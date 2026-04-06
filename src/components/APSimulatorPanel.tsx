// AP Simulator Panel
// Simulates fluorescence response to action potentials, including shot noise from photon statistics.
// SNR = peak ΔF/F / shot-noise σ, where σ = 100% / √(photons/frame).
// Brightness enters twice: as the noise floor (shot noise) and indirectly via peakDeltaF through kinetics filtering.

import { useState, useMemo } from 'react';
import { getAllGEVIs } from '../geviData';
import type { GEVI } from '../types';

// ─── Hodgkin-Huxley Model ───────────────────────────────────────────────────
// Standard HH equations (Hodgkin & Huxley 1952, J Physiol 117:500-544)
// with temperature scaling φ = Q₁₀^((T − 6.3°C)/10) for mammalian speed.
// Modern sign convention: V_rest ≈ −65 mV, depolarization positive.

interface HHParams {
  Cm: number;   // µF/cm²  membrane capacitance
  gNa: number;  // mS/cm²  max Na⁺ conductance
  gK: number;   // mS/cm²  max K⁺ conductance
  gL: number;   // mS/cm²  leak conductance
  ENa: number;  // mV      Na⁺ reversal potential
  EK: number;   // mV      K⁺ reversal potential
  EL: number;   // mV      leak reversal potential
}

const HH_DEFAULT: HHParams = {
  Cm: 1.0, gNa: 120.0, gK: 36.0, gL: 0.3,
  ENa: 50.0, EK: -77.0, EL: -54.4,
};

// α/β rate functions (V in mV, rates in ms⁻¹)
function alphaM(V: number) { const d = V + 40; return Math.abs(d) < 1e-6 ? 1.0 : 0.1 * d / (1 - Math.exp(-d / 10)); }
function betaM(V: number)  { return 4.0 * Math.exp(-(V + 65) / 18); }
function alphaH(V: number) { return 0.07 * Math.exp(-(V + 65) / 20); }
function betaH(V: number)  { return 1.0 / (1 + Math.exp(-(V + 35) / 10)); }
function alphaN(V: number) { const d = V + 55; return Math.abs(d) < 1e-6 ? 0.1 : 0.01 * d / (1 - Math.exp(-d / 10)); }
function betaN(V: number)  { return 0.125 * Math.exp(-(V + 65) / 80); }

type HHState = { V: number; m: number; h: number; n: number };

function hhDeriv(s: HHState, I: number, phi: number, p: HHParams): HHState {
  const am = phi * alphaM(s.V), bm = phi * betaM(s.V);
  const ah = phi * alphaH(s.V), bh = phi * betaH(s.V);
  const an = phi * alphaN(s.V), bn = phi * betaN(s.V);
  const INa = p.gNa * s.m ** 3 * s.h * (s.V - p.ENa);
  const IK  = p.gK  * s.n ** 4 * (s.V - p.EK);
  const IL  = p.gL  * (s.V - p.EL);
  return {
    V: (I - INa - IK - IL) / p.Cm,
    m: am * (1 - s.m) - bm * s.m,
    h: ah * (1 - s.h) - bh * s.h,
    n: an * (1 - s.n) - bn * s.n,
  };
}

// 4th-order Runge-Kutta integrator
function hhRK4(s: HHState, I: number, phi: number, dt: number, p: HHParams): HHState {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const k1 = hhDeriv(s, I, phi, p);
  const s2 = { V: s.V + k1.V * dt / 2, m: s.m + k1.m * dt / 2, h: s.h + k1.h * dt / 2, n: s.n + k1.n * dt / 2 };
  const k2 = hhDeriv(s2, I, phi, p);
  const s3 = { V: s.V + k2.V * dt / 2, m: s.m + k2.m * dt / 2, h: s.h + k2.h * dt / 2, n: s.n + k2.n * dt / 2 };
  const k3 = hhDeriv(s3, I, phi, p);
  const s4 = { V: s.V + k3.V * dt, m: s.m + k3.m * dt, h: s.h + k3.h * dt, n: s.n + k3.n * dt };
  const k4 = hhDeriv(s4, I, phi, p);
  return {
    V: s.V + (k1.V + 2 * k2.V + 2 * k3.V + k4.V) * dt / 6,
    m: clamp(s.m + (k1.m + 2 * k2.m + 2 * k3.m + k4.m) * dt / 6),
    h: clamp(s.h + (k1.h + 2 * k2.h + 2 * k3.h + k4.h) * dt / 6),
    n: clamp(s.n + (k1.n + 2 * k2.n + 2 * k3.n + k4.n) * dt / 6),
  };
}

// Generate a single AP waveform via the HH model.
// Returns voltage array at `outDt` ms spacing, starting from stimulus onset.
interface HHAPResult {
  waveform: number[];   // V(t) at outDt spacing
  rest: number;         // mV, resting potential
  peak: number;         // mV, peak depolarization
  trough: number;       // mV, AHP minimum
  duration: number;     // ms, total AP+AHP duration
}

function generateHHAP(phi: number, stimAmp: number, stimDur: number, outDt: number, p: HHParams = HH_DEFAULT): HHAPResult {
  const dt = 0.01; // ms, fine integration step
  // Steady-state initial conditions at V₀ ≈ −65 mV
  const V0 = -65;
  const m0 = alphaM(V0) / (alphaM(V0) + betaM(V0));
  const h0 = alphaH(V0) / (alphaH(V0) + betaH(V0));
  const n0 = alphaN(V0) / (alphaN(V0) + betaN(V0));
  let s: HHState = { V: V0, m: m0, h: h0, n: n0 };

  // Settle for 10 ms to reach true resting potential
  for (let i = 0; i < Math.round(10 / dt); i++) s = hhRK4(s, 0, phi, dt, p);
  const rest = s.V;

  // Simulate with stimulus; sample at outDt
  const maxTime = 40; // ms, hard cutoff
  const waveform: number[] = [s.V];
  let peak = -Infinity, trough = Infinity;
  let t = 0, nextOut = outDt;
  let hasPeaked = false, hasTroughed = false, prevV = s.V;
  let duration = maxTime;

  while (t < maxTime) {
    const Iext = t < stimDur ? stimAmp : 0;
    s = hhRK4(s, Iext, phi, dt, p);
    t += dt;

    if (s.V > peak) peak = s.V;
    if (hasPeaked && s.V < trough) trough = s.V;
    if (!hasPeaked && s.V < prevV && prevV > 0) hasPeaked = true;
    if (hasPeaked && !hasTroughed && s.V > prevV && prevV < rest) hasTroughed = true;
    prevV = s.V;

    if (t >= nextOut) {
      waveform.push(s.V);
      nextOut += outDt;
    }

    // Stop once recovered to within 0.5 mV of rest after AHP
    if (hasTroughed && Math.abs(s.V - rest) < 0.5) {
      duration = t;
      break;
    }
  }

  if (trough === Infinity) trough = rest;
  return { waveform, rest, peak, trough, duration };
}

// ─── AP presets (HH temperature scaling) ────────────────────────────────────
const DT = 0.05;          // ms, fluorescence ODE integration step
const PRE_PAD = 3;        // ms before first AP
const POST_PAD = 10;      // ms after last AP
const STIM_AMP = 20;      // µA/cm², current injection amplitude
const STIM_DUR = 0.5;     // ms, current injection duration

const EGFP_PHOTONS_PER_MS_AT_10MW = 500;

interface APPresetConfig { label: string; phi: number; gNa: number; gK: number; gL: number; Iext: number; }

const AP_PRESETS: Record<string, APPresetConfig> = {
  fast:   { label: 'Fast',   phi: 5, gNa: 120, gK: 36, gL: 0.3, Iext: 20 },
  normal: { label: 'Normal', phi: 3, gNa: 120, gK: 36, gL: 0.3, Iext: 20 },
  slow:   { label: 'Slow',   phi: 1, gNa: 120, gK: 36, gL: 0.3, Iext: 20 },
};

// Pre-compute all AP waveforms once at module load
const PRECOMPUTED_APS: Record<string, HHAPResult> = {};
for (const [key, cfg] of Object.entries(AP_PRESETS)) {
  const p: HHParams = { ...HH_DEFAULT, gNa: cfg.gNa, gK: cfg.gK, gL: cfg.gL };
  PRECOMPUTED_APS[key] = generateHHAP(cfg.phi, cfg.Iext, STIM_DUR, DT, p);
}

// Canonical voltage references from the normal AP (for vNorm mapping in fluorescence ODE)
const V_REST = PRECOMPUTED_APS['normal'].rest;
const V_AP_PEAK = PRECOMPUTED_APS['normal'].peak;

// ─── Reference AP for calibration ───────────────────────────────────────────
// Calibrate fTargetMax so the simulation reproduces sensitivityData for a standard
// "Normal" AP. Without this, slow sensors (τ_on >> AP duration) would be doubly
// penalized: low fTarget AND slow kinetics both limiting the peak.
const REF_AP = PRECOMPUTED_APS['normal'];
const REF_VOLTAGES: number[] = [
  ...Array.from({ length: Math.ceil(PRE_PAD / DT) }, () => V_REST),
  ...REF_AP.waveform,
  ...Array.from({ length: Math.ceil(POST_PAD / DT) }, () => V_REST),
];

function computeCalibFactor(tauOn: number, tauOff: number, polarity: 'positive' | 'negative'): number {
  const sign = polarity === 'positive' ? 1 : -1;
  let f = 0;
  let peakAbs = 0;
  for (let i = 0; i < REF_VOLTAGES.length; i++) {
    const vNorm = (REF_VOLTAGES[i] - V_REST) / (V_AP_PEAK - V_REST);
    const fTarget = sign * vNorm; // unit amplitude
    const approaching = sign > 0 ? fTarget >= f : fTarget <= f;
    f += (fTarget - f) * DT / (approaching ? tauOn : tauOff);
    if (Math.abs(f) > peakAbs) peakAbs = Math.abs(f);
  }
  return peakAbs < 1e-6 ? 1 : 1 / peakAbs;
}

// ─── GEVI simulation params ──────────────────────────────────────────────────
interface SimParams {
  tauOn: number;
  tauOff: number;
  peakDeltaF: number;    // measured ΔF/F per AP (for display in SNR table)
  fTargetMax: number;    // calibrated asymptotic fTarget at V_peak — ensures simulated
                         // peak ≈ peakDeltaF for the reference Normal AP, regardless of kinetics
  polarity: 'positive' | 'negative';
  bRel: number;
  estimated: boolean;
}

function extractSimParams(gevi: GEVI): SimParams | null {
  const tauOn = gevi.displayTauOn;
  const tauOff = gevi.displayTauOff;
  if (!tauOn || !tauOff) return null;

  let peakDeltaF: number | null = null;
  let estimated = false;

  if (gevi.sensitivityData?.length) {
    peakDeltaF = Math.max(...gevi.sensitivityData.map(s => Math.abs(s.deltaF)));
  } else if (gevi.dynamicRangeData?.length) {
    // Rough estimate: a brief AP captures ~50% of the full 100mV-step response
    peakDeltaF = Math.max(...gevi.dynamicRangeData.map(d => Math.abs(d.deltaF))) * 0.5;
    estimated = true;
  }
  if (!peakDeltaF) return null;

  const polarity: 'positive' | 'negative' =
    gevi.voltage?.polarity ??
    (gevi.dynamicRangeData?.[0]?.sign === 'positive' ? 'positive' : 'negative');

  const bRel = gevi.bRel ?? 0.05;

  // Calibrate: scale fTargetMax so simulated peak = peakDeltaF on the reference Normal AP
  const calibFactor = computeCalibFactor(tauOn, tauOff, polarity);
  const fTargetMax = peakDeltaF * calibFactor;

  return { tauOn, tauOff, peakDeltaF, fTargetMax, polarity, bRel, estimated };
}

// First-order ODE: dF/dt = (F_target - F) / τ, with adaptive τ_on / τ_off
function simulateTrace(voltages: number[], params: SimParams): number[] {
  const { tauOn, tauOff, fTargetMax, polarity } = params;
  const sign = polarity === 'positive' ? 1 : -1;
  const n = voltages.length;
  const trace = new Array<number>(n);
  let f = 0;

  for (let i = 0; i < n; i++) {
    const vNorm = (voltages[i] - V_REST) / (V_AP_PEAK - V_REST);
    const fTarget = sign * fTargetMax * vNorm;
    const approaching = sign > 0 ? fTarget >= f : fTarget <= f;
    f += (fTarget - f) * DT / (approaching ? tauOn : tauOff);
    trace[i] = f;
  }
  return trace;
}

// Seeded PRNG (mulberry32) for reproducible noise across re-renders
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Average high-res trace over each imaging frame and add shot noise
function sampleWithNoise(
  trace: number[],
  frameTime: number,   // ms per frame
  photonsPerFrame: number,
  seed: number
): number[] {
  const rng = mulberry32(seed);
  const stepsPerFrame = Math.max(1, Math.round(frameTime / DT));
  const nFrames = Math.floor(trace.length / stepsPerFrame);
  const noiseSigma = 100 / Math.sqrt(Math.max(1, photonsPerFrame)); // % ΔF/F

  const sampled: number[] = [];
  for (let fr = 0; fr < nFrames; fr++) {
    let sum = 0;
    for (let s = 0; s < stepsPerFrame; s++) {
      sum += trace[fr * stepsPerFrame + s] ?? 0;
    }
    const avg = sum / stepsPerFrame;
    const u1 = Math.max(1e-10, rng());
    const u2 = rng();
    const noise = noiseSigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    sampled.push(avg + noise);
  }
  return sampled;
}

// ─── Chart colors ────────────────────────────────────────────────────────────
const TRACE_COLORS = ['#002FA7', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0891b2'];

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
}

export function APSimulatorPanel({}: Props) {
  const allGevis = useMemo(() => getAllGEVIs(), []);

  const simulatable = useMemo(() =>
    allGevis
      .filter(g => extractSimParams(g) !== null)
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)),
    [allGevis]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => simulatable.slice(0, 4).map(g => g.id)
  );
  const [apPreset, setApPreset] = useState<string | null>('normal');
  const [customGNa, setCustomGNa] = useState(AP_PRESETS.normal.gNa);
  const [customGK, setCustomGK] = useState(AP_PRESETS.normal.gK);
  const [customGL, setCustomGL] = useState(AP_PRESETS.normal.gL);
  const [customStim, setCustomStim] = useState(AP_PRESETS.normal.Iext);
  const [nAPs, setNAPs] = useState(3);
  const [apInterval, setApInterval] = useState(50);   // ms
  const [frameRateKHz, setFrameRateKHz] = useState(1); // kHz
  const [illumination, setIllumination] = useState(100); // mW/mm²
  const [showNoise, setShowNoise] = useState(true);
  const [noiseSeed, setNoiseSeed] = useState(0);
  const [invertNeg, setInvertNeg] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const frameTime = 1 / frameRateKHz; // ms per frame

  // Compute AP waveform — use precomputed when a preset is active, otherwise compute from custom values
  const customAP = useMemo(() => {
    if (apPreset) return null;
    const p: HHParams = { ...HH_DEFAULT, gNa: customGNa, gK: customGK, gL: customGL };
    return generateHHAP(3, customStim, STIM_DUR, DT, p);
  }, [apPreset, customGNa, customGK, customGL, customStim]);

  const activeAP = apPreset ? PRECOMPUTED_APS[apPreset] : customAP!;

  // Time axis and AP start times
  const { times, apStarts, totalTime } = useMemo(() => {
    const total = PRE_PAD + (nAPs - 1) * apInterval + activeAP.duration + POST_PAD;
    const nSteps = Math.ceil(total / DT) + 1;
    const times: number[] = Array.from({ length: nSteps }, (_, i) => i * DT);
    const apStarts: number[] = Array.from({ length: nAPs }, (_, i) => PRE_PAD + i * apInterval);
    return { times, apStarts, totalTime: total };
  }, [activeAP, nAPs, apInterval]);

  // Voltage waveform: for each timestep, take the AP with greatest deviation from rest
  const voltages = useMemo(() => {
    return times.map(t => {
      let v = activeAP.rest;
      for (const start of apStarts) {
        const tRel = t - start;
        if (tRel >= 0) {
          const idx = Math.round(tRel / DT);
          const apV = idx < activeAP.waveform.length ? activeAP.waveform[idx] : activeAP.rest;
          if (Math.abs(apV - activeAP.rest) > Math.abs(v - activeAP.rest)) v = apV;
        }
      }
      return v;
    });
  }, [times, apStarts, activeAP]);

  // Simulate all selected GEVIs
  const traces = useMemo(() => {
    return selectedIds.flatMap((id, idx) => {
      const gevi = allGevis.find(g => g.id === id);
      if (!gevi) return [];
      const params = extractSimParams(gevi);
      if (!params) return [];

      const rawNoiseless = simulateTrace(voltages, params);
      const photonsPerFrame = EGFP_PHOTONS_PER_MS_AT_10MW * params.bRel * (illumination / 10) * frameTime;
      const rawNoisy = sampleWithNoise(rawNoiseless, frameTime, photonsPerFrame, idx * 99991 + noiseSeed);

      // Frame-average without noise
      const stepsPerFrame = Math.max(1, Math.round(frameTime / DT));
      const nFrames = Math.floor(rawNoiseless.length / stepsPerFrame);
      const rawClean: number[] = [];
      for (let fr = 0; fr < nFrames; fr++) {
        let sum = 0;
        for (let s = 0; s < stepsPerFrame; s++) sum += rawNoiseless[fr * stepsPerFrame + s] ?? 0;
        rawClean.push(sum / stepsPerFrame);
      }

      // Flip negative-going traces so all curves are positive-going
      const flip = invertNeg && params.polarity === 'negative' ? -1 : 1;
      const cleanSampled = flip === 1 ? rawClean : rawClean.map(v => v * flip);
      const noisySampled = flip === 1 ? rawNoisy : rawNoisy.map(v => v * flip);

      const noiseSigma = 100 / Math.sqrt(Math.max(1, photonsPerFrame));
      const peakResponse = Math.max(...cleanSampled.map(Math.abs));
      const snr = noiseSigma > 0 ? peakResponse / noiseSigma : 0;

      return [{ gevi, params, cleanSampled, noisySampled, photonsPerFrame, snr, color: TRACE_COLORS[idx % TRACE_COLORS.length] }];
    });
  }, [selectedIds, voltages, illumination, frameTime, allGevis, invertNeg, noiseSeed]);

  // Chart geometry
  const SVG_W = 700;
  const SVG_H = 370;
  const VOLT_H = 60;          // px reserved for voltage trace band at top
  const VOLT_SEP = 6;         // gap between voltage band and ΔF/F chart
  const PAD = { top: VOLT_H + VOLT_SEP + 4, right: 48, bottom: 44, left: 62 };
  const chartW = SVG_W - PAD.left - PAD.right;
  const chartH = SVG_H - PAD.top - PAD.bottom;

  // Y-axis range always based on clean traces so noise doesn't compress signal visually
  const allDeltaFs = traces.flatMap(t => t.cleanSampled);
  const rawMinY = allDeltaFs.length ? Math.min(...allDeltaFs) : -10;
  const rawMaxY = allDeltaFs.length ? Math.max(...allDeltaFs) :  10;
  const yPad = Math.max(2, (rawMaxY - rawMinY) * 0.18);
  const minY = rawMinY - yPad;
  const maxY = rawMaxY + yPad;

  const xScale = (t: number) => PAD.left + (t / totalTime) * chartW;
  const yScale = (v: number) => PAD.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

  // Voltage mini-panel: fixed mV scale, independent of ΔF/F range
  const V_MIN_MV = -85, V_MAX_MV = 55;
  const voltTop = 6, voltBottom = VOLT_H - 4;
  const yScaleV = (v: number) =>
    voltTop + (voltBottom - voltTop) * (1 - (v - V_MIN_MV) / (V_MAX_MV - V_MIN_MV));

  const voltagePath = times.reduce((pts, t, i) => {
    if (i % 2 !== 0) return pts;
    const x = xScale(t).toFixed(1);
    const y = yScaleV(voltages[i]).toFixed(1);
    return pts + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  }, '');

  const yTicks = useMemo(() => {
    const range = maxY - minY;
    const step = range < 10 ? 2 : range < 25 ? 5 : range < 60 ? 10 : range < 120 ? 20 : 50;
    const ticks: number[] = [];
    for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) ticks.push(v);
    return ticks;
  }, [minY, maxY]);

  const xTicks = useMemo(() => {
    const step = totalTime <= 20 ? 5 : totalTime <= 60 ? 10 : totalTime <= 150 ? 25 : 50;
    const ticks: number[] = [];
    for (let t = 0; t <= totalTime; t += step) ticks.push(Math.round(t));
    return ticks;
  }, [totalTime]);

  const noisyLinePath = (sampled: number[]) => {
    if (!sampled.length) return '';
    return sampled.map((val, i) => {
      const x = xScale((i + 0.5) * frameTime).toFixed(1);
      const y = yScale(val).toFixed(1);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const filteredGevis = useMemo(() =>
    simulatable.filter(g => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [simulatable, searchQuery]
  );

  const toggleGEVI = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) :
      prev.length >= 6 ? prev : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface-lowest rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-klein">AP Simulator</h2>
          <p className="text-xs text-ink mt-0.5">
            Hodgkin-Huxley AP model + fluorescence ODE + shot noise. SNR = peak ΔF/F / (100% / √photons per frame).
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-y-visible">
        {/* ── Left: controls ── */}
        <div className="w-full lg:w-60 flex-shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4 bg-surface-low rounded-lg p-3">

          {/* Action Potential */}
          <div>
            <div className="text-[11px] font-semibold text-ink uppercase tracking-wide mb-1.5">Action Potential</div>
            <div className="flex rounded overflow-hidden border border-ink/20 mb-2">
              {Object.entries(AP_PRESETS).map(([key, cfg], i, arr) => (
                <button key={key} onClick={() => {
                  setApPreset(key);
                  setCustomGNa(cfg.gNa);
                  setCustomGK(cfg.gK);
                  setCustomGL(cfg.gL);
                  setCustomStim(cfg.Iext);
                }}
                  className={`flex-1 text-xs px-2 py-1 ${apPreset === key ? 'bg-klein text-white' : 'bg-surface text-ink hover:bg-surface-low'} ${i < arr.length - 1 ? 'border-r border-ink/20' : ''}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <div className="hidden lg:flex flex-col gap-1">
              {([
                ['gNa', <><span className="italic">g</span><sub>Na</sub></>, 'mS/cm²', customGNa, setCustomGNa, 10, 300, 10] as const,
                ['gK', <><span className="italic">g</span><sub>K</sub></>, 'mS/cm²', customGK, setCustomGK, 5, 100, 5] as const,
                ['gL', <><span className="italic">g</span><sub>L</sub></>, 'mS/cm²', customGL, setCustomGL, 0.05, 2, 0.05] as const,
                ['Iext', <><span className="italic">I</span><sub>ext</sub></>, 'µA/cm²', customStim, setCustomStim, 5, 100, 5] as const,
              ] as const).map(([key, label, unit, value, setter, min, max, step]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-ink w-10 text-right font-mono">{label}</span>
                  <input type="number" min={min} max={max} step={step} value={value}
                    onChange={e => {
                      setApPreset(null);
                      (setter as (v: number) => void)(Math.max(min as number, Math.min(max as number, Number(e.target.value) || (min as number))));
                    }}
                    className="w-16 text-xs px-1.5 py-0.5 rounded border border-ink/10 bg-surface outline-none focus:border-klein/40" />
                  <span className="text-[9px] text-ink">{unit}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-ink w-14">Count</span>
              <input type="number" min={1} max={10} value={nAPs}
                onChange={e => setNAPs(Math.max(1, Math.min(10, Math.round(Number(e.target.value) || 1))))}
                className="w-16 text-xs px-2 py-1 rounded border border-ink/10 bg-surface outline-none focus:border-klein/40" />
            </div>
            {nAPs > 1 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-ink w-14">Interval</span>
                <input type="number" min={5} max={500} step={5} value={apInterval}
                  onChange={e => setApInterval(Math.max(5, Math.min(500, Math.round(Number(e.target.value) || 50))))}
                  className="w-16 text-xs px-2 py-1 rounded border border-ink/10 bg-surface outline-none focus:border-klein/40" />
                <span className="text-xs text-ink">ms</span>
              </div>
            )}
          </div>

          {/* Imaging */}
          <div>
            <div className="text-[11px] font-semibold text-ink uppercase tracking-wide mb-1.5">Imaging</div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-ink w-14">Frame rate</span>
              <input type="number" min={0.1} max={20} step={0.1} value={frameRateKHz}
                onChange={e => setFrameRateKHz(Math.max(0.1, Math.min(20, Number(e.target.value) || 1)))}
                className="w-16 text-xs px-2 py-1 rounded border border-ink/10 bg-surface outline-none focus:border-klein/40" />
              <span className="text-xs text-ink">kHz</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink w-14">Illumin.</span>
              <input type="number" min={10} max={5000} step={10} value={illumination}
                onChange={e => setIllumination(Math.max(10, Math.min(5000, Math.round(Number(e.target.value) || 100))))}
                className="w-16 text-xs px-2 py-1 rounded border border-ink/10 bg-surface outline-none focus:border-klein/40" />
              <span className="text-xs text-ink">mW/mm²</span>
            </div>
          </div>

          {/* Display */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="text-[11px] font-semibold text-ink uppercase tracking-wide">Display</div>
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={showNoise} onChange={e => { setShowNoise(e.target.checked); if (e.target.checked) setNoiseSeed(s => s + 1); }} />
                Shot noise
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={invertNeg} onChange={e => setInvertNeg(e.target.checked)} />
                Invert neg.
              </label>
            </div>
          </div>

          {/* GEVI selector */}
          <div className="col-span-2 lg:col-span-1 flex-1 min-h-0 flex flex-col">
            <div className="text-[11px] font-semibold text-ink uppercase tracking-wide mb-1">
              GEVIs <span className="font-normal text-ink">({selectedIds.length}/6)</span>
            </div>
            <input
              type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs px-2 py-1 rounded border border-ink/10 bg-surface mb-1 outline-none focus:border-klein/40"
            />
            <div className="overflow-y-auto grid grid-cols-3 lg:grid-cols-1 gap-0.5 max-h-28 lg:max-h-64">
              {filteredGevis.map(g => {
                const idx = selectedIds.indexOf(g.id);
                const isSelected = idx !== -1;
                const color = isSelected ? TRACE_COLORS[idx % TRACE_COLORS.length] : undefined;
                const params = extractSimParams(g);
                const disabled = !isSelected && selectedIds.length >= 6;
                return (
                  <button key={g.id} onClick={() => toggleGEVI(g.id)} disabled={disabled}
                    className={`flex items-center gap-2 text-left px-2 py-1 rounded text-xs w-full transition-colors
                      ${isSelected ? 'bg-surface text-ink' : 'text-ink hover:bg-surface-low'}
                      ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border"
                      style={{ backgroundColor: color ?? 'transparent', borderColor: color ?? '#d1d5db' }} />
                    <span className="flex-1 truncate">{g.name}</span>
                    {params?.estimated && <span className="text-ink text-[9px] flex-shrink-0">est.</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right: chart + table ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Fluorescence trace chart */}
          <div className="rounded-lg border border-ink/10 bg-surface-low p-2">
            <p className="hidden md:block text-[10px] text-ink font-mono text-center mb-1">
              <span className="italic">C</span><sub>m</sub> d<span className="italic">V</span>/d<span className="italic">t</span>{' = '}
              <span className="italic">I</span><sub>ext</sub>{' − '}
              <span className="italic">g</span><sub>Na</sub><span className="italic">m</span><sup>3</sup><span className="italic">h</span>(<span className="italic">V</span>−<span className="italic">E</span><sub>Na</sub>){' − '}
              <span className="italic">g</span><sub>K</sub><span className="italic">n</span><sup>4</sup>(<span className="italic">V</span>−<span className="italic">E</span><sub>K</sub>){' − '}
              <span className="italic">g</span><sub>L</sub>(<span className="italic">V</span>−<span className="italic">E</span><sub>L</sub>)
              <span className="ml-2 not-italic text-ink">— Hodgkin &amp; Huxley 1952</span>
            </p>
            <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>

              {/* ── Voltage mini-panel ── */}
              {/* Rest line */}
              <line x1={PAD.left} y1={yScaleV(V_REST)} x2={SVG_W - PAD.right} y2={yScaleV(V_REST)}
                stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 2" />
              {/* AP waveform */}
              <path d={voltagePath} fill="none" stroke="#6b7280" strokeWidth="1.5" />
              {/* Right-side mV labels */}
              {[Math.round(V_REST), 0, Math.round(V_AP_PEAK)].map(mv => (
                <text key={mv} x={SVG_W - PAD.right + 4} y={yScaleV(mv) + 3.5}
                  fontSize="9" fill="#9ca3af">{mv > 0 ? `+${mv}` : mv}</text>
              ))}
              <text x={SVG_W - PAD.right + 4} y={voltTop - 1} fontSize="9" fill="#9ca3af">mV</text>
              {/* Separator between voltage and ΔF/F panels */}
              <line x1={PAD.left} y1={VOLT_H + 2} x2={SVG_W - PAD.right} y2={VOLT_H + 2}
                stroke="#e5e7eb" strokeWidth="1" />

              {/* ── ΔF/F chart ── */}
              {/* Grid */}
              {yTicks.map(v => (
                <line key={v} x1={PAD.left} y1={yScale(v)} x2={SVG_W - PAD.right} y2={yScale(v)}
                  stroke="#e5e7eb" strokeWidth="1" />
              ))}

              {/* Zero line */}
              {minY <= 0 && maxY >= 0 && (
                <line x1={PAD.left} y1={yScale(0)} x2={SVG_W - PAD.right} y2={yScale(0)}
                  stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 3" />
              )}

              {/* AP timing markers — span both panels */}
              {apStarts.map((t, i) => (
                <g key={i}>
                  <line x1={xScale(t)} y1={voltTop} x2={xScale(t)} y2={PAD.top + chartH}
                    stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 3" />
                </g>
              ))}

              {/* Traces */}
              {traces.map(({ cleanSampled, noisySampled, color }) => (
                <g key={color}>
                  <path d={noisyLinePath(showNoise ? noisySampled : cleanSampled)} fill="none" stroke={color}
                    strokeWidth="1.5" opacity={0.9} />
                </g>
              ))}

              {/* ΔF/F Y labels (left) */}
              {yTicks.map(v => (
                <text key={v} x={PAD.left - 5} y={yScale(v) + 4}
                  textAnchor="end" fontSize="11" fill="#9ca3af">{v}%</text>
              ))}

              {/* X labels */}
              {xTicks.map(t => (
                <text key={t} x={xScale(t)} y={SVG_H - 6}
                  textAnchor="middle" fontSize="11" fill="#9ca3af">{t}</text>
              ))}

              {/* Axis labels */}
              <text x={SVG_W / 2} y={SVG_H - 0} textAnchor="middle" fontSize="11" fill="#9ca3af">
                Time (ms)
              </text>
              <text x={10} y={SVG_H / 2} textAnchor="middle" fontSize="11" fill="#9ca3af"
                transform={`rotate(-90, 10, ${SVG_H / 2})`}>
                ΔF/F (%)
              </text>
            </svg>
          </div>

          {/* SNR Table */}
          {traces.length > 0 && (
            <div className="rounded-lg border border-ink/10 bg-surface-low overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink/10 bg-surface">
                    <th className="text-left px-3 py-2 font-semibold text-ink">GEVI</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink">τ_on</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink">τ_off</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink">Peak ΔF/F</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink">B_rel</th>
                    <th className="text-right px-3 py-2 font-semibold text-ink">SNR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...traces].sort((a, b) => b.snr - a.snr).map(({ gevi, params, cleanSampled, snr, color }) => {
                    const peak = Math.max(...cleanSampled.map(Math.abs));
                    return (
                      <tr key={gevi.id} className="border-b border-ink/5 last:border-0">
                        <td className="px-3 py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-medium text-ink">{gevi.name}</span>
                            {params.estimated && <span className="text-ink text-[9px]">~est</span>}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-ink">{params.tauOn.toFixed(1)} ms</td>
                        <td className="px-3 py-1.5 text-right text-ink">{params.tauOff.toFixed(1)} ms</td>
                        <td className="px-3 py-1.5 text-right text-ink">{peak.toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-right text-ink">{params.bRel.toFixed(2)}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${snr >= 5 ? 'text-green-600' : snr >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {snr.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-3 py-1.5 text-[10px] text-ink border-t border-ink/5">
                AP waveform: Hodgkin-Huxley 1952 with temperature scaling φ.
                Shot noise σ = 100% / √(photons/frame).
                SNR = simulated peak ΔF/F / σ.
              </div>
            </div>
          )}

          {traces.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-sm text-ink">
              Select GEVIs from the left panel to simulate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
