import type { ReviewMark } from '../types'
import type { EntryField, ValidationEntry } from './entries'

/** Client for the dev-only /__validate API (see scripts/validationApiPlugin.ts). */

const BASE = '/__validate'

export interface PdfInfo { dir: string; file: string; rel: string; bytes: number }
export interface AttachmentInfo { dir: string; file: string; rel: string }
export interface PapersResponse {
  pdfs: PdfInfo[]
  suggestedDirs: string[]
  /** Non-PDF supplementary files (spreadsheets, docs) sitting beside the papers. */
  attachments: AttachmentInfo[]
}

/** Which PDF and page a given source was last read at, so revisits land in the same place. */
export interface Bookmarks {
  /** keyed by DOI/url → PDF chosen for it */
  pdfBySource: Record<string, string>
  /** keyed by `${geviId}::${entryKey}` → page number */
  pageByEntry: Record<string, number>
}

export interface WriteOp {
  jsonPath: (string | number)[]
  value?: unknown
  remove?: boolean
  /** Place a newly created key right after this sibling rather than at the end. */
  insertAfter?: string
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

export const fetchAllGevis = () => req<{ gevis: Record<string, Record<string, unknown>> }>('/all').then((r) => r.gevis)
export const fetchPapers = (geviId: string) => req<PapersResponse>(`/papers?gevi=${encodeURIComponent(geviId)}`)
export const fetchBookmarks = () => req<Partial<Bookmarks>>('/bookmarks').then((b) => ({ pdfBySource: b.pdfBySource ?? {}, pageByEntry: b.pageByEntry ?? {} }))
export const saveBookmarks = (b: Bookmarks) => req<{ ok: true }>('/bookmarks', { method: 'POST', body: JSON.stringify(b) })
export const exportFlagged = () => req<{ file: string; count: number }>('/export-flagged', { method: 'POST' })
/** DOI → the Papers/ folders whose PDF opening pages print that DOI. */
export const fetchDoiIndex = () => req<{ dirsByDoi: Record<string, string[]> }>('/doi-index').then((r) => r.dirsByDoi)

/** Bare DOI from a stored `source` ("doi:10.x/y") or a doi.org URL; null if neither. */
export function doiFrom(source?: string): string | null {
  if (!source) return null
  if (source.startsWith('doi:')) return source.slice(4).toLowerCase()
  const m = source.match(/10\.\d{4,9}\/\S+/)
  return m ? m[0].toLowerCase().replace(/[.,;)\]]+$/, '') : null
}
export const pdfUrl = (rel: string) => `${BASE}/pdf?rel=${encodeURIComponent(rel)}`

export const applyOps = (geviId: string, ops: WriteOp[]) =>
  req<Record<string, unknown>>(`/gevi/${geviId}`, { method: 'POST', body: JSON.stringify({ ops }) })

/** Local date, not toISOString() — an evening review in the Americas must not be stamped tomorrow. */
const today = () => new Date().toLocaleDateString('en-CA')

/**
 * Writes the proofread/review pair onto the reviewed object. Uniform for every entry:
 * the identity card's `markPath` is the file root, so it sets the root's own `proofread`
 * exactly the way a nested record sets its own.
 */
function markOps(entry: ValidationEntry, proofread: boolean, review?: ReviewMark): WriteOp[] {
  return [
    { jsonPath: [...entry.markPath, 'proofread'], value: proofread },
    review
      ? { jsonPath: [...entry.markPath, 'review'], value: review, insertAfter: 'proofread' }
      : { jsonPath: [...entry.markPath, 'review'], remove: true },
  ]
}

/** ✓ — checked against the source, value stands. Clears any earlier flag. */
export const acceptOps = (entry: ValidationEntry): WriteOp[] => markOps(entry, true)

/** ⚑ — needs another look; picked up by checker/flagged-*.md. */
export const flagOps = (entry: ValidationEntry, comment: string): WriteOp[] =>
  markOps(entry, false, { status: 'questionable', comment: comment.trim() || undefined, date: today() })

/**
 * ✎ — the value was wrong and is being fixed. Writes the corrected fields, marks the
 * record proofread, and keeps the superseded values under `review.previous`.
 */
export function correctOps(
  entry: ValidationEntry,
  edits: Record<string, unknown>,
  comment: string,
  curve?: { x: number[]; y: number[] },
): WriteOp[] {
  const previous: Record<string, unknown> = {}
  const ops: WriteOp[] = []

  const ce = entry.curveEdit
  if (ce && curve && !(curve.x.length === ce.x.length && curve.x.every((v, i) => v === ce.x[i] && curve.y[i] === ce.y[i]))) {
    if (ce.containerExists) {
      ops.push({ jsonPath: [...ce.containerPath, ce.xKey], value: curve.x })
      ops.push({ jsonPath: [...ce.containerPath, ce.yKey], value: curve.y })
    } else {
      // First points for this curve — the container has to be created in one write.
      ops.push({ jsonPath: ce.containerPath, value: { [ce.xKey]: curve.x, [ce.yKey]: curve.y } })
    }
    previous.curve = curvePrevious(ce, curve)
  }
  for (const [key, next] of Object.entries(edits)) {
    const field = entry.fields.find((f) => f.key === key)
    if (!field || sameValue(field.value, next)) continue
    previous[key] = field.value
    const jsonPath = [...entry.jsonPath, key]
    // Blank input means "this field should not be here" — drop the key rather than
    // writing an empty string, so optional fields stay genuinely absent.
    if (next === undefined) ops.push({ jsonPath, remove: true })
    else ops.push({ jsonPath, value: next })
  }
  if (ops.length === 0) return acceptOps(entry)
  return [...ops, ...markOps(entry, true, { status: 'corrected', comment: comment.trim() || undefined, date: today(), previous })]
}

/**
 * Audit record for a corrected curve, sized to the correction. Nudging one point is the
 * common case, and storing all ~16 old pairs for it would add dozens of lines to the file
 * every time; only when the x values themselves change (a re-digitization) is the whole
 * previous curve worth keeping, and past 60 points even that becomes a summary.
 */
function curvePrevious(ce: NonNullable<ValidationEntry['curveEdit']>, next: { x: number[]; y: number[] }): unknown {
  const sameX = ce.x.length === next.x.length && ce.x.every((v, i) => v === next.x[i])
  if (sameX) {
    return {
      changedPoints: ce.x
        .map((_, i) => i)
        .filter((i) => ce.y[i] !== next.y[i])
        .map((i) => ({ [ce.xKey]: ce.x[i], [ce.yKey]: ce.y[i] })),
    }
  }
  return ce.x.length <= 60
    ? { [ce.xKey]: ce.x, [ce.yKey]: ce.y }
    : `${ce.x.length} points, ${ce.xKey} ${Math.min(...ce.x)}…${Math.max(...ce.x)}`
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => x === b[i])
  return a === b
}

/** Turn the text in an input back into the JSON value for its field, or undefined to drop the key. */
export function parseFieldInput(field: EntryField, raw: string): unknown {
  const trimmed = raw.trim()
  if (field.kind === 'boolean') return trimmed === 'true' ? true : trimmed === 'false' ? false : undefined
  if (trimmed === '') return undefined
  if (field.kind === 'number') {
    const n = Number(trimmed)
    if (Number.isNaN(n)) throw new Error(`"${raw}" is not a number`)
    return n
  }
  if (Array.isArray(field.value)) return trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  return trimmed
}

/** How a field's current value is shown in its input. */
export function fieldInputValue(field: EntryField): string {
  if (field.value === undefined || field.value === null) return ''
  if (Array.isArray(field.value)) return field.value.join(', ')
  return String(field.value)
}
