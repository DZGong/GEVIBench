// GEVI TypeScript Interfaces

export interface GEVI {
  id: string;
  name: string;
  year: number;
  category: string;
  tags: string[];
  paper: string;
  paperUrl: string;
  brightness: number;
  speed: number;
  snr: number;
  dynamicRange: number;
  photostability: number;
  subthreshold: number;
  overall: number;
  description: string;
  // Modular: Family tree path for lineage visualization
  familyTreePath?: string[];
  // Modular: Reference to spectrum data (embedded directly)
  spectrum?: {
    type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp';
    peakEx: number;
    peakEm: number;
    name: string;
    // Optional custom measured spectrum data
    custom?: {
      minEx: number;
      excitation: number[];
      minEm: number;
      emission: number[];
    };
  };
  // Modular: Voltage response data (embedded directly)
  voltage?: {
    type: 'opsin' | 'fp' | 'fret' | 'red' | 'chemi';
    slope: number;
    polarity: 'positive' | 'negative';
    name: string;
    // Optional custom measured voltage data
    custom?: {
      voltage: number[];
      deltaF: number[];
    };
  };
  researchPapers?: ResearchPaper[];
  addgene?: {
    id: string;
    url: string;
  };
  kinetics?: {
    on: number;
    off: number;
    temperature: string;
  };
  dynamicRangeData?: {
    deltaF: number;
    sign: 'positive' | 'negative';
  };
  photostabilityData?: {
    brightnessRemaining: number;
    illumination: string;
    duration: string;
  };
  paperCount?: number;
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

export type SortField = 'overall' | 'brightness' | 'speed' | 'snr' | 'dynamicRange' | 'photostability' | 'paperCount' | 'year';

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
}

export interface FamilyTreeData {
  tree: Record<string, TreeNode>;
  geviPaths: Record<string, string[]>;
}

// Spectrum Data Types
export interface SpectrumPoint {
  wavelength: number;
  value: number;
}

export interface SpectrumData {
  excitation?: SpectrumPoint[];
  emission?: SpectrumPoint[];
  config?: {
    type: string;
    peakEx: number;
    peakEm: number;
    name: string;
  };
}

// Voltage Curve Data Types
export interface VoltagePoint {
  voltage: number;
  deltaF: number;
}

export interface VoltageCurveData {
  data?: VoltagePoint[];
  config?: {
    slope: number;
    polarity: 'positive' | 'negative';
    type: string;
  };
}
