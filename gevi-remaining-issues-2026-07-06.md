# GEVIBench — Remaining Issues by GEVI

_Companion to `gevi-recheck-report-2026-07-04.md`. Every open item from the targeted re-check, grouped per GEVI. Nothing here is a blocker — these are values contested between the recheck agent and QA, deliberate judgment calls, and cross-GEVI data still pending._

**Legend:** ⚠️ Contested (QA disputes the current on-disk value) · ❓ Unresolved judgment call (no clear paper answer) · ➡️ Cross-GEVI data not yet applied (data another paper reports about this page) · 🔁 Sweep value kept over the original QA flag (QA now agrees, listed for your awareness)

**55 GEVIs with open items** — 9 contested · 65 unresolved judgment calls · 24 pending cross-GEVI · 9 kept-over-flag.

Plus one page-level item with no existing file: **`asap6b`** — the ASAP6c paper's Suppl. Tables S2/S3/S4 carry full data for ASAP6.2 (=ASAP6b), the direct parent of ASAP6c, but no `asap6b.json` exists. Creating it is a new-GEVI task.

---

## 2photron

**❓ Unresolved judgment calls:**
- **kinetics[0].temperature** — Stored '25°C' but neither the main text nor supplement Methods states the in-vitro voltage-clamp recording temperature  
  _why not fixed:_ Room-temperature->25°C is the rulebook convention (line 128) and the reasonable default for cultured-neuron voltage clamp; the paper provides no explicit value to apply. Value kept as the compliant default.
- **apWidthData (Golgi-cell prep)** — Fig S9d gives a separate cerebellar-Golgi-cell FWHM for 2Photron (~0.65 ms), read against a truncated 0.5-1.5 ms axis  
  _why not fixed:_ Genuinely sub-millisecond (fast-spiking interneuron), below the rulebook 1-20 ms apWidth sanity range; storing it would render oddly and risk re-flagging. The explicit-in-text cortical 1.42 ms is the solid apWidth. Judgment call left for a human on whether a sub-ms bar-chart entry belongs.
- **addgene** — No addgene entry  
  _why not fixed:_ WebSearch found no Addgene deposit for this 2024 preprint; optional field left absent.
- **spectrum (FPbase re-verification)** — Did not byte-verify the FPbase 'Janelia Fluor JF552-HaloTag conjugate' curve this run  
  _why not fixed:_ Curve is real (asymmetric, vibronic), sourced and sourceFigure'd; paper labels 2Photron with JF552-HTL. Accepted on documented source per user directive rather than fabricate a verification.

---

## ace2n-mneon

**❓ Unresolved judgment calls:**
- **description** — Description was changed from the backup's 'First opsin-fluorescent protein FRET voltage indicator...' to a non-'First' phrasing. I kept the corrected version because MacQ-mCitrine (2014) predates Ace2N-mNeon (2015), making 'First' factually false.  
  _why not fixed:_ Not a data error — a wording/framing judgment call. Kept the factually-accurate corrected text and flagged it; user may prefer a historical framing, which would need explicit rewording rather than a straight revert to the false 'First' claim.

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **Unreported description change vs backup** → kept as: Opsin-fluorescent protein FRET voltage indicator pairing an Ace rhodopsin with mNeonGreen, optimized for fast sub-millisecond responses and high-fidelity spike detection.  
  _basis:_ macq-mcitrine.json year 2014 / date 2014-04-22 is an earlier opsin-FP eFRET GEVI, so the backup's 'First ... FRET voltage indicator' claim is factually false; reverting would reintroduce the error. Kept corrected (non-'First') text, now disclosed. Contested wording flagged for user.

---

## arch

**❓ Unresolved judgment calls:**
- **brightnessData** — Kralj 2012 Table 1 + main text report WT Arch fluorescence QY = 9×10⁻⁴; stored ratio 0.00016 uses Herasymenko 2025 QY 1.1×10⁻⁴ (paired with Herasymenko EC 48900, internally consistent). ~8× QY difference.  
  _why not fixed:_ Both are legitimate primary measurements from different methods, not fabrication. Stored value pairs EC and QY from the same source (Herasymenko) so it is internally consistent; mixing Kralj QY with Herasymenko EC would be inconsistent. Choosing between sources is a human judgment call. Recommend keeping stored value.
- **apWidthData** — FWHM 4.3 ms is plot-derived from Kralj Fig. 2f, not a paper-printed number.  
  _why not fixed:_ Not an error — sanctioned derive-from-plot (rulebook 1j). Independently re-digitized here (measured ≈4.6 ms, agreeing with stored 4.3 ms within ±0.3 ms baseline uncertainty). Noted so the human knows it carries ~±0.3-0.5 ms reading uncertainty.

---

## archer1

**❓ Unresolved judgment calls:**
- **kinetics[0].temperature** — Recording temperature missing (trips checker WARNING)  
  _why not fixed:_ Bando 2019 Methods do not state temperature; the Bando 2019 PDF is NOT present locally under /Users/dzgong/Documents/GEVIBench/Papers/, so it cannot be re-opened to confirm. Cannot fabricate a value.
- **kinetics[0].on/off** — 2.5/5.5 ms is LOW-confidence bar-chart digitization (±~1 ms) and is the ONLY numeric kinetics source  
  _why not fixed:_ Bando 2019 PDF not local to re-verify bars; origin paper Fig 1e (re-read in ncomms5894.pdf) is a qualitative Archer1-vs-Arch waveform comparison with no numeric tau; Piatkevich lists 'No data available'. Documented derivation is self-consistent; altering without the source would reduce reliability.
- **apWidthData** — No optical single-AP FWHM for Archer1 in any available paper  
  _why not fixed:_ Origin paper reports none (Fig 3e is a 40 Hz train, not a clean single-AP waveform); Piatkevich Fig 2h FWHM is Archon1-only. Genuinely absent — nothing to extract or derive.

---

## archer2

**❓ Unresolved judgment calls:**
- **addgene** — No Archer2 Addgene plasmid ID stored.  
  _why not fixed:_ Paper SI Supplementary Table 1 (Accession codes) lists only parent constructs (eArch3.0 #35514, Arch-GFP #22217, Arch-EEQ #45188). The Gradinaru lab deposited Archer1 (#60423) but no Archer2 plasmid exists in the paper or on the lab's Addgene page (verified via WebSearch on addgene.org). Assigning an ID would be fabrication.
- **kinetics** — No numeric τon/τoff for Archer2.  
  _why not fixed:_ Flytzanis 2014 gives only the qualitative 'slower rise to the steady-state value than Archer1' (Fig. 3c/SKi, no τ table). Bando 2019 (source of Archer1 kinetics) characterized Archer1 only. No numeric value is published.
- **sensitivityData** — No Archer2 per-AP ΔF/F stored.  
  _why not fixed:_ The 25-40% per-AP figure is explicitly Archer1 (Fig. 3, titled 'Archer1 fluorescence tracks action potentials'; Archer2 has no per-AP data). No numeric Archer2 per-AP value is published.

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **description: '99× vs Arch WT' photocurrent suppression** → kept as: Archaerhodopsin variant that further suppresses photocurrents (~99× vs Arch WT, producing no peak current) at the expense of slower kinetics and lower sensitivity (60% ΔF/F per 100 mV) than its sibling Archer1 (~55×).  
  _basis:_ Flytzanis 2014 (ncomms5894.pdf) Results lines 74-76: 'Archer1 and Archer2 also have ~55 and ~99 reduced photocurrents ... respectively' (55×=Archer1, 99×=Archer2); lines 80-85: 'Archer2 produces no peak current, and an average steady state of 3.1 pA'. The QA note's claim that 55×=peak and 99×=steady-state FOR ARCHER2 is a misread — 55× is Archer1. Stored 99× was correct; wording clarified to include both sensors' figures and the no-peak-current fact so it reads as sourced, not cherry-picked.

---

## archon1

**⚠️ Contested (QA disputes the current value):**
- **CROSS-GEVI: apWidthData fwhm=1.1 ms, PV cells, Fig. 4h (from quasar6b characterization)** (high) — FWHM=1.1 ms value is correct and sourceFigure='Fig. 4h' is correct. Paper main text p.1089 states 'optical FWHM, 1.1 ± 0.15 ms, two animals' for somArchon1 in PV cells. Not a duplicate (quasar6b.json stores 0.87 ms at Ext. Fig. 8f). HOWEVER, the note text states 'n = 24 cells' — this is WRONG. The paper says 'n = 23 cells, two animals' for somArchon1 at ×25 objective (p.1089). n=24 is QuasAr6b's cell count, not Archon1's. The fwhm value itself is correct but the n in the note is off by 1 (24 vs 23 per paper). Flag for correction.

**➡️ Cross-GEVI data not yet applied:**
- `brightnessData[0] (ratio 28, reference 'arch')` (from **quasar2** paper) — Monakhov 2020 Table 1 brightness column is normalized to Arch(D95N)=1 (footnote b), NOT WT Arch. Stored against WT 'arch' page it is a misattribution (same bug removed from quasar2). Consider removing or re-pointing to an arch-d95n node; Archon1's WT-relative brightness should instead flow through the verified Fig 2b edges (Archon1 = 2.78× QuasAr2).
- `apWidthData` (from **quasar6** paper) — Consider adding optical spike FWHM from Tian 2023 Fig. 4h: Archon1 ≈ 1.1 ms (PV cells, 2 kHz). Only add if not already present and verify against rendered Fig 4h. (Flagged by prior sweep as a 'your call' item — not applied here to avoid cross-file clobber.)

---

## archon2

**⚠️ Contested (QA disputes the current value):**
- **spectrum.peakEm 693 (revert from 670 to 693)** (low) — CANNOT INDEPENDENTLY CONFIRM. Pixel analysis of Song 2024 Fig. 1 (left panel, Archon1 emission) is INCONCLUSIVE: the x-axis calibration is uncertain by ±8–10 nm due to ambiguity in tick interval (5nm minor ticks at 25 px each vs. original 20nm major ticks at 50 px each). With the 5px/nm calibration derived from counting 15 ticks at row 654 (25-26px spacing), the highest data point is at abs col ~795 → ~684 nm, inconsistent with 693 nm. The stored array internally peaks at index 43 = 693 nm (consistent with the stored value). The filter 676/37 nm is consistent with a peak between ~670–694 nm. The connecting line between data points peaks somewhere between ~683 and 693 nm depending on calibration. Visual inspection of the figure puts the peak 'just past' the 690 nm tick which is consistent with 690–695 nm. The 693 nm claim is PLAUSIBLE but independent pixel digitization cannot confirm 693 nm with confidence; uncertainty is ±8–10 nm. Flag for manual re-digitization with careful x-axis calibration.
- **spectrum.custom.emission array (121-point backup array, peak at index 43 = 693nm)** (low) — Array is internally consistent with peakEm=693 (index 43 = 1.0). However the underlying calibration that produced this array is not independently verifiable from the figure alone (same ±8–10 nm x-axis uncertainty as peakEm). The array shape (rising from 650nm, monotonically falling after 693nm, noisy tail above 740nm) is visually consistent with the figure. Cannot confirm or deny 693nm peak without a separately calibrated digitization. Same confidence issue as peakEm.
- **spectrum.note (documents 693nm, panel confusion, real tail scatter, verified calibration)** (medium) — The note claims '693 nm confirmed by independent pixel trace' and cites 'x-axis calibrated on the 650/770nm ticks'. Independent analysis found 15 minor ticks (5nm intervals, 25px each) not 2 major ticks at 650/770nm. The 650nm and 770nm tick-anchor calibration would give very different scale (2.53 px/nm) vs the 5px/nm from minor tick counting. The '693 nm confirmed' claim is overstated given the calibration ambiguity. The note's specific calibration method ('col685=770.0, 3.375px/nm') does not match independently derived tick spacing (25px per 5nm = 5.0px/nm). The '670nm is the RIGHT panel' claim is correct per figure visual: right panel IS miRFP670, left panel IS Archon1 emission.

**➡️ Cross-GEVI data not yet applied:**
- `brightnessData (Monakhov ratio 80, reference 'arch')` (from **quasar2** paper) — Same Arch(D95N)-vs-WT-arch misattribution as archon1 if present (Monakhov Table 1 Archon2=80× Arch(D95N)). Verify and remove/re-point; Fig 2b edge (Archon2 = 8.01× QuasAr2) is the reliable one.

---

## arclight

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **macq-morange2** paper) — Fig 5c blue averaged optical single-AP waveform (Arclight, avg over n=10 spikes) is plotted; can yield an optical FWHM, but requires a tight crop of just the blue waveform to avoid contamination from the blue legend dot in panel d (prior reading ~21 ms unreliable). doi:10.1038/ncomms4674, Fig. 5c.

---

## asap3

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **asap2s** paper) — Review/remove the fwhm=5.8 ms entry sourced to doi:10.1038/s41467-023-41975-3 Fig. 2f. Verified by rendering panel f: it is a 'Width at 30% maximum response' scatter (x-axis explicit), NOT an FWHM; ASAP3 (orange) sits at x~8 ms / y~20 ms, and 5.8 appears nowhere in the paper. The entry's note claiming the panel 'IS a true FWHM' is a misread of the caption's contradictory 'full-width at half-maximum' line. Same fabrication class as the rejected ASAP2s 6.8 ms entry — recommend deletion or relabel as width-at-30%-max (~8 ms), not fwhm.
- `brightnessData (reverse entry reference=restus)` (from **restus** paper) — asap3.json has a stale restus reverse edge ratio 0.51 sourceFigure 'Fig. 2C' (reciprocal of the retired rEstus/ASAP3=1.96/Fig.2C value). restus.json now uses 1.71 (Nair Table S1) as the rEstus/ASAP3 cross-value. Update asap3's reverse edge to reciprocal of 1.71 (~0.585) sourced doi:10.1021/acschemneuro.5c00670 Table S1, or remove as redundant with restus.json's forward 1.71 entry.

---

## asap4b

**❓ Unresolved judgment calls:**
- **photobleach (2P)** — Ext Fig 4b/c 2P photobleaching for ASAP4b is recovery/reversible-photoactivation dominated (main text lines 216-217)  
  _why not fixed:_ A power-only, recovery-dominated 2P curve is not a comparable clean monotonic bleach; digitizing it would misrepresent photostability. Genuine judgment call, left for human decision as documented by the prior sweep.
- **photobleach (Fig 2b) t75=59s** — Noisy in-vivo 1P trace; strict first-crossing of 0.75 could be read earlier than 59s  
  _why not fixed:_ Stored smoothed digitization crosses 0.75 at ~59s consistent with its own fit; re-digitizing a noisy in-vivo trace by eye would not clearly improve accuracy. Left as-is, matches curated value.

---

## asap4e

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **forces1** paper) — FORCE1s paper Fig 1K co-measures ASAP4e in-vitro optical response FWHM ≈4.2 ms (2P, 721 Hz, HEK293A, 2-ms command). doi:10.64898/2026.04.07.717088.
- `photobleach/photostabilityData` (from **forces1** paper) — FORCE1s Fig S1.2B co-measures ASAP4e 2P photostability (100 mW, 940 nm, 6 min): gray ASAP4e endpoint ≈0.60 at 360 s. doi:10.64898/2026.04.07.717088.
- `dynamicRangeData/voltage` (from **forces1** paper) — FORCE1s Fig 1E/1F co-measures ASAP4e steady-state: −70→−40 mV = 33.6±6.4%, −70→0 mV = 148±29% (2P, HEK293A, 33°C). doi:10.64898/2026.04.07.717088.

---

## asap5

**❓ Unresolved judgment calls:**
- **dynamicRangeData[1] (2P) / brightnessData[1]** — 2P dynamicRange -35.2% (Ext. Fig. 1b) and asap4e-relative brightness 1.5x sourced from Nature Methods 2026 (doi:10.1038/s41592-026-03043-8) and ASAP4 bioRxiv, neither in local Papers folder (Nature Methods paywalled).  
  _why not fixed:_ Could not open the primary source to independently re-verify. Both entries carry concrete source+sourceFigure and were confirmed real by the prior deep-audit; -35.2% is internally consistent with jedi3-audit's independently verified reading of the same Ext. Fig. 1b (JEDI-2P -41.8% reference in this entry's note). Per user directive (accept if confirmed real on documented source), left unchanged; already proofread:false.
- **photobleach (Voltron2525-Kv cross-GEVI, Fig S5E)** — Fig S5E co-plots Voltron2525-Kv, which rulebook 1i says should get a matching photobleach entry for cross-overlay.  
  _why not fixed:_ Editing other GEVI files is out of scope (recorded in crossGeviTODO). Also a genuine judgment call: ASAP5-Kv's trace in that panel is x2.3 time-rescaled while Voltron2's is not, so a same-panel cross-overlay would be misleading. Needs a human to choose skip vs add-with-caveat.

---

## asap6b

**➡️ Cross-GEVI data not yet applied:**
- `(new page)` (from **asap6c** paper) — Supplement Tables S2/S3/S4 hold complete data for ASAP6.2 (=ASAP6b), the DIRECT parent of ASAP6c, but no asap6b page exists: Vhalf -42.0, brightness 0.49, DR 92% (100-mV step, Table S2), 1AP 34% (Table S2), kinetics tau_on 3.74/tau_off 6.16 ms (Table S3), Kinetic index 0.36. Also ASAP6.1: Vhalf -19.0, DR 164%, 1AP 50%, kinetics 3.99/4.89 (Tables S2/S3), ASAP6.1-Kv 1AP 48% (Table S4). Curator should create asap6b (and optionally asap6-1) page and re-parent asap6c -> asap6b. Source doi:10.1101/2024.06.21.599617.

---

## asap6c

**❓ Unresolved judgment calls:**
- **parentId** — parentId=asap4b is a distant ancestor; the paper's actual engineering path (Supplement Tables S2/S3) is ASAP6.1 -> ASAP6.2 (=ASAP6b) -> ASAP6.3 (=ASAP6c), so the true direct parent is ASAP6.2/ASAP6b.  
  _why not fixed:_ The direct parent ASAP6.2 (=asap6b) has no page in src/gevis/ (verified: only asap6c.json exists among asap6* files). Per rulebook 1h, when the direct parent lacks a page the ancestor fallback (asap4b) is allowed and correct; the chain resolves cleanly asap6c->asap4b->asap3->asap2s->asap1 with no cycle. Creating an asap6b page and re-parenting is a curator decision outside this single-file targeted audit; recorded in crossGeviTODO.

---

## asap7y

**➡️ Cross-GEVI data not yet applied:**
- `photobleach` (from **asap5** paper) — Add matching Fig. 2g (doi:10.64898/2026.05.27.728040) 2P photobleach entry for ASAP7y (green, 940 nm curve, plateaus near 1.0 over 60 s) so it cross-overlays with the ASAP5 entry just added (same source + sourceFigure 'Fig. 2g'). 2P power-only, no t75/intensityMWmm2.

---

## bongwoori-r3

**➡️ Cross-GEVI data not yet applied:**
- `spectrum.peakEx` (from **bongwoori** paper) — Consider 490→488 for EGFP-curve consistency with siblings (prior sweep noted this but did not apply it to avoid parallel clobber). Verify the stored custom excitation peaks at 488/489 nm like the shared FPbase EGFP curve.

---

## cepheid1s

**⚠️ Contested (QA disputes the current value):**
- **apWidthData[0].note — sibling comparison value '~7.8 ms'** (high) — The note states 'comparable to the sibling Cepheid1b's separately-digitized ~7.8 ms from the same panel.' However, the current cepheid1b.json has fwhm=7.0, not 7.8. The 7.8 was a transient intermediate 300-dpi read that was present in the pre-round2 backup, then superseded by a 600-dpi re-digitization (7.0 ms, now live). The recheck agent wrote the 7.8 comparison at the moment cepheid1b showed 7.8, but cepheid1b was revised again to 7.0 in the same session. The note now contains a stale sibling value. The cepheid1s fwhm value itself (7.9 ms) is not independently verifiable from a rendered figure here (no separate pixel-level re-digitization was possible), but is plausible given Fig. 1D visual inspection and the τoff ≈ 3.5 ms anchor. The sibling comparison text should be updated to '~7.0 ms' to match current cepheid1b.json. Also: the pre-sweep and pre-recheck backups confirm cepheid1s had NO apWidthData at all before this sweep, so the 'digitized fresh' provenance claim is correct and the removal of the false cross-digitization claim is correct.

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **photobleach fit model change (monoexp → biexponential) — unreported silent edit** → kept as: biexp: a=0.027, tau=2.1, tau2=3646.9, r2=0.963, t75 omitted (kept)  
  _basis:_ Independent scipy re-fit reproduced both fits exactly (mono r2=0.8981/t75=869; biexp r2=0.9625/t75=948). Curve is genuinely biphasic (fast ~5% drop in first 15s then slow decline) which mono cannot represent; r2 gain is decisive. Removed mono t75 was an unanchored extrapolation (curve only reaches 0.768 in-window; paper gives only t50>13 min). Not a regression per revert-biased tie-break because reading is unambiguous.

---

## electricpk

**❓ Unresolved judgment calls:**
- **brightnessData[0]** — ratio 0.32 vs EGFP is a computed cpEGFP/GCaMP3 EC×QY estimate (10741/33600); the ElectricPk paper reports no brightness/EC/QY, so the entry has source 'estimated from cpEGFP (GCaMP3) EC×QY vs EGFP' and no sourceFigure.  
  _why not fixed:_ Judgment call: it is the only brightness datum and a legitimate curator-B2 component-FP fallback. Deleting removes all brightness data; inventing a figure label would be fabrication. Left for the human to keep / remove / re-source from a GCaMP3 paper (e.g. Tian 2009).
- **kinetics[0].off** — Off is bi-exponential (2.09 + 69.07 ms) with amplitudes unreported. Now stored as the 50:50 rulebook default (35.6 ms), but the true weighted mean is faster if the fast component dominates (as the figure and the paper's fast-comparison suggest).  
  _why not fixed:_ Amplitude split is not recoverable from the paper (no numbers, noisy figure). 35.6 is the reproducible default per rulebook B4; the exact value carries genuine uncertainty. Not a defect to 'fix' further without paper data.

---

## flicr1

**❓ Unresolved judgment calls:**
- **brightnessData[0] (ratio 1458 vs arch)** — Ratio 1458× vs arch exceeds the 50–500× normal-vs-arch band; cited to Piatkevich 2020 (acschemneuro.0c00046) Table 1.  
  _why not fixed:_ Piatkevich 2020 is not in Papers/flicr1 and could not be opened in this environment; cannot independently verify or correct. Left as stored (proofread:false).
- **kinetics (Milosevic 2020 fast τ 11.8 ms, Fig. 2E)** — Milosevic reports a FlicR1 fast component (~11.8 ms) from a double-exp fit but slow τ and amplitudes are not reported.  
  _why not fixed:_ Storing the fast component alone violates rule 1b (understates); amplitude-weighted mean not computable. Correctly omitted.
- **photostabilityData[0] (67% at 100 mW/mm²/1 min)** — 67% derived from paper's single-exp τ=150 s; the digitized Fig. 3I curve gives F(60 s)≈0.70.  
  _why not fixed:_ Value cites the paper's own τ and legitimately coexists with the photobleach array; ~3-point gap within reading error. Kept paper-derived value; flagged for human preference.

---

## flicr2

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **UNREPORTED CHANGE: dynamicRangeData[1].note substantially rewritten** → kept as: current note: '2P ΔF/F ≈ 24% ... (Fig. 2D: 0% at -70 mV, ~+20-24% at +30 mV for the gray FlicR2 curve...). The paper's own headline FlicR2 number is 19 ± 11% ΔF/F, but that is the narrower -40→+30 mV (70-mV) suprathreshold window quantified in Fig. 2E; ...' (sourceFigure Fig. 2D, deltaF 24 — UNCHANGED)  
  _basis:_ Yang 2026 text line 210-211: 'FlicR2 exhibited only 19 ± 11% ΔF/F (mean ± 95% CI) across the same suprathreshold voltage range... (Figure 2D, E)'. Fig 2 caption: (D)=steady-state F-V from -70 mV; (E)=quantification for 70-mV (-40 to +30 mV) steps. Rendered panel D @400dpi: gray FlicR2 curve ~20-25% at +30 mV. deltaF value 24 identical across pre-sweep/pre-recheck/current — nothing measurable changed; the expansion is verified-correct and the stray cross-paper token '(Fig. S2e caption)' present in pre-recheck is already removed. Revert-biased tie-break does not force a factual revert since no quantity was altered.
- **UNREPORTED CHANGE: dynamicRangeData[0].note and sourceFigure changed (Fig. S2 → Fig. S2e)** → kept as: current: sourceFigure 'Fig. S2e'; note '...ΔF/ΔV plot (Fig. S2e, dark-brown FlicR2 curve reaching ~13% at +50 mV); ... chord read off Fig. S2e is ~10.8%.' deltaF 12.9 — UNCHANGED  
  _basis:_ Kannan 2018 supplement Supp Fig 2 caption panel (e): 'Fluorescence-voltage (ΔF/ΔV) plots for FlicR1 and FlicR2 in HEK cells (n = 4 and 6 cells).' So 'Fig. S2e' is the correct, more precise panel. Main text confirms '12.9 ± 1.3% for a 120 mV step, n=6'. deltaF 12.9 identical across all versions. Reverting to vaguer 'Fig. S2' would reduce accuracy; QA itself confirmed 'Fig. S2e is the correct panel designation'.

---

## harclight1 🔴 (contains a real regression to revert)

**⚠️ Contested (QA disputes the current value):**
- **kinetics[0].note: acquisition rate changed from '1 kHz' to '400 Hz'** (high) — WRONG. The recheck agent introduced an error. Supplementary Table 6 caption (line 287–288 of 41589_2021_775_MOESM43_ESM.txt) explicitly states: 'Neurons expressing HASAP1 and HArclight1 were imaged at 1 kHz during whole cell voltage clamp.' Supplementary Figures 3 and 4 (kinetics traces for HASAP1 and HArclight1) both state 'Image acquisition rate 1200 Hz.' The 400 Hz rate is used for the F-V curve step protocol (main text line 599) and for field-stim AP imaging (line 563), not for kinetics measurements. The backup note correctly said '1.2 kHz'; the new note saying '400 Hz' is factually incorrect. REVERT to '1 kHz' (or '1,200 Hz') for kinetics.

---

## hvi

**⚠️ Contested (QA disputes the current value):**
- **Agent calibration claim: '50 ms gridline' used for pixel calibration** (high) — The Fig. 6F FWHMfluo. y-axis tops out at approximately 40 ms, with ticks visible at 0, 10, 20, 30, 40 ms. No 50 ms gridline is present. This is a minor error in the method-provenance description inside the note. It does NOT affect the stored fwhm=12 value (which relies on the 0/10/20 ms ticks alone), but the claim of using a '50 ms' gridline is unsupported by the figure. Low severity: note-only, no stored numeric impact.

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **hviplus** paper) — Add α-cell HVI-Cy3b optical FWHM from HVI+ paper Fig. 6F (α-cells group, 3 mM glucose resting box ≈11-12 ms; 200 Hz; mouse pancreatic islet α cells, ex vivo; 37°C; 1P 532 nm; dye Cy3b). Cross-measured in the HVI+ (hviplus) Science Advances 2025 paper, doi:10.1126/sciadv.ads1807. Verify exact box median by re-reading Fig. 6F before writing.

---

## hviplus

**❓ Unresolved judgment calls:**
- **addgene** — No Addgene/plasmid-deposit entry.  
  _why not fixed:_ Genuine absence — grep of main.txt + sm.txt found no addgene ID, GenBank, or deposit statement; HVI+ uses Tz-dye bioorthogonal chemistry, not a single deposited plasmid. Optional field per rulebook.
- **sensitivityData[0].deltaF** — Stored 22.3% (Fig 2C main-text headline) vs Table S2's 21.9% for the same HVI+-Cy3b per-AP measurement.  
  _why not fixed:_ Both are the paper's own values (Fig 2C headline n vs Table S2 n=5; rounding/n-set difference, not an error). The Fig 2C headline value with its correct sourceFigure is the appropriate display value.

---

## jarvis

**❓ Unresolved judgment calls:**
- **photobleach[0].t75 (extrapolated:true, 317 s)** — t75 lies 82 s beyond the last digitized point (235 s, F=0.80); biexp fit extrapolates 0.80→0.75 with no paper-stated t75 anchor.  
  _why not fixed:_ Rulebook leans to an honest lower bound when no paper anchor exists, but the fit is clean (r²=0.986), extrapolation is small, and it is already flagged extrapolated:true with an explanatory note. Reversing a deliberate prior decision is a human judgment call — not a regression to revert.
- **brightnessData (0.42×pace, 4.08×jedi2p)** — Both are SNR-derived proxies (F0 ∝ (SNR/ΔF/F)²), not direct EC×QY; directionality is counterintuitive (dimmer than pAce yet 4× JEDI-2P).  
  _why not fixed:_ Notes honestly disclose the proxy method; SNR inputs verified verbatim against paper (265/575/208); math reproduces the measured Jarvis/pAce ratio; 0.42×pace is the page's pre-existing established method. Keep-vs-remove of a proxy is an explicit human judgment call.

---

## jedi2p

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **2photron** paper) — Fig S9d (Villette 2024, 2Photron paper) reports optical spike FWHM for JEDI-2P-Kv ~0.72 ms in awake-mouse cerebellar Golgi cells (2P ULoVE, >3.5 kHz, n=10). Sub-ms fast-spiking-interneuron value; below the 1-20 ms sanity range — apply only if a sub-ms apWidth entry is acceptable. source doi:10.1101/2024.11.15.623698, sourceFigure 'Fig. S9', modality 2P, note cross-measured in 2Photron's paper.
- `apWidthData` (from **2photron** paper) — Main text (Villette 2024) line 233: cortical optical spike FWHM JEDI-2P-Kv 1.84 ± 0.46 ms (awake mouse V1 L2/3, 2P ULoVE) vs 2Photron-ST552 1.42 ± 0.13 ms (Fig. 3f). source doi:10.1101/2024.11.15.623698, sourceFigure 'Fig. 3f', modality 2P.
- `apWidthData` (from **forces1** paper) — FORCE1s paper Fig 3E co-measures JEDI-2P-Kv in-vivo optical spike FWHM = 1.4±0.3 ms (n=17, ULoVE 2P, 7.1 kHz, awake mouse V1 L2/3), and Fig 1K in-vitro FWHM ≈3.6 ms (2P, 721 Hz, HEK293A, 2-ms command). doi:10.64898/2026.04.07.717088. Verify against jedi2p's own paper before applying if a direct value exists.
- `photobleach/photostabilityData` (from **forces1** paper) — FORCE1s Fig S1.2B co-measures JEDI-2P 2P photostability (100 mW, 940 nm, 6 min, resonance-scanning): green/purple JEDI-2P endpoint ≈0.32 at 360 s. doi:10.64898/2026.04.07.717088.
- `dynamicRangeData/voltage` (from **forces1** paper) — FORCE1s Fig 1E/1F co-measures JEDI-2P steady-state: −70→−40 mV = 25.9±3.7%, −70→0 mV = 52±4% (2P, HEK293A, 33°C). doi:10.64898/2026.04.07.717088.

**❓ Unresolved judgment calls:**
- **dynamicRangeData (forces1 Fig 1E/1F)** — FORCE1s paper reports JEDI-2P steady-state −70→−40 mV = 25.9±3.7% and −70→0 mV = 52±4% (verified real). Incoming cross-GEVI proposed applying these.  
  _why not fixed:_ Both are sub-100-mV steps (30 mV and 70 mV), not the standard 100-mV −70→+30 window that all dynamicRangeData entries and the display median use. Adding them would mix window sizes and corrupt the |ΔF/F| median. The 100-mV F-V behavior is already captured in voltage.custom (origin-paper Fig. 2B). Left out pending a dedicated sub-window field if one is ever introduced site-wide.

---

## jedi3hyp

**❓ Unresolved judgment calls:**
- **researchPapers** — Only 1 paper (the 2026 origin, Nat Methods doi:10.1038/s41592-026-03043-8). No independent-use papers listed.  
  _why not fixed:_ JEDI-3hyp is a brand-new 2026 sensor; no qualifying independent-use papers exist yet. Not an error — flag for periodic recheck as adoption grows.

---

## jedi3sub

**❓ Unresolved judgment calls:**
- **researchPapers** — Only the origin paper (Nature Methods 2026) is listed; no independent-usage papers.  
  _why not fixed:_ Just-published 2026 sensor; an exhaustive external citation search needs web access not used here and is low-yield. Origin paper is correctly present.
- **spectrum (inheritance choice)** — No JEDI-3sub-specific published 1P spectrum exists; the displayed curve is inherited verbatim from parent jedi2p (501/519) rather than a directly-measured JEDI-3sub curve.  
  _why not fixed:_ Verified physically correct (paper reports only a 2P spectrum; JEDI3sub mutations are in the VSD / near the chromophore-VSD junction, not the cpGFP chromophore body). It is a provenance/inheritance decision, not a measurement, so it is flagged rather than changed.

---

## macq-mcitrine

**⚠️ Contested (QA disputes the current value):**
- **apWidthData[0] note claim 'peak amplitude ~4%' — accuracy vs Fig. 5c** (high) — Minor note inaccuracy: the note says 'peak amplitude ≈4% ΔF/F, consistent with the 4.8% peak-per-AP value.' However Fig. 5c green panel shows a scale bar of ΔF/F −3%, meaning the averaged waveform peak is approximately −3%, not ~4%. The 4.8% is the mean over individual spikes from Fig. 5d, not the n=16 averaged waveform in Fig. 5c. This does NOT affect the stored fwhm=10.2 value (which is the only numerical datum), but the note text is misleading. Low severity — note-only error, no data field is wrong.

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **macq-morange2** paper) — Fig 5c green averaged optical single-AP waveform (n=16 spikes, 20 ms scale bar) gives a cleanly measurable optical FWHM (~11 ms). Digitize the averaged waveform (not a train) and add to macq-mcitrine's own page. modality 1P, 440 Hz, cultured neurons, Fig. 5c, doi:10.1038/ncomms4674.

---

## macq-morange2

**❓ Unresolved judgment calls:**
- **crossGevi arclight apWidthData** — Arclight optical-AP FWHM is plotted in Fig 5c (blue averaged waveform) but the prior ~21 ms reading was contaminated by the blue Arclight legend dot in adjacent panel d.  
  _why not fixed:_ Out of scope for this scoped pass (cannot edit arclight.json) and the reading is unreliable without a dedicated tight crop of only the blue waveform. Recorded as crossGeviTODO.

---

## marina

**❓ Unresolved judgment calls:**
- **apWidthData** — No optical single-AP FWHM/half-width is stated in the paper, and the only single-AP-scale figure (Fig. 5) is a low-pass Kaiser-Bessel-30 (150 Hz cutoff) filtered multi-spike burst, not a clean averaged single-AP optical waveform.  
  _why not fixed:_ Genuine absence. Verified Fig. 5 caption (PDF p.516) confirms the filtering; deriving an FWHM from a filtered multi-spike trace would violate the no-fabrication rule (rulebook line 243 requires a stated width or a usable single-AP waveform).

---

## mermaid

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **dynamicRangeData[1] note: donor value 'mUKG (500 nm) −26.8 ± 2.7%'** → kept as: donor mUKG (500 nm) −6.8 ± 2.7%  
  _basis:_ Rendered Mutoh 2009 PLoS ONE e4555 Table 1 (page 3 PNG, 200dpi): Mermaid row donor ΔF/F = −6.8 ± 2.7% (500 nm). pdftotext -layout collapsed the leading minus glyph onto '6.8' giving the spurious '26.8'. QA flag confirmed correct; note fixed to −6.8. (Note-only fix — this is not the stored deltaF; deltaF=12.9 = ΔR/R is unaffected. Action reflects that QA's stated correct value −6.8 is the one I independently confirmed from the image.)
- **dynamicRangeData[1] note: voltage step '+60 mV step from −70 mV (=130-mV span)'** → kept as: +40 mV step from a holding potential of −70 mV (=110-mV span)  
  _basis:_ Mutoh 2009 Results: 'Emission spectra were recorded during the last 1100 ms of a 1200 ms step to −100 mV (hyperpolarization) and +40 mV (depolarization) from holding potential (VH) −70 mV ... summarized in Table 1.' Table 1 = CCD spectral experiment (+40 mV step, 110-mV span). The +60 mV/130-mV span belongs to the separate Fig.3 two-photodiode experiment (mUKG 25.5%, mKOκ 5.9% — NOT Table 1). QA flag confirmed correct; note fixed and the two experiments disambiguated.

---

## mermaid2

**❓ Unresolved judgment calls:**
- **apWidthData** — Paper reports only electrical AP command half-widths (1.85/1.50 ms, Suppl Fig 6; 2.1 ms Methods) used as voltage commands; no averaged single-AP OPTICAL waveform with a ms scale for optical FWHM (Fig 6B is single-trial train responses).  
  _why not fixed:_ Rulebook 1j requires an optical single-AP FWHM. No digitizable clean optical single-AP trace exists; digitizing would be fabrication. Genuine absence.
- **brightnessData/photostabilityData/photobleach/addgene** — None reported in the origin paper (the only paper). No EC×QY, no EGFP/relative-intensity comparison, no photobleach figure, no photostability value.  
  _why not fixed:_ Nothing to source in main text or supplement; plasmid distributed via RIKEN BRC (not Addgene). Genuine absences.

---

## nirbutterfly

**❓ Unresolved judgment calls:**
- **kinetics** — Song 2024 (Neurophotonics, Fig 3d) reports a population synaptic-response decay τ for nirButterfly (17.5±3.15 ms single-pulse; 15.5±1.11 ms 5-pulse; single-exp, acute CA3 slices, Schaffer-collateral stim).  
  _why not fixed:_ Population field-response decay in acute slices — a different prep and physical quantity than the stored HEK293 single-cell voltage-step τOFF (2.13 ms). Adding it as an off-value would be non-comparable and would pollute the displayed kinetics median. Documented judgment call; recommend leaving out.
- **dynamicRangeData[0]** — Table 1 lists −16%/100 mV while the stored primary DR is the neurons donor −9.8% ΔF/F; the two disagree within the same paper.  
  _why not fixed:_ The prior audit deliberately stored the explicitly-stated neurons donor −9.8% and documented Table-1's −16% in the note (likely a best-case/full-range figure). Not a clear error to overwrite; left as documented decision.

---

## novarch

**❓ Unresolved judgment calls:**
- **subthresholdData[0].slope** — 0.41 %/mV is derived from the whole-range 41%/100 mV, not a measured -90->-50 mV subthreshold slope (paper reports none).  
  _why not fixed:_ F-V is near-linear so average slope approximates subthreshold slope; note now explicitly discloses the derivation. Keep-vs-remove is a human judgment call, not fabrication.
- **kinetics[0].temperature** — HEK293 whole-cell voltage-clamp recording temperature (25°C) is an assumption, not stated in the paper.  
  _why not fixed:_ Re-read Methods (main.txt line 700-715): the paper genuinely does not state the HEK recording temperature. The note already discloses the assumption. No source exists to correct it.

---

## pacer

**❓ Unresolved judgment calls:**
- **addgene.id** — 195534 accepted on prior documented web-verification (prior agent + QA confirmed 195534=pAceR on Addgene.org); origin paper only says plasmids 'available through Addgene' with no explicit ID.  
  _why not fixed:_ curl to addgene.org is blocked and WebFetch is unavailable in this sandbox; cannot independently re-verify. Value already applied by sweep and confirmed by the deep-audit agent — accepted per accept-if-confirmed-real directive.
- **researchPapers** — Cannot machine-verify the 2-paper list is exhaustive (citation-tracking APIs blocked).  
  _why not fixed:_ No web/citation access; list is plausible for a niche 2022 sensor and not a defect I can prove either way.

---

## positron

**❓ Unresolved judgment calls:**
- **dynamicRangeData[0]** — deltaF=23 is labeled/noted as the +30 mV (−70→+30) value, but Fig 2a reads ~20% at +30 mV and ~23% at +50 mV — 23 is the +50 mV read. Correct −70→+30 value (~20%) is already in DR[1].  
  _why not fixed:_ Entry is proofread:true (human-locked); rulebook forbids value replacement and note-rewrites on proofread entries. Not a QA-flag, so not eligible for revert here.
- **researchPapers** — Janelia figshare deposit (doi:10.25378/janelia.21534411), cited as source for dynamicRangeData[3] and sensitivityData[1], is not listed in researchPapers.  
  _why not fixed:_ It is a figshare dataset deposit (PatcherBot assay), not a peer-reviewed research paper; adding it to researchPapers is a judgment call the prior audit deliberately declined and no paper text resolves it.

---

## positron2

**❓ Unresolved judgment calls:**
- **parentId** — Positron2 (R78K N81D D92N W178F) shares R78K+W178F with pAce but N81D+D92N with Positron; direct molecular parent not stated.  
  _why not fixed:_ The only source (Janelia figshare 2022 dataset) does not state the engineering parent; kept the plausible existing 'pace' assignment rather than guessing.
- **kinetics/brightnessData/photostabilityData/photobleach/apWidthData** — All absent for Positron2.  
  _why not fixed:_ No available source reports them; the figshare screening set has no kinetics traces, bleach curve, or Positron2-attributed AP waveform to read or digitize.

---

## props

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **voltage.custom.deltaF (F-V curve re-digitization)** → kept as: [-47,-41,-29,-13,0,19,42,55,75,91,100,112]  
  _basis:_ Independent numeral-center calibration (x: px=1012.5V+471.1, 0V@px471; y: F=1@py386.5, 51.37px/unit) reproduces the sweep's F readings (F(-70)=2.68, F(+30)=5.12) and yields a near-identical array. Paper anchor 'five times as bright at +70 vs -170 mV' → my calib gives 5.0x; QA calib gave impossible 11.6x. QA flag was a false alarm from the reviewer's own miscalibration (0V@px452.5, F=1@py411). Backup [-39,-34,...] is understated (assumed F(-70)=2.34), so NOT reverted.

---

## quasar1

**❓ Unresolved judgment calls:**
- **photobleach** — Paper states QuasAr1 photobleaching monoexponential tau=440 s at 300 W/cm2 (main text) but no fluorescence-vs-time bleach FIGURE for QuasAr1 exists (verified: Supp Fig 5 = QuasAr2, Supp Fig 6D = ArcLight tau=70s).  
  _why not fixed:_ Constructing a photobleach[] curve from a single stated tau (no digitizable figure) would synthesize/fabricate data points, which the rules forbid. Existing photostabilityData (87% @ 3000 mW/mm2/1 min, derived from tau=440 s) already captures this honestly.
- **researchPapers** — Only 1 paper (origin, Hochbaum 2014).  
  _why not fixed:_ QuasAr1 was superseded by QuasAr2 within the same publication and is essentially unused independently in the literature. A single-paper list is accurate, not a defect; adding QuasAr2-only papers would misattribute data.

---

## quasar3

**❓ Unresolved judgment calls:**
- **apWidthData[0].fwhm** — 1.8 ms derived by manual digitization of Fig. 1i blue Soma STA (88 spikes); paper reports no numeric FWHM and a fresh auto-redigitization is contaminated by adjacent legend/panel-j text.  
  _why not fixed:_ Store-only (not displayed), visually plausible (soma trace is the narrowest of the three STA traces), and no paper number exists to apply. Overwriting with a worse automated value would degrade it. Genuine judgment call — left as the documented manual value.

---

## quasar6

**❓ Unresolved judgment calls:**
- **sensitivityData[0].deltaF** — Fig. 3i shows QuasAr6a per-spike ΔF/F ≈ 0.238 (~24%); stored value is 23.  
  _why not fixed:_ Within visual-reading tolerance; entry is proofread:true. QA agreed a 1% change to a human-approved value is not warranted.

---

## quasar6b

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **quasar6** paper) — Consider adding optical spike FWHM from Tian 2023: somQuasAr6b 2.3 ± 0.3 ms (Fig 4d,e, NDNF) and/or 0.87 ms (PV cells, 2 kHz, Fig 4h). Verify against figure before applying.

---

## restus-ni

**🔁 Sweep value kept over the original QA flag (verify if you disagree):**
- **kinetics[0].on: 153 → 178 (τs,on=0.52s, rs=0.24 at 0 mV)** → kept as: 181  
  _basis:_ Fig. S6C rendered @500dpi + pixel-calibrated (y-ticks 2.0/1.5/1.0/0.5/0.0 s @186px/s; x-ticks −100/−50/0/50 mV). At 0 mV: τs,on marker centroid = 0.488 s, rs (top subpanel, ticks 0.6/0.4/0.2) = 0.265. Weighted on = 0.735·70 + 0.265·490 = 181 ms — decisively at the sweep value (178), far above backup 153. QA's 0.44 s under-read did not separate the marker centroid from the error bar/red fit.

---

## solaris

**❓ Unresolved judgment calls:**
- **parentId** — parentId 'cepheid1b' but paper says Solaris replaced the FP in the ECL1 of 'Cepheid1b/s' generically; both cepheid1b (brightness) and cepheid1s (photostability) exist as pages and no single molecular parent is named.  
  _why not fixed:_ Genuine judgment call with no paper support for one specific Cepheid variant; cepheid1b is defensible (Solaris emphasizes brightness) so left as-is per QA guidance.

---

## somarchon

**❓ Unresolved judgment calls:**
- **sensitivityData / dynamicRange notes: λex=637 nm** — Notes state λex=637 nm for the Fig. 1c/1d brain-slice ΔF/F_AP recordings, but the Fig. 1c caption reads λex=488 nm at 1.5 W/mm²; unclear which applies to the box-plot medians  
  _why not fixed:_ Not a QA flag and out of scope of this targeted pass; predates the sweep; resolving would need careful re-reading of the full Fig. 1 caption to attribute λex per sub-panel — left to avoid an unverified edit

---

## varnam

**❓ Unresolved judgment calls:**
- **dynamicRangeData[2].deltaF** — -17.9% is over a 110-mV (-70→+40) window, not the 100-mV standard; verified verbatim in Cepheid main text, but no -70→+30 value is published.  
  _why not fixed:_ The paper gives no -70→+30 number and reading it off the overlapping Fig 1B curves would be fabrication; kept the paper's explicit 110-mV value with the window honestly documented in the note.
- **parentId** — parentId='ace2n-mneon' but VARNAM's true direct molecular parent is Ace-mRuby3 (Ace-WR-mRuby3 N81S).  
  _why not fixed:_ No ace-mruby3 page exists in src/gevis/; ace2n-mneon is the nearest existing predecessor (same Ace opsin + Opsin-FRET architecture). A human judgment call; changing it would break the visible lineage without a better target.
- **dynamicRangeData[0] (Beck 2019 -10.8, Fig 2c) / sensitivityData[1] (Beck 2019 5.3, Fig 3a)** — Beck 2019 (Sci Rep) DR -10.8 and sens 5.3 figure-panel numbers not independently re-verified.  
  _why not fixed:_ The Sci Rep PDF is not in the local Papers directory; values are pre-existing, plausible, and were not touched by the sweep, so left unchanged rather than removed or altered without a source in hand. (Abdelfattah 2023 subthreshold 0.104 %/mV was verified via web search and is correct.)

---

## varnam2

**➡️ Cross-GEVI data not yet applied:**
- `dynamicRangeData` (from **varnam** paper) — Add DR -26.7% ±1.7 (n=7 cells) over -70→+40 mV (110 mV window) in HEK293T, from Han 2023 Cepheid paper (doi:10.1126/sciadv.adi4208, main text; F-V curves Fig. 1B). Note window is 110 mV, not the 100 mV standard. modality 1P, sign negative, proofread:false.
- `sensitivityData` (from **varnam** paper) — Add per-AP sensitivity 9.0% ±1.2 in cultured rat hippocampal neurons, from Han 2023 Cepheid Fig. 1C (VARNAM2 red bar; text: 'VARNAM2 (9.0±1.2%)'). modality 1P, proofread:false.

---

## vega

**❓ Unresolved judgment calls:**
- **parentId** — parentId = cepheid1b, but Vega is engineered from the Cepheid design template (FP inserted into Ace2 first extracellular loop + D81C), not from a specific Cepheid variant; cepheid1b vs cepheid1s is arbitrary and neither variant is singled out as the molecular parent.  
  _why not fixed:_ Lineage judgment call. Paper (main text p.2) confirms 'same design logic' as Cepheid but builds Vega directly on the Ace2 scaffold with mBaoJin(3M); no evidence names one Cepheid variant as the molecular ancestor. Changing it is not clearly warranted; left as-is per documented design-template rationale.

---

## voltron

**⚠️ Contested (QA disputes the current value):**
- **Pre-sweep backup value off=2.83 (should this be reverted?)** (high) — The pre-sweep value of 2.83 was computed using onset %fast (~53%) for the decay weighting, which the figure directly contradicts. The decay bar for Voltron525 (blue) is clearly and measurably above the 50% gridline (~60%), not at 53%. Reverting to 2.83 would reintroduce an error. The recheck agent's 2.56 is correct. Do NOT revert.

---

## voltron2

**➡️ Cross-GEVI data not yet applied:**
- `apWidthData` (from **2photron** paper) — Fig S9d (Villette 2024, 2Photron paper) reports optical spike FWHM for Voltron2-ST552 ~0.85 ms in awake-mouse cerebellar Golgi cells (2P ULoVE, >3.5 kHz, n=11). Sub-ms; below 1-20 ms sanity range. source doi:10.1101/2024.11.15.623698, sourceFigure 'Fig. S9', modality 2P, note cross-measured in 2Photron's paper.
- `photobleach` (from **asap5** paper) — Fig. S5E (doi:10.1016/j.neuron.2024.08.019) co-plots Voltron2525-Kv alongside ASAP5-Kv. JUDGMENT CALL: ASAP5's trace is x2.3 time-rescaled (SNR-matched) while Voltron2's is not, so a same-panel cross-overlay via matching source+sourceFigure would misrepresent Voltron2's real time axis. Decide skip vs add-with-time-base-caveat before writing.

**❓ Unresolved judgment calls:**
- **apWidthData[1].fwhm** — ~7 ms optical FWHM is approximate: at 484 Hz only ~3–5 samples span the sharp spike, so ±2 ms  
  _why not fixed:_ Genuine measurement-precision limit of the source figure; a real trace exists so deletion is not warranted, and 7 ms is the best-supported value at the verified calibration

---

## vsfp1

**❓ Unresolved judgment calls:**
- **researchPapers** — Only 1 paper (Sakai 2001). No downstream experimental re-use of VSFP1.  
  _why not fixed:_ VSFP1 is the prototype construct, poorly trafficked and immediately superseded by VSFP2.x, so it is not re-characterized in later papers. Verified Sakai 2001 is the origin paper; adding more would be fabrication. Judgment call left for the human if a fresh citation crawl is wanted.
- **voltage.custom** — F-V points sit on the paper's linear regression line mapped onto absolute-Vm labels, not raw scatter markers read at absolute voltages.  
  _why not fixed:_ Confirmed by rendering Fig. 3B that the x-axis is deltaVm (change), so scatter markers cannot be uniquely mapped to absolute membrane potentials; the paper reports the F-V ONLY as a linear slope (1.8+/-0.1%/100 mV, r=0.99). The stored points reproduce that slope re-referenced to -70=0 within the measured deltaVm span (no extrapolation). Honest representation for a purely-linear sensor; a judgment call, not an error.

---

## vsfp2

**❓ Unresolved judgment calls:**
- **parentId** — parentId 'vsfp1' is a conceptual successor, not a direct molecular parent — VSFP1 is Kv2.1-VSD CFP/YFP FRET whereas VSFP2.1 is a Ci-VSP-VSD redesign (R217Q).  
  _why not fixed:_ No nearer parent exists in src/gevis/ (VSFP2A–D have no pages; only vsfp1/vsfp2/vsfp2_3/vsfp3_1 exist). VSFP-tree convention keeps vsfp1 as branch anchor; changing it would orphan the node. Human judgment call.
- **researchPapers** — Only 2 papers listed.  
  _why not fixed:_ VSFP2.1 (2007) was a prototype immediately superseded by VSFP2.3; independent downstream use of the 2.1 variant specifically is effectively nil. The 2 Knöpfel-lab characterization papers are appropriate; a broader sweep is unlikely to add qualifying entries.

---

## vsfp2_3

**❓ Unresolved judgment calls:**
- **kinetics (Mishina 2014 entry) temperature** — Recording temperature stored as 35°C but Mishina 2014 Table 1 does not restate it for the VSFP2.3 row (values labeled 'From Mishina et al. 2012').  
  _why not fixed:_ 35°C is the Knöpfel-lab PC12 patch-fluorometry standard (used in the local Mutoh 2009 & Lundby 2010) and is transparently disclosed in the entry note. The definitive value would be in Mishina 2012 Neuron, which is not local, and WebFetch/curl are unavailable in this environment. Not a fabrication — a disclosed assumption.
- **voltage.custom (F-V)** — F-V is a normalized-Boltzmann shape (Mutoh 2009 Fig. 3B) rescaled to ΔR/R via a 15.2% full-range anchor, not signed ΔF/F points read directly from a figure.  
  _why not fixed:_ Confirmed against the local Mutoh 2009 PDF: Fig. 3B is a normalized 0→1 acceptor ΔF-voltage curve (V½ −49.5 mV) and NO signed-ΔF/F-vs-V figure exists in any paper, so direct reading is impossible. The rescale follows the documented project method and is fully disclosed in voltage.note; changing it would require a figure that does not exist.

---

## vsfp3_1

**❓ Unresolved judgment calls:**
- **kinetics.off** — Deactivation time constant (τ_off) for VSFP3.1_Cerulean is not present in any accessible source.  
  _why not fixed:_ Perron ChemBiol text explicitly places OFF properties in Table S1 (supplementary), which is not in the local PDF; Table 1 (local) contains only ON properties. Akemann 2009 BpJ provides model OFF rate constants (S1,OFF 0.074/ms etc.) but those are kinetic-model transition rates, not a fitted fluorescence τ_off, so they cannot be stored as a measured value. No primary source available; estimation disallowed. Genuine data gap.

---

## vsfpbutterfly

**❓ Unresolved judgment calls:**
- **brightnessData[0].sourceFigure** — Missing sourceFigure; entry is a component-FP EC×QY estimate (mCitrine 77000×0.76 / 33600 EGFP anchor = 1.74), not from a paper figure.  
  _why not fixed:_ Value verified correct with site-standard /33600 anchor but there is no figure to cite; fabricating a figure label would be wrong. Judgment call, left per prior convention.
- **voltage.sourceFigure vs custom values** — sourceFigure/sourceImage is Fig. 2C (normalized Boltzmann) while signed deltaF amplitudes were cross-checked against Fig. 2B step traces.  
  _why not fixed:_ Both panels describe the same PC12 F-V; digitized shape is from Fig. 2C and values agree with Fig. 2B. No mismatch to correct — noted for transparency.

---

