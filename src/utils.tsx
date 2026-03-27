import type { GEVIColor, ResearchPaper } from './types';

// Canonical sample categories for organism usage bar chart
export const SAMPLE_CATEGORY_ORDER = ['Rodent', 'Fly', 'Fish', 'C. elegans', 'Cell culture', 'Other'];

const SAMPLE_CATEGORIES: { label: string; keywords: string[] }[] = [
  { label: 'Rodent',       keywords: ['mouse', 'mice', 'rat', 'murine'] },
  { label: 'Fly',          keywords: ['drosophila', 'fly', 'flies'] },
  { label: 'Fish',         keywords: ['zebrafish', 'fish'] },
  { label: 'C. elegans',   keywords: ['elegans', 'caenorhabditis', 'worm'] },
  { label: 'Cell culture', keywords: ['hek', 'hela', 'ipsc', 'ips-c', 'mcf', 'cos-7', 'a375', 'melanoma', 'cell line'] },
];

export function computeSampleSummary(researchPapers?: ResearchPaper[]): Record<string, number> {
  if (!researchPapers?.length) return {};
  const counts: Record<string, number> = {};
  for (const paper of researchPapers) {
    if (!paper.sample) continue;
    const s = paper.sample.toLowerCase();
    const matched = new Set<string>();
    for (const { label, keywords } of SAMPLE_CATEGORIES) {
      if (keywords.some(kw => s.includes(kw))) matched.add(label);
    }
    if (matched.size === 0) matched.add('Other');
    for (const label of matched) counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

// Unified color for GEVI titles across the UI
export const getGEVIColor = (_gevi: { tags?: string[]; category?: string; name: string }): GEVIColor => {
  return { color: '#002FA7', label: '' };
};

// Convert a wavelength (nm) to an approximate visible color
export function wavelengthToColor(nm: number): string {
  let r = 0, g = 0, b = 0;
  if      (nm < 380)             { r = 0.5; g = 0;   b = 0.8; }
  else if (nm < 440)             { r = (440 - nm) / 60; g = 0; b = 1; }
  else if (nm < 490)             { r = 0; g = (nm - 440) / 50; b = 1; }
  else if (nm < 510)             { r = 0; g = 1; b = (510 - nm) / 20; }
  else if (nm < 580)             { r = (nm - 510) / 70; g = 1; b = 0; }
  else if (nm < 645)             { r = 1; g = (645 - nm) / 65; b = 0; }
  else if (nm <= 750)            { r = 1; g = 0; b = 0; }
  else                           { r = 0.6; g = 0; b = 0; }

  let factor = 1;
  if      (nm >= 380 && nm < 420) factor = 0.4 + 0.6 * (nm - 380) / 40;
  else if (nm > 700 && nm <= 750) factor = 0.4 + 0.6 * (750 - nm) / 50;

  const R = Math.round(255 * Math.min(1, r) * factor);
  const G = Math.round(255 * Math.min(1, g) * factor);
  const B = Math.round(255 * Math.min(1, b) * factor);
  return `rgb(${R},${G},${B})`;
}

// Color mapping for family tree nodes — derived from emission peak wavelength
export function getTreeNodeColor(gevi: { name: string; tags?: string[]; category?: string; spectrum?: { peakEm?: number; type?: string } }): string {
  const category = gevi.category || '';
  // Chemigenetic GEVIs use synthetic dyes — no intrinsic FP color
  if (category.includes('Chemigenetic') || gevi.spectrum?.type === 'chemi') return '#d500f9';
  if (gevi.spectrum?.peakEm) {
    return wavelengthToColor(gevi.spectrum.peakEm);
  }
  return '#6b7280';
}

export function RainbowText({ text }: { text: string }) {
  return (
    <span
      style={{
        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}
