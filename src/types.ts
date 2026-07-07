// GEVI TypeScript Interfaces

export interface GEVI {
  id: string;
  name: string;
  year: number;
  /** Exact publication date (ISO YYYY-MM-DD), used as the primary sort key.
   *  `year` remains the displayed/citation year; `date` drives ordering. */
  date?: string;
  category: string;
  tags: string[];
  paper: string;
  paperUrl: string;
  // Raw data fields — stored in JSON, used to compute scores at runtime.
  // Each entry has a source (DOI). Multiple entries from different papers are averaged.
  kinetics?: {
    on: number;
    off: number;
    temperature?: string;
    dye?: string;  // chemigenetic GEVIs only: the dye this measurement used; the displayed value prefers the canonical dye
    source: string;
    sourceFigure?: string;
    proofread?: boolean;
  }[];
  dynamicRangeData?: {
    deltaF: number;
    sign: 'positive' | 'negative';
    responseType?: 'peak' | 'steady-state';  // 'peak' renders a gold badge; steady-state is the default (unlabeled)
    modality?: '1P' | '2P';  // excitation modality; 1P is the primary list/sort value
    dye?: string;  // chemigenetic GEVIs only: the dye this measurement used (e.g. "Cy3b", "JF525")
    source: string;
    sourceFigure?: string;
    proofread?: boolean;
  }[];
  sensitivityData?: {
    deltaF: number;  // ΔF/F % per action potential
    modality?: '1P' | '2P';  // excitation modality; 1P is the primary list/sort value
    dye?: string;  // chemigenetic GEVIs only: the dye this measurement used (e.g. "Cy3b", "JF525")
    source: string;
    sourceFigure?: string;
    proofread?: boolean;
  }[];
  subthresholdData?: {
    slope: number;  // %/mV
    modality?: '1P' | '2P';   // excitation modality of the subthreshold measurement, when identifiable
    source: string;
    sourceFigure?: string;
    note?: string;
    proofread?: boolean;
  }[];
  // Time width of the optically-recorded action potential (FWHM of the single-AP
  // fluorescence waveform). Store-only for now — not yet displayed. The measured
  // width is broadened by finite frame rate, so samplingRate (Hz) is recorded too.
  apWidthData?: {
    fwhm: number;          // ms — full-width at half-maximum of the optical AP waveform
    samplingRate: number;  // Hz — imaging frame rate the width was measured at (required)
    sample?: string;       // prep: species, cell type, in vivo/slice/culture (see ResearchPaper.sample)
    modality?: '1P' | '2P';
    temperature?: string;  // °C — AP width is temperature-dependent
    source: string;
    sourceFigure?: string;
    note?: string;
    proofread?: boolean;
  }[];
  brightnessData?: {
    ratio: number;
    reference: string;
    source: string;
    sourceFigure?: string;
    proofread?: boolean;
  }[];
  photostabilityData?: {
    brightnessRemaining: number;
    illumination: string;
    duration: string;
    modality?: '1P' | '2P';  // excitation modality; display-only label (no primary-value logic)
    dye?: string;  // chemigenetic GEVIs only: the dye this measurement used; the displayed value prefers the canonical dye
    source: string;
    sourceFigure?: string;
    proofread?: boolean;
  }[] | 'bioluminescent';
  twoPhoton?: {
    compatible: boolean;
    source: string;
    sourceFigure?: string;
    proofread?: boolean;
  }[];

  // Raw derived values — computed at runtime for tabular display + sorting
  bRel?: number | null;                  // brightness relative to EGFP (from graph traversal)
  displayTauOn?: number | null;          // selected τ_on in ms (temperature-preferred)
  displayTauOff?: number | null;         // selected τ_off in ms (temperature-preferred)
  displayTauSum?: number | null;         // τ_on + τ_off, for speed sorting
  displayDynamicRange?: number | null;   // median |ΔF/F| across entries
  displaySubthreshold?: number | null;   // median subthreshold slope (%/mV); falls back to F-V-derived estimate
  subthresholdDerived?: boolean;         // true when displaySubthreshold was estimated from the F-V slope (not measured)
  displaySensitivity?: number | null;    // median |ΔF/F| per AP across entries
  displayApWidth?: number | null;        // median optical AP width (FWHM, ms) across entries
  displayPhotostab?: number | null;      // legacy F_remain metric: normalized % remaining @ 100 mW/mm², 1 min (kept for reference; no longer the displayed/sorted stability metric)
  displayT75?: number | null;            // photostability landmark: 1P t₇₅ (or t₅₀ where the 75% crossing is transient-dominated), in seconds, linearly dose-scaled to 100 mW/mm². 2P/power-only curves are excluded (not cross-comparable). null when no scalable 1P photobleach curve exists.
  description: string;
  familyTreePath?: string[] | null;
  parentId?: string;
  siblingId?: string;  // geviId of a sibling (same parent, same paper) — renders as Y-fork in tree
  crossBranchParentId?: string;  // geviId of a parent in a different branch
  canonicalDye?: string;  // chemigenetic GEVIs: the dye the page's headline ΔF/F medians use (e.g. "JF525"); overrides the spectrum.name parenthetical. Off-dye entries stay stored/badged but out of the median.
  spectrum?: {
    type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp';
    peakEx: number;
    peakEm: number;
    name: string;
    source?: string;
    sourceFigure?: string;
    note?: string;
    proofread?: boolean;
    custom?: {
      minEx?: number;
      excitation?: number[];
      minEm: number;
      emission: number[];
    };
  };
  voltage?: {
    type: 'opsin' | 'fp' | 'fret' | 'red' | 'chemi';
    slope: number;
    polarity: 'positive' | 'negative';
    name: string;
    proofread?: boolean;
    custom?: {
      voltage: number[];
      deltaF: number[];
    };
    additionalCurves?: {
      name: string;
      voltage: number[];
      deltaF: number[];
      proofread?: boolean;
    }[];
    source?: string;
    sourceImage?: string;
    sourceFigure?: string;
  };
  // Photobleaching decay curve + model-free t75% metric (time for fluorescence to
  // fall to 75% of its initial value at the stated illumination). Digitized from the
  // paper's bleach figure; an explicit fit (power-law, (bi)exponential, …) is stored
  // so the panel can draw the smooth curve and solve the t75% crossing without
  // assuming single-exponential decay. Non-standard-power / 2P entries are NOT
  // intensity-normalized — they stand alone and are not compared across GEVIs.
  photobleach?: Array<{
    modality?: '1P' | '2P';
    illumination: string;          // irradiance/power as reported (may be power-only for 2P)
    intensityMWmm2?: number;       // 1P illumination intensity in mW/mm² — enables linear-dose scaling of t75 to the 100 mW/mm² reference (1P only; omit for 2P / power-only)
    t75?: number;                  // time to 75% of initial fluorescence, in seconds (at the measured illumination). Omit when the sensor never reaches 75% within the measured window (negligible bleaching) — the curve still renders/overlays, just without a t75 marker.
    t50?: number;                  // half-life: time to 50% of initial fluorescence, in seconds. Use INSTEAD of t75 when the 75% crossing falls inside an unrepresentative rapid-initial-photobleach transient (the 50% crossing then sits in the sustained phase). The panel renders the marker/threshold at 50% with a t₅₀ label.
    extrapolated?: boolean;        // true when the displayed metric (t75 or t50) lies beyond the measured window (fit extrapolated past the data)
    reportedTau?: number;          // the paper's OWN reported photobleach time constant, in seconds (usually a single-exponential τ stated in the caption/text). Store-only provenance — the displayed metric is still the model-free t75/t50 from the digitized curve; record this so the authors' authoritative number is preserved even when the real curve is multi-phasic and the model-free metric differs.
    fit?: {
      model: 'power-law' | 'biexponential' | 'monoexponential' | 'stretched-exponential';
      a?: number;                  // power-law: F(t) = a · t^b (t in s). biexponential: fast-component fraction (0-1)
      b?: number;                  // power-law exponent; also the stretch exponent β for stretched-exponential: F = exp(−(t/tau)^b)
      tau?: number;                // exponential time constant, in seconds: mono → F = exp(-t/tau); biexp → fast τ₁
      tau2?: number;               // biexponential slow time constant, in seconds: F = a·exp(-t/tau) + (1-a)·exp(-t/tau2)
      r2?: number;
    };
    custom?: {
      time: number[];              // seconds
      fluorescence: number[];      // fraction of initial fluorescence (F/F0)
    };
    source?: string;
    sourceImage?: string;
    sourceFigure?: string;
    note?: string;
    proofread?: boolean;
  }>;
  researchPapers?: ResearchPaper[];
  lastUpdated?: string;  // ISO date string, e.g. "2026-04-06"
  addgene?: {
    id: string;
    url: string;
    note?: string;         // optional caveat, e.g. when the only deposited plasmid is a variant/derivative of this GEVI rather than the exact construct
    proofread?: boolean;
  };
  paperCount?: number;    // computed at runtime from researchPapers.length
}

export interface ResearchPaper {
  title: string;
  journal: string;
  year?: number;
  authors: string;
  sample?: string;
  dye?: string;
  url: string;
  applications?: string[];
  proofread?: boolean;
}

export interface GEVIColor {
  color: string;
  label: string;
}

export type SortField =
  | 'name'
  | 'year'
  | 'paperCount'
  | 'bRel'
  | 'peakEx'
  | 'displayTauOn'
  | 'displayTauOff'
  | 'displayTauSum'
  | 'displayDynamicRange'
  | 'displaySubthreshold'
  | 'displaySensitivity'
  | 'displayApWidth'
  | 'displayPhotostab'
  | 'displayT75';

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export type ViewTab = 'database' | 'contact' | 'tools';

export type MobileView = 'list' | 'detail';

// Family Tree Types
export interface TreeNode {
  name: string;
  year?: number;
  children?: Record<string, TreeNode>;
  geviId?: string;
  isFork?: boolean;  // invisible Y-fork node grouping siblings
}
