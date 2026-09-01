import { ArrowDownUp, Plus, Trash2 } from 'lucide-react'
import type { CurveEdit } from './entries'
import { parseDraft, type DraftPoint } from './curvePoints'

/**
 * Point-by-point editor for a digitized curve. Values are typed, not dragged: F–V points
 * are read off the paper's axes, and a number you can read off the figure beats a pixel
 * position you nudged. The chart above re-renders from these values as you type, so the
 * shape can be checked against the figure without saving.
 */

interface Props {
  curve: CurveEdit
  points: DraftPoint[]
  onChange: (points: DraftPoint[]) => void
}

export function CurvePointsEditor({ curve, points, onChange }: Props) {
  const set = (i: number, key: 'x' | 'y', value: string) =>
    onChange(points.map((p, j) => (j === i ? { ...p, [key]: value } : p)))

  const parsed = parseDraft(points)
  const unsorted = parsed.x.some((v, i) => i > 0 && v < parsed.x[i - 1])
  // House rule (see CLAUDE.md): the F–V curve is normalized so ΔF/F is 0 at the −70 mV
  // holding potential. Flag a drifted baseline rather than silently storing it.
  const restIndex = parsed.x.indexOf(-70)
  const restNonZero = restIndex >= 0 && parsed.y[restIndex] !== 0

  return (
    <div className="mt-2 rounded border border-klein/30 bg-klein/5 p-2">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-medium text-ink/70">Curve points ({parsed.x.length})</span>
        <button
          type="button"
          onClick={() => {
            // Sort the rows themselves; anything not yet a number keeps its place at the
            // end rather than being dropped or shuffled against a mismatched index.
            const numeric = (p: DraftPoint) => p.x.trim() !== '' && !Number.isNaN(Number(p.x.trim()))
            const sorted = points.filter(numeric).sort((a, b) => Number(a.x) - Number(b.x))
            onChange([...sorted, ...points.filter((p) => !numeric(p))])
          }}
          disabled={!unsorted}
          className="flex items-center gap-1 rounded border border-ink/20 px-1.5 py-0.5 text-[10px] hover:bg-ink/5 disabled:opacity-30"
          title="Sort rows by ascending x"
        >
          <ArrowDownUp size={10} /> sort
        </button>
        <button
          type="button"
          onClick={() => onChange([...points, { x: '', y: '' }])}
          className="ml-auto flex items-center gap-1 rounded border border-ink/20 px-1.5 py-0.5 text-[10px] hover:bg-ink/5"
        >
          <Plus size={10} /> add point
        </button>
      </div>

      {unsorted && <p className="mb-1 text-[10px] text-amber-700">Points are out of order along {curve.xLabel} — the plot draws them in row order.</p>}
      {restNonZero && <p className="mb-1 text-[10px] text-amber-700">ΔF/F at −70 mV is {parsed.y[restIndex]}, not 0 — the curve is normally normalized to 0 at rest.</p>}

      <div className="grid grid-cols-[1fr_1fr_auto] gap-x-1.5 gap-y-1">
        <div className="text-[10px] uppercase tracking-wide text-ink/40">{curve.xLabel}</div>
        <div className="text-[10px] uppercase tracking-wide text-ink/40">{curve.yLabel}</div>
        <div />
        {points.map((p, i) => (
          <PointRow key={i} point={p} onX={(v) => set(i, 'x', v)} onY={(v) => set(i, 'y', v)} onRemove={() => onChange(points.filter((_, j) => j !== i))} />
        ))}
      </div>

      {points.length === 0 && (
        <p className="py-2 text-center text-[11px] text-ink/40">No stored points — add them by reading the figure's axes.</p>
      )}
    </div>
  )
}

function PointRow({ point, onX, onY, onRemove }: { point: DraftPoint; onX: (v: string) => void; onY: (v: string) => void; onRemove: () => void }) {
  const bad = (v: string) => v.trim() !== '' && Number.isNaN(Number(v.trim()))
  const cls = (v: string) =>
    `w-full rounded border px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-klein ${bad(v) ? 'border-red-500 bg-red-50' : 'border-ink/20'}`
  return (
    <>
      <input value={point.x} onChange={(e) => onX(e.target.value)} inputMode="decimal" className={cls(point.x)} />
      <input value={point.y} onChange={(e) => onY(e.target.value)} inputMode="decimal" className={cls(point.y)} />
      <button type="button" onClick={onRemove} className="px-1 text-ink/30 hover:text-red-600" title="Remove point">
        <Trash2 size={11} />
      </button>
    </>
  )
}
