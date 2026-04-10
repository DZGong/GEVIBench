// Generates a tileable SVG background of realistic fluorescence traces
// resembling ASAP-family GEVI recordings: sharp negative-going spikes,
// noisy baseline, variable inter-spike intervals, slight amplitude jitter.

// Seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Box-Muller for Gaussian noise from a seeded uniform PRNG
function gaussGen(rand: () => number) {
  let spare: number | null = null;
  return (sigma: number) => {
    if (spare !== null) { const v = spare * sigma; spare = null; return v; }
    let u, v, s;
    do { u = rand() * 2 - 1; v = rand() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const f = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * f;
    return u * f * sigma;
  };
}

// Generate one row of fluorescence trace as an array of y-values.
// Simulates: noisy baseline + sharp negative ΔF/F spikes (ASAP-like).
// spike shape: fast rise (~1-2 samples), exponential decay (~4-6 samples)
function generateTraceRow(
  nSamples: number,
  rand: () => number,
  gauss: (sigma: number) => number,
): number[] {
  const trace = new Array(nSamples);
  const baseNoiseSigma = 1.2;  // baseline noise amplitude (px), scaled 1.5x
  const spikeAmp = (12 + rand() * 6) * 1.5; // 18-27 px, negative-going (1.5x taller)

  // Generate spike times with irregular intervals (Poisson-ish)
  const spikeTimes: number[] = [];
  let t = 8 + rand() * 25;
  while (t < nSamples - 5) {
    spikeTimes.push(Math.round(t));
    // Irregular ISI: mix of short bursts and longer pauses
    if (rand() < 0.3) {
      t += 8 + rand() * 12;   // short ISI (burst)
    } else {
      t += 25 + rand() * 55;  // longer ISI
    }
  }

  // Fill baseline with noise only (no drift / photobleach)
  for (let i = 0; i < nSamples; i++) {
    trace[i] = gauss(baseNoiseSigma);
  }

  // Stamp spikes: sharp negative deflection, ~2 sample rise, exponential decay
  for (const st of spikeTimes) {
    const amp = spikeAmp * (0.7 + rand() * 0.5); // amplitude jitter
    const tauDecay = 2.5 + rand() * 2.0; // decay time constant in samples

    // Upstroke (1-2 samples)
    if (st < nSamples) trace[st] += -amp * 0.6;
    if (st + 1 < nSamples) trace[st + 1] += -amp;

    // Exponential decay back to baseline
    for (let j = 2; j < 20 && st + j < nSamples; j++) {
      trace[st + j] += -amp * Math.exp(-(j - 1) / tauDecay);
    }
  }

  return trace;
}

export function generateSpikeTextureSVG(): string {
  const W = 900;
  const rowH = 36;
  const rows = 7;
  const H = rowH * rows;
  const pxPerSample = 0.5; // each sample = 0.5px horizontal (compressed for sharp spikes)
  const nSamples = Math.ceil((W + 40) / pxPerSample);
  const rand = mulberry32(77);
  const gauss = gaussGen(rand);

  let paths = '';

  for (let r = 0; r < rows; r++) {
    const baseY = r * rowH + rowH * 0.55;
    const xOffset = -20 + rand() * 30; // stagger per row
    const trace = generateTraceRow(nSamples, rand, gauss);

    // Build polyline from samples
    const points: string[] = [];
    for (let i = 0; i < nSamples; i++) {
      const x = (xOffset + i * pxPerSample).toFixed(1);
      const y = (baseY + trace[i]).toFixed(1);
      points.push(`${x},${y}`);
    }

    paths += `<polyline points="${points.join(' ')}" fill="none" stroke="#1c1c19" stroke-opacity="0.04" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${paths}</svg>`;
}

let _cached: string | null = null;
export function getSpikeTextureDataURI(): string {
  if (!_cached) {
    const svg = generateSpikeTextureSVG();
    _cached = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  return _cached;
}
