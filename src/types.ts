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
