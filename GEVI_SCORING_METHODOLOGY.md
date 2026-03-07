# GEVI Performance Scoring Methodology

## Goal
Score each GEVI based on **objective, paper-reported metrics** rather than authors' claims, using data from **independent benchmark studies** and **direct measurements**.

---

## Data Sources (Priority Order)

### Tier 1: Independent Benchmark Studies
- **ENeuro 2020** (PMC7540930): Side-by-side testing of Archon1, ArcLightD, ASAP1, ASAP2s, ASAP3b, Bongwoori-Pos6, BeRST1, FlicR1
- **Nature Scientific Reports**: Population imaging comparisons

### Tier 2: Original Development Papers
- Extract **actual measured values** only (ΔF/F, SNR, kinetics)
- Ignore authors' subjective comparisons

### Tier 3: Multiple Independent Papers
- Cross-validate with 2+ papers when possible

---

## Metrics & Scoring Formula

### 1. Dynamic Range (Voltage Sensitivity)
**What it measures**: %ΔF/F per 100 mV step

**Data source**: Direct measurement from papers

**Scoring formula** (normalized to 0-100):
```
score = (ΔF/F / max_ΔF) × 100
```
Where max_ΔF ≈ 50% (best in class from ENeuro)

**Example from ENeuro**:
| GEVI | Measured ΔF/F | Score |
|------|--------------|-------|
| ASAP3b | 49.3% | 100 |
| Archon1 | 48.6% | 98 |
| ArcLight | 29.6% | 60 |
| ASAP1 | 25.7% | 52 |
| FlicR1 | 2.54% | 5 |

---

### 2. Speed (Kinetics)
**What it measures**: Response time constant (ms)

**Data source**: Rise time (τ) from voltage step experiments

**Scoring formula** (inverted - faster = higher score):
```
score = max(0, 100 - (τ - 1) × 10)
```
Where 1ms = best, >10ms = poor

**Example from ENeuro**:
| GEVI | Fast τ (ms) | Score |
|------|------------|-------|
| BeRST1 | 3.8 | 72 |
| ASAP3b | 7.6 | 34 |
| Archon1 | 8.1 | 29 |
| ASAP1 | 11.5 | 0 |
| ArcLight | 47.3 | 0 |

---

### 3. Signal-to-Noise Ratio (SNR)
**What it measures**: Signal quality for action potential detection

**Data source**: Reported SNR values (not d')

**Scoring formula**:
```
score = min(100, (SNR / 40) × 100)
```
Where SNR=40 is excellent (detects spikes reliably)

**Example from literature**:
| GEVI | Reported SNR | Score |
|------|-------------|-------|
| Archon1 | 36 | 90 |
| ASAP3 | 22.5 | 56 |
| ArcLight | 11.6 | 29 |
| ASAP1 | ~10 | 25 |

---

### 4. Photostability
**What it measures**: Fluorescence retention after continuous illumination

**Data source**: % baseline after X seconds/minutes of illumination

**Scoring formula**:
```
score = (% retention after illumination) 
```
Extract directly: 95% retention = score 95

**Example**:
| GEVI | Condition | Retention | Score |
|------|----------|-----------|-------|
| Archon1 | 900s @ 800mW/mm² | 95% | 95 |
| ASAP3 | 300s | ~80% | 80 |
| ArcLight | 28 days in vivo | stable | 80 |

---

### 5. Brightness
**What it measures**: Resting fluorescence intensity

**Data source**: Arbitrary units from same experimental setup

**Scoring formula** (normalized to best in study):
```
score = (brightness / max_brightness) × 100
```
Where max is BeRST1=329 (or best GEVI=59 for pure GEVIs)

**Example from ENeuro**:
| GEVI | Brightness (AU×1000) | Score (GEVI-only) |
|------|---------------------|-------------------|
| ArcLight | 59 | 100 |
| ASAP1 | 36 | 61 |
| ASAP3b | 34 | 58 |
| Archon1 | 13 | 22 |
| FlicR1 | 1.6 | 3 |

---

### 6. Subthreshold Sensitivity
**What it measures**: Ability to detect small subthreshold depolarizations

**Data source**: d' for small voltage changes OR %ΔF for 5-10mV steps

**Scoring**: Direct measurement where available, estimate from d' otherwise

---

## Final Overall Score

**Weighted average**:
```
Overall = 0.20×DynamicRange + 0.25×Speed + 0.25×SNR + 0.15×Photostability + 0.10×Brightness + 0.05×Subthreshold
```

**Weighting rationale**:
- **Speed (25%)**: Critical for spike timing
- **SNR (25%)**: Overall signal quality
- **Dynamic Range (20%)**: Voltage sensitivity
- **Photostability (15%)**: Long recordings
- **Brightness (10%)**: Expression/signal strength
- **Subthreshold (5%)**: Specialized use case

---

## Example: Calculating Scores for ASAP3b

**From ENeuro 2020 + papers**:

| Metric | Measured Value | Score |
|--------|---------------|-------|
| ΔF/F per 100mV | 49.3% | 100 |
| Fast τ (rise time) | 7.6 ms | 34 |
| SNR (d') | 22.5 | 56 |
| Photostability | ~80% after 5min | 80 |
| Brightness | 34 | 58 |
| Subthreshold | Good | 70 |

**Overall** = 0.20×100 + 0.25×34 + 0.25×56 + 0.15×80 + 0.10×58 + 0.05×70
         = 20 + 8.5 + 14 + 12 + 5.8 + 3.5 = **63.8**

---

## Key Principles to Avoid Bias

1. **Use measured values only** - Never use author claims like "best-in-class"
2. **Same-condition comparisons** - Compare GEVIs tested in same study
3. **Independent validation** - Prefer papers that compare multiple GEVIs
4. **Acknowledge limitations** - Note experimental conditions (temp, illumination, cell type)
5. **No cherry-picking** - Use all relevant data, not just favorable results
