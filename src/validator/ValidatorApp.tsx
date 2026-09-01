import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CircleDashed, Flag, FileDown, Loader2, PencilLine } from 'lucide-react'
import { buildEntries, summarize, type ValidationEntry } from './entries'
import {
  acceptOps, applyOps, correctOps, exportFlagged, fetchAllGevis, fetchBookmarks, fetchPapers,
  flagOps, saveBookmarks, doiFrom, fetchDoiIndex, type Bookmarks, type PapersResponse, type WriteOp,
} from './api'
import { CurvePreview } from './CurvePreview'
import { EntryCard } from './EntryCard'
import { PdfPane } from './PdfPane'

type GeviJson = Record<string, unknown>

const SESSION_KEY = 'gevi-validator-session'

/** Where the user was, so an HMR reload (JSON writes retrigger one) does not lose the place. */
interface Session { geviId: string; entryKey: string; pdfRel: string | null; pdfPage: number }

/**
 * Publisher naming for supplementary files: mmc1.pdf, cn6b00234_si_001.pdf,
 * 41593_2014_..._MOESM12_ESM.pdf, media-1-2.pdf, sciadv.ads1807_sm.pdf.
 * The separators matter — `_sm` is followed by "." as often as by a digit, and requiring
 * the digit sent every Science Advances supplement to the back of the queue.
 */
const SUPPLEMENT_FILE = /(_si[_\d.]|_sm[_\d.]|mmc|supp[a-z]*|esm|media-|sd\d)/i
/** A supplementary citation: "Fig. S3c", "Table S1", "Supplementary Fig. 6". */
const SUPPLEMENT_FIGURE = /(^|\s)(suppl|s\s*\d)|(fig(?:ure)?s?\.?|table)\s*s\s*\d/i

/**
 * Key for the remembered PDF choice. One DOI usually has two files — the article and its
 * supplement — so the memory is per paper *and* per kind of figure cited. Otherwise the
 * first entry reviewed would pin every later entry of that paper to the same file.
 */
function sourceKey(entry: ValidationEntry): string {
  return `${entry.source ?? ''}::${SUPPLEMENT_FIGURE.test(entry.sourceFigure ?? '') ? 'S' : 'M'}`
}

/**
 * Which folder holds the paper this entry actually cites. Many entries are sourced from
 * third-party papers rather than the GEVI's own — voltron2 alone cites nine DOIs — and
 * those papers are usually already on disk, just filed under a different sensor. The DOI
 * index finds them; folder-name matching only ever finds the GEVI's own paper.
 */
function resolveDir(papers: PapersResponse, dirsByDoi: Record<string, string[]>, source?: string) {
  const doi = doiFrom(source)
  const dirs = doi ? dirsByDoi[doi] ?? [] : []
  if (dirs.length > 0) {
    // If the cited paper sits in this GEVI's own folder too, prefer that copy.
    const own = papers.suggestedDirs.find((d) => dirs.includes(d))
    return { dir: own ?? dirs[0], dirs, doi, viaDoi: true }
  }
  return { dir: papers.suggestedDirs[0] ?? null, dirs, doi, viaDoi: false }
}

/**
 * Which PDF to open by default. A "Fig. S3" citation belongs in the supplement and a
 * "Fig. 3" citation in the main text, so match the file to the kind of figure cited —
 * otherwise a main-text figure number happily matches prose inside a supplement caption.
 */
function defaultPdf(papers: PapersResponse, dir: string | null, figure?: string): string | null {
  if (!dir) return null
  const candidates = papers.pdfs.filter((p) => p.dir === dir)
  if (candidates.length === 0) return null
  const wantSupplement = SUPPLEMENT_FIGURE.test(figure ?? '')
  const matching = candidates.filter((p) => SUPPLEMENT_FILE.test(p.file) === wantSupplement)
  // Largest file as the tie-break: the main article outweighs a cover letter or a
  // one-page checklist filed next to it.
  return (matching.length > 0 ? matching : candidates).sort((a, b) => b.bytes - a.bytes)[0].rel
}

const STATUS_ICON: Record<ValidationEntry['status'], JSX.Element> = {
  unreviewed: <CircleDashed size={13} className="shrink-0 text-ink/30" />,
  validated: <Check size={13} className="shrink-0 text-emerald-700" />,
  corrected: <PencilLine size={13} className="shrink-0 text-klein" />,
  questionable: <Flag size={13} className="shrink-0 text-amber-600" />,
}

export function ValidatorApp() {
  const [gevis, setGevis] = useState<Record<string, GeviJson>>({})
  const [geviId, setGeviId] = useState('')
  const [entryKey, setEntryKey] = useState('')
  // Tagged with the GEVI it was fetched for: the fetch is async, so an untagged list
  // would briefly be the previous sensor's and pick a PDF from the wrong paper.
  const [papers, setPapers] = useState<(PapersResponse & { geviId: string }) | null>(null)
  const [pdfRel, setPdfRel] = useState<string | null>(null)
  const [pdfPage, setPdfPage] = useState(1)
  const [bookmarks, setBookmarks] = useState<Bookmarks>({ pdfBySource: {}, pageByEntry: {} })
  /** DOI → folders holding that paper; lets an entry open its own third-party source. */
  const [doiDirs, setDoiDirs] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [requestedMode, setRequestedMode] = useState<'edit' | 'flag' | null>(null)
  const [hideDone, setHideDone] = useState(false)

  const restored = useRef<Session | null>(null)
  const lastEntryKey = useRef('')

  const geviIds = useMemo(() => Object.keys(gevis).sort(), [gevis])
  const entries = useMemo(() => (gevis[geviId] ? buildEntries(gevis[geviId]) : []), [gevis, geviId])
  const entry = useMemo(() => entries.find((e) => e.key === entryKey) ?? entries[0], [entries, entryKey])
  const stats = useMemo(() => summarize(entries), [entries])

  const overall = useMemo(() => {
    let total = 0, validated = 0, questionable = 0
    for (const id of geviIds) {
      const s = summarize(buildEntries(gevis[id]))
      total += s.total; validated += s.validated; questionable += s.questionable
    }
    return { total, validated, questionable }
  }, [gevis, geviIds])

  // ---- initial load ----
  useEffect(() => {
    try { restored.current = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') } catch { /* ignore */ }
    Promise.all([fetchAllGevis(), fetchBookmarks()])
      .then(([all, marks]) => {
        setGevis(all)
        setBookmarks(marks)
        const s = restored.current
        const first = s?.geviId && all[s.geviId] ? s.geviId : Object.keys(all).sort()[0]
        setGeviId(first)
        if (s?.entryKey) setEntryKey(s.entryKey)
        if (s?.pdfRel) { setPdfRel(s.pdfRel); setPdfPage(s.pdfPage || 1) }
      })
      .catch((e) => setToast(`Could not reach the validator API — is this running under \`pnpm dev\`? (${e.message})`))
  }, [])

  useEffect(() => {
    if (!geviId) return
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ geviId, entryKey, pdfRel, pdfPage } satisfies Session))
  }, [geviId, entryKey, pdfRel, pdfPage])

  // The index takes a few seconds to build on a cold server, so rather than blocking the
  // first pick, re-run it for the current entry once the index arrives.
  useEffect(() => {
    fetchDoiIndex()
      .then((d) => { setDoiDirs(d); lastEntryKey.current = '' })
      .catch(() => { /* fall back to folder-name matching */ })
  }, [])

  useEffect(() => {
    if (!geviId) return
    fetchPapers(geviId)
      .then((p) => setPapers({ ...p, geviId }))
      .catch(() => setPapers({ pdfs: [], suggestedDirs: [], attachments: [], geviId }))
  }, [geviId])

  // ---- pick the PDF for the entry being reviewed ----
  // Runs on entry change only, so a manual pick in the dropdown is never overridden.
  useEffect(() => {
    if (!entry || !papers || papers.geviId !== geviId) return
    const token = `${geviId}::${entry.key}`
    if (token === lastEntryKey.current) return
    const isRestore = restored.current?.entryKey === entry.key && restored.current?.pdfRel
    lastEntryKey.current = token
    restored.current = null
    if (isRestore) return

    const remembered = entry.source ? bookmarks.pdfBySource[sourceKey(entry)] : undefined
    const known = new Set(papers.pdfs.map((p) => p.rel))
    const { dir, dirs, viaDoi } = resolveDir(papers, doiDirs, entry.source)
    // A remembered pick is honoured only if it is still the cited paper. Bookmarks saved
    // before the DOI index existed point at the GEVI's own paper for third-party sources,
    // and must not override the paper the entry actually cites.
    const rememberedOk = remembered && known.has(remembered) && (!viaDoi || dirs.includes(remembered.split('/')[0]))
    const nextPdf = rememberedOk ? remembered : defaultPdf(papers, dir, entry.sourceFigure)
    setPdfRel(nextPdf)

    // Only move the page deliberately: to a remembered spot, or to the top of a PDF
    // we are opening for the first time. Otherwise stay put and let the figure search
    // in PdfPane decide — consecutive entries usually cite the same figure.
    const bookmarked = bookmarks.pageByEntry[`${geviId}::${entry.key}`]
    if (bookmarked) setPdfPage(bookmarked)
    else if (nextPdf !== pdfRel) setPdfPage(1)
    // `pdfRel` is read, not tracked: this effect is keyed to entry changes only, so a
    // manual pick in the PDF dropdown is never undone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, papers, bookmarks, geviId, doiDirs])

  // ---- remember the PDF + page for next time ----
  useEffect(() => {
    if (!entry || !pdfRel) return
    const key = `${geviId}::${entry.key}`
    // Wait until the effect above has actually chosen a PDF for this entry. Mid-switch,
    // `pdfRel` still points at the previous sensor's paper, and recording that against
    // this entry's DOI would make the wrong file the remembered one from then on.
    if (lastEntryKey.current !== key) return
    setBookmarks((prev) => {
      if (prev.pageByEntry[key] === pdfPage) return prev
      const next = { ...prev, pageByEntry: { ...prev.pageByEntry, [key]: pdfPage } }
      saveBookmarks(next).catch(() => { /* bookmarks are a convenience, not data */ })
      return next
    })
  }, [entry, pdfRel, pdfPage, geviId])

  /**
   * Remember a PDF choice only when it was made by hand. Persisting the automatic pick
   * too would freeze it: every later improvement to the default (third-party DOIs,
   * main-vs-supplement) would be overridden by a bookmark recording the old, wrong guess.
   */
  const choosePdf = useCallback((rel: string | null) => {
    setPdfRel(rel)
    if (!entry?.source || !rel) return
    const srcKey = sourceKey(entry)
    setBookmarks((prev) => {
      if (prev.pdfBySource[srcKey] === rel) return prev
      const next = { ...prev, pdfBySource: { ...prev.pdfBySource, [srcKey]: rel } }
      saveBookmarks(next).catch(() => { /* convenience only */ })
      return next
    })
  }, [entry])

  const visible = useMemo(
    () => (hideDone ? entries.filter((e) => e.status === 'unreviewed' || e.status === 'questionable') : entries),
    [entries, hideDone],
  )

  const step = useCallback((delta: number) => {
    const list = visible.length > 0 ? visible : entries
    const i = list.findIndex((e) => e.key === entry?.key)
    const next = list[Math.min(Math.max((i < 0 ? 0 : i) + delta, 0), list.length - 1)]
    if (next) setEntryKey(next.key)
  }, [visible, entries, entry])

  /** After a decision, jump to the next entry still needing one. */
  const advance = useCallback((updated: GeviJson) => {
    const list = buildEntries(updated)
    const i = list.findIndex((e) => e.key === entry?.key)
    const after = list.slice(i + 1).find((e) => e.status === 'unreviewed')
    const anywhere = list.find((e) => e.status === 'unreviewed')
    const next = after ?? anywhere
    if (next) setEntryKey(next.key)
    else setToast(`${gevis[geviId]?.name ?? geviId}: every entry reviewed ✓`)
  }, [entry, gevis, geviId])

  const run = useCallback(async (ops: WriteOp[]) => {
    if (!geviId) return
    setBusy(true)
    try {
      const updated = await applyOps(geviId, ops)
      setGevis((g) => ({ ...g, [geviId]: updated }))
      advance(updated)
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [geviId, advance])

  // ---- keyboard: sweep without touching the mouse ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey || !entry) return
      const key = e.key.toLowerCase()
      if (key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); step(1) }
      else if (key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
      else if (key === 'a' || e.key === 'Enter') { e.preventDefault(); void run(acceptOps(entry)) }
      else if (key === 'e') { e.preventDefault(); setRequestedMode('edit') }
      else if (key === 'f') { e.preventDefault(); setRequestedMode('flag') }
      else if (e.key === ']') { e.preventDefault(); setPdfPage((p) => p + 1) }
      else if (e.key === '[') { e.preventDefault(); setPdfPage((p) => Math.max(1, p - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entry, step, run])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  /** Where this entry's cited paper came from, for the banner above the PDF. */
  const sourceInfo = useMemo(() => {
    if (!entry || !papers) return null
    const { dir, doi, viaDoi } = resolveDir(papers, doiDirs, entry.source)
    const ownDoi = doiFrom(gevis[geviId]?.paperUrl as string | undefined)
    return {
      doi,
      dir,
      viaDoi,
      thirdParty: !!doi && !!ownDoi && doi !== ownDoi,
      /** A DOI we could not find in any local PDF — the paper needs downloading. */
      missing: !!doi && !viaDoi,
      /** Spreadsheets etc. in the same folder — often where a big table actually lives. */
      attachments: (papers.attachments ?? []).filter((a) => a.dir === dir),
    }
  }, [entry, papers, doiDirs, gevis, geviId])

  /**
   * Numbers worth searching for when the citation names no figure. Decimals from the note
   * come first: curators write the paper's own reported value there ("τ1/2 = 2.1 ± 0.1 ms"),
   * whereas a stored field is often derived and appears nowhere in the text.
   */
  const searchTerms = useMemo(() => {
    if (!entry) return []
    const terms = new Set<string>()
    for (const n of (entry.note ?? '').match(/\d+\.\d+/g) ?? []) terms.add(n)
    for (const f of entry.fields) {
      if (f.kind === 'number' && typeof f.value === 'number') terms.add(String(Math.abs(f.value)))
    }
    return [...terms].slice(0, 6)
  }, [entry])

  const pdfOptions = useMemo(() => {
    if (!papers) return []
    const rank = new Map(papers.suggestedDirs.map((d, i) => [d, i]))
    return [...papers.pdfs].sort((a, b) => (rank.get(a.dir) ?? 999) - (rank.get(b.dir) ?? 999) || a.rel.localeCompare(b.rel))
  }, [papers])

  if (!geviId) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-surface text-ink/60">
        {toast ? <span className="max-w-lg text-sm text-red-700">{toast}</span> : <><Loader2 className="animate-spin" size={18} /> loading GEVIs…</>}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-surface font-sans text-ink">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-surface-low px-4 py-2">
        <h1 className="text-sm font-semibold tracking-tight">
          GEVI<span className="text-klein">Bench</span> <span className="font-normal text-ink/50">data validator</span>
        </h1>

        <select
          value={geviId}
          onChange={(e) => { setGeviId(e.target.value); setEntryKey(''); lastEntryKey.current = '' }}
          className="rounded border border-ink/20 bg-white px-2 py-1 text-sm outline-none focus:border-klein"
        >
          {geviIds.map((id) => {
            const s = summarize(buildEntries(gevis[id]))
            const done = s.validated === s.total
            return (
              <option key={id} value={id}>
                {done ? '✓ ' : ''}{(gevis[id].name as string) ?? id} — {s.validated}/{s.total}{s.questionable ? ` · ${s.questionable}⚑` : ''}
              </option>
            )
          })}
        </select>

        <div className="flex items-center gap-2 text-xs text-ink/60">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${stats.total ? (stats.validated / stats.total) * 100 : 0}%` }} />
          </div>
          <span className="tabular-nums">{stats.validated}/{stats.total}</span>
          {stats.questionable > 0 && <span className="text-amber-700">{stats.questionable} flagged</span>}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-ink/60">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          hide reviewed
        </label>

        <div className="ml-auto flex items-center gap-3 text-xs text-ink/50">
          <span className="tabular-nums">all GEVIs: {overall.validated}/{overall.total} · {overall.questionable} flagged</span>
          <button
            onClick={() => exportFlagged().then((r) => setToast(`Wrote ${r.file} (${r.count} flagged)`)).catch((e) => setToast(e.message))}
            className="flex items-center gap-1 rounded border border-ink/20 px-2 py-1 hover:bg-ink/5"
          >
            <FileDown size={13} /> export flagged
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* queue */}
        <nav className="w-64 shrink-0 overflow-auto border-r border-ink/10 bg-surface-low">
          {visible.length === 0 && <p className="p-4 text-xs text-ink/40">Nothing left to review here.</p>}
          {visible.map((e, i) => {
            const newGroup = i === 0 || visible[i - 1].group !== e.group
            return (
              <div key={e.key}>
                {newGroup && (
                  <div className="sticky top-0 z-10 bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink/40">{e.group}</div>
                )}
                <button
                  onClick={() => setEntryKey(e.key)}
                  className={`flex w-full items-start gap-1.5 px-3 py-1.5 text-left text-xs hover:bg-ink/5 ${e.key === entry?.key ? 'bg-klein/10 ring-1 ring-inset ring-klein/30' : ''}`}
                >
                  {STATUS_ICON[e.status]}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[10px] text-ink/45">{e.key}</span>
                    <span className="block truncate text-ink/80">{e.title}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </nav>

        {/* paper */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-ink/10 bg-surface-low px-3 py-1.5 text-xs">
            <span className="text-ink/40">PDF</span>
            <select
              value={pdfRel ?? ''}
              onChange={(e) => choosePdf(e.target.value || null)}
              className="min-w-0 flex-1 rounded border border-ink/20 bg-white px-2 py-1 outline-none focus:border-klein"
            >
              <option value="">— none —</option>
              {pdfOptions.map((p) => (
                <option key={p.rel} value={p.rel}>{p.dir}/{p.file} ({Math.round(p.bytes / 1024)} kB)</option>
              ))}
            </select>
            {sourceInfo?.thirdParty && !sourceInfo.missing && (
              <span className="shrink-0 rounded bg-klein/15 px-1.5 py-0.5 font-medium text-klein" title={`Cited from another paper (${sourceInfo.doi}), found in Papers/${sourceInfo.dir}`}>
                other paper · {sourceInfo.dir}
              </span>
            )}
            {entry?.sourceFigure && (
              <span className="shrink-0 rounded bg-gold/25 px-1.5 py-0.5 font-medium text-ink/70">{entry.sourceFigure}</span>
            )}
          </div>

          {sourceInfo && !sourceInfo.missing && sourceInfo.attachments.length > 0 && (
            <div className="border-b border-ink/10 bg-surface px-3 py-1 text-[11px] text-ink/50">
              also in this folder (open outside the browser):{' '}
              {sourceInfo.attachments.map((a) => (
                <code key={a.rel} className="mr-2 rounded bg-ink/5 px-1">Papers/{a.rel}</code>
              ))}
            </div>
          )}

          {sourceInfo?.missing && (
            <div className="flex items-start gap-2 border-b border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-900">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                No local PDF matches this entry's source{' '}
                <a href={`https://doi.org/${sourceInfo.doi}`} target="_blank" rel="noreferrer" className="font-mono underline">{sourceInfo.doi}</a>
                {' '}— download it into <code className="rounded bg-amber-500/20 px-1">Papers/{sourceInfo.dir ?? geviId}/</code>, then reload this page.
                {sourceInfo.dir && <> Showing <code className="rounded bg-amber-500/20 px-1">{sourceInfo.dir}</code> meanwhile, which is a different paper.</>}
              </span>
            </div>
          )}
          <div className="min-h-0 flex-1">
            <PdfPane rel={pdfRel} figure={entry?.sourceFigure} page={pdfPage} onPageChange={setPdfPage} entryKey={entry?.key ?? ''} suggestions={searchTerms} />
          </div>
        </section>

        {/* entry */}
        <aside className="flex w-[30rem] shrink-0 flex-col border-l border-ink/10 bg-surface-low">
          {entry ? (
            <EntryCard
              entry={entry}
              busy={busy}
              requestedMode={requestedMode}
              onModeHandled={() => setRequestedMode(null)}
              renderCurve={(draft) => <CurvePreview entry={entry} gevi={gevis[geviId]} allGevis={gevis} geviId={geviId} draft={draft} />}
              onAccept={() => void run(acceptOps(entry))}
              onCorrect={(edits, comment, curve) => void run(correctOps(entry, edits, comment, curve))}
              onFlag={(comment) => void run(flagOps(entry, comment))}
              onSkip={() => step(1)}
            />
          ) : (
            <p className="p-4 text-sm text-ink/40">No entries for this GEVI.</p>
          )}
        </aside>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded bg-ink px-4 py-2 text-sm text-white shadow-ambient">
          <AlertTriangle size={14} /> {toast}
        </div>
      )}
    </div>
  )
}
