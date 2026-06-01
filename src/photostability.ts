export const STANDARD_PHOTOSTABILITY_DURATION_MINUTES = 1;
export const STANDARD_PHOTOSTABILITY_POWER_MW_PER_MM2 = 100;

export interface PhotostabilityEntryLike {
  brightnessRemaining: number | null;
  illumination: string;
  duration: string;
}

const POWER_SCALES_TO_MW: Record<string, number> = {
  uw: 0.001,
  'µw': 0.001,
  'μw': 0.001,
  mw: 1,
  w: 1000,
};

const AREA_SCALES_TO_MM2: Record<string, number> = {
  mm: 1,
  cm: 100,
};

export function parseIlluminationMwPerMm2(illumination: string): number | null {
  const matches = [...illumination.matchAll(/([\d.]+)\s*(uW|µW|μW|mW|W)\s*\/\s*(mm|cm)\s*(?:\^?2|²)/gi)];
  if (matches.length !== 1) return null;

  const [, rawValue, rawPowerUnit, rawAreaUnit] = matches[0];
  const value = Number.parseFloat(rawValue);
  const powerScale = POWER_SCALES_TO_MW[rawPowerUnit.toLowerCase()];
  const areaScale = AREA_SCALES_TO_MM2[rawAreaUnit.toLowerCase()];
  if (!Number.isFinite(value) || powerScale === undefined || areaScale === undefined) return null;

  return (value * powerScale) / areaScale;
}

export function parseDurationMinutes(duration: string): number | null {
  const minMatch = duration.match(/([\d.]+)\s*(?:min|mins|minute|minutes)\b/i);
  if (minMatch) return Number.parseFloat(minMatch[1]);

  const secMatch = duration.match(/([\d.]+)\s*(?:s|sec|secs|second|seconds)\b/i);
  if (secMatch) return Number.parseFloat(secMatch[1]) / 60;

  return null;
}

export function normalizePhotostability(entry: PhotostabilityEntryLike): number | null {
  const remaining = entry.brightnessRemaining;
  if (remaining === null || remaining <= 0 || remaining > 100) return null;

  const power = parseIlluminationMwPerMm2(entry.illumination);
  const minutes = parseDurationMinutes(entry.duration);
  if (power === null || power <= 0 || minutes === null || minutes <= 0) return null;

  const fRemaining = remaining / 100;
  const standardDose = STANDARD_PHOTOSTABILITY_DURATION_MINUTES * STANDARD_PHOTOSTABILITY_POWER_MW_PER_MM2;
  const observedDose = minutes * power;
  return Math.min(100, Math.pow(fRemaining, standardDose / observedDose) * 100);
}

export function estimateBleachTauAt1MwPerMm2Ms(entry: PhotostabilityEntryLike): number | null {
  const remaining = entry.brightnessRemaining;
  if (remaining === null || remaining <= 0 || remaining >= 100) return null;

  const power = parseIlluminationMwPerMm2(entry.illumination);
  const minutes = parseDurationMinutes(entry.duration);
  if (power === null || power <= 0 || minutes === null || minutes <= 0) return null;

  const durationMs = minutes * 60 * 1000;
  const tauAtMeasuredPower = -durationMs / Math.log(remaining / 100);
  return tauAtMeasuredPower * power;
}
