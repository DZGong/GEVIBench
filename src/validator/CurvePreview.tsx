import { SpectrumViewer, type SpectrumData } from '../SpectrumViewer'
import { VoltageCurveViewer, type VoltageData } from '../VoltageCurveViewer'
import { PhotobleachViewer, type CompanionCurve, type PhotobleachData } from '../PhotobleachViewer'
import type { ValidationEntry } from './entries'

/**
 * Renders the stored curve for entries that hold one, using the very same viewers the
 * public GEVI page uses — so what you compare against the paper figure is exactly what
 * the site will draw, not a separate approximation.
 *
 * Returns null for scalar entries.
 */

type Rec = Record<string, unknown>

/** Index out of an entry key like `photobleach[2]`. */
function indexOf(key: string, field: string): number | null {
  const m = key.match(new RegExp(`^${field}\\[(\\d+)\\]$`))
  return m ? Number(m[1]) : null
}

/**
 * Other GEVIs with a bleach curve from the SAME figure, overlaid for comparison — many
 * bleach panels plot five sensors at once. Recomputed here over the validator's live data
 * rather than importing geviData's build-time snapshot, which would be stale the moment
 * a value is corrected.
 */
function companionCurves(allGevis: Record<string, Rec>, geviId: string, pb: Rec): CompanionCurve[] {
  const { source, sourceFigure } = pb
  if (!source || !sourceFigure) return []
  const out: CompanionCurve[] = []
  for (const [id, gevi] of Object.entries(allGevis)) {
    if (id === geviId) continue
    for (const raw of (gevi.photobleach as Rec[] | undefined) ?? []) {
      const custom = raw.custom as { time?: number[]; fluorescence?: number[] } | undefined
      if (raw.source !== source || raw.sourceFigure !== sourceFigure || !custom?.time?.length) continue
      out.push({
        name: gevi.name as string,
        fit: raw.fit as PhotobleachData['fit'],
        points: custom.time.map((t, i) => ({ time: t, flux: custom.fluorescence![i] })),
      })
      break
    }
  }
  return out
}

/**
 * Swap unsaved points into the F–V data so the plot tracks the point editor. Only the
 * curve being edited is replaced; sibling curves in the same panel stay as stored.
 */
function withDraftPoints(voltage: VoltageData, entry: ValidationEntry, draft: { x: number[]; y: number[] }): VoltageData {
  if (entry.key === 'voltage') {
    return { ...voltage, custom: { ...voltage.custom, voltage: draft.x, deltaF: draft.y } }
  }
  const i = Number(entry.key.match(/\[(\d+)\]$/)?.[1])
  return {
    ...voltage,
    additionalCurves: (voltage.additionalCurves ?? []).map((c, j) => (j === i ? { ...c, voltage: draft.x, deltaF: draft.y } : c)),
  }
}

interface Props {
  entry: ValidationEntry
  gevi: Rec
  allGevis: Record<string, Rec>
  geviId: string
  /** Unsaved curve points from the editor; when given, the plot draws these instead. */
  draft?: { x: number[]; y: number[] }
}

export function CurvePreview({ entry, gevi, allGevis, geviId, draft }: Props) {
  const name = gevi.name as string | undefined
  let chart: React.ReactNode = null

  if (entry.key === 'spectrum' && gevi.spectrum) {
    chart = (
      <SpectrumViewer
        spectrumData={gevi.spectrum as SpectrumData}
        geviName={name}
        bioluminescent={gevi.category === 'Bioluminescent GEVI' || gevi.photostabilityData === 'bioluminescent'}
      />
    )
  } else if ((entry.key === 'voltage' || entry.key.startsWith('voltage.additionalCurves[')) && gevi.voltage) {
    // Always the whole F–V panel: the extra curves are the comparison series from the
    // same figure, so reviewing one of them still wants the full plot.
    const voltage = gevi.voltage as VoltageData
    chart = <VoltageCurveViewer voltageData={draft ? withDraftPoints(voltage, entry, draft) : voltage} geviName={name} />
  } else {
    const i = indexOf(entry.key, 'photobleach')
    const pb = i === null ? undefined : (gevi.photobleach as Rec[] | undefined)?.[i]
    if (pb) {
      chart = (
        <PhotobleachViewer
          photobleachData={pb as PhotobleachData}
          geviName={name}
          companions={companionCurves(allGevis, geviId, pb)}
        />
      )
    }
  }

  if (!chart) return null
  return (
    <div className="mb-3 rounded border border-ink/10 bg-white p-2">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-ink/40">stored curve — compare with the figure</div>
      {chart}
    </div>
  )
}
