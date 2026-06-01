// GEVI Data Manager
// Provides unified access to GEVI data from modular JSON files in src/gevis/

import type { GEVI } from './types';
import geviGitDates from 'virtual:gevi-git-dates';
import { normalizePhotostability } from './photostability';

// Cache for loaded GEVIs
let geviCache: GEVI[] | null = null;

// Parse a temperature string like "33-34°C", "22°C", "25°C" into a numeric °C value.
// Returns null if unparseable or not provided.
function parseTemperature(temp?: string): number | null {
  if (!temp) return null;
  const rangeMatch = temp.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  const singleMatch = temp.match(/([\d.]+)/);
  if (singleMatch) return parseFloat(singleMatch[1]);
  return null;
}

// Build B_rel map via BFS from EGFP through the brightness comparison graph.
// Each brightnessData entry { ratio, reference } in GEVI A encodes: B_rel(A) = ratio × B_rel(reference).
// Edges are bidirectional: the reverse also holds (B_rel(reference) = B_rel(A) / ratio).
// When multiple paths reach a node, estimates are averaged via geometric mean.
function buildBrelMap(gevis: GEVI[]): Map<string, number> {
  // Build adjacency list: edges[from] = [{ to, factor }] where B_rel(to) = factor × B_rel(from)
  const edges = new Map<string, { to: string; factor: number }[]>();
  const addEdge = (from: string, to: string, factor: number) => {
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from)!.push({ to, factor });
  };

  for (const gevi of gevis) {
    if (!gevi.brightnessData) continue;
    for (const { ratio, reference } of gevi.brightnessData) {
      if (ratio <= 0) continue;
      // B_rel(gevi.id) = ratio × B_rel(reference)
      addEdge(reference, gevi.id, ratio);       // forward: knowing reference → compute gevi.id
      addEdge(gevi.id, reference, 1 / ratio);   // reverse: knowing gevi.id → compute reference
    }
  }

  // BFS from EGFP; collect all estimates per node and resolve with geometric mean.
  // Track each node's discoverer to prevent redundant back-propagation (child → parent).
  const logEstimates = new Map<string, number[]>([['EGFP', [0]]]);
  const discoveredBy = new Map<string, string>();  // child → parent that first discovered it
  const queue: string[] = ['EGFP'];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const logNode = logEstimates.get(node)!.reduce((a, b) => a + b, 0) / logEstimates.get(node)!.length;
    for (const { to, factor } of edges.get(node) ?? []) {
      // Skip back-propagation to the node that discovered this one
      if (discoveredBy.get(node) === to) continue;
      const logTo = logNode + Math.log(factor);
      if (!logEstimates.has(to)) {
        logEstimates.set(to, [logTo]);
        discoveredBy.set(to, node);
        queue.push(to);
      } else {
        logEstimates.get(to)!.push(logTo);
      }
    }
  }

  const resolved = new Map<string, number>();
  for (const [id, logs] of logEstimates) {
    resolved.set(id, Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length));
  }
  return resolved;
}

// Select the kinetics entry set matching the temperature preference:
// prefer entries ≥33°C; else closest to 33°C; else all entries.
// Returns average (on, off) across selected entries.
function selectBestKinetics(gevi: GEVI): { on: number; off: number } | null {
  if (!gevi.kinetics || gevi.kinetics.length === 0) return null;
  const withTemp = gevi.kinetics.filter(k => parseTemperature(k.temperature) !== null);
  const withoutTemp = gevi.kinetics.filter(k => parseTemperature(k.temperature) === null);
  let selected: typeof gevi.kinetics;
  if (withTemp.length > 0) {
    const warm = withTemp.filter(k => parseTemperature(k.temperature)! >= 33);
    if (warm.length > 0) {
      selected = warm;
    } else {
      const sorted = [...withTemp].sort((a, b) =>
        Math.abs(parseTemperature(a.temperature)! - 33) - Math.abs(parseTemperature(b.temperature)! - 33)
      );
      selected = [sorted[0]];
    }
  } else {
    selected = withoutTemp;
  }
  if (selected.length === 0) return null;
  const avgOn = selected.reduce((s, k) => s + k.on, 0) / selected.length;
  const avgOff = selected.reduce((s, k) => s + k.off, 0) / selected.length;
  return { on: avgOn, off: avgOff };
}

// Compute raw derived values used for display + sorting in the scoreless UI.
// No 0-100 score mapping — these are measured quantities.
function computeDisplayValues(gevi: GEVI, bRelMap: Map<string, number>) {
  const bRel = bRelMap.get(gevi.id) ?? null;
  const bestKinetics = selectBestKinetics(gevi);
  const displayTauOn = bestKinetics?.on ?? null;
  const displayTauOff = bestKinetics?.off ?? null;
  const displayTauSum = bestKinetics ? bestKinetics.on + bestKinetics.off : null;

  const drEntries = (gevi.dynamicRangeData ?? []).map(d => Math.abs(d.deltaF)).filter(v => v > 0);
  const displayDynamicRange = median(drEntries);

  const sensEntries = (gevi.sensitivityData ?? []).map(d => Math.abs(d.deltaF)).filter(v => v > 0);
  const displaySensitivity = median(sensEntries);

  let displayPhotostab: number | null;
  if (gevi.photostabilityData === 'bioluminescent') {
    displayPhotostab = 100;
  } else if (Array.isArray(gevi.photostabilityData) && gevi.photostabilityData.length > 0) {
    const normalized = gevi.photostabilityData.map(normalizePhotostability).filter((v): v is number => v !== null && v > 0);
    displayPhotostab = median(normalized);
  } else {
    displayPhotostab = null;
  }

  const paperCount = gevi.researchPapers?.length ?? 0;

  return { bRel, displayTauOn, displayTauOff, displayTauSum, displayDynamicRange, displaySensitivity, displayPhotostab, paperCount };
}

// Load all GEVIs from modular files (synchronous, uses eager import)
export function getAllGEVIs(): GEVI[] {
  if (geviCache) return geviCache;

  const modules = import.meta.glob('./gevis/*.json', { eager: true });
  const rawGevis: GEVI[] = [];

  for (const path in modules) {
    const imported = modules[path] as Record<string, unknown>;
    if (!imported?.id) continue;

    // Copy so we can normalize legacy single-object fields to arrays
    const raw = { ...imported };
    const normalize = (key: string) => {
      const val = raw[key];
      if (val && !Array.isArray(val) && typeof val !== 'string') raw[key] = [val];
    };
    normalize('kinetics');
    normalize('dynamicRangeData');
    normalize('sensitivityData');
    normalize('photostabilityData');

    rawGevis.push(raw as unknown as GEVI);
  }

  // Augment brightnessData with reverse comparisons from other GEVIs.
  // If GEVI B has { ratio, reference: A }, then A should also show { ratio: 1/ratio, reference: B }.
  // This ensures both sides of a comparison are visible on each GEVI's detail page.
  const reverseEntries = new Map<string, { ratio: number; reference: string; source: string; sourceFigure?: string }[]>();
  for (const gevi of rawGevis) {
    if (!gevi.brightnessData) continue;
    for (const entry of gevi.brightnessData) {
      if (entry.ratio <= 0) continue;
      if (!reverseEntries.has(entry.reference)) reverseEntries.set(entry.reference, []);
      reverseEntries.get(entry.reference)!.push({
        ratio: 1 / entry.ratio,
        reference: gevi.id,
        source: entry.source,
        ...(entry.sourceFigure && { sourceFigure: entry.sourceFigure }),
      });
    }
  }
  for (const gevi of rawGevis) {
    const extras = reverseEntries.get(gevi.id);
    if (!extras?.length) continue;
    const existingRefs = new Set((gevi.brightnessData ?? []).map(e => e.reference));
    const newEntries = extras.filter(e => !existingRefs.has(e.reference));
    if (newEntries.length > 0) {
      gevi.brightnessData = [...(gevi.brightnessData ?? []), ...newEntries];
    }
  }

  // Build B_rel map across all GEVIs before scoring (enables graph traversal for brightness)
  const bRelMap = buildBrelMap(rawGevis);

  geviCache = rawGevis.map(gevi => ({
    ...gevi,
    lastUpdated: (geviGitDates as Record<string, string>)[gevi.id] || undefined,
    ...computeDisplayValues(gevi, bRelMap),
  }));
  return geviCache;
}

// ============================================================================
// Distribution radar — raw-data axes for the scoreless DistributionRadar chart.
// Each axis exposes the representative raw value per GEVI plus the per-GEVI
// array of all raw entries for the current GEVI's "stars".
// ============================================================================

export type DistributionAxisKey = 'tauOn' | 'tauOff' | 'dynamicRange' | 'sensitivity' | 'brightness' | 'photostability' | 'kinetics' | 'nUsed';

export interface DistributionAxisSpec {
  key: DistributionAxisKey;
  label: string;
  unit: string;
  invert: boolean;  // true → smaller raw is "better" (outer); only speed
}

export interface AxisDistribution {
  spec: DistributionAxisSpec;
  min: number;  // min raw value across population (excluding nulls)
  max: number;  // max raw value across population
  repValues: Map<string, number>;  // geviId → representative raw value for the backdrop
}

export const DISTRIBUTION_AXES: DistributionAxisSpec[] = [
  { key: 'tauOn',          label: 'τ_on',         unit: 'ms',            invert: true },
  { key: 'dynamicRange',   label: 'Dyn. Range',   unit: '% ΔF/F',        invert: false },
  { key: 'sensitivity',    label: 'Sensitivity',  unit: '% ΔF/F per AP', invert: false },
  { key: 'brightness',     label: 'Brightness',   unit: '× EGFP',        invert: false },
  { key: 'photostability', label: 'Photostab.',   unit: '%/min @100mW',  invert: false },
  { key: 'tauOff',         label: 'τ_off',        unit: 'ms',            invert: true },
];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// All raw entries for a single GEVI on a single axis (used for "stars" of the current GEVI).
export function getRawEntriesForGEVI(gevi: GEVI, key: DistributionAxisKey): number[] {
  switch (key) {
    case 'tauOn':
      return (gevi.kinetics ?? []).map(k => k.on).filter(v => v > 0);
    case 'tauOff':
      return (gevi.kinetics ?? []).map(k => k.off).filter(v => v > 0);
    case 'dynamicRange':
      return (gevi.dynamicRangeData ?? []).map(d => Math.abs(d.deltaF)).filter(v => v > 0);
    case 'sensitivity':
      return (gevi.sensitivityData ?? []).map(d => Math.abs(d.deltaF)).filter(v => v > 0);
    case 'brightness': {
      const b = gevi.bRel;
      return (b !== null && b !== undefined && b > 0) ? [b] : [];
    }
    case 'photostability': {
      if (gevi.photostabilityData === 'bioluminescent') return [100];
      if (!Array.isArray(gevi.photostabilityData)) return [];
      return gevi.photostabilityData.map(normalizePhotostability).filter((v): v is number => v !== null && v > 0);
    }
    // Combined τ_on + τ_off per kinetics entry — the radar's "speed" axis on
    // main collapses on/off into a single dimension so the polygon doesn't
    // double-count kinetics. Display tiles still show on / off separately.
    case 'kinetics':
      return (gevi.kinetics ?? []).map(k => k.on + k.off).filter(v => v > 0);
    // Independent papers that used the sensor. Single scalar per GEVI (no
    // distribution); the radar renders it as a point at the count's radius
    // on the log axis.
    case 'nUsed': {
      const n = gevi.researchPapers?.length ?? 0;
      return n > 0 ? [n] : [];
    }
  }
}

// Representative value per GEVI for the population backdrop.
// Speed uses temperature-preferred selection; others use median of raw entries.
function getRepresentativeValue(gevi: GEVI, key: DistributionAxisKey): number | null {
  if (key === 'tauOn' || key === 'tauOff') {
    const best = selectBestKinetics(gevi);
    if (!best) return null;
    const v = key === 'tauOn' ? best.on : best.off;
    return v > 0 ? v : null;
  }
  return median(getRawEntriesForGEVI(gevi, key));
}

// Build per-axis distribution across all GEVIs. Call once, pass to DistributionRadar.
let axisDistributionCache: AxisDistribution[] | null = null;
export function getAxisDistributions(): AxisDistribution[] {
  if (axisDistributionCache) return axisDistributionCache;
  const gevis = getAllGEVIs();
  axisDistributionCache = DISTRIBUTION_AXES.map(spec => {
    const repValues = new Map<string, number>();
    for (const gevi of gevis) {
      const v = getRepresentativeValue(gevi, spec.key);
      if (v !== null && v > 0) repValues.set(gevi.id, v);
    }
    const all = [...repValues.values()];
    return { spec, min: Math.min(...all), max: Math.max(...all), repValues };
  });
  return axisDistributionCache;
}

// Manual citations for reference papers (fluorophores, tools) not in any GEVI's researchPapers
const MANUAL_CITATIONS: Record<string, string> = {
  '10.1038/nmeth.2413': 'Shaner 2013',
};

// Build DOI -> "LastName Year" citation map from all researchPapers
let citationCache: Record<string, string> | null = null;
export function getDoiCitationMap(): Record<string, string> {
  if (citationCache) return citationCache;
  const gevis = getAllGEVIs();
  const map: Record<string, string> = { ...MANUAL_CITATIONS };
  for (const gevi of gevis) {
    for (const rp of gevi.researchPapers ?? []) {
      if (!rp.url) continue;
      const m = rp.url.match(/doi\.org\/(10\..+)/);
      if (!m) continue;
      const doi = m[1];
      if (map[doi]) continue;
      const authors = rp.authors ?? '';
      const first = authors.split(',')[0].split(' and ')[0].trim();
      const parts = first.split(/\s+/);
      const lastName = parts[0] || '';
      if (lastName && rp.year) map[doi] = `${lastName} ${rp.year}`;
    }
  }
  citationCache = map;
  return map;
}
