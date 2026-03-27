// GEVI Data Manager
// Provides unified access to GEVI data from modular JSON files in src/gevis/

import type { GEVI } from './types';

// Cache for loaded GEVIs
let geviCache: GEVI[] | null = null;

function average(scores: number[]): number {
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Parse a temperature string like "33-34°C", "22°C", "25°C" into a numeric °C value.
// Returns null if unparseable or not provided.
function parseTemperature(temp?: string): number | null {
  if (!temp) return null;
  // Match patterns like "33-34°C" (take midpoint), "22°C", "37 °C"
  const rangeMatch = temp.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  const singleMatch = temp.match(/([\d.]+)/);
  if (singleMatch) return parseFloat(singleMatch[1]);
  return null;
}

// Speed: max(0, min(100, 63.6 × log₁₀(30 / τ_sum)))
// Temperature selection: prefer entries ≥33°C; if none, use entry closest to 33°C;
// if no temperature data at all, average all entries.
function computeSpeed(gevi: GEVI): number | null {
  if (!gevi.kinetics || gevi.kinetics.length === 0) return null;

  // Separate entries by temperature availability
  const withTemp = gevi.kinetics.filter(k => parseTemperature(k.temperature) !== null);
  const withoutTemp = gevi.kinetics.filter(k => parseTemperature(k.temperature) === null);

  let selected: typeof gevi.kinetics;
  if (withTemp.length > 0) {
    // Filter to entries ≥33°C
    const warm = withTemp.filter(k => parseTemperature(k.temperature)! >= 33);
    if (warm.length > 0) {
      selected = warm;
    } else {
      // No entries ≥33°C: pick the one closest to 33°C
      const sorted = [...withTemp].sort((a, b) =>
        Math.abs(parseTemperature(a.temperature)! - 33) - Math.abs(parseTemperature(b.temperature)! - 33)
      );
      selected = [sorted[0]];
    }
  } else {
    // No temperature data at all: use all entries
    selected = withoutTemp;
  }

  const scores = selected.map(({ on, off }) => {
    const tauSum = on + off;
    if (tauSum <= 0) return null;
    return Math.max(0, Math.min(100, Math.round(63.6 * Math.log10(30 / tauSum))));
  }).filter((s): s is number => s !== null);
  return scores.length > 0 ? average(scores) : null;
}

// Dynamic Range: score = max(0, min(100, 83.33 × log₁₀(|ΔF/F|) − 66.66))
// Calibration: 25% → 50, 50% → 75, 100% → 100
function computeDynamicRange(gevi: GEVI): number | null {
  if (!gevi.dynamicRangeData || gevi.dynamicRangeData.length === 0) return null;
  const scores = gevi.dynamicRangeData.map(({ deltaF }) => {
    const absDF = Math.abs(deltaF);
    if (absDF <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round(83.33 * Math.log10(absDF) - 66.66)));
  });
  return average(scores);
}

// Sensitivity (ΔF/F per AP): max(0, min(100, 66.4 × log₁₀(|ΔF/F|%) − 32.8))
// Calibration: 25% → 60, 50% → 80, 100% → 100
function computeSensitivity(gevi: GEVI): number | null {
  if (!gevi.sensitivityData || gevi.sensitivityData.length === 0) return null;
  const scores = gevi.sensitivityData.map(({ deltaF }) => {
    const absDF = Math.abs(deltaF);
    if (absDF <= 0) return null;
    return Math.max(0, Math.min(100, Math.round(66.4 * Math.log10(absDF) - 32.8)));
  }).filter((s): s is number => s !== null);
  return scores.length > 0 ? average(scores) : null;
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

// Brightness: max(0, min(100, 25 × log₁₀(B_rel) + 60)) where B_rel is ratio vs EGFP.
// B_rel is resolved via graph traversal through all brightness comparisons.
function computeBrightness(gevi: GEVI, bRelMap: Map<string, number>): number | null {
  const bRel = bRelMap.get(gevi.id);
  if (bRel === undefined || bRel <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(25 * Math.log10(bRel) + 60)));
}

// Photostability: normalize to standard condition (100 mW/mm², 1 min).
// First-order bleaching model: F(t) = exp(-k·t·P), k = -ln(F) / (t·P)
//   F_std = exp(-k · 100 · 1) = exp(100 · ln(F_remaining) / (t · P))
//         = F_remaining ^ (100 / (t · P))
// If multiple measurements, select the one with duration closest to 1 min,
// breaking ties by intensity closest to 10 mW/mm².
function photostabilityScore(brightnessRemaining: number, illumination: string, duration: string): number {
  const fRemaining = brightnessRemaining / 100;
  const powerMatch = illumination.match(/([\d.]+)\s*mW\/mm[²2]/);
  const power = powerMatch ? parseFloat(powerMatch[1]) : 100;
  let minutes = 1;
  const minMatch = duration.match(/([\d.]+)\s*min/);
  const secMatch = duration.match(/([\d.]+)\s*s\b/i);
  if (minMatch) minutes = parseFloat(minMatch[1]);
  else if (secMatch) minutes = parseFloat(secMatch[1]) / 60;
  const exponent = 100 / (minutes * power);
  return Math.min(100, Math.round(Math.pow(fRemaining, exponent) * 100));
}

function computePhotostability(gevi: GEVI): number | null {
  // Bioluminescent GEVIs have no photobleaching — score 100
  if (gevi.photostabilityData === 'bioluminescent') return 100;
  if (!gevi.photostabilityData || !Array.isArray(gevi.photostabilityData) || gevi.photostabilityData.length === 0) return null;

  const withParsed = gevi.photostabilityData.map(entry => {
    const powerMatch = entry.illumination.match(/([\d.]+)\s*mW\/mm[²2]/);
    const power = powerMatch ? parseFloat(powerMatch[1]) : 100;
    let minutes = 1;
    const minMatch = entry.duration.match(/([\d.]+)\s*min/);
    const secMatch = entry.duration.match(/([\d.]+)\s*s\b/i);
    if (minMatch) minutes = parseFloat(minMatch[1]);
    else if (secMatch) minutes = parseFloat(secMatch[1]) / 60;
    return { entry, minutes, power };
  });

  // Pick the entry closest to 1 min, breaking ties by closest to 10 mW/mm²
  withParsed.sort((a, b) => {
    const dDuration = Math.abs(a.minutes - 1) - Math.abs(b.minutes - 1);
    if (dDuration !== 0) return dDuration;
    return Math.abs(a.power - 10) - Math.abs(b.power - 10);
  });

  const { entry } = withParsed[0];
  return photostabilityScore(entry.brightnessRemaining, entry.illumination, entry.duration);
}

// Compute all derived scores from raw data fields, then compute overall.
// Weights: Speed 20%, Dynamic Range 20%, Brightness 20%, Sensitivity 15%, Photostability 15%, Popularity 10%
// Null scores are excluded and remaining weights are normalized proportionally.
function computeScores(gevi: GEVI, bRelMap: Map<string, number>) {
  const speed          = computeSpeed(gevi);
  const dynamicRange   = computeDynamicRange(gevi);
  const sensitivity    = computeSensitivity(gevi);
  const brightness     = computeBrightness(gevi, bRelMap);
  const photostability = computePhotostability(gevi);
  const paperCount     = gevi.researchPapers?.length ?? 0;
  const popularity     = Math.min(100, 50 * Math.log10(paperCount + 1));

  const components: { value: number | null; weight: number }[] = [
    { value: speed,          weight: 0.20 },
    { value: dynamicRange,   weight: 0.20 },
    { value: brightness,     weight: 0.20 },
    { value: sensitivity,    weight: 0.15 },
    { value: photostability, weight: 0.15 },
    { value: popularity,     weight: 0.10 },
  ];

  const performanceScores = [speed, dynamicRange, sensitivity, brightness, photostability];
  const hasAllPerformanceScores = performanceScores.every(v => v !== null && v !== undefined);

  let overall: number | null = null;
  if (hasAllPerformanceScores) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const { value, weight } of components) {
      if (value !== null && value !== undefined) {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }

    const tags = Array.isArray(gevi.tags) ? gevi.tags : [];
    let bonus = 0;
    if (tags.some(t => t.toLowerCase().includes('far-red') || t.toLowerCase().includes('red') || t.toLowerCase().includes('nir')) ||
        gevi.voltage?.type === 'chemi') bonus += 3;
    if (gevi.twoPhoton?.some(tp => tp.compatible)) bonus += 3;
    if (tags.some(t => t.toLowerCase().includes('positive')) || gevi.dynamicRangeData?.[0]?.sign === 'positive') bonus += 3;

    // Penalty: -10 for first performance score below 10, capped at -15 total
    const lowCount = performanceScores.filter(s => s !== null && s !== undefined && s < 10).length;
    const penalty = lowCount === 0 ? 0 : lowCount === 1 ? -10 : -15;

    overall = totalWeight > 0 ? Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight) + bonus + penalty)) : null;
  }
  return { speed, dynamicRange, sensitivity, brightness, photostability, overall, paperCount, popularity: Math.round(popularity) };
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

  // Build B_rel map across all GEVIs before scoring (enables graph traversal for brightness)
  const bRelMap = buildBrelMap(rawGevis);

  geviCache = rawGevis.map(gevi => ({ ...gevi, ...computeScores(gevi, bRelMap) }));
  return geviCache;
}
