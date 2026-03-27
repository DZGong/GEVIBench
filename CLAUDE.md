# GEVIBench — Developer Guide for Claude

## What Is This Project

GEVIBench is a scientific benchmarking website for **Genetically Encoded Voltage Indicators (GEVIs)** — fluorescent proteins used in neuroscience to image electrical activity in neurons. The site lets researchers compare sensors by performance metrics, explore lineage relationships, and find the best GEVI for their experimental needs.

Live repo: https://github.com/DZGong/GEVIBench
Working directory: `/Users/dzgong/Documents/GEVIBench/vnet-benchmark`

---

## Tech Stack

- **React 18** + **TypeScript** + **Vite** + **Tailwind CSS v3**
- **pnpm** as package manager
- **No React Router** — navigation is pure state (`activeTab` in App.tsx)
- **No D3** — custom SVG for all visualizations (family tree, brightness network, spectra, voltage curves)
- **Recharts** for bar charts in the comparison panel
- **lucide-react** for icons
- Dev server: `pnpm dev` — runs at `http://localhost:5173`

---

## Project Structure

```
src/
├── App.tsx                  # Root component; all state lives here; state-based routing
├── types.ts                 # All TypeScript interfaces (GEVI, ResearchPaper, ViewTab, etc.)
├── geviData.ts              # Score computation engine; loads + processes all JSON files
├── methodology.ts           # Human-readable methodology text (rendered in Methodology tab)
├── constants.ts             # Shared constants (colors, filters, etc.)
├── gevis/                   # One JSON file per GEVI (~48 files)
│   ├── asap3.json
│   ├── jedi1p.json
│   └── ...
└── components/
    ├── Header.tsx
    ├── GEVIList.tsx          # Left panel: sortable/filterable list
    ├── GEVIDetail.tsx        # Right panel: full GEVI profile
    ├── GEVILineage.tsx       # Shows parent chain
    ├── FamilyTreePanel.tsx   # Interactive lineage tree (FPbase-style vertical layout)
    ├── BrightnessNetworkPanel.tsx  # Force-directed brightness comparison graph
    ├── ComparisonPanel.tsx   # Side-by-side GEVI comparison
    ├── SearchFilters.tsx     # Filter/sort controls
    ├── BonusBadges.tsx       # Renders bonus badges (red-shifted, two-photon, positive-going)
    ├── SampleUsageChart.tsx  # Bar chart of research paper samples
    ├── SpectrumViewer.tsx    # Excitation/emission spectrum SVG
    ├── VoltageCurveViewer.tsx # ΔF/F vs voltage SVG
    ├── ContactForm.tsx
    └── ErrorBoundary.tsx
```

---

## Navigation / State Routing

`App.tsx` drives all navigation through state — no URL changes.

```tsx
activeTab: 'database' | 'methodology' | 'contact' | 'tools'
showFamilyTree: boolean        // replaces main database view with FamilyTreePanel
showBrightnessNetwork: boolean // replaces main database view with BrightnessNetworkPanel
selectedGEVI: GEVI | null      // which GEVI is shown in detail panel
```

Tools (Family Tree, Brightness Network, Compare) are accessible from the **Tools** dropdown in the header. They render inside the `database` tab by replacing the normal list+detail layout.

---

## GEVI JSON Schema

Each file in `src/gevis/*.json` follows this schema (see `types.ts` for the authoritative definition):

```json
{
  "id": "asap3",              // must match filename (without .json)
  "name": "ASAP3",
  "year": 2019,
  "category": "VSD-cpGFP GEVI",
  "tags": ["cpGFP", "Green", "Two-photon"],
  "paper": "Cell 2019",
  "paperUrl": "https://doi.org/...",
  "description": "One concise sentence.",

  // Lineage — use ONE, never both:
  "parentId": "asap2s",                      // preferred: direct parent GEVI id
  // "familyTreePath": ["GEVI","VSD","..."], // only for root/branch nodes

  "spectrum": { "type": "fp", "peakEx": 505, "peakEm": 525, "name": "ASAP3", "custom": {...} },
  "voltage": { "type": "fp", "slope": 12, "polarity": "negative", "name": "ASAP3", "custom": {...} },

  // Raw data (arrays; scores computed at runtime — NEVER hardcode scores in JSON):
  "kinetics": [{ "on": 0.94, "off": 3.79, "source": "doi:..." }],
  "dynamicRangeData": [{ "deltaF": -51, "sign": "negative", "source": "doi:..." }],
  "sensitivityData": [{ "deltaF": 8.5, "source": "doi:..." }],
  "brightnessData": [{ "ratio": 0.748, "reference": "EGFP", "source": "doi:..." }],
  "photostabilityData": [{ "brightnessRemaining": 80, "illumination": "16 mW/mm²", "duration": "1 min", "source": "doi:..." }],

  "addgene": { "id": "132331", "url": "https://www.addgene.org/132331/" },
  "researchPapers": [{ "title": "...", "authors": "...", "journal": "...", "year": 2024, "sample": "Mouse, cortex, in vivo", "url": "https://doi.org/..." }]
}
```

### Critical rules for JSON files
- **Never set score fields** (`speed`, `dynamicRange`, `sensitivity`, `brightness`, `photostability`, `overall`, `paperCount`, `popularity`) in JSON — all computed at runtime by `geviData.ts`
- **Omit empty arrays** — if no kinetics data exists, omit the `kinetics` field entirely
- `id` must match filename and last element of `familyTreePath` if used
- `voltage.custom.deltaF` at −70 mV must be normalized to 0

---

## Score Computation (`geviData.ts`)

All subscores are computed at runtime from raw data. The pipeline:

1. Load all JSON files via `import.meta.glob('./gevis/*.json', { eager: true })`
2. Normalize legacy single-object fields to arrays (old files may have `kinetics: {...}` instead of `[{...}]`)
3. Build brightness B_rel map via BFS graph traversal across all `brightnessData` entries
4. Compute all subscores per GEVI

### Scoring formulas

| Score | Formula | Notes |
|-------|---------|-------|
| **Speed** | `max(0, min(100, round(63.6 × log₁₀(30 / (τ_on + τ_off)))))` | τ in ms; score 0 when τ_sum ≥ 30 ms |
| **Dynamic Range** | `max(0, min(100, round(83.33 × log₁₀(|ΔF/F|) − 66.66)))` | ΔF/F in %; 25%→50, 50%→75, 100%→100 |
| **Sensitivity** | `max(0, min(100, round(66.4 × log₁₀(|ΔF/F|) − 32.8)))` | ΔF/F per AP; 25%→60, 50%→80, 100%→100 |
| **Brightness** | `max(0, min(100, round(25 × log₁₀(B_rel) + 60)))` | B_rel vs EGFP; EGFP scores 60 |
| **Photostability** | `min(100, round(100 × F_remaining ^ (100 / (t × P))))` | Standard: 100 mW/mm², 1 min |
| **Popularity** | `min(100, round(50 × log₁₀(papers + 1)))` | papers = researchPapers.length |
| **Overall** | Weighted average + penalty | Speed 20%, DynRange 20%, Brightness 20%, Sensitivity 15%, Photostability 15%, Popularity 10%; null scores excluded with proportional weight redistribution; −10 penalty per performance score below 10 |

### Brightness graph traversal

`buildBrelMap()` performs BFS from `EGFP` (anchor, B_rel = 1.0) through a **bidirectional** graph of brightness comparisons. Each `brightnessData` entry `{ ratio, reference }` in GEVI A encodes:
- Forward edge: `reference → A` with factor = `ratio`
- Reverse edge: `A → reference` with factor = `1/ratio`

Multiple path estimates are resolved via geometric mean (average of log estimates). This allows resolving brightness for GEVIs not directly compared to EGFP.

---

## Adding / Updating GEVIs

Use the **`gevi-page-curator`** subagent defined in `.claude/agents/gevi-page-curator.md`. It handles:
- Fetching papers, extracting metrics
- Searching for independent research papers
- Extracting real spectrum data from FPbase
- Extracting voltage curves from figures
- Cross-GEVI updates when a paper measures multiple sensors

**Usage:** Launch as a general-purpose agent with the curator instructions embedded, not as a named subagent type.

```
Agent tool → general-purpose → "Follow the gevi-page-curator instructions at .claude/agents/gevi-page-curator.md to add/update [GEVI name] from [paper URL]"
```

---

## Family Tree

Structure is implicit from `parentId` chains and explicit `familyTreePath` arrays in JSON files. There are 5 branches:

| Branch | spectrum.type | voltage.type |
|--------|--------------|-------------|
| VSD-single (ASAP, JEDI, ArcLight) | `fp` | `fp` |
| VSD-FRET (Mermaid, VSFP, LOTUS-V, FlicR1) | `fret` | `fret` |
| Opsin-Fluorescent (Arch, PROPS) | `rhodopsin` | `opsin` |
| Opsin-FRET (Ace2N-mNeon, MacQ) | `rhodopsin` | `opsin` |
| Chemigenetic (Voltron, HVI+) | `rhodopsin` | `chemi` |

The `FamilyTreePanel` renders a vertical FPbase-style layout using custom SVG with no external libraries.

---

## Brightness Network

`BrightnessNetworkPanel.tsx` renders a force-directed graph of brightness comparisons between GEVIs:
- Nodes = GEVIs (size scaled by brightness score; color from `getTreeNodeColor`)
- Edges = `brightnessData` entries (labeled with ratio)
- EGFP pinned at center
- Layout: Fruchterman-Reingold algorithm (350 iterations), BFS-based concentric ring initialization
- Pan/zoom via non-passive wheel listener + drag
- Hover tooltip; click node → navigates to GEVI detail

---

## Theme

- **Dark/light mode** via `ThemeContext` — `darkMode` prop passed throughout
- Light mode uses `bg-paper` (off-white) and `text-gray-900`
- Dark mode uses `bg-gray-800` / `bg-gray-900` and `text-gray-300`
- Active nav tabs: `bg-blue-900 text-white`
- Brand colors: blue-500 for "GEVI", gray-900/white for "Bench"

---

## Development Notes

- Run dev server: `pnpm dev` from `/Users/dzgong/Documents/GEVIBench/vnet-benchmark/`
- No test suite — manual browser testing
- When browsing the site with playwright-cli, always use the `--headed` flag
- The site has no backend — all data is bundled at build time via Vite's `import.meta.glob`
- `geviData.ts` caches loaded GEVIs in a module-level variable; refresh the page to pick up JSON changes in dev mode
