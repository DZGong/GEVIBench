# F-V Curve Issues

Audit completed 2026-05-07. All issues verified against source papers by 8 parallel agents.
Unverifiable entries (paywalled papers) are excluded from this list.

---

## Fabricated / Heavily Extrapolated (critical)

**archon1** ✓ FIXED 2026-05-07
- Was: 11 extrapolated points extending to ±150 mV using linear slope.
- Fix: Replaced with 9 points from -100 to +40 mV (20 mV steps), values computed from paper's stated 43%/100 mV linear slope, normalized to -70 mV = 0.

**restus-ni**
- Entire curve is inverted. The sensor brightens on depolarization (Boltzmann Vmid = -96.6 mV), but the JSON shows the opposite polarity. Normalization should be to -60 mV, not -70 mV. JSON values (+69% at -120 mV, -79% at +60 mV) are approximately the mirror image of what the paper shows.

**props**
- 23 perfectly evenly-spaced points at 10 mV intervals. Almost certainly generated from a Boltzmann/sigmoid fit. Paper (Science 2011) is paywalled so the exact figure cannot be confirmed, but the regular spacing is a fabrication signal.

**bongwoori**
- Cited Fig. 6B shows a 0–1 Boltzmann-normalized curve (not actual ΔF/F%). The JSON values (max -21% at +130 mV) cannot be read from that figure. Voltage range in JSON extends to ±170/130 mV, beyond the figure's ±100 mV x-axis.

**bongwoori-r3**
- Wrong sourceFigure: JSON cites "Fig. 4D" but the stored source image is Fig. 4C (a bar chart with only 3 voltage points: -20, 80, 130 mV). The other 4 voltage steps in the JSON (-170, -120, -70, 30 mV) are extrapolated with no figure source.

**electricpk**
- Wrong figure cited. Fig. 6B in the paper is a **ΔF/ΔV derivative curve**, not an F-V curve. The stored source image shows a direct ΔF/F% vs voltage scatter plot that does not match the cited figure.

---

## Wrong Magnitude / Shape

**jedi1p**
- Depolarizing values significantly inflated vs. the figure. Paper Fig. 2b shows JEDI-1P reaching ~-38 to -40% at +50 mV and ~-33% at +20 mV. JSON has -56% at +50 mV and -46% at +20 mV — roughly 15-20% more negative throughout the depolarized range.

**jedi2p**
- (1) JSON includes a -120 mV point (+22% ΔF/F) that does not appear in Fig. 2B (figure x-axis starts at -100 mV). (2) ΔF/F magnitudes at depolarizing voltages systematically underestimated: figure shows ~-38 to -40% at 0 mV and ~-48 to -50% at +30 mV; JSON has -30% and -43%. (3) JSON stops at +30 mV; figure extends to +50 mV showing the plateau.

**forces1**
- Hyperpolarized data points 3-4× too small in magnitude. Paper Fig. 1E shows ~-35 to -40% ΔF/F at -120 mV; JSON has -10%. At -100 mV: figure ~-20 to -25%, JSON has -7%. The depolarized values (0 mV: 227%, +30 mV: 260%) appear roughly correct.

**arclight**
- JSON has -30% at +100 mV. Paper Fig. 1C shows original ArcLight at ~-18% at +100 mV; Fig. 2C (ArcLight A242) shows ~-35% at +100 mV. The JSON value of -30% matches neither figure. The sourceFigure annotation "Fig. 1C" appears incorrect (should reference Fig. 2C for ArcLight A242, but even then the value is wrong).

**hvi**
- Stored source image (hvi.jpg) shows raw fluorescence **time traces**, not a steady-state F-V scatter plot. The actual F-V summary panel from the paywalled paper is not stored. Additionally, the paper abstract states -39% ΔF/F per 100 mV for HVI-Cy3, but the JSON curve implies ~32%/100 mV (0 to -32% from -70 to +30 mV). The curve shape (nearly flat from -100 to -40 mV then steeply accelerating) is atypical for an opsin-based FRET sensor and may be fabricated.

**restus**
- Wrong sourceFigure: JSON cites "Fig. 1C" but Fig. 1C in the paper shows ASAP3 brightness data, not rEstus. rEstus F-V data is in Fig. 1G (absolute brightness units, %EGFP, not ΔF/F%). No conventionally normalized ΔF/F curve exists in the paper; the JSON values appear derived from Boltzmann fit parameters (B_max=77.5, ΔB=57, V_half=-32 mV) rather than read from a figure. Hyperpolarized values (+23% at -100 mV, +13% at -80 mV) are too large compared to what the Boltzmann model predicts (~+3.5% at -100 mV).

---

## Extrapolated Beyond Measured Range

**archon2**
- Paper Fig. 2e only measures -70 to +30 mV. JSON has two points outside this range: -80 mV (deltaF = -2%) and +40 mV (deltaF = +21%) are extrapolated, not measured.

**novarch**
- Paper characterizes -70 to +30 mV only (confirmed by text: "41 ± 7% from -70 to +30 mV"). JSON extends to -100 and +100 mV; the 4 outer points (-100, -60, +60, +100 mV) are not from the figure and are likely extrapolated.

**quasar3**
- Paper's Ext. Data Fig. 3c covers -75 mV to ~+40 mV. JSON extends to +75 mV; the +50 mV and +75 mV points are not in the figure.

**ace2n-mneon**
- Paper Fig. 1D covers -100 to +30 mV. JSON includes a -120 mV point that is outside the measured range and appears extrapolated.

**mermaid2**
- 23 points at uniform 5 mV spacing — dense regular grid is a fabrication signal. More critically, Boltzmann Vmid = -32 mV means the curve is already substantially activated at -70 mV; setting -70 mV = 0 misrepresents the figure, which plots absolute ΔR/R from the curve minimum (not from -70 mV). The paper reports 48.5% for the -70 to +30 mV step and a maximum of 53.5% total, implying the curve minimum is not at -70 mV.

**macq**
- Paper's Fig. 3b covers -140 to +100 mV. JSON is truncated to -100 to +40 mV. The curve shape (apparent early saturation in JSON) is inconsistent with the paper's description of a relatively linear ~20%/100 mV response.

---

## Baseline / Normalization Wrong

**vsfp1**
- Paper Fig. 3B shows a linear ΔF/F curve with zero-crossing near 0 mV. JSON imposes -70 mV = 0 as the baseline, shifting the entire curve ~70 mV left relative to the actual data.

**amber**
- AMBER is a bioluminescent sensor with Boltzmann V₁/₂ = -25.5 mV. At -60 mV (the JSON's zero baseline), the sensor is already substantially activated on the sigmoid curve — it is not at its minimum. Setting -60 mV = 0 misrepresents the curve shape.

---

## Derived from Normalized Figures (not directly digitized)

**asap6-1**
- Source figure (Fig. 1b) uses F/F_max (0–1 normalized). JSON values were derived by computing (F/Fmax(V) - F/Fmax(-70)) / F/Fmax(-70), not read as absolute ΔF/F% directly from the figure. The same JPEG file is stored for both asap6-1 and asap6b (byte-for-byte identical).

**asap6b**
- Identical source image file as asap6-1. Figure labels the sensor "ASAP6.2(b)" — unclear if this is the same construct as "ASAP6b". Values show a significant difference from asap6-1 (max 191% vs 304%) but this cannot be independently verified from a shared source image.

**vsfp2_3**
- Source figure (Fig. 3B, Mutoh 2009) is a normalized 0–1 plot. JSON absolute % values were derived by scaling the normalized curve by the paper-reported maximum of 3.9%. This is methodologically acceptable but introduces uncertainty; the values are not directly readable from the stored image.

**vsfp2**
- Wrong sourceFigure label: stored image panel shows "C" but JSON cites "Fig. 3B". Data represents ΔR/R (yellow/cyan ratio change), which is stored in the `deltaF` field — a semantic mismatch. Values and polarity are broadly consistent with the figure.

---

## No Custom Data (using sigmoid fallback)

**vsfp3_1** — `voltage.custom` is absent entirely.

---

## Minor Issues (low priority)

**asap4b** — Only 5 sparse data points; -100 mV value (-63%) unconfirmed in paper text. The -40 mV value (67% jump from -70 mV baseline) seems implausibly large.

**archer2** — Irregular voltage step sampling: paper uses uniform 10 mV increments from -100 to +50 mV, but JSON has non-uniform steps with several voltages missing. Minor numerical inconsistency at -80 mV.

**positron** — Paper tests voltage steps from -110 mV; JSON starts at -100 mV, missing the most hyperpolarized data point.
