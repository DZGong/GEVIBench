import type { ReviewMark } from '../types'

/**
 * Flattens a GEVI JSON into the ordered list of records a human reviews, one card
 * at a time. Every record that carries a `proofread` flag becomes an entry, plus a
 * leading "identity" card for the top-level fields (year/date/paperUrl/lineage/…)
 * that have no flag of their own and are tracked under `identity`.
 */

export type EntryStatus = 'unreviewed' | 'validated' | 'corrected' | 'questionable'

export type FieldKind = 'number' | 'text' | 'longtext' | 'boolean' | 'readonly'

export interface EntryField {
  key: string
  label: string
  value: unknown
  kind: FieldKind
  /** Hint rendered under the input while editing. */
  hint?: string
}

/**
 * Describes a pair of parallel number arrays that make up a digitized curve, so the card
 * can offer a point-by-point editor for it. The two arrays live side by side on
 * `containerPath` — under `custom` for the main F–V curve, directly on the record for an
 * additional curve — which is also what makes writing them uniform.
 */
export interface CurveEdit {
  containerPath: (string | number)[]
  /** False when the container object does not exist yet (a curve being entered for the
   *  first time); it must then be written whole, since jsonc-parser will not create
   *  intermediate objects. */
  containerExists: boolean
  xKey: string
  yKey: string
  xLabel: string
  yLabel: string
  x: number[]
  y: number[]
}

export interface ValidationEntry {
  /** Unique within a GEVI; also the label shown in the queue ("kinetics[0]"). */
  key: string
  /** Path to the reviewed record. `[]` for the identity card (the GEVI root). */
  jsonPath: (string | number)[]
  /** Path to the object holding `proofread`/`review` — same as jsonPath except identity. */
  markPath: (string | number)[]
  group: string
  title: string
  subtitle?: string
  fields: EntryField[]
  source?: string
  sourceFigure?: string
  /** Cropped figure image under public/, when the curator saved one. */
  sourceImage?: string
  note?: string
  status: EntryStatus
  review?: ReviewMark
  /** Present when this entry holds a hand-editable digitized curve (F–V). */
  curveEdit?: CurveEdit
}

type Rec = Record<string, unknown>

const num = (key: string, label: string, hint?: string): FieldSpec => ({ key, label, kind: 'number', hint })
const txt = (key: string, label: string, hint?: string): FieldSpec => ({ key, label, kind: 'text', hint })
const bool = (key: string, label: string): FieldSpec => ({ key, label, kind: 'boolean' })

interface FieldSpec { key: string; label: string; kind: FieldKind; hint?: string }

/** Fields every sourced record shares; appended last so the value fields lead the card. */
const PROVENANCE: FieldSpec[] = [
  txt('source', 'Source', 'DOI of the paper this value came from'),
  txt('sourceFigure', 'Figure', 'e.g. "Fig. 3c", "Fig. S1", "Table 1"'),
  { key: 'note', label: 'Note', kind: 'longtext' },
]

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (Array.isArray(v)) return v.length > 6 ? `${v.length} values` : v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function buildFields(record: Rec, specs: FieldSpec[]): EntryField[] {
  return specs.map((s) => ({ ...s, value: record[s.key] }))
}

function statusOf(mark: Rec | undefined): { status: EntryStatus; review?: ReviewMark } {
  const review = mark?.review as ReviewMark | undefined
  if (review?.status === 'questionable') return { status: 'questionable', review }
  if (review?.status === 'corrected') return { status: 'corrected', review }
  return { status: mark?.proofread === true ? 'validated' : 'unreviewed', review }
}

/** Read-only summary of a digitized curve — the arrays themselves are not hand-editable. */
function curveSummary(custom: unknown, xKey: string, yKey: string): string {
  if (!custom || typeof custom !== 'object') return '—'
  const c = custom as Rec
  const xs = c[xKey] as number[] | undefined
  const ys = c[yKey] as number[] | undefined
  if (!Array.isArray(xs) || !Array.isArray(ys)) return '—'
  return `${xs.length} pts · ${xKey} ${Math.min(...xs)} → ${Math.max(...xs)} · ${yKey} ${Math.min(...ys)} → ${Math.max(...ys)}`
}

/** Spectra store one array per curve plus the wavelength it starts at (1 nm steps). */
function spectrumCurve(custom: unknown, key: 'excitation' | 'emission', minKey: 'minEx' | 'minEm'): string {
  const c = custom as Rec | undefined
  const arr = c?.[key]
  if (!Array.isArray(arr)) return '—'
  const min = c?.[minKey]
  return typeof min === 'number' ? `${arr.length} pts from ${min} nm` : `${arr.length} pts`
}

/**
 * Builds the editor descriptor for a container holding two parallel number arrays.
 * Returns a descriptor even when the container is missing, so a curve can be entered
 * from scratch by reading points off the figure.
 */
function pointArrays(
  container: Rec | undefined,
  containerPath: (string | number)[],
  xKey: string,
  yKey: string,
  xLabel: string,
  yLabel: string,
): CurveEdit {
  const x = container?.[xKey]
  const y = container?.[yKey]
  return {
    containerPath,
    containerExists: !!container,
    xKey,
    yKey,
    xLabel,
    yLabel,
    x: Array.isArray(x) ? (x as number[]) : [],
    y: Array.isArray(y) ? (y as number[]) : [],
  }
}

interface GroupSpec {
  /** Top-level key on the GEVI object. */
  field: string
  group: string
  specs: FieldSpec[]
  /** Human one-liner for the card header. */
  title: (r: Rec) => string
  /** Extra read-only rows (digitized arrays, fits). */
  extra?: (r: Rec) => EntryField[]
}

const ARRAY_GROUPS: GroupSpec[] = [
  {
    field: 'kinetics',
    group: 'Kinetics',
    specs: [num('on', 'τ_on', 'ms — amplitude-weighted mean for multi-exponential fits'), num('off', 'τ_off', 'ms'), txt('temperature', 'Temperature'), txt('dye', 'Dye')],
    title: (r) => `τ_on ${fmt(r.on)} ms · τ_off ${fmt(r.off)} ms`,
  },
  {
    field: 'dynamicRangeData',
    group: 'Dynamic range',
    specs: [num('deltaF', 'ΔF/F', '% over the −70 → +30 mV (100 mV) step'), txt('sign', 'Sign', 'positive | negative'), txt('responseType', 'Response type', 'peak | steady-state'), txt('modality', 'Modality', '1P | 2P'), txt('dye', 'Dye')],
    title: (r) => `ΔF/F ${fmt(r.deltaF)}%${r.modality ? ` · ${r.modality}` : ''}`,
  },
  {
    field: 'sensitivityData',
    group: 'Sensitivity',
    specs: [num('deltaF', 'ΔF/F per AP', '%'), txt('modality', 'Modality', '1P | 2P'), txt('dye', 'Dye')],
    title: (r) => `${fmt(r.deltaF)}% per AP${r.modality ? ` · ${r.modality}` : ''}`,
  },
  {
    field: 'subthresholdData',
    group: 'Subthreshold',
    specs: [num('slope', 'Slope', '%/mV'), txt('modality', 'Modality', '1P | 2P')],
    title: (r) => `${fmt(r.slope)} %/mV`,
  },
  {
    field: 'apWidthData',
    group: 'AP width',
    specs: [num('fwhm', 'FWHM', 'ms'), num('samplingRate', 'Sampling rate', 'Hz'), txt('sample', 'Sample'), txt('modality', 'Modality', '1P | 2P'), txt('temperature', 'Temperature')],
    title: (r) => `FWHM ${fmt(r.fwhm)} ms @ ${fmt(r.samplingRate)} Hz`,
  },
  {
    field: 'brightnessData',
    group: 'Brightness',
    specs: [num('ratio', 'Ratio', 'this GEVI ÷ reference'), txt('reference', 'Reference')],
    title: (r) => `${fmt(r.ratio)} × ${fmt(r.reference)}`,
  },
  {
    field: 'photostabilityData',
    group: 'Photostability',
    specs: [num('brightnessRemaining', 'F remaining', '%'), txt('illumination', 'Illumination'), txt('duration', 'Duration'), txt('modality', 'Modality', '1P | 2P'), txt('dye', 'Dye')],
    title: (r) => `${fmt(r.brightnessRemaining)}% left after ${fmt(r.duration)}`,
  },
  {
    field: 'twoPhoton',
    group: 'Two-photon',
    specs: [bool('compatible', '2P compatible')],
    title: (r) => (r.compatible ? '2P compatible' : 'NOT 2P compatible'),
  },
  {
    field: 'photobleach',
    group: 'Photobleach',
    specs: [
      txt('modality', 'Modality', '1P | 2P'),
      txt('illumination', 'Illumination', 'as reported'),
      num('intensityMWmm2', 'Intensity', 'mW/mm² — 1P only; enables dose-scaling'),
      num('t75', 't₇₅', 's — time to 75% of initial F'),
      num('t50', 't₅₀', 's — use INSTEAD of t75 when 75% falls in a rapid transient'),
      bool('extrapolated', 'Extrapolated'),
      num('reportedTau', 'Reported τ', "s — the paper's own photobleach τ"),
    ],
    title: (r) => (r.t50 !== undefined ? `t₅₀ ${fmt(r.t50)} s` : r.t75 !== undefined ? `t₇₅ ${fmt(r.t75)} s` : 'curve, no landmark') + ` · ${fmt(r.illumination)}`,
    extra: (r) => [
      { key: 'fit', label: 'Fit', kind: 'readonly', value: r.fit ? `${(r.fit as Rec).model} ${JSON.stringify(r.fit)}` : '—' },
      { key: 'custom', label: 'Curve', kind: 'readonly', value: curveSummary(r.custom, 'time', 'fluorescence') },
    ],
  },
]

export function buildEntries(gevi: Record<string, unknown>): ValidationEntry[] {
  const entries: ValidationEntry[] = []

  const push = (e: Omit<ValidationEntry, 'status' | 'review'>, mark: Rec | undefined) => {
    entries.push({ ...e, ...statusOf(mark) })
  }

  // ---- identity: the root object's own fields, flagged by the root's own `proofread` ----
  push(
    {
      key: 'identity',
      jsonPath: [],
      markPath: [],
      group: 'Identity',
      title: `${fmt(gevi.name)} — ${fmt(gevi.paper)}`,
      subtitle: 'Name, dates, lineage and description',
      fields: [
        { key: 'name', label: 'Name', kind: 'text', value: gevi.name },
        { key: 'year', label: 'Year', kind: 'number', value: gevi.year, hint: 'displayed/citation year' },
        { key: 'date', label: 'Date', kind: 'text', value: gevi.date, hint: 'ISO YYYY-MM-DD — primary sort key' },
        { key: 'category', label: 'Category', kind: 'text', value: gevi.category },
        { key: 'tags', label: 'Tags', kind: 'text', value: gevi.tags, hint: 'comma-separated' },
        { key: 'paper', label: 'Paper', kind: 'text', value: gevi.paper, hint: 'e.g. "Cell 2019"' },
        { key: 'paperUrl', label: 'Paper URL', kind: 'text', value: gevi.paperUrl },
        { key: 'description', label: 'Description', kind: 'longtext', value: gevi.description },
        { key: 'parentId', label: 'Parent id', kind: 'text', value: gevi.parentId },
        { key: 'siblingId', label: 'Sibling id', kind: 'text', value: gevi.siblingId },
        { key: 'crossBranchParentId', label: 'Cross-branch parent', kind: 'text', value: gevi.crossBranchParentId },
        { key: 'canonicalDye', label: 'Canonical dye', kind: 'text', value: gevi.canonicalDye },
        { key: 'familyTreePath', label: 'Family tree path', kind: 'readonly', value: fmt(gevi.familyTreePath) },
      ],
      source: typeof gevi.paperUrl === 'string' ? gevi.paperUrl : undefined,
    },
    gevi,
  )

  // ---- spectrum (single object) ----
  const spectrum = gevi.spectrum as Rec | undefined
  if (spectrum) {
    push(
      {
        key: 'spectrum',
        jsonPath: ['spectrum'],
        markPath: ['spectrum'],
        group: 'Spectrum',
        title: `Ex ${fmt(spectrum.peakEx)} / Em ${fmt(spectrum.peakEm)} nm`,
        subtitle: fmt(spectrum.name),
        fields: [
          ...buildFields(spectrum, [txt('type', 'Type', 'fp | rhodopsin | nir | fret | redfp'), num('peakEx', 'Peak Ex', 'nm'), num('peakEm', 'Peak Em', 'nm'), txt('name', 'Curve name', 'e.g. "FPbase: EGFP" when inherited')]),
          { key: 'customEx', label: 'Ex curve', kind: 'readonly', value: spectrumCurve(spectrum.custom, 'excitation', 'minEx') },
          { key: 'customEm', label: 'Em curve', kind: 'readonly', value: spectrumCurve(spectrum.custom, 'emission', 'minEm') },
          ...buildFields(spectrum, PROVENANCE),
        ],
        source: spectrum.source as string | undefined,
        sourceFigure: spectrum.sourceFigure as string | undefined,
        note: spectrum.note as string | undefined,
      },
      spectrum,
    )
  }

  // ---- voltage F-V curve + any additional curves ----
  const voltage = gevi.voltage as Rec | undefined
  if (voltage) {
    push(
      {
        key: 'voltage',
        jsonPath: ['voltage'],
        markPath: ['voltage'],
        group: 'F–V curve',
        title: `slope ${fmt(voltage.slope)} · ${fmt(voltage.polarity)}`,
        subtitle: fmt(voltage.name),
        fields: [
          ...buildFields(voltage, [txt('type', 'Type', 'opsin | fp | fret | red | chemi'), num('slope', 'Slope', '%/100 mV, fallback when no custom curve'), txt('polarity', 'Polarity', 'positive | negative'), txt('name', 'Curve name')]),
          { key: 'custom', label: 'Digitized curve', kind: 'readonly', value: curveSummary(voltage.custom, 'voltage', 'deltaF') },
          ...buildFields(voltage, PROVENANCE.filter((p) => p.key !== 'note')),
        ],
        source: voltage.source as string | undefined,
        sourceFigure: voltage.sourceFigure as string | undefined,
        sourceImage: voltage.sourceImage as string | undefined,
        curveEdit: pointArrays(voltage.custom as Rec | undefined, ['voltage', 'custom'], 'voltage', 'deltaF', 'mV', 'ΔF/F %'),
      },
      voltage,
    )
    const extras = voltage.additionalCurves as Rec[] | undefined
    extras?.forEach((curve, i) => {
      push(
        {
          key: `voltage.additionalCurves[${i}]`,
          jsonPath: ['voltage', 'additionalCurves', i],
          markPath: ['voltage', 'additionalCurves', i],
          group: 'F–V curve',
          title: `extra curve: ${fmt(curve.name)}`,
          fields: [
            ...buildFields(curve, [txt('name', 'Curve name')]),
            { key: 'custom', label: 'Digitized curve', kind: 'readonly', value: curveSummary(curve, 'voltage', 'deltaF') },
          ],
          source: voltage.source as string | undefined,
          sourceFigure: voltage.sourceFigure as string | undefined,
          sourceImage: voltage.sourceImage as string | undefined,
          // An additional curve keeps its arrays on the record itself, not under `custom`.
          curveEdit: pointArrays(curve, ['voltage', 'additionalCurves', i], 'voltage', 'deltaF', 'mV', 'ΔF/F %'),
        },
        curve,
      )
    })
  }

  // ---- the sourced measurement arrays ----
  for (const spec of ARRAY_GROUPS) {
    const arr = gevi[spec.field]
    if (!Array.isArray(arr)) continue  // photostabilityData can be the string 'bioluminescent'
    arr.forEach((raw, i) => {
      const record = raw as Rec
      push(
        {
          key: `${spec.field}[${i}]`,
          jsonPath: [spec.field, i],
          markPath: [spec.field, i],
          group: spec.group,
          title: spec.title(record),
          fields: [...buildFields(record, spec.specs), ...(spec.extra?.(record) ?? []), ...buildFields(record, PROVENANCE)],
          source: record.source as string | undefined,
          sourceFigure: record.sourceFigure as string | undefined,
          sourceImage: record.sourceImage as string | undefined,
          note: record.note as string | undefined,
        },
        record,
      )
    })
  }

  // ---- addgene ----
  const addgene = gevi.addgene as Rec | undefined
  if (addgene) {
    push(
      {
        key: 'addgene',
        jsonPath: ['addgene'],
        markPath: ['addgene'],
        group: 'Addgene',
        title: `#${fmt(addgene.id)}`,
        fields: buildFields(addgene, [txt('id', 'Plasmid id'), txt('url', 'URL'), { key: 'note', label: 'Note', kind: 'longtext' }]),
        source: addgene.url as string | undefined,
        note: addgene.note as string | undefined,
      },
      addgene,
    )
  }

  // ---- independent research papers ----
  const papers = gevi.researchPapers as Rec[] | undefined
  papers?.forEach((paper, i) => {
    push(
      {
        key: `researchPapers[${i}]`,
        jsonPath: ['researchPapers', i],
        markPath: ['researchPapers', i],
        group: 'Research papers',
        title: fmt(paper.title),
        subtitle: `${fmt(paper.journal)} ${fmt(paper.year)}`,
        fields: buildFields(paper, [
          { key: 'title', label: 'Title', kind: 'longtext' },
          txt('journal', 'Journal'),
          num('year', 'Year'),
          txt('authors', 'Authors'),
          txt('sample', 'Sample', 'species, cell type, in vivo/slice/culture'),
          txt('dye', 'Dye'),
          txt('url', 'URL'),
          txt('applications', 'Applications', 'comma-separated'),
        ]),
        source: paper.url as string | undefined,
      },
      paper,
    )
  })

  return entries
}

export function summarize(entries: ValidationEntry[]) {
  return {
    total: entries.length,
    validated: entries.filter((e) => e.status === 'validated' || e.status === 'corrected').length,
    questionable: entries.filter((e) => e.status === 'questionable').length,
  }
}
