export const methodologyContent = {
  overview: "GEVIBench scores are intended solely as a standardized reference to help researchers select the best sensor for their experiments and to encourage the development of next-generation GEVIs. A lower score does not diminish the scientific contribution of any indicator. We have deep respect for every GEVI and the work behind it, especially the pioneering efforts that made the entire field possible. Many foundational sensors that score modestly by today's metrics were transformative when published and remain essential to ongoing research.",

  scoreComponents: {
    title: "Score Components",
    description: "All metrics are extracted from peer-reviewed publications with imaging conditions recorded. Multiple measurements for the same GEVI are averaged.",
    items: [
      { name: "Brightness",    weight: "20%", description: "Relative brightness vs EGFP, graph-resolved, log-scaled" },
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
      "Bonus: +3 each for red-shifted, two-photon, positive-going (up to +9)",
      "Penalty: −10 for one performance score below 10, −15 for two or more",
      "Overall score requires all five performance metrics to be available"
    ],

    kineticsScoring: {
      title: "Speed (Kinetics)",
      description: "Log-scaled on τ_on + τ_off. Measurements at ≥33°C preferred; multiple entries averaged.",
      formula: "Speed = 63.6 × log₁₀(30 / (τ_on + τ_off))",
      formulaNote: "τ in ms. Score 0 at τ_sum ≥ 30 ms.",
      details: [
      ],
      benchmarks: [
        { score: 100, tau_on: 0.3, tau_off: 0.5, example: "Positron" },
        { score: 80, tau_on: 0.8, tau_off: 1.5, example: "ASAP4" },
        { score: 63, tau_on: 1.0, tau_off: 2.0, example: "JEDI-1P, ASAP3" },
        { score: 37, tau_on: 3.0, tau_off: 6.0, example: "ArcLight" },
        { score: 0,  tau_on: 10.0, tau_off: 20.0, example: "τ_sum ≥ 30 ms" }
      ]
    },

    dynamicRangeScoring: {
      title: "Dynamic Range (ΔF/F per 100 mV)",
      description: "Log-scaled on absolute |ΔF/F| per 100 mV. Positive- and negative-going indicators treated equally.",
      formula: "DR = 83.33 × log₁₀(|ΔF/F|) − 66.66",
      formulaNote: "|ΔF/F| in %. ",
      details: [
      ],
      benchmarks: [
        { score: 100, deltaF: "≥100", example: "ASAP4" },
        { score: 75,  deltaF: 50,  example: "JEDI-1P, Voltron2" },
        { score: 50,  deltaF: 25,  example: "ArcLight" },
        { score: 0,   deltaF: 5,   example: "VSFP1" }
      ]
    },

    brightnessScoring: {
      title: "Brightness",
      description: "Relative brightness normalized to EGFP (1.0×), derived from direct pairwise comparisons reported in publications. Resolved via BFS graph traversal with EGFP as anchor. Multiple paths averaged by geometric mean.",
      formula: "Brightness = 25 × log₁₀(B/B_EGFP) + 60",
      formulaNote: "B/B_EGFP relative to EGFP.",
      details: [
      ],
      benchmarks: [
        { score: 85,  brightness: "10×", example: "Voltron2" },
        { score: 60,  brightness: "1.0×",  example: "EGFP standard" },
        { score: 35,  brightness: "0.1×",  example: "Archon1, QuasAr3" },
        { score: 10,  brightness: "0.01×", example: "Arch" }
      ]
    },

    sensitivityScoring: {
      title: "Sensitivity (ΔF/F per AP)",
      description: "Peak ΔF/F per single action potential. An intrinsic sensor property independent of imaging setup. Log-scaled.",
      formula: "Sensitivity = 66.4 × log₁₀(|ΔF/F|%) − 32.8",
      formulaNote: "",
      details: [

      ],
      benchmarks: [
        { score: 100, dfPerAP: "≥100", example: "ASAP6.1" },
        { score: 80,  dfPerAP: 50,  example: "Quasar2" },
        { score: 60,  dfPerAP: 25,  example: "ASAP4e" },
        { score: 20,   dfPerAP: 6.25, example: "Voltron" }
      ]
    },

    photostabilityScoring: {
      title: "Photostability",
      description: "Normalized to standard condition (100 mW/mm², 1 min) via first-order bleaching model. Entry closest to 1 min and 10 mW/mm² selected. Bioluminescent GEVIs score 100.",
      formula: "Score = F_remain ^ (100 / (t × P))",
      formulaNote: "F_remain: fractional brightness (0–1), t: duration (min), P: power (mW/mm²).",
      details: [
      ],
      example: "",
      benchmarks: [
        { score: 100, remaining: "100%", example: "Quasar2/3" },
        { score: 90,  remaining: "~80%", example: "ASAP3" },
        { score: 50,  remaining: "~60%", example: "ASAP5" },
        { score: 10,  remaining: "~10%", example: "Arclight" }
      ]
    },

    popularityScoring: {
      title: "Popularity (Community Adoption)",
      description: "Log-scaled count of research papers that have successfully used the GEVI.",
      formula: "Popularity = 50 × log₁₀(papers + 1)",
      formulaNote: "The original GEVI paper counts as 1 paper.",
      details: [
      ],
      example: "",
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
        description: "Demonstrated with two-photon excitation imaging.",
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
