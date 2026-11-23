import type { GEVI } from './types';

// Species a GEVI has been used in, derived from the free-text `sample` fields
// (research papers + the sensor's own measurement entries). Immortalized cell
// lines (HEK, CHO, PC12, HeLa, ...) are deliberately not mapped to a species:
// the filter answers "has this sensor been used in <model organism>?".
export const SPECIES: { name: string; pattern: RegExp }[] = [
  { name: 'Mouse',      pattern: /\b(mouse|mice|murine)\b/i },
  { name: 'Rat',        pattern: /\brats?\b/i },
  { name: 'Human',      pattern: /\b(human|hiPSCs?|hPSCs?)\b|\bhiPSC-/i },
  { name: 'Zebrafish',  pattern: /\bzebrafish\b/i },
  { name: 'Drosophila', pattern: /\b(drosophila|flies|fly)\b/i },
  { name: 'C. elegans', pattern: /\bC\.\s?elegans\b/i },
  { name: 'Xenopus',    pattern: /\bxenopus\b/i },
  { name: 'Plants',     pattern: /\b(arabidopsis|nicotiana)\b/i },
  { name: 'Yeast',      pattern: /\b(saccharomyces|yeast)\b/i },
  { name: 'Bacteria',   pattern: /\b(E\.\s?coli|bacteria)\b/i },
];

// "Human cell lines", "Human, HEK293T cells", human cancer lines: cell lines,
// not human tissue. A bare "iPSC" is not enough (mouse iPSCs exist).
const HUMAN_CELL_LINE = /\bhuman,? (cell lines?|colon|prostate|cancer|HEK)/i;

function sampleStrings(g: GEVI): string[] {
  const out: string[] = [];
  const push = (s: unknown) => { if (typeof s === 'string' && s) out.push(s); };
  for (const p of g.researchPapers ?? []) push(p.sample);
  for (const value of Object.values(g as unknown as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && !('title' in entry)) {
          push((entry as { sample?: unknown }).sample);
        }
      }
    }
  }
  return out;
}

export function speciesFromSample(sample: string): string[] {
  return SPECIES.filter(({ name, pattern }) => {
    if (!pattern.test(sample)) return false;
    if (name === 'Human') {
      const stripped = sample.replace(HUMAN_CELL_LINE, '');
      return pattern.test(stripped);
    }
    return true;
  }).map(s => s.name);
}

const cache = new WeakMap<GEVI, Set<string>>();

export function getSpecies(g: GEVI): Set<string> {
  let set = cache.get(g);
  if (!set) {
    set = new Set(sampleStrings(g).flatMap(speciesFromSample));
    cache.set(g, set);
  }
  return set;
}
