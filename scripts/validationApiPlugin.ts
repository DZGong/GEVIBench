import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { applyEdits, modify } from 'jsonc-parser'

/**
 * Dev-only REST API behind /__validate, backing the manual data validator
 * (validator.html). It reads and writes src/gevis/*.json and serves the paper
 * PDFs that live OUTSIDE the Vite root (../Papers), which the browser could not
 * otherwise reach.
 *
 * Runs under `apply: 'serve'` only — the endpoints do not exist in a production
 * build, so the deployed site can never write to the data files.
 */

interface Options {
  gevisDir: string
  papersDir: string
  checkerDir: string
  bookmarkFile: string
  doiIndexFile: string
}

/** Cached opening-pages text of one PDF, invalidated when the file changes on disk. */
interface PdfText { mtimeMs: number; size: number; head: string }

const HEAD_CHARS = 20000

/** Whitespace-free lowercase form, so a DOI split across a line break still matches. */
const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/**
 * Text from a paper's opening pages, where its own DOI is printed. Deeper pages are
 * skipped on purpose: the reference list is full of other people's DOIs, and matching
 * those would point every citation at the wrong paper.
 *
 * The text is cached rather than the DOIs found in it. Extracting DOIs by pattern is
 * unreliable — bioRxiv's header runs together in the text layer, yielding
 * "10.1101/2024.11.15.623698doi:biorxiv" — whereas searching the text for a DOI we
 * already know survives any amount of glued-on junk.
 */
async function scanPdfHead(abs: string, maxPages = 3): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ url: new URL(`file://${abs}`).href, useSystemFonts: true })
  let head = ''
  try {
    const doc = await task.promise
    for (let p = 1; p <= Math.min(maxPages, doc.numPages); p++) {
      const content = await doc.getPage(p).then((page) => page.getTextContent())
      head += content.items.map((i) => ('str' in i ? i.str : '')).join('')
      if (head.length > HEAD_CHARS) break
    }
  } finally {
    // Release the worker even when a page fails to parse, so one bad PDF cannot
    // starve the rest of the scan.
    await task.destroy()
  }
  return squash(head.slice(0, HEAD_CHARS))
}

/** Every distinct `source` DOI used anywhere in the curated data. */
function collectKnownDois(gevisDir: string): string[] {
  const dois = new Set<string>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'source' && typeof v === 'string' && v.startsWith('doi:')) dois.add(v.slice(4))
      else if (v && typeof v === 'object') walk(v)
    }
  }
  for (const id of listGeviIds(gevisDir)) {
    walk(JSON.parse(fs.readFileSync(path.join(gevisDir, `${id}.json`), 'utf8')))
  }
  return [...dois]
}

/** A single mutation: set `value` at `jsonPath`, or delete the key when `remove`. */
interface WriteOp {
  jsonPath: (string | number)[]
  value?: unknown
  remove?: boolean
  /** When creating a new key, place it directly after this sibling instead of at the end
   *  of the object. Keeps `review` next to the `proofread` it qualifies — at the file root
   *  those sit in the identity block, not last. Ignored when the key already exists. */
  insertAfter?: string
}

const FORMATTING = { tabSize: 2, insertSpaces: true, eol: '\n' }

/** Loose key for matching a Papers/ folder name to a GEVI id ("bonwoori-R3" → "bonwoorir3"). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function json(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

/** All GEVI ids that have a JSON file, in alphabetical order. */
function listGeviIds(gevisDir: string): string[] {
  return fs.readdirSync(gevisDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
}

/** Papers/<dir>/<file>.pdf inventory, one entry per PDF, as root-relative paths. */
function listPdfs(papersDir: string): { dir: string; file: string; rel: string; bytes: number }[] {
  if (!fs.existsSync(papersDir)) return []
  const out: { dir: string; file: string; rel: string; bytes: number }[] = []
  for (const dir of fs.readdirSync(papersDir)) {
    const abs = path.join(papersDir, dir)
    let stat: fs.Stats
    try { stat = fs.statSync(abs) } catch { continue }
    if (!stat.isDirectory()) continue
    for (const file of fs.readdirSync(abs)) {
      if (!file.toLowerCase().endsWith('.pdf')) continue
      let bytes = 0
      try { bytes = fs.statSync(path.join(abs, file)).size } catch { /* unreadable */ }
      out.push({ dir, file, rel: `${dir}/${file}`, bytes })
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

/** Length of the longest common subsequence — tolerant of the dropped letters in folder typos. */
function lcsLength(a: string, b: string): number {
  let prev = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0)
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
    }
    prev = cur
  }
  return prev[b.length]
}

/**
 * Non-PDF supplementary files sitting beside the papers. Journals increasingly publish
 * large tables as spreadsheets — the HVI+ supplement's Table S2 caption literally reads
 * "(separate file)" — so the reviewer needs to be told the data is next door.
 */
function listAttachments(papersDir: string): { dir: string; file: string; rel: string }[] {
  if (!fs.existsSync(papersDir)) return []
  const out: { dir: string; file: string; rel: string }[] = []
  for (const dir of fs.readdirSync(papersDir)) {
    const abs = path.join(papersDir, dir)
    try { if (!fs.statSync(abs).isDirectory()) continue } catch { continue }
    for (const file of fs.readdirSync(abs)) {
      if (!/\.(xlsx?|csv|tsv|docx?|zip)$/i.test(file)) continue
      out.push({ dir, file, rel: `${dir}/${file}` })
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

/**
 * Rank Papers/ folders by how well they match a GEVI id. Folder names are hand-made
 * and drift from the ids — abbreviations ("FlicR2" vs "flicr2"), and outright typos
 * ("cephid" for cepheid1b, "bonwoori-R3" for bongwoori-r3). Exact and prefix matches
 * win; a subsequence-similarity tier catches the typos, which plain substring tests miss.
 */
function rankDirs(dirs: string[], geviId: string): string[] {
  const target = norm(geviId)
  return dirs
    .map((dir) => {
      const d = norm(dir)
      const ratio = lcsLength(d, target) / Math.max(d.length, target.length)
      const coverage = Math.min(d.length, target.length) / Math.max(d.length, target.length)
      let score = 0
      if (d === target) score = 100
      // A shared beginning is strong evidence; a shared ending is weak — "asap1" sits
      // inside "hasap1" but the HaloTag sensor's paper is in HASAP/, not asap1/.
      else if (target.startsWith(d) || d.startsWith(target)) score = 60 + 30 * coverage
      // Near-identity competes with prefixes, so a one-letter typo spanning the whole id
      // ("bonwoori-R3" for bongwoori-r3) beats a prefix that drops the variant suffix.
      else if (ratio >= 0.85) score = 60 + 30 * ratio
      else if (d.includes(target) || target.includes(d)) score = 40 + 20 * coverage
      else if (ratio >= 0.6) score = 10 + 10 * ratio
      return { dir, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.dir)
}

export function validationApiPlugin(opts: Options): Plugin {
  const { gevisDir, papersDir, checkerDir, bookmarkFile, doiIndexFile } = opts

  /**
   * Maps every DOI found on a PDF's opening pages to the folders holding it, so an entry
   * sourced from a third-party paper opens that paper instead of the GEVI's own. Many
   * such papers are already on disk, just filed under a different sensor's folder.
   *
   * Scanning is cached per file (mtime + size); the first build costs a minute or so for
   * ~130 PDFs, after which only new or changed files are re-read.
   */
  let doiIndexPromise: Promise<Record<string, string[]>> | null = null
  let doiIndexSignature = ''

  /** Cheap fingerprint of the Papers/ tree, so a newly downloaded PDF is picked up
   *  without restarting the dev server. */
  function papersSignature(): string {
    return listPdfs(papersDir).map((p) => `${p.rel}:${p.bytes}`).join('|')
  }

  async function buildDoiIndex(): Promise<Record<string, string[]>> {
    let cache: Record<string, PdfText> = {}
    try { cache = JSON.parse(fs.readFileSync(doiIndexFile, 'utf8')) } catch { /* first run */ }

    const pdfs = listPdfs(papersDir)
    let scanned = 0
    for (const pdf of pdfs) {
      const abs = path.join(papersDir, pdf.rel)
      const stat = fs.statSync(abs)
      const hit = cache[pdf.rel]
      if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) continue
      let head = ''
      try { head = await scanPdfHead(abs) } catch { /* unreadable / scanned image */ }
      cache[pdf.rel] = { mtimeMs: stat.mtimeMs, size: stat.size, head }
      scanned++
      if (scanned % 20 === 0) console.log(`[validate] read ${scanned} PDFs…`)
    }
    // Drop entries for files that no longer exist.
    const live = new Set(pdfs.map((p) => p.rel))
    for (const rel of Object.keys(cache)) if (!live.has(rel)) delete cache[rel]

    if (scanned > 0) {
      fs.mkdirSync(path.dirname(doiIndexFile), { recursive: true })
      fs.writeFileSync(doiIndexFile, JSON.stringify(cache))
      console.log(`[validate] PDF text cache updated (${scanned} read, ${pdfs.length} total)`)
    }

    // Match at request time, not scan time: the curated DOIs change far more often than
    // the PDFs, and this way adding one needs no rescan.
    const dirsByDoi: Record<string, string[]> = {}
    for (const doi of collectKnownDois(gevisDir)) {
      // Keyed lowercase: DOIs are case-insensitive and curated values are mixed case
      // ("10.7554/eLife.25690", "10.1523/ENEURO.0060-20.2020"), while the client looks
      // them up lowercased. Keying by the raw string silently loses every such paper.
      const key = doi.toLowerCase()
      const needle = squash(doi)
      for (const [rel, { head }] of Object.entries(cache)) {
        if (!head.includes(needle)) continue
        const dir = rel.split('/')[0]
        const dirs = (dirsByDoi[key] ??= [])
        if (!dirs.includes(dir)) dirs.push(dir)
      }
    }
    return dirsByDoi
  }

  /**
   * Files this plugin just wrote, so `handleHotUpdate` can skip them. A GEVI JSON has no
   * HMR boundary, so any change to one triggers a full page reload — which during a review
   * sweep would reload the validator (and re-parse the open PDF) after every single verdict.
   * The validator already holds the server's response, so its own writes need no reload.
   * Edits from anywhere else — a curator agent, an editor — still reload normally.
   */
  const selfWrites = new Map<string, number>()
  const SELF_WRITE_TTL = 5000

  const geviFile = (id: string) => {
    // Reject anything that is not a bare id — no traversal into the rest of the repo.
    if (!/^[a-z0-9_-]+$/i.test(id)) return null
    const file = path.join(gevisDir, `${id}.json`)
    return fs.existsSync(file) ? file : null
  }

  return {
    name: 'gevi-validation-api',
    apply: 'serve',
    // Returning [] means "no modules to update", which cancels the reload this change
    // would otherwise cause. Scoped to our own recent writes; everything else falls
    // through to Vite's normal handling.
    handleHotUpdate(ctx) {
      const key = path.normalize(ctx.file)
      const at = selfWrites.get(key)
      if (at === undefined) return
      selfWrites.delete(key)
      if (Date.now() - at < SELF_WRITE_TTL) return []
    },
    configureServer(server) {
      server.middlewares.use('/__validate', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.replace(/\/$/, '') || '/'

        try {
          // ---- every GEVI, fresh from disk (1.4 MB total; one fetch on load) ----
          if (route === '/all' && req.method === 'GET') {
            const gevis: Record<string, unknown> = {}
            for (const id of listGeviIds(gevisDir)) {
              gevis[id] = JSON.parse(fs.readFileSync(path.join(gevisDir, `${id}.json`), 'utf8'))
            }
            return json(res, 200, { gevis })
          }

          // ---- one GEVI, re-read after a write ----
          if (route.startsWith('/gevi/') && req.method === 'GET') {
            const file = geviFile(route.slice('/gevi/'.length))
            if (!file) return json(res, 404, { error: 'unknown gevi' })
            return json(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
          }

          // ---- apply mutations to one GEVI ----
          // Text-level edits via jsonc-parser: untouched bytes stay byte-identical, so
          // a full re-serialize can't silently renormalize numbers (1.0 → 1) across the
          // digitized spectra/curve arrays and blow up the diff.
          if (route.startsWith('/gevi/') && req.method === 'POST') {
            const id = route.slice('/gevi/'.length)
            const file = geviFile(id)
            if (!file) return json(res, 404, { error: 'unknown gevi' })
            const { ops } = JSON.parse(await readBody(req)) as { ops: WriteOp[] }
            if (!Array.isArray(ops) || ops.length === 0) return json(res, 400, { error: 'no ops' })

            let text = fs.readFileSync(file, 'utf8')
            for (const op of ops) {
              const value = op.remove ? undefined : op.value
              const after = op.insertAfter
              text = applyEdits(text, modify(text, op.jsonPath, value, {
                formattingOptions: FORMATTING,
                ...(after && {
                  getInsertionIndex: (props: string[]) => {
                    const i = props.indexOf(after)
                    return i === -1 ? props.length : i + 1
                  },
                }),
              }))
            }
            JSON.parse(text)  // reject a malformed result before it reaches disk
            selfWrites.set(path.normalize(file), Date.now())
            fs.writeFileSync(file, text)
            return json(res, 200, JSON.parse(text))
          }

          // ---- PDF inventory, best-matching folders first ----
          if (route === '/papers' && req.method === 'GET') {
            const geviId = url.searchParams.get('gevi') ?? ''
            const pdfs = listPdfs(papersDir)
            const dirs = [...new Set(pdfs.map((p) => p.dir))]
            return json(res, 200, { pdfs, suggestedDirs: rankDirs(dirs, geviId), attachments: listAttachments(papersDir) })
          }

          // ---- which folders hold the paper for a given DOI ----
          if (route === '/doi-index' && req.method === 'GET') {
            const signature = papersSignature()
            if (signature !== doiIndexSignature) {
              doiIndexSignature = signature
              doiIndexPromise = buildDoiIndex()
            }
            return json(res, 200, { dirsByDoi: await doiIndexPromise! })
          }

          // ---- PDF bytes ----
          if (route === '/pdf' && req.method === 'GET') {
            const rel = url.searchParams.get('rel') ?? ''
            const abs = path.resolve(papersDir, rel)
            if (!abs.startsWith(path.resolve(papersDir) + path.sep) || !abs.toLowerCase().endsWith('.pdf') || !fs.existsSync(abs)) {
              return json(res, 404, { error: 'pdf not found' })
            }
            const buf = fs.readFileSync(abs)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Length', String(buf.length))
            res.setHeader('Cache-Control', 'no-store')
            return res.end(buf)
          }

          // ---- which PDF + page was last used for a given source, so revisits land there ----
          if (route === '/bookmarks' && req.method === 'GET') {
            let contents = '{}'
            try { contents = fs.readFileSync(bookmarkFile, 'utf8') } catch { /* first run */ }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            return res.end(contents)
          }
          if (route === '/bookmarks' && req.method === 'POST') {
            const parsed = JSON.parse(await readBody(req))
            fs.mkdirSync(path.dirname(bookmarkFile), { recursive: true })
            fs.writeFileSync(bookmarkFile, JSON.stringify(parsed, null, 2) + '\n')
            return json(res, 200, { ok: true })
          }

          // ---- hand the flagged entries to the next gevi-page-checker round ----
          if (route === '/export-flagged' && req.method === 'POST') {
            // Local date, not toISOString() — evening edits in the Americas would
            // otherwise be stamped with tomorrow's UTC date.
            const today = new Date().toLocaleDateString('en-CA')
            const body: string[] = []
            let count = 0
            for (const id of listGeviIds(gevisDir)) {
              const gevi = JSON.parse(fs.readFileSync(path.join(gevisDir, `${id}.json`), 'utf8'))
              const hits = collectFlags(gevi)
              if (hits.length === 0) continue
              body.push(`## ${gevi.name ?? id} (\`${id}\`)`, '')
              for (const h of hits) {
                count++
                body.push(`- **\`${h.path}\`** — ${h.comment || '_no comment_'}`)
                if (h.source) body.push(`  - source: ${h.source}${h.sourceFigure ? ` · ${h.sourceFigure}` : ''}`)
                body.push(`  - value: \`${h.value}\``)
                body.push(`  - flagged: ${h.date}`)
              }
              body.push('')
            }
            const lines = [
              `# Flagged data entries — ${today}`,
              '',
              `**${count} flagged entr${count === 1 ? 'y' : 'ies'}.** Marked questionable in the manual validator; each needs a re-check against the cited source.`,
              '',
              ...body,
            ]
            const out = path.join(checkerDir, `flagged-${today}.md`)
            fs.mkdirSync(checkerDir, { recursive: true })
            fs.writeFileSync(out, lines.join('\n'))
            return json(res, 200, { file: path.relative(process.cwd(), out), count })
          }

          return json(res, 404, { error: `no route ${req.method} ${route}` })
        } catch (err) {
          return json(res, 500, { error: err instanceof Error ? err.message : String(err) })
        }
      })
    },
  }
}

/** Walk a GEVI object for `review.status === 'questionable'` marks, recording their JSON paths. */
function collectFlags(gevi: unknown) {
  const hits: { path: string; comment: string; source?: string; sourceFigure?: string; date: string; value: string }[] = []
  const walk = (node: unknown, trail: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${trail}[${i}]`))
      return
    }
    if (!node || typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    const review = obj.review as { status?: string; comment?: string; date?: string } | undefined
    if (review?.status === 'questionable') {
      // Only this object's own scalar fields. At the file root that yields the identity
      // fields (name/year/date/…) rather than the entire GEVI with all its nested records.
      const scalarish = (v: unknown) =>
        v === null || typeof v !== 'object' || (Array.isArray(v) && v.every((x) => typeof x !== 'object'))
      const rest = Object.fromEntries(
        Object.entries(obj).filter(([k, v]) => k !== 'review' && k !== 'note' && scalarish(v)),
      )
      hits.push({
        path: trail || '(identity)',
        comment: review.comment ?? '',
        source: typeof obj.source === 'string' ? obj.source : undefined,
        sourceFigure: typeof obj.sourceFigure === 'string' ? obj.sourceFigure : undefined,
        date: review.date ?? '',
        value: JSON.stringify(rest).slice(0, 300),
      })
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'review' || k === 'custom') continue
      if (v && typeof v === 'object') walk(v, trail ? `${trail}.${k}` : k)
    }
  }
  walk(gevi, '')
  return hits
}
