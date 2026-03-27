export const methodologyContent = {
  overview: "GEVIBench provides independent, standardized evaluation of genetically encoded voltage indicators (GEVIs) using a transparent scoring methodology designed to minimize bias. Each GEVI receives a composite score (0–100) derived from six biophysical metrics, with logarithmic scaling applied where performance spans multiple orders of magnitude.",

  twoApproaches: {
    title: "Two Data Sources",
    rawData: {
      title: "1. Public Raw Datasets",
      description: "For GEVIs with publicly available imaging data, we apply our standardized processing pipeline to obtain objective measurements.",
      pipeline: [
        { step: "1. Motion Correction", description: "Apply NoRMCorre algorithm for rigid/non-rigid motion correction" },
        { step: "2. Segmentation", description: "Use CNN-based or ROI-based methods for neuron detection" },
        { step: "3. Signal Extraction", description: "Extract fluorescence traces from identified ROIs" },
        { step: "4. Denoising", description: "Apply DeepInterpolation or SpikePursuit for noise removal" },
        { step: "5. Metric Calculation", description: "Compute SNR, ΔF/F, kinetics, photostability, and brightness" }
      ]
    },
    literature: {
      title: "2. Published Parameters",
      description: "For GEVIs without public data, we extract key performance metrics from peer-reviewed publications, recording the imaging conditions alongside each measurement.",
      extractedMetrics: [
        { metric: "ΔF/F", description: "Fluorescence change per 100mV" },
        { metric: "Kinetics (on/off)", description: "Response time constants" },
        { metric: "Brightness", description: "EC × QY relative to EGFP standard" },
        { metric: "Photostability", description: "Fractional brightness remaining after defined illumination" },
        { metric: "SNR", description: "Signal-to-noise ratio for single action potential detection" }
      ]
    }
  },

  scoring: {
    title: "Scoring Methodology",
    approach: "We combine both data sources to generate a composite score while minimizing bias. Logarithmic scaling is used for metrics that span wide dynamic ranges (kinetics, SNR, brightness, popularity), while linear or power-law scaling is used for bounded metrics (dynamic range, photostability).",
    steps: [
      "Normalize all metrics to 0–100 scale using biologically motivated benchmarks",
      "Calculate separate scores for raw data and literature sources",
      "Apply weighted combination: 70% raw data + 30% literature when both available",
      "When only one source exists, use that source with confidence indicator",
      "Overall score = weighted average of 6 metric scores + bonus points − penalty (−10 for each performance score below 10, reflecting that a critical weakness in any dimension limits practical utility)"
    ],
    confidenceLevels: {
      high: "Multiple independent measurements from ≥2 datasets or papers",
      medium: "Single dataset or paper with detailed metrics and conditions reported",
      low: "Limited information; estimates derived from analogous sensors or incomplete reporting"
    },

    kineticsScoring: {
      title: "Speed Scoring (Kinetics)",
      description: "Speed score is derived from on/off kinetics time constants (τ_on and τ_off) measured at physiological temperature (~33–37°C). Because kinetics span two orders of magnitude across GEVIs, a logarithmic scale is used so that each 10× improvement in speed contributes equally to the score.",
      formula: "Speed Score = max(0, min(100, 63.6 × log₁₀(30 / (τ_on + τ_off))))",
      formulaNote: "where τ_on and τ_off are in milliseconds. The constant 63.6 = 100 / log₁₀(37.5) sets the scale so that the fastest reported kinetics (τ_sum ≈ 0.8 ms) score 100 and τ_sum = 30 ms scores 0.",
      details: [
        "Faster indicators (lower τ values) score higher; score is 0 when τ_on + τ_off ≥ 30 ms",
        "For dual-exponential kinetics, use the amplitude-weighted average (not just the fast component)",
        "Measurements at room temperature are corrected by a Q₁₀ factor of 2.5 (÷2.5 per 10°C shift)",
        "If only τ_off is reported, τ_on is estimated as τ_off / 2 based on typical GEVI ratios",
        "Score is symmetric: a 10× speedup is worth the same number of points regardless of absolute τ"
      ],
      benchmarks: [
        { score: 100, tau_on: 0.3, tau_off: 0.5, example: "Best reported GEVI kinetics (theoretical ceiling)" },
        { score: 80, tau_on: 0.8, tau_off: 1.5, example: "ASAP4, top-tier engineered sensors" },
        { score: 63, tau_on: 1.0, tau_off: 2.0, example: "JEDI-1P, ASAP3" },
        { score: 37, tau_on: 3.0, tau_off: 6.0, example: "ArcLight, first-generation cpGFP sensors" },
        { score: 19, tau_on: 5.0, tau_off: 10.0, example: "Early microbial rhodopsins" },
        { score: 0,  tau_on: 10.0, tau_off: 20.0, example: "Slow sensors (τ_sum ≥ 30 ms)" }
      ]
    },

    dynamicRangeScoring: {
      title: "Dynamic Range Scoring (ΔF/F per 100 mV)",
      description: "Dynamic range measures the fractional fluorescence change per 100 mV depolarization. Both positive-going (brightening) and negative-going (dimming) indicators are scored on absolute |ΔF/F|. A square-root transform is used: the perceptual difference between 3% and 10% is larger than between 30% and 40%, but less extreme than a full log scale.",
      formula: "Dynamic Range Score = max(0, min(100, 83.33 × log₁₀(|ΔF/F|) − 66.66))",
      formulaNote: "where |ΔF/F| is the absolute fluorescence change per 100 mV (%). Calibration: 25% → 50, 50% → 75, 100% → 100. Score is 0 below ~4.6% ΔF/F.",
      details: [
        "Take absolute value of ΔF/F so positive- and negative-going indicators are treated equally",
        "Measurements normalized to exactly 100 mV step; larger voltage steps are scaled proportionally",
        "Multiple measurements from different papers are averaged",
        "Log scaling reflects the fact that going from 25% to 50% ΔF/F is as meaningful as 50% to 100%"
      ],
      benchmarks: [
        { score: 100, deltaF: 100, example: "Exceptional sensors" },
        { score: 88,  deltaF: 75,  example: "Top-tier sensors" },
        { score: 75,  deltaF: 50,  example: "JEDI-1P, Voltron2" },
        { score: 67,  deltaF: 37,  example: "ASAP3, ASAP4" },
        { score: 50,  deltaF: 25,  example: "ArcLight, first-generation sensors" },
        { score: 0,   deltaF: 5,   example: "Marginal sensitivity" }
      ]
    },

    brightnessScoring: {
      title: "Brightness Scoring",
      description: "Brightness is expressed as the product of extinction coefficient (EC, M⁻¹cm⁻¹) and quantum yield (QY), normalized to EGFP (EC × QY = 33,400 × 0.60 = 20,040 M⁻¹cm⁻¹, defined as 1.0×). When absolute values are unavailable, pairwise comparisons from head-to-head experiments are used to derive a relative brightness via graph traversal anchored to EGFP. A logarithmic scale is used because brightness spans more than two orders of magnitude across GEVIs.",
      formula: "Brightness Score = max(0, min(100, 25 × log₁₀(B_rel) + 60))",
      formulaNote: "where B_rel is brightness relative to EGFP. EGFP (B_rel = 1.0) scores 60. Score reaches 0 below ~0.004× EGFP and 100 above ~40× EGFP.",
      details: [
        "EGFP (B_rel = 1.0) scores 60 — a mid-range anchor, not a ceiling",
        "For cpGFP-based GEVIs, the resting-state brightness is used (not the activated state)",
        "B_rel is derived from pairwise comparisons across papers, with EGFP as the fixed reference node",
        "When only non-EGFP comparisons are available, graph traversal infers B_rel through intermediate GEVIs",
        "Log scaling reflects the fact that a 10× increase in photon yield is equally valuable whether going from 0.01→0.1× or 0.1→1×"
      ],
      benchmarks: [
        { score: 76,  brightness: "≤4.5×", example: "Ace2N-mNeon (exceptional chemigenetic)" },
        { score: 61,  brightness: "1.1×",  example: "ArcLight Q239" },
        { score: 60,  brightness: "1.0×",  example: "EGFP reference standard" },
        { score: 57,  brightness: "0.75×", example: "ASAP3" },
        { score: 35,  brightness: "0.1×",  example: "Archon1, QuasAr3 (rhodopsin-based)" },
        { score: 10,  brightness: "0.01×", example: "Arch (very dim rhodopsin sensors)" }
      ]
    },

    sensitivityScoring: {
      title: "Sensitivity Scoring (ΔF/F per Action Potential)",
      description: "Sensitivity is measured as the peak ΔF/F amplitude evoked by a single action potential (AP), expressed as a percentage. Unlike SNR, which depends on illumination power and imaging setup, ΔF/F per AP is an intrinsic property of the sensor that can be directly compared across papers. Values range from <0.5% for dim opsin-based sensors to >20% for the brightest GFP-based sensors, motivating a logarithmic scale.",
      formula: "Sensitivity Score = max(0, min(100, 66.4 × log₁₀(ΔF/F%) − 32.8))",
      formulaNote: "25% ΔF/F/AP → 60, 50% → 80, 100% → 100. Score is 0 below ~1.5% ΔF/F/AP.",
      details: [
        "ΔF/F per AP is extracted from electrophysiology-paired optical recordings",
        "In vivo and in vitro values are both accepted; in vivo measurements are preferred where available",
        "For sensors with negative polarity, the absolute value of ΔF/F is used",
        "Log scaling ensures equal weight to relative improvements across the full range"
      ],
      benchmarks: [
        { score: 100, dfPerAP: 100, example: "Upper bound (100% ΔF/F per AP)" },
        { score: 80,  dfPerAP: 50,  example: "50% ΔF/F per AP" },
        { score: 60,  dfPerAP: 25,  example: "25% ΔF/F per AP" },
        { score: 40,  dfPerAP: 12,  example: "~12% ΔF/F per AP" },
        { score: 0,   dfPerAP: 1.5, example: "~1.5% ΔF/F per AP (score floor)" }
      ]
    },

    photostabilityScoring: {
      title: "Photostability Scoring",
      description: "Photostability measures the fraction of initial fluorescence remaining after a defined illumination protocol. Because bleaching rate depends on both illumination power and duration, raw measurements are normalized to a standard condition (100 mW/mm², 1 min) using exponential corrections derived from first-order photobleaching kinetics.",
      formula: "k = −ln(F_remaining) / (t · P);  Score = min(100, round(100 · exp(k · (−100)))  =  min(100, round(100 · F_remaining ^ (100 / (t · P))))",
      formulaNote: "where F_remaining is the fractional fluorescence remaining (0–1), t is illumination duration in minutes, and P is illumination power in mW/mm². Based on the first-order bleaching model F(t) = exp(−k·t·P): k is inferred from the raw measurement, then the score is 100× the predicted F at the standard condition (100 mW/mm², 1 min). Harsher conditions (higher P or longer t) yield a lower apparent bleaching rate k, boosting the normalized score.",
      details: [
        "Standard condition: 100 mW/mm² for 1 minute at the imaging wavelength",
        "Measurements at different powers or durations are normalized before comparison",
        "Score is capped at 100; no extrapolation beyond measured time points is performed"
      ],
      example: "Archon1: 95% remaining at 800 mW/mm² for 15 min → k = −ln(0.95)/(15×800) = 4.3×10⁻⁶ → Score = 100·exp(−4.3×10⁻⁶×100) ≈ 100. A sensor with 50% remaining at 10 mW/mm² for 1 min → k = 0.0693 → Score = 100·exp(−0.0693×100) ≈ 1.",
      benchmarks: [
        { score: 100, example: "No detectable bleaching at 100 mW/mm², 1 min" },
        { score: 90,  example: "~90% remaining at 100 mW/mm², 1 min" },
        { score: 50,  example: "~50% remaining at 100 mW/mm², 1 min" },
        { score: 10,  example: "~10% remaining at 100 mW/mm², 1 min (poor)" }
      ]
    },

    popularityScoring: {
      title: "Popularity Scoring (Community Adoption)",
      description: "Popularity measures how widely a GEVI has been adopted by the neuroscience community, based on the number of independent papers that use it experimentally (not mere citations). Because adoption follows a long-tailed distribution — most sensors are used in 1–5 papers, while a few blockbusters accumulate hundreds — a logarithmic scale is used so early adoption is strongly rewarded and very popular sensors do not completely overshadow newer competitors.",
      formula: "Popularity Score = min(100, 50 × log₁₀(papers + 1))",
      formulaNote: "where papers is the count of independent experimental papers (excluding the original characterization paper). Score reaches 100 at ~100 papers.",
      details: [
        "Only experimental papers (using the GEVI in a biological preparation) are counted; pure methods comparisons are excluded",
        "Preprints are counted at 0.5 weight until published",
        "Papers using a successor sensor do not count toward the parent sensor",
        "Log scaling: going from 1→10 papers (+34 pts) is rewarded equally to going from 10→100 papers (+50 pts)",
        "Score is recomputed quarterly as new papers are indexed"
      ],
      example: "JEDI-1P: 9 papers → Score = 50 × log₁₀(10) = 50 × 1.00 = 50",
      benchmarks: [
        { score: 100, papers: 99,  example: "Landmark sensors (GCaMP6, ArcLight era)" },
        { score: 85,  papers: 49,  example: "Very popular (Voltron, ASAP3)" },
        { score: 70,  papers: 19,  example: "Well established (JEDI-2P, ASAP4)" },
        { score: 50,  papers: 9,   example: "Gaining traction (JEDI-1P)" },
        { score: 30,  papers: 3,   example: "Emerging (1–2 follow-up studies)" },
        { score: 15,  papers: 1,   example: "Recent (only original + 1 paper)" }
      ]
    }
  },

  metrics: {
    title: "Score Components",
    items: [
      { name: "Speed",         weight: "20%", description: "On/off kinetics — critical for temporal resolution of action potentials. Log-scaled on τ_on + τ_off." },
      { name: "Dynamic Range", weight: "20%", description: "Fluorescence change (|ΔF/F|) per 100 mV depolarization. Square-root scaled." },
      { name: "Brightness",    weight: "20%", description: "EC × QY relative to EGFP. Log-scaled; dim sensors are heavily penalized." },
      { name: "SNR",           weight: "15%", description: "Signal-to-noise ratio for single action potential detection. Log-scaled." },
      { name: "Photostability",weight: "15%", description: "Fractional brightness remaining after standard illumination protocol. Power-law corrected." },
      { name: "Popularity",    weight: "10%", description: "Independent experimental papers using this GEVI. Log-scaled to reward early adoption." }
    ]
  },

  transparency: {
    title: "Transparency & Reproducibility",
    points: [
      "All source data and processing code are publicly available on GitHub",
      "Imaging conditions (power, wavelength, temperature, preparation) are documented for each measurement",
      "Confidence scores indicate data reliability: high (≥2 independent sources), medium (1 source), low (estimate)",
      "External validation welcome — submit your data or flag discrepancies via the GitHub issue tracker"
    ]
  },

  weaknessPenalty: {
    title: "Weakness Penalty",
    description: "A penalty of −10 points is applied to the overall score for each performance metric (speed, dynamic range, brightness, sensitivity, photostability) that scores below 10. This reflects the practical reality that a critical weakness in any single dimension — such as a GEVI too dim to image or too slow to resolve spikes — limits the sensor's real-world utility regardless of how well it performs in other areas. Penalties stack: a sensor with two metrics below 10 receives −20.",
    threshold: 10,
    penalty: -10
  },

  bonusPoints: {
    title: "Bonus Points",
    description: "Additional points are awarded for properties that substantially expand a GEVI's practical utility beyond standard single-photon fluorescence imaging in shallow cortex:",
    rules: [
      {
        name: "Red-shifted",
        points: 3,
        description: "Excitation/emission peak >550 nm, enabling improved tissue penetration, reduced phototoxicity, and compatibility with channelrhodopsin optogenetics.",
        logo: "redShift"
      },
      {
        name: "Two-photon",
        points: 3,
        description: "Successfully demonstrated with two-photon excitation for deep-tissue (>200 µm) in vivo imaging with reduced scattering.",
        logo: "twoPhoton"
      },
      {
        name: "Positive-going",
        points: 3,
        description: "Fluorescence increases with depolarization (turn-on sensor), producing intuitive signals that match conventional electrophysiology conventions.",
        logo: "positiveGoing"
      }
    ]
  }
};
