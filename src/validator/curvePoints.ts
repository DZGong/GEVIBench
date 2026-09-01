import type { CurveEdit } from './entries'

/** Draft state for the curve point editor, kept separate from the component so editing
 *  it does not break fast refresh. */

export interface DraftPoint {
  /** Held as strings so a half-typed value ("-", "1.") survives until it parses. */
  x: string
  y: string
}

export function toDraft(curve: CurveEdit): DraftPoint[] {
  return curve.x.map((x, i) => ({ x: String(x), y: String(curve.y[i] ?? '') }))
}

/** Parsed points, skipping rows that are not yet two valid numbers. */
export function parseDraft(points: DraftPoint[]): { x: number[]; y: number[] } {
  const x: number[] = []
  const y: number[] = []
  for (const p of points) {
    const px = Number(p.x.trim())
    const py = Number(p.y.trim())
    if (p.x.trim() === '' || p.y.trim() === '' || Number.isNaN(px) || Number.isNaN(py)) continue
    x.push(px)
    y.push(py)
  }
  return { x, y }
}
