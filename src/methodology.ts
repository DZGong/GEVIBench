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
      "Overall score = weighted average of 6 metric scores + bonus points"
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
      formula: "Dynamic Range Score = min(100, 100 × √(|ΔF/F| / 30%))",
      formulaNote: "where |ΔF/F| is the absolute fluorescence change per 100 mV. Score reaches 100 at 30% ΔF/F (the current state-of-the-art ceiling).",
      details: [
        "Take absolute value of ΔF/F so positive- and negative-going indicators are treated equally",
        "Measurements normalized to exactly 100 mV step; larger voltage steps are scaled proportionally",
        "In vitro (HEK cell) and in vivo ΔF/F are scored separately and averaged when both exist",
        "Square-root scaling means doubling ΔF/F yields ~41% more score points (not 100%)",
        "Values above 30% ΔF/F are capped at 100 and flagged for review"
      ],
      benchmarks: [
        { score: 100, deltaF: 30, example: "JEDI-1P, Voltron2 (top performers)" },
        { score: 82, deltaF: 20, example: "ASAP4, ASAP3" },
        { score: 58, deltaF: 10, example: "ArcLight A242, QuasAr3" },
        { score: 41, deltaF: 5,  example: "First-generation rhodopsin GEVIs" },
        { score: 18, deltaF: 1,  example: "Early prototype sensors" }
      ]
    },

    brightnessScoring: {
      title: "Brightness Scoring",
      description: "Brightness is expressed as the product of extinction coefficient (EC, M⁻¹cm⁻¹) and quantum yield (QY), normalized to EGFP (EC × QY = 33,400 × 0.60 = 20,040 M⁻¹cm⁻¹, defined as 1.0×). When absolute values are unavailable, pairwise comparisons from head-to-head experiments are used to derive a relative brightness. A logarithmic scale is appropriate because brightness spans more than two orders of magnitude across GEVIs.",
      formula: "Brightness Score = max(0, min(100, 100 × log₁₀(B_rel / 0.01) / log₁₀(200)))",
      formulaNote: "where B_rel is brightness relative to EGFP. Score is 0 at 0.01× EGFP and 100 at 2× EGFP.",
      details: [
        "EGFP (B_rel = 1.0) scores approximately 87 — bright but not perfect",
        "Score is 0 for any GEVI dimmer than 0.01× EGFP",
        "For cpGFP-based GEVIs, the resting-state brightness is used (not the activated state)",
        "Brightness values from different publications are harmonized by computing ratios to a shared reference measured in the same experiment",
        "Log scaling reflects the fact that a 10× increase in photon yield is equally valuable whether going from 0.01→0.1× or 0.1→1×"
      ],
      benchmarks: [
        { score: 100, brightness: "2.0×", example: "Brighter-than-EGFP fusions (exceptional)" },
        { score: 87,  brightness: "1.0×", example: "EGFP reference standard" },
        { score: 73,  brightness: "0.3×", example: "ASAP3, JEDI-1P (moderate-bright GEVIs)" },
        { score: 44,  brightness: "0.1×", example: "Archon1, QuasAr3 (rhodopsin-based)" },
        { score: 0,   brightness: "0.01×", example: "Dim sensors below practical threshold" }
      ]
    },

    snrScoring: {
      title: "SNR Scoring (Action Potential Detection)",
      description: "SNR measures the peak ΔF/F amplitude of a single action potential divided by the standard deviation of the baseline fluorescence noise. This is the most direct indicator of whether a GEVI can reliably detect single spikes. SNR spans two orders of magnitude across GEVIs and imaging conditions, making a logarithmic scale the most appropriate.",
      formula: "SNR Score = max(0, min(100, 50 × log₁₀(SNR)))",
      formulaNote: "where SNR = ΔF/F_AP / σ_baseline. Score is 0 at SNR ≤ 1 (undetectable), 50 at SNR = 10, and 100 at SNR = 100.",
      details: [
        "SNR is computed on background-subtracted traces without post-hoc denoising to ensure comparability",
        "Frame rate is standardized to 500 Hz equivalent; slower frame rates are corrected using shot-noise scaling",
        "In vivo measurements are preferred; in vitro values are down-weighted by 0.85×",
        "Both electrophysiology-paired and template-based SNR estimates are accepted",
        "Log scaling means each 10× improvement in SNR contributes 50 points regardless of absolute level"
      ],
      benchmarks: [
        { score: 100, snr: 100, example: "Best-case in vitro conditions" },
        { score: 85,  snr: 50,  example: "Excellent in vivo performance (top sensors)" },
        { score: 70,  snr: 20,  example: "JEDI-1P in vivo, ASAP4 in vitro" },
        { score: 50,  snr: 10,  example: "Reliable single-spike detection threshold" },
        { score: 34,  snr: 5,   example: "Marginal; requires averaging or denoising" },
        { score: 0,   snr: 1,   example: "Undetectable single spikes (SNR ≤ 1)" }
      ]
    },

    photostabilityScoring: {
      title: "Photostability Scoring",
      description: "Photostability measures the fraction of initial fluorescence remaining after a defined illumination protocol. Because bleaching rate depends on both illumination power and duration, raw measurements are normalized to a standard condition (16 mW/mm², 1 min) using power-law corrections derived from photobleaching kinetics theory.",
      formula: "Photostability Score = min(100, F_remaining × (1 / t_actual)^0.3 × (16 / P_actual)^0.2 × 100)",
      formulaNote: "where F_remaining is the fractional fluorescence remaining (0–1), t_actual is illumination duration in minutes, and P_actual is illumination power in mW/mm². Exponent 0.3 reflects sub-linear duration dependence; exponent 0.2 reflects sub-linear power dependence typical of one-photon bleaching.",
      details: [
        "Standard condition: 16 mW/mm² for 1 minute at the imaging wavelength",
        "Measurements at different powers (e.g., 5–50 mW/mm²) are corrected before comparison",
        "For two-photon imaging, power exponent is changed to 0.4 to reflect the quadratic intensity dependence",
        "Indicators with monoexponential vs. bi-exponential bleaching are treated separately; fast-phase fraction is penalized",
        "Score is capped at 100; no extrapolation beyond measured time points is performed"
      ],
      example: "JEDI-1P: 64% remaining at 16 mW/mm² for 1 min → Score = 0.64 × (1/1)^0.3 × (16/16)^0.2 × 100 = 64",
      benchmarks: [
        { score: 100, remaining: "≥100%", example: "No detectable bleaching" },
        { score: 80,  remaining: "80%",   example: "Excellent (e.g., JEDI-1P at low power)" },
        { score: 64,  remaining: "64%",   example: "Good (JEDI-1P standard conditions)" },
        { score: 40,  remaining: "40%",   example: "Moderate (ASAP series, ArcLight)" },
        { score: 20,  remaining: "20%",   example: "Poor (early GEVIs, bright-field rhodopsins)" }
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
