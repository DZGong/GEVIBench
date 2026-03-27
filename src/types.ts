// GEVI TypeScript Interfaces

export interface GEVI {
  id: string;
  name: string;
  year: number;
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
  }[];
  dynamicRangeData?: {
    deltaF: number;
    sign: 'positive' | 'negative';
    source: string;
  }[];
  sensitivityData?: {
    deltaF: number;  // ΔF/F % per action potential
    source: string;
  }[];
  brightnessData?: {
    ratio: number;
    reference: string;
    source: string;
  }[];
  photostabilityData?: {
    brightnessRemaining: number;
    illumination: string;
    duration: string;
    source: string;
  }[] | 'bioluminescent';
  twoPhoton?: {
    compatible: boolean;
    source: string;
  }[];

  // Computed scores — derived at runtime by geviData.ts, never stored in JSON
  brightness?: number | null;
  speed?: number | null;
  sensitivity?: number | null;
  dynamicRange?: number | null;
  photostability?: number | null;
  overall?: number;
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
    custom?: {
      voltage: number[];
      deltaF: number[];
    };
    additionalCurves?: {
      name: string;
      voltage: number[];
      deltaF: number[];
    }[];
  };
  researchPapers?: ResearchPaper[];
  addgene?: {
    id: string;
    url: string;
  };
  paperCount?: number;    // computed at runtime from researchPapers.length, never stored in JSON
  popularity?: number;    // computed at runtime from paperCount, never stored in JSON
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
}

export interface GEVIColor {
  color: string;
  label: string;
}

export type SortField = 'overall' | 'brightness' | 'speed' | 'sensitivity' | 'dynamicRange' | 'photostability' | 'popularity' | 'year';

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export type ViewTab = 'database' | 'methodology' | 'contact' | 'tools';

export type MobileView = 'list' | 'detail';

// Family Tree Types
export interface TreeNode {
  name: string;
  year?: number;
  children?: Record<string, TreeNode>;
  geviId?: string;
  isFork?: boolean;  // invisible Y-fork node grouping siblings
}
