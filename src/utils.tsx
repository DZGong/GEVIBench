import { COLORS } from './constants';
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

// Color mapping for family tree nodes — category-based for visual differentiation
export function getTreeNodeColor(gevi: { name: string; tags?: string[]; category?: string }): string {
  const tags = Array.isArray(gevi.tags) ? gevi.tags : [];
  const category = gevi.category || '';
  const name = gevi.name.toLowerCase();

  if (category.includes('Chemigenetic') || tags.includes('HaloTag') || name.includes('voltron') || name.includes('positron')) return '#d500f9';
  if (category.includes('Bioluminescent') || tags.includes('Luciferase')) return COLORS.yellow;
  if (tags.includes('Green') || category.includes('VSD-cpGFP') || category.includes('VSD-single')) return COLORS.green;
  if (tags.includes('Yellow') || tags.includes('cpYFP')) return COLORS.yellow;
  if (tags.includes('Orange')) return COLORS.orange;
  if (tags.includes('Red') || tags.includes('RFP')) return COLORS.red;
  if (tags.includes('Far-red') || category.includes('Red FP GEVI')) return COLORS.farRed;
  if (tags.includes('NIR') || tags.includes('Near-infrared')) return COLORS.nir;
  if (category.includes('Opsin') || tags.includes('Archaerhodopsin') || tags.includes('Proteorhodopsin')) return COLORS.farRed;
  if (category.includes('FRET') || category.includes('eFRET')) return COLORS.green;
  if (category.includes('Ion-channel')) return COLORS.green;
  return COLORS.gray;
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
