# GEVI Page Curator

Add new GEVIs or update existing ones based on scientific publications.

## Input
- GEVI name
- Paper URL

---

## Workflow

### 1. Check if GEVI exists
```
Glob: src/gevis/*{gevi-name}*.json
```
- **Exists** → read file, then go to **Update**
- **Not found** → go to **Create**

### 2. Fetch paper
Use `WebFetch` on the paper URL. If the page is paywalled or unhelpful, try:
- PubMed: `https://pubmed.ncbi.nlm.nih.gov/?term={GEVI+name}`
- bioRxiv/PMC full text
- DOI resolver fallback

Extract: year, journal, all quantitative metrics, spectrum data, FP/opsin lineage.

---

## Create New GEVI

### A. Determine category and lineage (`parentId` vs `familyTreePath`)

**Prefer `parentId` over `familyTreePath` when a direct parent GEVI exists.**

`parentId` is sufficient to reconstruct the full genetic lineage — it links the GEVI to its immediate parent, which in turn links to its own parent. Only use `familyTreePath` for **root-level or branch-level nodes** that have no single direct parent (e.g., "ASAP", "voltron", "arclight" which are branch heads, not leaves). Do NOT add both — they are redundant.

**Decision rule:**
- GEVI is a variant/successor of another GEVI in `src/gevis/*.json` → use **`parentId: "parent-id"`**, omit `familyTreePath`
- GEVI is a new lineage root or branch head with no parent in the database → use **`familyTreePath`**, omit `parentId`

**Category and branch reference** (for new root/branch nodes that need `familyTreePath`):

There are exactly 5 branches in the tree. Every GEVI belongs to one of them. Use only paths that match existing nodes exactly.

| Branch | spectrum.type | voltage.type | familyTreePath for a new root node |
|--------|---------------|--------------|-------------------------------------|
| VSD + VSD-single (ASAP, JEDI, ArcLight, etc.) | `fp` | `fp` | `["GEVI","VSD","VSD-single","new-id"]` |
| VSD + VSD-FRET (Mermaid, VSFP, LOTUS-V, FlicR1, etc.) | `fret` | `fret` | `["GEVI","VSD","VSD-FRET","new-id"]` |
| Opsin + Opsin-Fluorescent (Arch, PROPS lineage) | `rhodopsin` | `opsin` | `["GEVI","Opsin","Opsin-Fluorescent","new-id"]` |
| Opsin + Opsin-FRET (Ace2N-mNeon, MacQ lineage) | `rhodopsin` | `opsin` | `["GEVI","Opsin","Opsin-FRET","new-id"]` |
| Opsin + Opsin-FRET + Chemigenetic (Voltron, HVI+ lineage) | `rhodopsin` | `chemi` | `["GEVI","Opsin","Opsin-FRET","Chemigenetic","new-id"]` |

When using `familyTreePath`, the last element must equal `id`. Check `src/gevis/*.json` for existing paths to find the correct insertion point.

### B. Raw data fields (scores are computed automatically)

**Do NOT set any score fields (`speed`, `dynamicRange`, `sensitivity`, `brightness`, `photostability`, `overall`) in the JSON.** All scores are computed automatically by the website from the raw data fields below.

Every raw data entry must include a `source` field (DOI string, e.g. `"doi:10.1038/s41592-023-01820-3"`). All raw data fields are **arrays** — multiple entries from different papers are averaged into a single score.

| Raw data field | What to extract from the paper |
|----------------|-------------------------------|
| `kinetics` | Array of `{ on, off, temperature, source }`. τ_on and τ_off in ms. **Temperature rule:** Always include a `"temperature"` field recording the measurement temperature (e.g. `"22°C"`, `"33-34°C"`, `"37°C"`, `"room temperature"`). Omit `temperature` only if the paper does not state what temperature the kinetics were measured at. If kinetics are reported at multiple temperatures, prefer the measurement closest to 37°C (physiological). Always check supplementary tables — main text kinetics values are sometimes at room temperature or even have names swapped between variants. |
| `dynamicRangeData` | Array of `{ deltaF, sign, source }`. ΔF/F% per 100 mV step, signed. `sign`: `"positive"` or `"negative"`. |
| `sensitivityData` | Array of `{ deltaF, source }`. ΔF/F% per single action potential (always positive). |
| `subthresholdData` | Array of `{ slope, source }`. Subthreshold sensitivity in %/mV, always positive. Look for it in voltage-clamp ramps or step responses in the subthreshold range (typically −90 to −50 mV). |
| `brightnessData` | Array of `{ ratio, reference, source }` — see step B2. |
| `photostabilityData` | Array of `{ brightnessRemaining, illumination, duration, source }`. If the paper reports multiple measurements, include **one entry per paper**: select the measurement with duration closest to 1 min, breaking ties by intensity closest to 10 mW/mm². **Bioluminescent GEVIs:** If the GEVI is bioluminescent (no excitation light, e.g. uses NanoLuc/luciferase), set `"photostabilityData": "bioluminescent"` instead of an array — the scoring system will assign a score of 100 automatically. |
| `researchPapers` | Exhaustive list of independent papers that used this GEVI for voltage imaging — see step C. The popularity subscore is computed automatically from `researchPapers.length`. **Do NOT set `paperCount`** — it is derived from `researchPapers` at runtime. |

Omit a raw data field entirely if the paper does not report that measurement — do not include an empty array.

### B1. Cross-GEVI updates

> **This is not optional.** Papers routinely characterize 3–10 GEVIs side by side. Every number reported for a non-primary GEVI must be written into that GEVI's JSON file before this task is considered complete.

**When a paper reports data on GEVIs other than the primary subject, update those GEVIs too.**

While extracting data from the paper:
1. Make a list of every GEVI that receives any quantitative measurement — kinetics, ΔF/F per step, ΔF/F per AP, subthreshold slope, brightness, photostability. Do this before writing anything.
2. For each GEVI on that list, use `Glob src/gevis/*.json` to check whether it exists. **Do not skip this check** — the file may exist under a slightly different name.
3. If the file exists, read it, then **append** a new entry to the appropriate array with `source` set to the current paper's DOI.
4. Do not duplicate — check that no entry with the same `source` already exists before appending.
5. Write the updated file immediately before moving to the next GEVI.

**Failure modes to avoid:**
- Skipping a GEVI because "it's only shown in a figure" — if a number can be read from the figure, record it.
- Skipping a GEVI because you assumed its file doesn't exist — always `Glob` to confirm.
- Skipping a GEVI because the comparison is indirect (e.g. "X is 2.4× brighter than Y") — this is still a valid `brightnessData` entry for both X and Y.

### B2. Extracting brightness data (brightnessData)

Brightness is the most commonly missing or fabricated metric in GEVI databases. Always search the paper for real brightness data before skipping this step.

**What to look for:**
- Direct comparison to EGFP: "X× brighter than EGFP", "X% of EGFP fluorescence", "brightness relative to EGFP"
- Absolute spectroscopic values: extinction coefficient (EC, ε, in M⁻¹cm⁻¹) **and** quantum yield (QY, Φ) reported together → compute EC×QY product
- Comparison to another GEVI with known brightness (e.g., "2× brighter than ASAP3")
- Normalized fluorescence intensity plots with EGFP as a co-expressed reference

**How to compute B_rel from absolute EC×QY:**
EGFP reference: EC×QY = 33,400 × 0.60 = 20,040 M⁻¹cm⁻¹

```
B_rel = (sensor EC × sensor QY) / 20,040
```

Example: ASAP3 at −70 mV has EC×QY = 15,000 M⁻¹cm⁻¹ → B_rel = 15,000/20,040 ≈ 0.75

**Data structure — store all comparisons found:**
```json
"brightnessData": [
  {
    "ratio": 0.75,
    "reference": "EGFP",
    "source": "doi:10.1016/j.cell.2019.11.004"
  }
]
```

Rules:
- `ratio` is always **sensor/reference** (e.g., 0.75 means the sensor is 75% as bright as EGFP)
- `reference` must be an exact GEVI `id` as found in `src/gevis/*.json`, or `"EGFP"` for EGFP
- Multiple entries are allowed — record every comparison found in the paper
- If only a non-EGFP comparison is available, record it anyway; it will be used in graph traversal to infer the EGFP ratio later
- If no direct brightness comparison or EC×QY data is found, try these fallback approaches before giving up:
  1. **Component FP estimation (for FRET constructs):** Use the QY and EC of the primary imaging-channel fluorescent protein (typically the acceptor). Compute `ratio = (FP_EC × FP_QY) / (EGFP_EC × EGFP_QY)`. Note it as an estimate in the `source` field (e.g., `"Estimated from Citrine QY=0.76, EC=77000 vs EGFP QY=0.60, EC=56000"`).
  2. **SBR or SNR comparisons:** If a paper reports signal-to-background ratio or signal-to-noise ratio relative to another GEVI, this can serve as a proxy brightness comparison. Record as `brightnessData` with the compared GEVI as `reference`.
  3. **Relative fluorescence intensity:** If a paper reports "X was N× more fluorescent than Y" or shows normalized intensity bar charts, use this as a brightness ratio.
- Only omit `brightnessData` entirely if none of the above approaches yield a usable estimate

The `brightness` score is computed automatically by the website from `brightnessData`. Do not set it manually.

### C. Search for papers that used this GEVI

**This step is mandatory and must be exhaustive.** The goal is to find **every** paper that has independently used this GEVI for voltage imaging — not a sample. If 0 papers exist, record 0. If 100 exist, find all 100.

#### C1. Identify variant GEVIs first

Before searching, check `src/gevis/*.json` for closely related variants (e.g., Voltron2 for Voltron, ASAP4 for ASAP3). Read their `researchPapers` lists. This tells you:
- Which papers are already attributed to a variant (don't duplicate them here)
- What naming patterns to watch for when disambiguating

#### C2. Search multiple sources exhaustively

Keep searching until no new papers are found. **Use ALL of these strategies, not just one or two:**

1. **Citation tracking (most important — do this FIRST):**
   - Fetch the Semantic Scholar citation list for the original paper:
     `WebFetch: https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}/citations?fields=title,authors,year,externalIds,journal&limit=500`
   - If the paper has >500 citations, paginate with `&offset=500`, `&offset=1000`, etc.
   - Also try Google Scholar citations via `WebSearch: "citing:{original paper title}"`
   - **Every citing paper is a candidate** — scan titles for voltage imaging, electrophysiology, or neuroscience terms

2. **Keyword searches (cast a wide net):**
   - `WebSearch: "{GEVI name}" voltage imaging`
   - `WebSearch: "{GEVI name}" neuron`
   - `WebSearch: "{GEVI name}" in vivo`
   - `WebSearch: "{GEVI name}" site:pubmed.ncbi.nlm.nih.gov`
   - `WebSearch: "{GEVI name}" site:scholar.google.com`
   - For chemigenetic GEVIs, also search with dye names: `"{GEVI name}" "JF525"`, `"{GEVI name}" "JF549"`, etc.
   - Semantic Scholar API: `https://api.semanticscholar.org/graph/v1/paper/search?query={GEVI+name}&fields=title,authors,year,externalIds,journal&limit=100`

3. **PubMed search:**
   - `WebFetch: https://pubmed.ncbi.nlm.nih.gov/?term={GEVI+name}+voltage+imaging`
   - Check at least the first 3 pages of results

#### C3. Verify each candidate paper

For **every** candidate paper, fetch the abstract or full text with `WebFetch` and confirm:

1. **Did they actually use this GEVI experimentally?** (not just cite, mention, or review it)
2. **Which exact version did they use?** This is critical for GEVIs with variants:
   - Check the Methods section for the exact construct name (e.g., "Voltron-ST" vs "Voltron2-ST", "ASAP3" vs "ASAP4")
   - Check which Addgene plasmid they ordered
   - Check figure legends for the indicator name
   - If the paper says just the family name (e.g., "Voltron") without specifying a version, check the publication date: papers published before the variant existed likely used the original
3. **What preparation did they image?** (for the `sample` field)

**Assign each paper to the correct GEVI page.** If a paper used a variant (e.g., Voltron2), it belongs on the variant's page, not the original's — even if the paper loosely says "Voltron".

#### C4. Completeness check

Before finishing, verify your search was exhaustive:
- Did you check ALL citations of the original paper (not just the first page)?
- Did you search PubMed, Semantic Scholar, AND Google Scholar?
- Did you search with alternate names/dye combinations?
- For popular GEVIs (>50 citations on the original paper), finding fewer than 5 research papers should trigger additional searching

**Do not stop early.** Only finish when all search queries return no new qualifying papers.

Each entry in `researchPapers`:
```json
{
  "title": "Full paper title",
  "authors": "Last FM, et al.",
  "journal": "Journal Name",
  "year": 2024,
  "sample": "Species + tissue + in vivo/vitro",
  "url": "https://doi.org/..."
}
```

The `sample` field is **mandatory** for every paper entry. It is rendered as individual tag chips in the UI by splitting on `,` and `;`, so use comma-separated short tokens. Each token should be a concise label — species, tissue/region, or prep type:

- `"Mouse, cortex, in vivo"`
- `"Rat, hippocampal neurons, in vitro"`
- `"Zebrafish larvae, in vivo"`
- `"Drosophila, in vivo"`
- `"Human iPSC-derived neurons, in vitro"`
- `"Cardiac organoids, in vitro"`
- `"Mouse, visual cortex, in vivo; rat, hippocampal slices, in vitro"` (semicolons separate distinct preparations)

Rules:
- Always include at minimum: species/organism, and in vivo vs in vitro
- Add tissue/region when known (cortex, hippocampus, retina, cardiomyocytes, etc.)
- Keep each token short — 1–3 words
- Never leave `sample` empty or null — if preparation details are unclear, use the most specific information available from the abstract

Do NOT set `paperCount` — it is computed automatically from `researchPapers.length` at runtime.

---

### D. Build the ΔF/F–V curve (voltage.custom)

The `voltage.custom` field stores the actual ΔF/F–V relationship as two parallel arrays.

**CRITICAL: Every data point must come directly from the paper.** Only include (voltage, ΔF/F) values that you can read from a figure or find stated in the text/tables. **No fitting, extrapolation, interpolation, or curve reconstruction is allowed.** A curve with 5–8 honest data points read from a figure is far better than a smooth 30-point curve that was fabricated.

#### How to extract data
Look in the paper for a figure showing ΔF/F (or ΔF/F₀) vs membrane potential (mV), typically from voltage-clamp experiments. Read off values at the major tick marks or clearly identifiable voltage steps:
- Read the approximate ΔF/F% at each voltage tick mark on the x-axis (e.g., -100, -50, 0, +50 mV)
- If the paper states a specific value in the text (e.g., "−23% ΔF/F at +30 mV"), use that exact value
- If error bars or multiple cells are shown, use the mean trace values
- **Do NOT** interpolate between read points to create additional points
- **Do NOT** fit a sigmoid, Boltzmann, or any other function to generate a smooth curve
- **Do NOT** use stated slope values to extrapolate beyond the figure's range

If the paper has no F-V figure and states no specific (voltage, ΔF/F) values, omit `voltage.custom` entirely and let the app use the `generateVoltageCurve()` fallback.

#### Baseline normalization — mandatory
**ΔF/F must be normalized so that the value at −70 mV equals 0.**

If the paper uses a different holding potential as baseline:
1. Read the ΔF/F value at −70 mV from the figure
2. Subtract that value from every data point so that ΔF/F(−70 mV) = 0

Example: if the paper shows ΔF/F = −5% at −70 mV and +46% at +30 mV, shift all values by +5% so the normalized values become 0% and +51%.

#### Naming — `voltage.name`
- For **chemigenetic GEVIs** (Voltron, HVI+, etc.), always include the dye name: `"Voltron (JF525)"`, `"Voltron2 (JF552)"`, `"HVI+ (JF585)"`
- For all other GEVIs, use the GEVI name: `"ASAP3"`, `"JEDI-2P"`

#### Chemigenetic GEVIs — include all dye curves

Chemigenetic GEVIs are typically characterized with multiple synthetic dyes (e.g., JF525, JF549, JF585, JF635 for Voltron). **If the paper's F-V figure shows curves for multiple dyes, include ALL of them** — not just the best-performing one.

- The primary curve (`voltage.custom`) should be the dye with the highest sensitivity (usually the one highlighted in the paper)
- All other dye curves go in `voltage.additionalCurves`, each with a `name` that includes the dye (e.g., `"Voltron (JF549)"`)
- Read data points from the figure for every dye curve at the same voltage steps
- The viewer automatically colors curves based on the dye wavelength extracted from the name (JF525 → green, JF549 → yellow, JF585 → orange, JF635 → red)

#### Format
```json
"voltage": {
  "type": "chemi",
  "slope": 23,
  "polarity": "negative",
  "name": "Voltron (JF525)",
  "custom": {
    "voltage": [-100, -80, -70, -60, -40, -20, 0, 30, 50],
    "deltaF":  [7, 4, 0, -2, -7, -12, -17, -23, -28]
  },
  "additionalCurves": [
    {
      "name": "Voltron (JF549)",
      "voltage": [-100, -80, -70, -60, -40, -20, 0, 30, 50],
      "deltaF":  [5, 3, 0, -1, -5, -9, -13, -20, -24]
    }
  ]
}
```

For non-chemigenetic GEVIs (no multiple dyes), omit `additionalCurves`:
```json
"voltage": {
  "type": "fp",
  "slope": 12,
  "polarity": "negative",
  "name": "ASAP3",
  "custom": {
    "voltage": [-100, -80, -70, -60, -40, -20, 0, 30, 50],
    "deltaF":  [6, 3, 0, -2, -6, -10, -15, -21, -25]
  }
}
```

#### General rules for `voltage.custom`
- Arrays must have equal length
- Voltage values in mV, ΔF/F values in % (not fractions)
- List voltage values in ascending order
- Include the −70 mV point explicitly (ΔF/F = 0 after normalization)
- Round each value to nearest integer (for values read from figures, sub-integer precision is false precision)

In the output summary, note the source: `voltage.custom: read from Fig. 1E (9 data points per curve, 4 dye curves)`.

---

### E. Build the excitation/emission spectrum (spectrum.custom)

The `spectrum.custom` field stores real spectra as two normalized 0–1 arrays at 1 nm resolution. **Never rely on the Gaussian fallback** — the app generates fake Gaussian curves when `custom` is absent. Always attempt to populate `spectrum.custom`.

#### Format
```json
"spectrum": {
  "type": "fp",
  "peakEx": 487,
  "peakEm": 509,
  "name": "GEVI Name",
  "custom": {
    "minEx": 350,
    "excitation": [0.02, 0.03, ...],
    "minEm": 460,
    "emission":   [0.01, 0.02, ...]
  }
}
```
- Both arrays normalized so maximum value = 1.0
- 1 nm per element; `minEx`/`minEm` are the starting wavelengths
- Typical ranges: excitation 300–600 nm, emission 450–750 nm (adjust for red/NIR sensors)

#### Priority 1 — FPbase (for any GEVI containing a known fluorescent protein or synthetic dye)

FPbase maintains measured spectra for virtually every FP used in GEVIs (mNeonGreen, mVenus, mCitrine, mRuby, mCherry, GFP, EGFP, cpGFP variants, etc.) **and** for synthetic dyes used in chemigenetic GEVIs (Janelia Fluor dyes, HaloTag conjugates, etc.). Use it as the primary source.

**Important:** Some fluorophores (especially synthetic dyes like JF525, JF549, JF585, JF635) are **not findable via the FPbase protein search** (`/protein/{slug}/`) but ARE available in the **spectra viewer** tool. Always try the spectra viewer API when the protein page fails.

##### Method A — Protein page (for named FPs)
1. `WebFetch https://www.fpbase.org/protein/{slug}/`
   - slug is usually the lowercase name with no spaces: `mneongreen`, `mcherry`, `egfp`, `mcitrine`, etc.
   - The page lists excitation/emission maxima and links to spectrum data.

##### Method B — Spectra viewer API (for dyes, HaloTag conjugates, and any fluorophore not on the protein page)

Use playwright-cli (with `--headed` flag) to extract spectrum data directly from the FPbase spectra viewer API:

1. **Open the spectra viewer and search for the fluorophore:**
   ```bash
   playwright-cli open --headed https://www.fpbase.org/spectra/
   # Find the search combobox and type the dye name (e.g. "JF585")
   playwright-cli click e107
   playwright-cli type "JF585"
   playwright-cli snapshot   # find the option ref in the dropdown
   playwright-cli click {option-ref}
   ```

2. **Fetch the spectra list to find spectrum IDs:**
   ```js
   // Run via playwright-cli eval
   async () => {
     const r = await fetch('/api/spectra-list/');
     const d = await r.json();
     const matches = d.data.spectra.filter(s => s.owner.name.toLowerCase().includes('jf585'));
     return JSON.stringify(matches);
   }
   // Returns entries with id, category ("d"=dye, "p"=protein), subtype ("ex"=excitation, "em"=emission, "ab"=absorption)
   ```

3. **Fetch the actual data points for each spectrum ID:**
   ```js
   async () => {
     const [exR, emR] = await Promise.all([fetch('/api/spectrum/{ex-id}/'), fetch('/api/spectrum/{em-id}/')]);
     const [exD, emD] = await Promise.all([exR.json(), emR.json()]);
     // exD.data / emD.data are arrays of [wavelength_nm, value] pairs, already normalized to ~1.0
     const exMax = Math.max(...exD.data.map(p => p[1]));
     const emMax = Math.max(...emD.data.map(p => p[1]));
     return JSON.stringify({
       minEx: exD.data[0][0],
       minEm: emD.data[0][0],
       peakEx: exD.data.find(p => p[1] === exMax)[0],
       peakEm: emD.data.find(p => p[1] === emMax)[0],
       excitation: exD.data.map(p => Math.round(p[1]/exMax * 10000)/10000),
       emission:   emD.data.map(p => Math.round(p[1]/emMax * 10000)/10000)
     });
   }
   ```

4. Use the returned `peakEx`, `peakEm`, `minEx`, `minEm`, `excitation`, and `emission` arrays directly in `spectrum.custom`.

5. **For eFRET/Chemigenetic GEVIs:** use the spectrum of the **fluorescent partner** (e.g., for Ace2N-mNeon use mNeonGreen; for Voltron/Solaris use the specific JF dye conjugate).

#### Priority 2 — Paper figures

If the paper includes an excitation or emission spectrum figure:
- Read off values at each visible wavelength tick from the figure
- Normalize so the maximum = 1.0
- Use 1 nm resolution where possible; interpolate linearly between digitized points if the figure only shows coarser resolution

#### Priority 3 — Manufacturer / supplier spectra

For synthetic dyes (Voltron, chemigenetic) or less common FPs, check:
- Thermo Fisher SpectraViewer, Chroma spectra, BioLegend spectra
- The supplier's product page for the specific dye

#### When to omit `spectrum.custom`

Only omit `custom` if none of the three sources above yields usable data. In that case set `peakEx`/`peakEm` accurately and leave `custom` absent — do **not** include placeholder or synthetic data.

In the output summary, note the source: `spectrum.custom: FPbase mNeonGreen` or `spectrum.custom: digitized from Fig. 2A`.

---

### F. Write the JSON file (after completing steps C, D, and E above)

File: `src/gevis/{id}.json`

```json
{
  "id": "gevi-id",
  "name": "GEVI Name",
  "year": 2024,
  "category": "Category Type",
  "tags": ["Tag1", "Tag2"],
  "paper": "Journal Year",
  "paperUrl": "https://doi.org/...",
  "description": "ONE concise sentence — the most important features only. STRICT RULES: (1) NEVER start with the GEVI name ('ASAP5 is a...' is WRONG — the name is already displayed above the description). (2) NEVER include specific numbers (no ΔF/F percentages, fold-changes, time constants, mutation counts, SNR values). (3) NEVER list mutations or specific residues. (4) NEVER pad with promotional language ('opening the door to...', 'enabling unprecedented...'). (5) State what it is derived from, what it is optimized for, and its key distinguishing trait — nothing more. Good: 'Third-generation ASAP sensor with large fluorescence modulation and submillisecond kinetics for reliable single-trial spike detection in awake animals.' Good: 'Variant of ASAP3 optimized for non-excitable cells, shifting voltage sensitivity to match their characteristically negative resting potentials.' Good: 'Voltage indicator using opsin-FRET architecture with red fluorescent protein for improved tissue penetration.' Bad: 'ASAP5 is a fast and responsive voltage indicator with enhanced sensitivity for unitary synaptic events.' (starts with name) Bad: 'Improved chemigenetic GEVI with the A122D mutation in the Ace2 rhodopsin domain, boosting sensitivity by 65%.' (has mutation and number) Bad: 'Archon2 carries mutations T56P-P60S and exhibits 6.8-fold increased brightness.' (mutation list and number)",

  // Use ONE of the following — never both:
  "parentId": "parent-gevi-id",           // preferred: when a direct parent GEVI exists in the database
  // "familyTreePath": ["GEVI", "...", "gevi-id"],  // only for root/branch nodes with no parent

  "spectrum": {
    "type": "fp|rhodopsin|nir|fret|redfp",
    "peakEx": 490,
    "peakEm": 510,
    "name": "GEVI Name",
    "custom": {
      "minEx": 350,
      "excitation": [0.01, 0.02, ...],
      "minEm": 460,
      "emission": [0.01, 0.02, ...]
    }
  },

  "voltage": {
    "type": "opsin|fp|fret|red|chemi",
    "slope": 20,         // always positive integer (magnitude only); polarity is set separately
    "polarity": "positive|negative",
    "name": "GEVI Name",
    "custom": {
      // MUST be two parallel arrays — NOT an array of objects like [{"voltage":..., "dff":...}]
      "voltage": [-120, -100, -70, -50, -30, 0, 30],
      "deltaF":  [-18, -12, 0, 6, 12, 22, 31]   // field name is "deltaF", NOT "dff"
    }
  },

  "kinetics": [
    // One entry per paper that reports kinetics. Omit field entirely if no kinetics data found.
    {
      "on": 1.2,           // τ_on in ms — field name is exactly "on", NOT "tauOn"
      "off": 2.5,          // τ_off in ms — field name is exactly "off", NOT "tauOff"
      "temperature": "33-34°C",  // measurement temperature — omit only if paper doesn't state it
      "source": "doi:10.1038/s41592-023-01820-3"
      // Do NOT add extra fields beyond on, off, temperature, source
    }
  ],

  "dynamicRangeData": [
    // One entry per paper. Omit field entirely if no data found.
    {
      "deltaF": -35,           // ΔF/F% per 100 mV step, signed; field name is exactly "deltaF"
      "sign": "negative|positive",
      "source": "doi:10.1038/s41592-023-01820-3"
      // Do NOT add extra fields
    }
  ],

  "sensitivityData": [
    // One entry per paper. Omit field entirely if no data found.
    {
      "deltaF": 8.5,           // ΔF/F% per single action potential, always positive
      "source": "doi:10.1038/s41592-023-01820-3"
      // Do NOT add extra fields
    }
  ],

  "subthresholdData": [
    // One entry per paper. Omit field entirely if no data found.
    {
      "slope": 0.54,           // subthreshold sensitivity in %/mV, always positive
      "source": "doi:10.1038/s41592-023-01820-3"
      // Do NOT add extra fields
    }
  ],

  "brightnessData": [
    // One entry per comparison found across all papers. Omit field entirely if no data found.
    {
      "ratio": 0.75,           // sensor/reference — e.g. 0.75 means 75% as bright as EGFP
      "reference": "EGFP",     // exact GEVI id from src/gevis/*.json, or "EGFP"
      "source": "doi:10.1016/j.cell.2019.11.004"
    }
  ],

  "photostabilityData": [
    // One entry per paper (select best measurement per paper — see step B). Omit field entirely if no data found.
    {
      "brightnessRemaining": 80,  // numeric %, e.g. 90 means 90% remaining
      "illumination": "16 mW/mm²",
      "duration": "1 min",
      "source": "doi:10.1038/s41592-023-01820-3"
      // Do NOT add extra fields
    }
  ],

  "addgene": {
    "id": "123456",
    "url": "https://www.addgene.org/123456/"
  },

  "researchPapers": [
    {
      "title": "Title of a paper that INDEPENDENTLY USED this GEVI (not the original paper)",
      "authors": "Last FM, et al.",
      "journal": "Journal Name",
      "year": 2024,
      "sample": "Mouse cortex, in vivo",
      "url": "https://doi.org/..."
    }
  ]
}
```

**Polarity:** `"positive"` = fluorescence increases with depolarization; `"negative"` = decreases.

**`spectrum.custom`:** Always attempt to populate per step E. Omit only if no source (FPbase, paper, supplier) yields usable data — the app will fall back to a fake Gaussian using `peakEx`/`peakEm`.

**`voltage.custom`:** Include only if you extracted real data or reconstructed from stated quantitative values per step D. The ΔF/F values must be normalized so that the value at −70 mV = 0. Omit `custom` entirely if neither extraction nor reconstruction was possible — the app will fall back to the `generateVoltageCurve()` function using `type`/`slope`/`polarity`.

**Omit optional sections** (`kinetics`, `dynamicRangeData`, `sensitivityData`, `photostabilityData`, `addgene`) if data is not available — do not include them as empty arrays.

**`researchPapers` is NOT optional** — always perform the citing-paper search in step C before writing this field. **The original paper (matching `paperUrl`) must always be included as the first entry.** Every GEVI should have at least 1 research paper. Then add all independent papers found via the citing-paper search.

**Tags:** Use concise descriptive tags. Common examples: `"Green"`, `"Red"`, `"cpGFP"`, `"Two-photon"`, `"Somatic targeting"`, `"Positive-going"`, named FP or opsin (e.g. `"mNeon"`, `"Ace opsin"`).

### G. Voltage slope reference

| Type | Typical slope |
|------|--------------|
| opsin | 15–40 |
| chemi | 20–35 |
| fp (cpGFP/ASAP) | 8–20 |
| fret | 10–18 |
| red | 7–15 |

---

## Update Existing GEVI

Read the existing file. Fetch the paper. Compare every field:

| Field | Check |
|-------|-------|
| `year` | Publication year correct? |
| `kinetics` | τ_on / τ_off match paper? `temperature` set correctly? |
| `dynamicRangeData.deltaF` | ΔF/F value and sign correct? (per 100 mV step) |
| `sensitivityData.deltaF` | ΔF/F per AP correct? If absent, search the paper for single-AP recordings. |
| `subthresholdData.slope` | Subthreshold slope in %/mV present? If absent, search for ramp or step data in the −90 to −50 mV range. |
| `brightnessData` | Does `brightnessData` exist? If absent, search the paper for EC, QY, or pairwise brightness comparisons and add it per step B2. |
| `photostabilityData` | Values and conditions correct? `illumination` and `duration` strings parseable? |
| `tags` | Missing or wrong tags? |
| `spectrum.peakEx/peakEm` | Peak wavelengths correct? |
| `spectrum.custom` | Is real spectrum data present? If absent or looks like a Gaussian reconstruction, populate it using step E (FPbase first). |
| `paperUrl` | URL resolves to correct paper? |
| `parentId` / `familyTreePath` | Does the GEVI have a direct parent in the database? Use `parentId` if yes; use `familyTreePath` only for root/branch nodes. Never have both. |
| `voltage.custom` | Does it contain real extracted/reconstructed data? If it looks like a generic linear or sigmoid fabrication, replace it using step D. |

Update any incorrect raw data fields. Do not set score fields (`speed`, `dynamicRange`, `sensitivity`, `brightness`, `photostability`, `overall`) — they are computed automatically.

### Filling missing data from external papers

> **This is not optional.** After updating from the primary paper, check whether any of the 5 core performance fields are still missing: `kinetics`, `dynamicRangeData`, `sensitivityData`, `brightnessData`, `photostabilityData`. If any field is absent, **actively search other papers** to fill the gap. A GEVI without all 5 performance scores cannot receive an overall score.

**For each missing field:**

1. **Search citing papers first.** Papers that cite the original GEVI paper often include side-by-side comparisons. Use Semantic Scholar or Google Scholar to find papers that measured the missing metric for this GEVI.
2. **Search comparative/benchmarking papers.** These frequently test many GEVIs together:
   - Milosevic et al. 2020 (doi:10.1523/ENEURO.0060-20.2020) — kinetics, dynamic range, brightness for ~10 GEVIs
   - Bando et al. 2019 (doi:10.1016/j.celrep.2018.12.088) — comparative evaluation
   - Villette et al. 2019 (doi:10.1016/j.cell.2019.11.004) — ASAP3 paper Table 1 (brightness, kinetics, sensitivity for many GEVIs)
   - Abdelfattah et al. 2016 (doi:10.1523/JNEUROSCI.3590-15.2016) — FlicR1 paper (photostability time constants for several GEVIs)
   - Abdelfattah et al. 2019/2022 — Voltron/Voltron2 papers (broad comparisons)
3. **Search by keyword.** `WebSearch: "{GEVI name}" {missing metric}` (e.g., `"ArcLight" photostability`, `"Archon1" brightness EGFP`).
4. **Check derivative/successor papers.** Papers introducing improved versions often re-characterize the parent GEVI as a baseline.

**When adding data from external papers:**
- Always include the `source` DOI of the paper the data came from — never the original GEVI paper's DOI unless that paper actually reports the measurement.
- If a paper reports a photobleaching time constant (τ in seconds) instead of brightness remaining, convert: `brightnessRemaining = round(100 × exp(-duration/τ))` at the stated illumination power. Note the conversion in the output summary.
- If brightness is reported as a ratio to another GEVI (not EGFP), record it as `brightnessData` with that GEVI as `reference` — the BFS graph traversal will resolve the EGFP ratio automatically.

**In the output summary**, list each missing field and what was found (or confirm it remains unfound after searching):
```
## Missing Data Search
- brightnessData: Found in Villette 2019 Table 1 (ratio 1.097 vs EGFP)
- photostabilityData: Found in Abdelfattah 2016 (τ=300s at 100 mW/mm² → 82% remaining at 1 min)
- voltage.custom: Not found — no paper provides F-V curve data points for this variant
```

---

## Quality Checks

- [ ] Valid JSON (no trailing commas, correct quotes)
- [ ] `id` matches filename and last element of `familyTreePath`
- [ ] `paperUrl` resolves
- [ ] `spectrum.type` and `voltage.type` consistent with category
- [ ] `voltage.polarity` consistent with `dynamicRangeData.sign`
- [ ] No score fields in JSON (`speed`, `dynamicRange`, `sensitivity`, `brightness`, `photostability`, `overall` are all computed automatically)
- [ ] `brightnessData` entries each have `ratio`, `reference`, and `source` — no extra fields
- [ ] `photostabilityData.illumination` contains a parseable mW/mm² value; `duration` contains a parseable time in min or s

---

## Output

```
## Summary
- Action: Created / Updated
- GEVI: [name]
- File: src/gevis/[id].json

## Changes
- [field]: [old] → [new]  (source: paper section/figure)

## Missing Data
- [field]: not found in paper — [what was used instead]
```
