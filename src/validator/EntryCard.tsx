import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, Flag, Pencil, SkipForward, Undo2 } from 'lucide-react'
import type { EntryField, ValidationEntry } from './entries'
import { fieldInputValue, parseFieldInput } from './api'
import { CurvePointsEditor } from './CurvePointsEditor'
import { SourceCrop } from './SourceCrop'
import { parseDraft, toDraft, type DraftPoint } from './curvePoints'

interface Props {
  entry: ValidationEntry
  busy: boolean
  onAccept: () => void
  onCorrect: (edits: Record<string, unknown>, comment: string, curve?: { x: number[]; y: number[] }) => void
  onFlag: (comment: string) => void
  onSkip: () => void
  /** Set by the parent when a keyboard shortcut asks to open a mode. */
  requestedMode: 'edit' | 'flag' | null
  onModeHandled: () => void
  /** Plot of this entry's stored curve, when it has one. Takes the in-progress point
   *  edits so the chart tracks what is being typed (see CurvePreview). */
  renderCurve?: (draft?: { x: number[]; y: number[] }) => React.ReactNode
}

const STATUS_STYLE: Record<ValidationEntry['status'], { label: string; className: string }> = {
  unreviewed: { label: 'unreviewed', className: 'bg-ink/10 text-ink/60' },
  validated: { label: 'validated', className: 'bg-emerald-600/15 text-emerald-800' },
  corrected: { label: 'corrected here', className: 'bg-klein/15 text-klein' },
  questionable: { label: 'flagged', className: 'bg-amber-500/20 text-amber-800' },
}

/** DOIs are stored as `doi:10.xxxx/...`; make them clickable. */
function sourceHref(source?: string): string | null {
  if (!source) return null
  if (source.startsWith('http')) return source
  if (source.startsWith('doi:')) return `https://doi.org/${source.slice(4)}`
  return null
}

export function EntryCard({ entry, busy, onAccept, onCorrect, onFlag, onSkip, requestedMode, onModeHandled, renderCurve }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'flag'>('view')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pointDrafts, setPointDrafts] = useState<DraftPoint[]>([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const editable = useMemo(() => entry.fields.filter((f) => f.kind !== 'readonly'), [entry])

  // A new entry always starts in view mode with fresh inputs.
  useEffect(() => {
    setMode('view')
    setComment('')
    setError(null)
    setDrafts(Object.fromEntries(entry.fields.map((f) => [f.key, fieldInputValue(f)])))
    setPointDrafts(entry.curveEdit ? toDraft(entry.curveEdit) : [])
  }, [entry])

  /** Editing a curve: the source crop belongs beside the point table, not in the body. */
  const editingCurve = mode === 'edit' && !!entry.curveEdit

  // While editing points the chart shows the draft; otherwise the stored curve.
  const curve = renderCurve?.(mode === 'edit' && entry.curveEdit ? parseDraft(pointDrafts) : undefined)

  useEffect(() => {
    if (!requestedMode) return
    setMode(requestedMode)
    onModeHandled()
  }, [requestedMode, onModeHandled])

  const submitEdit = () => {
    try {
      const edits: Record<string, unknown> = {}
      for (const field of editable) edits[field.key] = parseFieldInput(field, drafts[field.key] ?? '')
      if (entry.curveEdit) {
        const bad = pointDrafts.filter((p) => (p.x.trim() === '') !== (p.y.trim() === ''))
        if (bad.length > 0) throw new Error('Every curve point needs both a value and a coordinate')
      }
      setError(null)
      onCorrect(edits, comment, entry.curveEdit ? parseDraft(pointDrafts) : undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const href = sourceHref(entry.source)
  const status = STATUS_STYLE[entry.status]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-ink/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[11px] text-ink/60">{entry.key}</span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${status.className}`}>{status.label}</span>
        </div>
        <h2 className="mt-1.5 text-base font-medium leading-snug text-ink">{entry.title}</h2>
        {entry.subtitle && <p className="text-xs text-ink/50">{entry.subtitle}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        {curve}

        {entry.review && (
          <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
            <div className="font-medium">
              {entry.review.status === 'questionable' ? 'Flagged' : 'Corrected'} {entry.review.date}
            </div>
            {entry.review.comment && <p className="mt-0.5">{entry.review.comment}</p>}
            {entry.review.previous && (
              <p className="mt-0.5 font-mono text-[11px] opacity-70">was: {JSON.stringify(entry.review.previous)}</p>
            )}
          </div>
        )}

        <dl className="space-y-1.5">
          {entry.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              editing={mode === 'edit' && field.kind !== 'readonly'}
              draft={drafts[field.key] ?? ''}
              onDraft={(v) => setDrafts((d) => ({ ...d, [field.key]: v }))}
            />
          ))}
        </dl>

        {entry.sourceImage && !editingCurve && (
          <div className="mt-3">
            <SourceCrop src={entry.sourceImage} />
          </div>
        )}

        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-klein hover:underline">
            <ExternalLink size={12} /> open source
          </a>
        )}
      </div>

      <div className="max-h-[70vh] overflow-auto border-t border-ink/10 px-4 py-3">
        {error && <p className="mb-2 text-xs text-red-700">{error}</p>}

        {mode === 'view' && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onAccept} disabled={busy} className="col-span-2 flex items-center justify-center gap-1.5 rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
              <Check size={15} /> Correct <kbd className="ml-1 rounded bg-white/20 px-1 text-[10px]">A</kbd>
            </button>
            <button onClick={() => setMode('edit')} disabled={busy} className="flex items-center justify-center gap-1.5 rounded border border-ink/20 px-3 py-2 text-sm hover:bg-ink/5 disabled:opacity-50">
              <Pencil size={14} /> Fix value <kbd className="rounded bg-ink/10 px-1 text-[10px]">E</kbd>
            </button>
            <button onClick={() => setMode('flag')} disabled={busy} className="flex items-center justify-center gap-1.5 rounded border border-amber-600/40 px-3 py-2 text-sm text-amber-800 hover:bg-amber-500/10 disabled:opacity-50">
              <Flag size={14} /> Flag <kbd className="rounded bg-amber-500/20 px-1 text-[10px]">F</kbd>
            </button>
            <button onClick={onSkip} className="col-span-2 flex items-center justify-center gap-1.5 py-1 text-xs text-ink/50 hover:text-ink">
              <SkipForward size={12} /> skip without deciding <kbd className="rounded bg-ink/10 px-1 text-[10px]">J</kbd>
            </button>
          </div>
        )}

        {mode === 'edit' && (
          <div className="space-y-2">
            {editingCurve && entry.sourceImage && <SourceCrop src={entry.sourceImage} />}
            {entry.curveEdit && (
              <CurvePointsEditor curve={entry.curveEdit} points={pointDrafts} onChange={setPointDrafts} />
            )}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was wrong, and what does the paper actually say? (optional)"
              rows={2}
              className="w-full resize-none rounded border border-ink/20 px-2 py-1.5 text-xs outline-none focus:border-klein"
            />
            <div className="flex gap-2">
              <button onClick={submitEdit} disabled={busy} className="flex-1 rounded bg-klein px-3 py-2 text-sm font-medium text-white hover:bg-klein-light disabled:opacity-50">
                Save correction
              </button>
              <button onClick={() => setMode('view')} className="flex items-center gap-1 rounded border border-ink/20 px-3 py-2 text-sm hover:bg-ink/5">
                <Undo2 size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {mode === 'flag' && (
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why is this questionable? This goes to the next gevi-page-checker round."
              rows={3}
              autoFocus
              className="w-full resize-none rounded border border-amber-600/40 px-2 py-1.5 text-xs outline-none focus:border-amber-700"
            />
            <div className="flex gap-2">
              <button onClick={() => onFlag(comment)} disabled={busy} className="flex-1 rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                Flag as questionable
              </button>
              <button onClick={() => setMode('view')} className="flex items-center gap-1 rounded border border-ink/20 px-3 py-2 text-sm hover:bg-ink/5">
                <Undo2 size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldRow({ field, editing, draft, onDraft }: { field: EntryField; editing: boolean; draft: string; onDraft: (v: string) => void }) {
  const empty = field.value === undefined || field.value === null || field.value === ''
  return (
    <div className="grid grid-cols-[8.5rem_1fr] items-start gap-2 text-sm">
      <dt className="pt-1 text-xs text-ink/50">{field.label}</dt>
      <dd className="min-w-0">
        {editing ? (
          <>
            {field.kind === 'longtext' ? (
              <textarea value={draft} onChange={(e) => onDraft(e.target.value)} rows={3} className="w-full resize-y rounded border border-ink/20 px-2 py-1 text-xs outline-none focus:border-klein" />
            ) : field.kind === 'boolean' ? (
              <select value={draft} onChange={(e) => onDraft(e.target.value)} className="w-full rounded border border-ink/20 px-2 py-1 text-xs outline-none focus:border-klein">
                <option value="">(absent)</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input value={draft} onChange={(e) => onDraft(e.target.value)} className="w-full rounded border border-ink/20 px-2 py-1 font-mono text-xs outline-none focus:border-klein" />
            )}
            {field.hint && <p className="mt-0.5 text-[10px] leading-tight text-ink/40">{field.hint}</p>}
          </>
        ) : (
          <span className={`block break-words ${empty ? 'text-ink/25' : field.kind === 'longtext' ? 'text-ink/80' : 'font-mono text-ink'}`}>
            {empty ? '—' : Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}
          </span>
        )}
      </dd>
    </div>
  )
}
