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
    source: string;
    sourceFigure?: string;
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
  displaySensitivity?: number | null;    // median |ΔF/F| per AP across entries
  displayPhotostab?: number | null;      // normalized % remaining @ 100 mW/mm², 1 min
  description: string;
  familyTreePath?: string[] | null;
  parentId?: string;
  siblingId?: string;  // geviId of a sibling (same parent, same paper) — renders as Y-fork in tree
  crossBranchParentId?: string;  // geviId of a parent in a different branch
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
  researchPapers?: ResearchPaper[];
  lastUpdated?: string;  // ISO date string, e.g. "2026-04-06"
  addgene?: {
    id: string;
    url: string;
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
  | 'displaySensitivity'
  | 'displayPhotostab';

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
