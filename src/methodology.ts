export const methodologyContent = {
  overview: "GEVIBench provides independent, standardized evaluation of genetically encoded voltage indicators (GEVIs) using a transparent scoring methodology designed to minimize bias.",

  twoApproaches: {
    title: "Two Data Sources",
    rawData: {
      title: "1. Public Raw Datasets",
      description: "For GEVIs with publicly available imaging data, we apply our standardized processing pipeline to obtain objective measurements.",
      pipeline: [
        { step: "1. Motion Correction", description: "Apply NoRMCorre algorithm for rigid/非刚性 motion correction" },
        { step: "2. Segmentation", description: "Use CNN-based or ROI-based methods for neuron detection" },
        { step: "3. Signal Extraction", description: "Extract fluorescence traces from identified ROIs" },
        { step: "4. Denoising", description: "Apply DeepInterpolation or SpikePursuit for noise removal" },
        { step: "5. Metric Calculation", description: "Compute SNR, ΔF/F, kinetics, photostability" }
      ]
    },
    literature: {
      title: "2. Published Parameters",
      description: "For GEVIs without public data, we extract key performance metrics from peer-reviewed publications.",
      extractedMetrics: [
        { metric: "ΔF/F", description: "Fluorescence change per 100mV" },
        { metric: "Kinetics (on/off)", description: "Response time constants" },
        { metric: "Brightness", description: "Absolute fluorescence intensity" },
        { metric: "Photostability", description: "Time to 50% bleaching" },
        { metric: "SNR", description: "Signal-to-noise ratio for spike detection" }
      ]
    }
  },

  scoring: {
    title: "Scoring Methodology",
    approach: "We combine both data sources to generate a composite score while minimizing bias:",
    steps: [
      "Normalize all metrics to 0-100 scale using standard benchmarks",
      "Calculate separate scores for raw data and literature sources",
      "Apply weighted combination: 70% raw data + 30% literature when both available",
      "When only one source exists, use that source with confidence indicator",
      "Overall score = weighted average of 6 metric scores"
    ],
    confidenceLevels: {
      high: "Multiple independent measurements available",
      medium: "Single dataset or paper with detailed metrics",
      low: "Limited information, estimates based on similar sensors"
    },
    kineticsScoring: {
      title: "Kinetics Scoring Rule",
      description: "Speed score is calculated from on/off kinetics time constants (τ_on and τ_off) measured at physiological temperature (~33-37°C):",
      formula: "Speed Score = 100 - (τ_on × 50 + τ_off × 50)",
      details: [
        "Faster indicators (lower τ values) score higher",
        "Typical range: 0.3-10 ms for τ_on, 0.5-20 ms for τ_off",
        "Score capped at 0-100 (negative values become 0)",
        "Dual-exponential kinetics: use fast component (τ_fast) for scoring"
      ],
      benchmarks: [
        { score: 100, tau_on: 0.3, tau_off: 0.5, example: "Best reported GEVI kinetics" },
        { score: 80, tau_on: 1.0, tau_off: 2.0, example: "JEDI-1P, ASAP4" },
        { score: 60, tau_on: 2.5, tau_off: 5.0, example: "ASAP3, ArcLight" },
        { score: 40, tau_on: 5.0, tau_off: 10.0, example: "Early generation GEVIs" },
        { score: 20, tau_on: 10.0, tau_off: 20.0, example: "Slow microbial rhodopsins" }
      ]
    },
    dynamicRangeScoring: {
      title: "Dynamic Range Scoring Rule",
      description: "Dynamic range (ΔF/F) measures fluorescence change per 100mV depolarization. We use absolute values to fairly compare positively-tuned (brighten) and negatively-tuned (dim) indicators:",
      formula: "Dynamic Range Score = min(100, |ΔF/F| × 3.33)",
      details: [
        "Take absolute value of ΔF/F (both positive and negative responses score equally)",
        "Typical range: 3-50% per 100mV",
        "Score = ΔF/F × 3.33, capped at 100",
        "Example: 30% ΔF/F → score of 100; 15% → score of 50"
      ],
      benchmarks: [
        { score: 100, deltaF: 30, example: "JEDI-1P, top-performing GEVIs" },
        { score: 80, deltaF: 24, example: "ASAP3, ASAP4" },
        { score: 60, deltaF: 18, example: "ASAP2s, ArcLight" },
        { score: 40, deltaF: 12, example: "QuasAr, Archon" },
        { score: 20, deltaF: 6, example: "Early rhodopsin-based GEVIs" }
      ]
    },
    photostabilityScoring: {
      title: "Photostability Scoring Rule",
      description: "Photostability measures how much brightness remains after illumination. We normalize across different power and duration conditions to create a standardized score:",
      formula: "Photostability Score = (Brightness_remaining × 100) × (1 min / actual_time)^0.3 × (16 / power)^0.2",
      details: [
        "Standard condition: 16 mW/mm² for 1 minute",
        "Adjusts for different illumination powers (exponent 0.2) and durations (exponent 0.3)",
        "Higher remaining brightness = higher score",
        "Score capped at 100"
      ],
      example: "JEDI-1P: 64% remaining @ 16mW/mm² for 1min → Score = 64 × (1/1)^0.3 × (16/16)^0.2 = 64",
      benchmarks: [
        { score: 100, remaining: 100, example: "No bleaching" },
        { score: 80, remaining: 80, example: "Excellent (e.g., JEDI-1P at low power)" },
        { score: 60, remaining: 60, example: "Good (e.g., JEDI-1P at high power)" },
        { score: 40, remaining: 40, example: "Moderate (e.g., ASAP series)" },
        { score: 20, remaining: 20, example: "Poor (early GEVIs)" }
      ]
    },
    popularityScoring: {
      title: "Popularity Score (Number of Papers)",
      description: "Measures how widely a GEVI has been adopted by the neuroscience community based on the number of papers using or citing it:",
      formula: "Popularity Score = min(100, papers × 5)",
      details: [
        "Count of papers that use or cite this GEVI",
        "Includes original paper, preprints, and citing papers",
        "Linear scale: 1 paper = 5 points, 20 papers = 100 points",
        "Higher count = more validated/accepted in the field"
      ],
      example: "JEDI-1P: 9 papers → Score = 9 × 5 = 45",
      benchmarks: [
        { score: 100, papers: 20, example: "Highly popular (ArcLight, GCaMP series)" },
        { score: 75, papers: 15, example: "Very popular (ASAP3, Voltron)" },
        { score: 50, papers: 10, example: "Moderate (JEDI-1P, JEDI-2P)" },
        { score: 25, papers: 5, example: "Emerging (newer sensors)" },
        { score: 5, papers: 1, example: "Recent (only original paper)" }
      ]
    }
  },

  metrics: {
    title: "Score Components",
    items: [
      { name: "Speed", weight: "17%", description: "On/off kinetics - critical for temporal resolution. Based on τ_on and τ_off time constants" },
      { name: "Dynamic Range", weight: "17%", description: "Fluorescence change (ΔF/F) per 100mV depolarization" },
      { name: "SNR", weight: "17%", description: "Signal-to-noise ratio for action potential detection" },
      { name: "Photostability", weight: "17%", description: "Resistance to photobleaching during imaging" },
      { name: "Popularity", weight: "17%", description: "Number of papers using/citing the GEVI - measures community adoption" },
      { name: "Brightness", weight: "15%", description: "Relative brightness from pairwise comparisons across papers" }
    ]
  },

  transparency: {
    title: "Transparency & Reproducibility",
    points: [
      "All source data and processing code will be publicly available",
      "We document imaging conditions for each dataset",
      "Confidence scores indicate data reliability",
      "External validation welcome - submit your data!"
    ]
  }
};
