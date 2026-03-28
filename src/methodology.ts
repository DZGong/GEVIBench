export const methodologyContent = {
  overview: "Each GEVI receives a composite score (0–100) from six metrics, all computed at runtime from published data. Logarithmic scaling is used where performance spans orders of magnitude.",

  scoreComponents: {
    title: "Score Components",
    description: "All metrics are extracted from peer-reviewed publications with imaging conditions recorded. Multiple measurements for the same GEVI are averaged.",
    items: [
      { name: "Brightness",    weight: "20%", description: "EC × QY vs EGFP, graph-resolved, log-scaled" },
      { name: "Speed",         weight: "20%", description: "Log-scaled on τ_on + τ_off (ms)" },
      { name: "Dynamic Range", weight: "20%", description: "|ΔF/F| per 100 mV, log-scaled" },
      { name: "Sensitivity",   weight: "15%", description: "ΔF/F per action potential, log-scaled" },
      { name: "Photostability",weight: "15%", description: "Brightness remaining after illumination, power-law normalized" },
      { name: "Popularity",    weight: "10%", description: "Research paper count, log-scaled" }
    ]
  },

  scoring: {
    title: "Scoring Methodology",
    approach: "Each metric is normalized to 0–100 using log or power-law scaling. The overall score is a weighted average plus bonus points minus weakness penalties.",
    steps: [
      "Weighted average: Brightness 20%, Speed 20%, Dynamic Range 20%, Sensitivity 15%, Photostability 15%, Popularity 10%",
      "Missing metrics are excluded; remaining weights redistributed proportionally",
      "Bonus: +3 each for red-shifted, two-photon, positive-going (up to +9)",
      "Penalty: −10 for one performance score below 10, −15 for two or more",
      "Overall score requires all five performance metrics to be available"
    ],

    kineticsScoring: {
      title: "Speed (Kinetics)",
      description: "Log-scaled on τ_on + τ_off. Measurements at ≥33°C preferred; multiple entries averaged.",
      formula: "Speed = max(0, min(100, round(63.6 × log₁₀(30 / (τ_on + τ_off)))))",
      formulaNote: "τ in ms. Score 0 at τ_sum ≥ 30 ms, ~100 at τ_sum ≈ 0.8 ms.",
      details: [
        "Entries ≥33°C preferred; otherwise closest to 33°C selected",
        "Score is 0 when τ_on + τ_off ≥ 30 ms"
      ],
      benchmarks: [
        { score: 100, tau_on: 0.3, tau_off: 0.5, example: "Theoretical ceiling" },
        { score: 80, tau_on: 0.8, tau_off: 1.5, example: "ASAP4" },
        { score: 63, tau_on: 1.0, tau_off: 2.0, example: "JEDI-1P, ASAP3" },
        { score: 37, tau_on: 3.0, tau_off: 6.0, example: "ArcLight" },
        { score: 0,  tau_on: 10.0, tau_off: 20.0, example: "τ_sum ≥ 30 ms" }
      ]
    },

    dynamicRangeScoring: {
      title: "Dynamic Range (ΔF/F per 100 mV)",
      description: "Log-scaled on absolute |ΔF/F|. Positive- and negative-going indicators treated equally.",
      formula: "DR = max(0, min(100, round(83.33 × log₁₀(|ΔF/F|) − 66.66)))",
      formulaNote: "|ΔF/F| in %. Calibration: 25% → 50, 50% → 75, 100% → 100.",
      details: [
        "Absolute value used; multiple measurements averaged"
      ],
      benchmarks: [
        { score: 100, deltaF: 100, example: "Exceptional" },
        { score: 75,  deltaF: 50,  example: "JEDI-1P, Voltron2" },
        { score: 50,  deltaF: 25,  example: "ArcLight" },
        { score: 0,   deltaF: 5,   example: "Marginal" }
      ]
    },

    brightnessScoring: {
      title: "Brightness",
      description: "EC × QY normalized to EGFP (1.0×). Relative brightness resolved via BFS graph traversal through pairwise comparisons, with EGFP as anchor. Multiple paths averaged by geometric mean.",
      formula: "Brightness = max(0, min(100, round(25 × log₁₀(B_rel) + 60)))",
      formulaNote: "B_rel relative to EGFP. EGFP scores 60. Score 0 below ~0.004×, 100 above ~40×.",
      details: [
        "EGFP (B_rel = 1.0) scores 60 — mid-range anchor",
        "Graph traversal infers B_rel for GEVIs not directly compared to EGFP"
      ],
      benchmarks: [
        { score: 76,  brightness: "4.5×", example: "Ace2N-mNeon" },
        { score: 60,  brightness: "1.0×",  example: "EGFP standard" },
        { score: 35,  brightness: "0.1×",  example: "Archon1, QuasAr3" },
        { score: 10,  brightness: "0.01×", example: "Arch" }
      ]
    },

    sensitivityScoring: {
      title: "Sensitivity (ΔF/F per AP)",
      description: "Peak ΔF/F per single action potential. An intrinsic sensor property independent of imaging setup. Log-scaled.",
      formula: "Sensitivity = max(0, min(100, round(66.4 × log₁₀(|ΔF/F|%) − 32.8)))",
      formulaNote: "Calibration: 25% → 60, 50% → 80, 100% → 100. Score 0 below ~3.1%.",
      details: [
        "Absolute value used for negative-polarity sensors",
        "Multiple measurements averaged"
      ],
      benchmarks: [
        { score: 100, dfPerAP: 100, example: "Upper bound" },
        { score: 80,  dfPerAP: 50,  example: "50% ΔF/F per AP" },
        { score: 60,  dfPerAP: 25,  example: "25% ΔF/F per AP" },
        { score: 0,   dfPerAP: 1.5, example: "Score floor" }
      ]
    },

    photostabilityScoring: {
      title: "Photostability",
      description: "Normalized to standard condition (100 mW/mm², 1 min) via first-order bleaching model. Entry closest to 1 min selected. Bioluminescent GEVIs score 100.",
      formula: "Score = min(100, round(100 × F_remaining ^ (100 / (t × P))))",
      formulaNote: "F_remaining: fractional brightness (0–1), t: duration (min), P: power (mW/mm²).",
      details: [
        "Entry closest to 1 min preferred, ties broken by closest to 10 mW/mm²"
      ],
      example: "Archon1: 95% at 800 mW/mm², 15 min → Score ≈ 100. 50% at 10 mW/mm², 1 min → Score ≈ 1.",
      benchmarks: [
        { score: 100, remaining: "100%", example: "No detectable bleaching" },
        { score: 90,  remaining: "~90%", example: "Excellent" },
        { score: 50,  remaining: "~50%", example: "Moderate" },
        { score: 10,  remaining: "~10%", example: "Poor" }
      ]
    },

    popularityScoring: {
      title: "Popularity (Community Adoption)",
      description: "Log-scaled count of research papers listed for the GEVI.",
      formula: "Popularity = min(100, round(50 × log₁₀(papers + 1)))",
      formulaNote: "Score reaches 100 at ~99 papers.",
      details: [
        "All listed research papers counted"
      ],
      example: "9 papers → Score = 50 × log₁₀(10) = 50",
      benchmarks: [
        { score: 100, papers: 99,  example: "Landmark sensors" },
        { score: 70,  papers: 19,  example: "Well established" },
        { score: 50,  papers: 9,   example: "Gaining traction" },
        { score: 15,  papers: 1,   example: "Recent" }
      ]
    }
  },

  transparency: {
    title: "Transparency & Reproducibility",
    points: [
      "All source data and scoring code are publicly available on GitHub",
      "Imaging conditions documented alongside each measurement",
      "Submit data or flag discrepancies via the GitHub issue tracker"
    ]
  },

  weaknessPenalty: {
    title: "Weakness Penalty",
    description: "−10 for one performance score below 10, capped at −15 for two or more. Checks speed, dynamic range, brightness, sensitivity, and photostability (not popularity). A critical weakness in any dimension limits practical utility.",
    threshold: 10,
    penalty: -10
  },

  bonusPoints: {
    title: "Bonus Points",
    description: "+3 points each for properties that expand practical utility:",
    rules: [
      {
        name: "Red-shifted / Chemigenetic",
        points: 3,
        description: "Red/far-red/NIR emission or chemigenetic design — better tissue penetration and optogenetics compatibility.",
        logo: "redShift"
      },
      {
        name: "Two-photon compatible",
        points: 3,
        description: "Demonstrated with two-photon excitation for deep-tissue (>200 µm) imaging.",
        logo: "twoPhoton"
      },
      {
        name: "Positive-going",
        points: 3,
        description: "Fluorescence increases with depolarization — intuitive signals matching electrophysiology conventions.",
        logo: "positiveGoing"
      }
    ]
  }
};
