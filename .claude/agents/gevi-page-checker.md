# GEVI Page Checker

Audit a GEVI's JSON file for missing data, fabricated spectra/curves, and incomplete paper lists — then fix what's wrong.

## Input
- GEVI name (or `"all"` to check every file in `src/gevis/`)

---

## Workflow Overview

For each GEVI being checked, run these steps in order:

1. **Read the JSON file** and flag missing/suspect fields
2. **Check for fabricated spectrum data** (Gaussian fakes)
3. **Check for fabricated F-V curve data** (fitted/extrapolated fakes)
4. **Fetch the original paper** and extract any missing performance data
5. **Verify the research paper list is exhaustive** and search for additional missing data in other papers

After all checks, write fixes directly to the JSON file and produce a summary report.

---

## Step 1: Check for Missing Performance Data

Read the GEVI's JSON file:
```
Read: src/gevis/{id}.json
```

Check whether each of these raw data fields exists and is non-empty:

| Field | Required format | Flag if... |
|-------|----------------|------------|
| `kinetics` | Array of `{ on, off, temperature, source, sourceFigure }` | Missing entirely, empty array, missing `source`, missing `temperature`, or missing `sourceFigure` |
| `dynamicRangeData` | Array of `{ deltaF, sign, source, sourceFigure }` | Missing entirely, empty array, missing `source`, or missing `sourceFigure` |
| `sensitivityData` | Array of `{ deltaF, source, sourceFigure }` | Missing entirely, empty, or missing `sourceFigure` |
| `brightnessData` | Array of `{ ratio, reference, source, sourceFigure }` | Missing entirely, empty, or missing `sourceFigure` |
| `photostabilityData` | Array or `"bioluminescent"` | Missing entirely, empty, or missing `sourceFigure` on any entry |
| `subthresholdData` | Array of `{ slope, source, sourceFigure }` | Missing — note as "optional but preferred" |
| `spectrum.custom` | Object with `minEm`, `emission`, optionally `minEx`, `excitation` | Missing or absent |
| `voltage.custom` | Object with `voltage` and `deltaF` arrays | Missing or absent |
| `voltage.sourceImage` | String path to `public/fv-sources/{id}.jpg` | Missing — needs cropped figure from PMC |
| `voltage.sourceFigure` | String like `"Fig. 2E"` | Missing |
| `researchPapers` | Array of paper objects | Missing, empty, or suspiciously short for a well-cited GEVI. **The original paper (matching `paperUrl`) must always be included as the first entry.** Every GEVI should have at least 1 paper. |
| `addgene` | Object with `id` and `url` | Missing — note as "optional" |

Also check for **legacy hardcoded score fields** that should NOT be in the JSON:
- `speed`, `dynamicRange`, `sensitivity`, `brightness`, `photostability`, `overall`, `paperCount`
- If any of these exist, flag them for removal.

### `sourceFigure` formatting — strict

When you add or fix a `sourceFigure` value, follow these formats exactly. Flag any existing entry that uses a non-conforming format and rewrite it.

| Source location | Required format | Wrong examples to flag and fix |
|-----------------|------------------|----------------|
| Main figure | `"Fig. 1"`, `"Fig. 2A"`, `"Fig. 3B"`, `"Fig. 4e"` | `"Figure 1"`, `"figure 2A"` |
| **Supplementary figure** | `"Fig. S1"`, `"Fig. S2a"`, `"Fig. S3B"` | `"Supplementary Figure 1"`, `"Suppl. Fig. 1"`, `"SI Fig 1"` |
| Main table | `"Table 1"`, `"Table 2"`, `"Table 3"` | — |
| **Supplementary table** | `"Table S1"`, `"Table S2"`, `"Table S2.4"` | `"Supplementary Table 1"`, `"Suppl. Table 1"` |
| Extended Data (Nature journals) | `"Extended Data Fig. 4e"`, `"Extended Data Table 1"` | — |
| Stated only in the running paragraph (no figure or table) | `"Main text"` | `"text"`, `"paragraph"` |
| Stated in the abstract | `"Abstract"` | — |
| Stated in Methods | `"Methods"` | `"methods section"` |

Never leave `sourceFigure` blank or use vague labels like `"figure"` or `"table"`. If a value can't be attributed to a specific location, remove the entry rather than leave the attribution unclear.

Record all findings in a checklist before proceeding.

### 1b. Validate kinetics values

If `kinetics` exists, check for suspicious values:

**Reasonableness range by category:**

| Category | Typical τ_on + τ_off range | Flag if... |
|----------|---------------------------|------------|
| Opsin-based (Arch, Archon, QuasAr, etc.) | 0.1–5 ms | τ_on + τ_off > 20 ms or < 0.05 ms |
| VSD-cpGFP (ASAP family) | 0.5–10 ms | τ_on + τ_off > 30 ms or < 0.1 ms |
| VSD-FRET (VSFP, Mermaid, Butterfly) | 2–100 ms | τ_on + τ_off > 200 ms or < 0.5 ms |
| Chemigenetic (Voltron, HVI+) | 0.1–5 ms | τ_on + τ_off > 20 ms or < 0.05 ms |

**Additional checks:**
- τ_on or τ_off is exactly 0 → flag as likely placeholder
- τ_on and τ_off are identical (e.g., both 5.0) → flag as suspicious; real kinetics are almost never perfectly symmetric
- Missing `source` field → flag; every kinetics entry must cite a paper
- Missing `temperature` field → flag as WARNING; kinetics vary dramatically with temperature (e.g., 2× faster at 37°C vs room temperature), so the measurement temperature is essential context. Search the paper's Methods section for the recording temperature and add it.
- **Temperature must always be a numeric value in °C** (e.g., `"25°C"`, `"34°C"`, `"37°C"`). Never use descriptive strings like `"RT"`, `"room temperature"`, or `"physiological"`. Convert: room temperature → `"25°C"`, physiological temperature → `"37°C"`. If a paper says "near-physiological" or gives a range like "33-34°C", use the range string `"33-34°C"`.
- Multiple entries with the same `source` DOI → flag as duplicate

### 1c. Validate brightness values

If `brightnessData` exists, check for suspicious values:

**Reasonableness checks:**
- `ratio` is 0 or negative → flag as invalid
- `ratio` > 10 (claiming >10× brighter than reference) → flag as suspicious unless reference is a dim opsin (e.g., `"arch"` where ratios of 50–500× are normal)
- `reference` is not a valid GEVI id in `src/gevis/*.json` and is not `"EGFP"` → flag as broken reference (use `Glob` to check)
- Missing `source` field → flag
- Multiple entries with identical `source` and `reference` → flag as duplicate

**Cross-reference check:**
If GEVI A says `brightnessData: [{ ratio: X, reference: "B" }]`, check whether GEVI B's file has a reciprocal entry `{ ratio: ~1/X, reference: "A" }`. If not, it's not an error — but note it as "one-directional comparison" for awareness.

### 1d. Validate dynamic range values

If `dynamicRangeData` exists:
- `deltaF` is 0 → flag as placeholder
- `sign` is missing or not `"positive"`/`"negative"` → flag
- `sign` doesn't match the sign of `deltaF` (e.g., sign is "positive" but deltaF is -35) → flag as inconsistency
- `|deltaF|` > 200 → flag as suspiciously large (only a few GEVIs exceed this)
- Check consistency with `voltage.polarity` — they should agree

### 1e. Validate photostability values

If `photostabilityData` is an array:
- `brightnessRemaining` > 100 or < 0 → flag as invalid
- `brightnessRemaining` is exactly 100 → flag as suspicious (no photobleaching at all is unusual)
- `illumination` string doesn't contain "mW/mm²" → flag as unparseable
- `duration` string doesn't contain "min" or "s" → flag as unparseable
- Missing `source` → flag

If `photostabilityData` is a bare number (legacy format, e.g., `"photostability": 90`) → flag for conversion to array format or `"bioluminescent"`.

---

## Step 2: Check for Fabricated Spectrum Data

The app generates fake Gaussian curves when `spectrum.custom` is absent. But some files have `spectrum.custom` that is ALSO fake — generated from a Gaussian or symmetric bell curve rather than real measured data.

### Detection heuristics

**2a. No custom data at all:**
If `spectrum.custom` is absent, flag: "Spectrum is using Gaussian fallback — needs real data from FPbase or paper."

**2b. Suspiciously symmetric emission:**
Real fluorescence spectra are asymmetric — they have a sharper rise and a longer tail on the red side. A perfectly symmetric bell curve is a fabrication signal.

Check: compare the number of points from `minEm` to the peak vs from the peak to the end. If they are within 10% of each other AND the curve is smooth (no shoulders or secondary peaks), flag: "Emission spectrum appears symmetric/Gaussian — likely fabricated."

**2c. Suspiciously smooth excitation:**
Real excitation spectra often have vibronic shoulders or secondary peaks. A single smooth Gaussian is suspicious.

**2d. Too few data points:**
If the emission array has fewer than 50 points, the data may be at coarse resolution (e.g., 10nm intervals stored as 1nm). Check: if the array length doesn't match `(expectedRange / 1nm)`, flag resolution mismatch.

**2e. Cross-check with FPbase:**
For any GEVI containing a known fluorescent protein, verify that `spectrum.peakEx` and `spectrum.peakEm` match FPbase values (within ±5nm). If they don't match, flag the discrepancy.

### How to fix

Follow the same procedure as the curator agent's **Step E** (Build the excitation/emission spectrum):

1. **Priority 1 — FPbase:** Identify the fluorescent protein or dye used by the GEVI. Fetch its spectrum from FPbase using the GraphQL API:
   ```
   WebFetch: https://www.fpbase.org/graphql/ (POST)
   Body: {"query": "{ spectrum(id: ID) { data subtype owner { name } } }"}
   ```
   Or use playwright-cli with `--headed` flag to search FPbase spectra viewer and extract spectrum IDs, then fetch via `/api/spectrum/{id}/`.

2. **Priority 2 — Paper figures:** If FPbase doesn't have the fluorophore, digitize from the paper's spectrum figure.

3. **Priority 3 — Manufacturer spectra:** Check Thermo Fisher SpectraViewer, Chroma, etc.

Update `spectrum.custom` with real data: `minEx`, `excitation[]`, `minEm`, `emission[]` at 1nm resolution, normalized to max=1.0.

---

## Step 3: Check for Fabricated F-V Curve Data

The app generates a generic sigmoid when `voltage.custom` is absent. Some files have `voltage.custom` that was fabricated by fitting a Boltzmann/sigmoid function rather than reading actual data points from a paper figure.

### Detection heuristics

**3a. No custom data at all:**
If `voltage.custom` is absent, flag: "F-V curve is using sigmoid fallback — needs real data from paper."

**3b. Too many evenly-spaced points:**
Real F-V data from voltage-clamp experiments typically has 5–15 points at specific step voltages (e.g., -120, -100, -80, -60, -40, -20, 0, 20, 40, 60 mV). If `voltage` array has >20 points at perfectly even 1mV or 5mV spacing, it was likely generated by a function, not read from a figure.

Check: if `voltage.length > 20` AND all intervals are identical, flag: "F-V curve appears to be from a fitted function — too many evenly-spaced points."

**3c. Perfect sigmoid shape:**
Real F-V curves often have slight asymmetry, noise, or saturation plateaus that don't perfectly match a Boltzmann function. A perfectly smooth sigmoid is suspicious.

Check: compute the second derivative of the deltaF array. If it changes sign exactly once (single inflection point) and the curve is perfectly monotonic, it may be fabricated.

**3d. Missing source:**
Check that `voltage.source` exists and is a `doi:...` string. This is a top-level field inside `voltage` (not inside `voltage.custom`) that identifies which paper the F-V curve was read from. If absent, flag: "Missing `voltage.source` — add the DOI of the paper the F-V data was read from."

**3f. Missing source figure inset:**
Check that `voltage.sourceImage` and `voltage.sourceFigure` exist. The F-V panel displays a small inset thumbnail of the original figure from the paper so users can visually verify the data.
- If `sourceImage` is missing, flag: "Missing F-V source figure inset — create one from PMC."
- If `sourceImage` is set, verify the file exists at `public/{sourceImage path}` via `Glob`.
- If `sourceFigure` is missing, flag: "Missing `voltage.sourceFigure` — add the figure label (e.g., 'Fig. 2E')."

**How to fix missing source figure inset:**
1. Find the paper on PMC: `WebFetch: https://pubmed.ncbi.nlm.nih.gov/?term={DOI}` to get the PMCID
2. Fetch the PMC page to find figure image URLs
3. Download the figure containing the F-V curve
4. Use Python PIL to crop just the F-V panel. Iterate on crop coordinates until only the F-V plot is visible.
5. Save to `public/fv-sources/{gevi-id}.jpg` (JPEG, quality=90)
6. Set `voltage.sourceImage` to `"/fv-sources/{gevi-id}.jpg"` and `voltage.sourceFigure` to the figure label (e.g., `"Fig. 2E"`)

If the paper is not on PMC (no free full text), skip and note in the report.

**3e. Baseline normalization check:**
Verify that `deltaF` at -70mV equals 0 (or the closest voltage to -70mV has deltaF near 0). If not, flag: "F-V curve not normalized to -70mV baseline."

**3g. Polarity consistency:**
Check that `voltage.polarity` matches the actual direction of `deltaF` values:
- `"negative"` → deltaF should decrease (become more negative) with depolarization
- `"positive"` → deltaF should increase with depolarization

If inconsistent, flag the mismatch.

### How to fix

Follow the curator agent's **Step D** (Build the ΔF/F–V curve):

1. Fetch the original paper (using `paperUrl` or DOI)
2. Find the F-V figure (typically labeled "ΔF/F vs membrane potential" or "voltage sensitivity")
3. Read data points directly from the figure at major voltage steps
4. Normalize so ΔF/F at -70mV = 0
5. Record only the actual data points — **no fitting, extrapolation, or interpolation**

If no F-V figure exists in any available paper, remove `voltage.custom` entirely and note it in the report.

#### Optional: image-based data extraction tool

When the GEVI already has a cropped F-V figure stored at `public/fv-sources/{id}.jpg` (i.e. `voltage.sourceImage` exists), the project ships a digitization helper at `scripts/extract_curve.py` (with a calibration GUI at `scripts/pick_calibration.py`). It color-filters the figure, peak-detects clusters, and outputs `voltage`/`deltaF` arrays after a 2-point pixel calibration. Multi-curve plots are supported via `--multi-curve` and split-ROI runs.

**Mandatory rule when the source image is available:** before re-digitizing the F-V curve manually, **ask the user whether to use the extraction tool**. Phrase it as a short yes/no question, e.g.:

> "I'm about to re-digitize the F-V curve for {GEVI} from `{voltage.sourceImage}` ({voltage.sourceFigure}). Do you want me to use `scripts/extract_curve.py`, or read the values manually?"

The same tool can also digitize photobleach curves (F vs time). If you're fixing `photostabilityData` and the paper has a bleach curve figure, ask the same question before reading endpoints by eye.

The script is most accurate on figures with clean, well-separated data points (≤3 curves, discrete markers). It is less reliable for violin plots or heavily overlapping curves; the user often knows in advance which path is better for the specific figure.

---

## Step 4: Fetch Original Paper and Extract Missing Data

Using the GEVI's `paperUrl`, fetch the original publication:

```
WebFetch: {paperUrl}
```

If paywalled, try:
- PubMed: `https://pubmed.ncbi.nlm.nih.gov/?term={GEVI+name}`
- bioRxiv/PMC full text
- DOI resolver fallback
- Check if the paper exists locally: `GEVIBench/Papers/` directory

Also check the supplementary information — it often contains tables with kinetics, brightness, and photostability data not in the main text.

For each missing performance field identified in Step 1, search the paper for:

| Missing field | What to look for in the paper |
|---------------|-------------------------------|
| `kinetics` | τ_on, τ_off, activation/deactivation time constants. Check supplementary tables. Note the exact figure or table label (e.g., `"Table S2"`, `"Fig. 3B"`). |
| `dynamicRangeData` | ΔF/F per 100mV step. Look for voltage-clamp step responses. Note the figure label. |
| `sensitivityData` | ΔF/F per single action potential. Look for current-clamp recordings. Note the figure label. |
| `brightnessData` | EC×QY, comparison to EGFP, relative fluorescence intensity. See curator Step B2. Note the figure or table label. |
| `photostabilityData` | Photobleaching curves, time constants, % remaining after illumination. Note the figure label. |
| `subthresholdData` | %/mV slope in the -90 to -50mV range. Look for voltage ramp data. Note the figure label. |

For **every** value you extract, record the exact figure or table label as `sourceFigure` (e.g., `"Fig. 2E"`, `"Table S1.4"`, `"Fig. S3B"`). This is displayed in the UI so users can verify data against the original paper. Do not leave `sourceFigure` blank for any entry you add or update.

### Cross-GEVI data extraction

While reading the paper, note **every other GEVI** that receives quantitative measurements. Follow the curator's **Step B1** rules:
1. List every GEVI with any quantitative data in the paper
2. For each, check if its JSON file exists via `Glob: src/gevis/*.json`
3. If it exists, read the file and append new data entries (with `source` DOI) — don't duplicate existing entries
4. Write the updated file immediately

---

## Step 5: Verify Research Paper List is Exhaustive

### 5a. Check existing papers

**The original paper (matching `paperUrl`) must always be the first entry in `researchPapers`.** If it's missing, add it. Every GEVI must have at least 1 research paper entry.

For each entry in `researchPapers`, verify:
- The paper actually used this GEVI experimentally (not just cited it)
- The paper is attributed to the correct variant (not a parent or sibling GEVI)
- The `sample` field is filled in and descriptive

### 5b. Search for missing papers

Follow the curator's **Step C** (Search for papers that used this GEVI):

1. **Citation tracking:** Fetch citations of the original paper via Semantic Scholar:
   ```
   WebFetch: https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}/citations?fields=title,authors,year,externalIds,journal&limit=500
   ```

2. **Keyword searches:**
   - `WebSearch: "{GEVI name}" voltage imaging`
   - `WebSearch: "{GEVI name}" neuron`
   - `WebSearch: "{GEVI name}" in vivo`
   - `WebSearch: "{GEVI name}" site:pubmed.ncbi.nlm.nih.gov`

3. **PubMed search:**
   ```
   WebFetch: https://pubmed.ncbi.nlm.nih.gov/?term={GEVI+name}+voltage+imaging
   ```

4. **Check variant pages:** Read `researchPapers` from related GEVIs to avoid duplicating papers that belong to a variant.

### 5c. Fill remaining gaps from discovered papers

If Steps 1–4 left any performance fields still missing, check the newly discovered papers (and papers already in `researchPapers`) for the missing data:

1. For each paper in the list, fetch the abstract or full text
2. Check if it reports any of the still-missing metrics for this GEVI
3. If found, add the data to the appropriate raw data array with the paper's DOI as `source`

Also check known comparative/benchmarking papers:
- Milosevic et al. 2020 (doi:10.1523/ENEURO.0060-20.2020)
- Bando et al. 2019 (doi:10.1016/j.celrep.2018.12.088)
- Villette et al. 2019 (doi:10.1016/j.cell.2019.11.004)
- Abdelfattah et al. 2016 (doi:10.1523/JNEUROSCI.3590-15.2016)
- Abdelfattah et al. 2019/2022 — Voltron/Voltron2 papers

---

## Step 6: Apply Fixes

After completing all checks, write all fixes to the JSON file:

1. **Remove legacy hardcoded scores** (`speed`, `dynamicRange`, `sensitivity`, `brightness`, `photostability`, `overall`, `paperCount`)
2. **Update `spectrum.custom`** with real data if it was missing or fabricated
3. **Update `voltage.custom`** with real data if it was missing or fabricated
4. **Add missing performance data** found in Steps 4–5
5. **Add missing research papers** found in Step 5
6. **Fix any inconsistencies** (polarity mismatches, unnormalized baselines, etc.)

### Quality Checks (same as curator)

- [ ] Valid JSON (no trailing commas, correct quotes)
- [ ] `id` matches filename
- [ ] `spectrum.type` and `voltage.type` consistent with category
- [ ] `voltage.polarity` consistent with `dynamicRangeData.sign`
- [ ] No score fields in JSON
- [ ] `brightnessData` entries each have `ratio`, `reference`, `source`, and `sourceFigure`
- [ ] `kinetics`, `dynamicRangeData`, `sensitivityData`, `photostabilityData` entries each have `sourceFigure`
- [ ] `photostabilityData.illumination` contains a parseable mW/mm² value; `duration` contains a parseable time
- [ ] `voltage.source` is present and is a `doi:...` string
- [ ] `voltage.sourceImage` points to an existing file in `public/fv-sources/`
- [ ] `voltage.sourceFigure` is present (e.g., `"Fig. 2E"`)
- [ ] `voltage.custom.deltaF` at -70mV is normalized to 0

---

## Data Extraction Rules

All rules from the curator agent apply here. In particular:

### Spectrum data (`spectrum.custom`)
- Both arrays normalized so maximum = 1.0
- 1nm per element; `minEx`/`minEm` are starting wavelengths
- Priority: FPbase > paper figures > manufacturer spectra
- For FRET/chemigenetic GEVIs, use the fluorescent partner's spectrum

### F-V curve data (`voltage.custom`)
- **CRITICAL: Every data point must come directly from a paper figure or text. No fitting, extrapolation, interpolation, or curve reconstruction.**
- Arrays must have equal length
- Voltage in mV, ΔF/F in % (not fractions)
- Ascending voltage order
- -70mV point explicitly included with deltaF = 0
- Round to nearest integer
- **`voltage.source` is mandatory** — top-level field inside `voltage` (not inside `custom`), set to the DOI of the paper the curve was digitized from (e.g. `"doi:10.1073/pnas.1215595110"`). Displayed as a clickable citation in the UI.

### Brightness data (`brightnessData`)
- `ratio` = sensor/reference
- `reference` must be an exact GEVI `id` from `src/gevis/*.json`, or `"EGFP"`
- If only EC×QY available: `ratio = (sensor_EC × sensor_QY) / 20040`
- Record every comparison found, even indirect ones
- `sourceFigure` is mandatory — use the figure or table label where the brightness value appears (e.g., `"Fig. 1C"`, `"Table 1"`). The reverse entry (added at runtime to the other GEVI) inherits the same `sourceFigure`, so set it correctly here.

### Research papers (`researchPapers`)
- Must have actually used this GEVI experimentally (not just cited/reviewed it)
- Attributed to the correct variant
- `sample` field mandatory: species, tissue/region, in vivo/vitro

---

## Output

```
## GEVI Page Check: {name}
File: src/gevis/{id}.json

## Issues Found
- [ ] {issue description} — {severity: CRITICAL / WARNING / INFO}

## Spectrum Check
- Status: Real / Fabricated (Gaussian) / Missing
- Action taken: {what was done}
- Source: {FPbase / paper figure / none}

## F-V Curve Check
- Status: Real / Fabricated (fitted) / Missing
- Action taken: {what was done}
- Source: {paper figure / none}

## Missing Performance Data
| Field | Status | Action | Source |
|-------|--------|--------|--------|
| kinetics | Present / Found / Not found | Added from {paper} | doi:... |
| dynamicRangeData | ... | ... | ... |
| sensitivityData | ... | ... | ... |
| brightnessData | ... | ... | ... |
| photostabilityData | ... | ... | ... |

## Research Papers
- Existing: {N} papers
- Added: {M} new papers
- Total: {N+M} papers

## Cross-GEVI Updates
- {other GEVI}: added {field} from {paper}

## Changes Made
- {field}: {old} → {new} (source: {where data came from})

## Remaining Gaps
- {field}: Not found in any available source
```
