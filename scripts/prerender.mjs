#!/usr/bin/env node
// Post-build step (`pnpm build` runs it after `vite build`): writes everything a crawler
// or LLM can read without running JavaScript, regenerated on every deploy.
//
//   dist/**/index.html   per-route HTML with the page's real content inside #root
//   dist/llms.txt        llmstxt.org index: what GEVIBench is + one line per sensor
//   dist/llms-full.txt   every sensor in full, as Markdown
//   dist/data/gevis.json machine-readable values + every measurement with its source
//   dist/data/gevis.csv  one row per sensor, the table's headline values
//   dist/sitemap.xml
//
// Values come from the app's own modules (src/geviData.ts, src/metricText.ts), loaded
// through Vite's SSR loader — not re-derived here — so the text matches the site exactly.
//
// The content sits inside <div id="root"> (not <noscript>): HTML→Markdown fetchers used
// by LLM tools drop <noscript>, which left them seeing only the page title. React's
// createRoot replaces it on load; a one-line head script hides it first so visitors
// with JavaScript never see it flash.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const BASE_URL = 'https://gevibench.org';

// ── Load the app's data through Vite (import.meta.glob + virtual modules work) ──
const vite = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, watch: null },
});
const { getAllGEVIs, getDoiCitationMap, scaledT75Entries } = await vite.ssrLoadModule('/src/geviData.ts');
const { metricText } = await vite.ssrLoadModule('/src/metricText.ts');
await vite.close();

const gevis = getAllGEVIs().slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
const byId = new Map(gevis.map(g => [g.id, g]));
const citeMap = getDoiCitationMap();
const GEVI_COUNT = gevis.length;
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const CITATION = JSON.parse(readFileSync(join(ROOT, 'src', 'citation.json'), 'utf-8'));
const CITATION_URL = `https://doi.org/${CITATION.doi}`;
const CITATION_PROSE =
  `${CITATION.authors.map(a => `${a.given} ${a.family}`).join(' and ')} (${CITATION.year}). ` +
  `${CITATION.title}. ${CITATION.journal}. ${CITATION_URL}`;

// ── Metric definitions (same wording as the table's column help) ──
const METRICS = [
  { key: 'brightness', label: 'Brightness (B/B_EGFP)', def: 'Molecular brightness relative to EGFP (extinction coefficient × quantum yield, or a measured ratio). Sensors not measured against EGFP directly are placed through a chain of pairwise brightness comparisons, combined by geometric mean.' },
  { key: 'kinetics', label: 'Kinetics τ_on / τ_off (ms)', def: 'Activation / decay time constants in ms (amplitude-weighted mean τ for multi-exponential fits). The value shown averages the measurements made at physiological temperature (≥33 °C); if there are none, it is the measurement closest to 33 °C.' },
  { key: 'dynamicRange', label: 'ΔF/F per 100 mV', def: 'Steady-state fluorescence change for a 100 mV depolarization step (−70 → +30 mV); the sign gives the polarity. The table shows the first listed measurement; the median across measurements (one-photon preferred) is used for sorting.' },
  { key: 'subthreshold', label: 'ΔF/F per mV', def: 'Subthreshold sensitivity: fluorescence change per mV near rest (−90 to −50 mV). Where no value is reported directly, it is estimated from the F–V curve.' },
  { key: 'sensitivity', label: 'ΔF/F per AP', def: 'Fluorescence change per single action potential in neurons. The table shows the first listed measurement; the median across measurements (one-photon preferred) is used for sorting.' },
  { key: 'apWidth', label: 'AP width (FWHM, ms)', def: 'Full width at half maximum of the optical spike waveform.' },
  { key: 'photostability', label: 'Photostability t75% @ 100 mW/mm²', def: 'Time for fluorescence to fall to 75% of its initial value under one-photon illumination, linearly dose-scaled to 100 mW/mm² (t50% is used where the 75% crossing falls inside a fast initial transient). Two-photon curves are not dose-scaled and are excluded.' },
];

// ── Formatting helpers ──
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mdEsc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const num = v => (v == null || !Number.isFinite(v) ? null : parseFloat(v.toPrecision(4)));
const geviUrl = id => `${BASE_URL}/gevi/${id}`;
const doiOf = src => (typeof src === 'string' ? src.replace(/^doi:\s*/i, '').replace(/^https?:\/\/(dx\.)?doi\.org\//, '') : '');
function sourceRef(src, fig) {
  const doi = doiOf(src);
  if (!doi) return null;
  const label = citeMap[doi] || `doi:${doi}`;
  return { label: fig ? `${label}, ${fig}` : label, url: /^10\./.test(doi) ? `https://doi.org/${doi}` : src };
}
const nameOf = id => byId.get(id)?.name ?? id;
const polarityOf = g => g.voltage?.polarity ?? (g.dynamicRangeData?.[0]?.sign ?? null);

// ── One structured record per sensor: the single source for HTML, Markdown, JSON, CSV ──
function buildRecord(g) {
  const ent = (arr, map) => (Array.isArray(arr) ? arr.map(map) : []);
  const withSrc = e => ({ source: sourceRef(e.source, e.sourceFigure) });
  const t75Scaled = scaledT75Entries(g);
  return {
    id: g.id,
    name: g.name,
    url: geviUrl(g.id),
    description: g.description,
    category: g.category,
    tags: g.tags ?? [],
    year: g.year,
    date: g.date ?? null,
    paper: g.paper,
    paperUrl: g.paperUrl,
    parent: g.parentId ? { id: g.parentId, name: nameOf(g.parentId) } : null,
    crossBranchParent: g.crossBranchParentId ? { id: g.crossBranchParentId, name: nameOf(g.crossBranchParentId) } : null,
    lineagePath: g.familyTreePath ?? null,
    polarity: polarityOf(g),
    spectrum: g.spectrum ? { peakExcitationNm: g.spectrum.peakEx ?? null, peakEmissionNm: g.spectrum.peakEm ?? null, fluorophore: g.spectrum.name ?? null } : null,
    twoPhotonCompatible: g.twoPhoton?.length ? g.twoPhoton.some(t => t.compatible) : null,
    bioluminescent: g.photostabilityData === 'bioluminescent' || g.category === 'Bioluminescent GEVI',
    addgene: g.addgene ? { id: g.addgene.id, url: g.addgene.url, note: g.addgene.note ?? null } : null,
    lastUpdated: g.lastUpdated ?? null,
    // Exactly the strings the database table shows.
    display: Object.fromEntries(METRICS.map(m => [m.key, metricText(g, m.key)])),
    values: {
      brightnessRelEGFP: num(g.bRel),
      tauOnMs: num(g.displayTauOn),
      tauOffMs: num(g.displayTauOff),
      dffPer100mV: num(g.dynamicRangeData?.[0]?.deltaF),
      dffPer100mVMedianAbs: num(g.displayDynamicRange),
      dffPerMV: num(g.displaySubthreshold),
      dffPerMVEstimatedFromFV: !!g.subthresholdDerived,
      dffPerAP: num(g.sensitivityData?.[0]?.deltaF),
      dffPerAPMedianAbs: num(g.displaySensitivity),
      apWidthMs: num(g.displayApWidth),
      t75At100mWmm2Sec: num(g.displayT75),
      papersUsingIt: g.paperCount ?? 0,
    },
    measurements: {
      kinetics: ent(g.kinetics, e => ({ tauOnMs: e.on ?? null, tauOffMs: e.off ?? null, temperature: e.temperature ?? null, dye: e.dye ?? null, ...withSrc(e) })),
      dffPer100mV: ent(g.dynamicRangeData, e => ({ dff: e.deltaF, responseType: e.responseType ?? 'steady-state', modality: e.modality ?? null, dye: e.dye ?? null, ...withSrc(e) })),
      dffPerMV: ent(g.subthresholdData, e => ({ slopePercentPerMV: e.slope, modality: e.modality ?? null, note: e.note ?? null, ...withSrc(e) })),
      dffPerAP: ent(g.sensitivityData, e => ({ dff: e.deltaF, modality: e.modality ?? null, dye: e.dye ?? null, ...withSrc(e) })),
      apWidth: ent(g.apWidthData, e => ({ fwhmMs: e.fwhm, samplingRateHz: e.samplingRate, sample: e.sample ?? null, modality: e.modality ?? null, temperature: e.temperature ?? null, ...withSrc(e) })),
      brightness: ent(g.brightnessData, e => ({ ratio: e.ratio, reference: e.reference === 'EGFP' ? 'EGFP' : nameOf(e.reference), ...withSrc(e) })),
      photobleaching: ent(g.photobleach, e => ({
        modality: e.modality ?? null, illumination: e.illumination ?? null, intensityMWmm2: e.intensityMWmm2 ?? null,
        t75Sec: e.t75 ?? null, t50Sec: e.t50 ?? null, extrapolated: !!e.extrapolated, ...withSrc(e),
      })),
    },
    t75ScaledEntriesSec: t75Scaled.map(num),
    fvCurve: g.voltage?.custom?.voltage?.length
      ? { voltageMV: g.voltage.custom.voltage, dffPercent: g.voltage.custom.deltaF, ...withSrc(g.voltage) }
      : null,
    researchPapers: (g.researchPapers ?? []).map(p => ({ title: p.title, authors: p.authors, journal: p.journal, year: p.year ?? null, sample: p.sample ?? null, url: p.url })),
  };
}
const records = gevis.map(buildRecord);
// The table rounds brightness to 2 decimals, which prints opsins (~10⁻³) as "0.00×" — read
// literally as zero. Generated text keeps 2 significant figures below 0.01 instead.
for (const r of records) {
  const b = r.values.brightnessRelEGFP;
  if (b != null && b < 0.01) r.display.brightness = `${b.toPrecision(2)}×`;
}
const recById = new Map(records.map(r => [r.id, r]));

// ── A tiny document builder that emits HTML and Markdown from the same calls ──
// Inline content is an array of strings and {text, url} links.
const inl = parts => (Array.isArray(parts) ? parts : [parts]).filter(x => x != null && x !== '');
const inlHtml = parts => inl(parts).map(p => (typeof p === 'string' ? esc(p) : `<a href="${esc(p.url)}">${esc(p.text)}</a>`)).join('');
const inlMd = parts => inl(parts).map(p => (typeof p === 'string' ? p : `[${p.text}](${p.url})`)).join('');

class Doc {
  constructor() { this.html = []; this.md = []; }
  h(level, parts) { this.html.push(`<h${level}>${inlHtml(parts)}</h${level}>`); this.md.push(`${'#'.repeat(level)} ${inlMd(parts)}`, ''); return this; }
  p(parts) { this.html.push(`<p>${inlHtml(parts)}</p>`); this.md.push(inlMd(parts), ''); return this; }
  ul(items) {
    if (!items.length) return this;
    this.html.push(`<ul>${items.map(i => `<li>${inlHtml(i)}</li>`).join('')}</ul>`);
    this.md.push(...items.map(i => `- ${inlMd(i)}`), '');
    return this;
  }
  table(head, rows) {
    this.html.push(`<table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inlHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    this.md.push(`| ${head.map(mdEsc).join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(c => mdEsc(inlMd(c))).join(' | ')} |`), '');
    return this;
  }
  raw(html, md) { this.html.push(html); this.md.push(md, ''); return this; }
  toHtml() { return this.html.join('\n'); }
  toMd() { return this.md.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'; }
}

const link = (text, url) => ({ text, url });
const src = s => (s ? link(s.label, s.url) : 'source not recorded');
const v = x => x ?? '—';
const fmtN = x => (x == null ? '—' : String(parseFloat(Number(x).toPrecision(3))));

// ── Sensor page content ──
function sensorDoc(r, doc = new Doc(), level = 1) {
  const H = n => level + n;
  doc.h(H(0), r.name);
  if (r.description) doc.p(r.description);
  const facts = [
    [`Category: ${r.category}`],
    [`Published: ${r.date ?? r.year} — `, r.paperUrl ? link(r.paper, r.paperUrl) : r.paper],
    r.parent ? ['Derived from: ', link(r.parent.name, geviUrl(r.parent.id)), r.crossBranchParent ? ['; also related to ', link(r.crossBranchParent.name, geviUrl(r.crossBranchParent.id))] : ''].flat() : null,
    r.polarity ? [`Response polarity: ${r.polarity}-going (fluorescence ${r.polarity === 'negative' ? 'decreases' : 'increases'} on depolarization)`] : null,
    r.spectrum ? [`Spectrum: excitation peak ${v(r.spectrum.peakExcitationNm)} nm, emission peak ${v(r.spectrum.peakEmissionNm)} nm (${r.spectrum.fluorophore})`] : null,
    r.twoPhotonCompatible != null ? [`Two-photon compatible: ${r.twoPhotonCompatible ? 'yes' : 'no'}`] : null,
    r.bioluminescent ? ['Bioluminescent: emits light enzymatically, needs no excitation and does not photobleach'] : null,
    r.addgene ? ['Plasmid: ', link(`Addgene #${r.addgene.id}`, r.addgene.url), r.addgene.note ? ` (${r.addgene.note})` : ''] : null,
    r.tags.length ? [`Tags: ${r.tags.join(', ')}`] : null,
  ].filter(Boolean);
  doc.ul(facts);

  doc.h(H(1), 'Headline values (as shown in the GEVIBench table)');
  doc.table(['Metric', 'Value', 'Definition'], METRICS.map(m => {
    let val = r.display[m.key] ?? '—';
    if (m.key === 'brightness' && r.display.brightness) val += ' EGFP';
    if (m.key === 'kinetics' && r.display.kinetics) val += ' ms';
    if (m.key === 'subthreshold' && r.values.dffPerMVEstimatedFromFV) val += ' (estimated from the F–V curve)';
    const signed = (x, first) => `${first < 0 ? '−' : first > 0 && m.key === 'dynamicRange' ? '+' : ''}${fmtN(x)}%`;
    if (m.key === 'dynamicRange' && r.measurements.dffPer100mV.length > 1) val += ` (median of ${r.measurements.dffPer100mV.length} measurements: ${signed(r.values.dffPer100mVMedianAbs, r.values.dffPer100mV)})`;
    if (m.key === 'sensitivity' && r.measurements.dffPerAP.length > 1) val += ` (median of ${r.measurements.dffPerAP.length} measurements: ${signed(r.values.dffPerAPMedianAbs, r.values.dffPerAP)})`;
    return [m.label, val, m.def];
  }));
  doc.p(`Used in ${r.values.papersUsingIt} research paper${r.values.papersUsingIt === 1 ? '' : 's'} tracked by GEVIBench.`);

  doc.h(H(1), 'Measurements and sources');
  const M = r.measurements;
  const sect = (title, items) => { if (items.length) { doc.h(H(2), title); doc.ul(items); } };
  sect('Kinetics', M.kinetics.map(e => [`τ_on ${v(e.tauOnMs)} ms, τ_off ${v(e.tauOffMs)} ms`, e.temperature ? ` at ${e.temperature}` : '', e.dye ? ` (dye ${e.dye})` : '', ' — ', src(e.source)]));
  sect('ΔF/F per 100 mV', M.dffPer100mV.map(e => [`${e.dff > 0 ? '+' : ''}${e.dff}%`, e.responseType === 'peak' ? ' (peak)' : '', e.modality ? `, ${e.modality}` : '', e.dye ? `, dye ${e.dye}` : '', ' — ', src(e.source)]));
  sect('ΔF/F per mV (subthreshold)', M.dffPerMV.map(e => [`${e.slopePercentPerMV}%/mV`, e.modality ? `, ${e.modality}` : '', e.note ? ` (${e.note})` : '', ' — ', src(e.source)]));
  sect('ΔF/F per action potential', M.dffPerAP.map(e => [`${e.dff}%`, e.modality ? `, ${e.modality}` : '', e.dye ? `, dye ${e.dye}` : '', ' — ', src(e.source)]));
  sect('AP width (FWHM)', M.apWidth.map(e => [`${e.fwhmMs} ms at ${e.samplingRateHz} Hz sampling`, e.sample ? `, ${e.sample}` : '', e.modality ? `, ${e.modality}` : '', e.temperature ? `, ${e.temperature}` : '', ' — ', src(e.source)]));
  sect('Brightness comparisons', M.brightness.map(e => [`${e.ratio}× the brightness of ${e.reference}`, ' — ', src(e.source)]));
  sect('Photobleaching', M.photobleaching.map(e => [
    e.t75Sec != null ? `t75% = ${fmtN(e.t75Sec)} s` : e.t50Sec != null ? `t50% = ${fmtN(e.t50Sec)} s` : 'curve only (did not reach 75% within the measured window)',
    e.extrapolated ? ' (extrapolated)' : '', e.illumination ? ` at ${e.illumination}` : '', e.modality ? `, ${e.modality}` : '', ' — ', src(e.source),
  ]));
  if (r.fvCurve) {
    doc.h(H(2), 'Fluorescence–voltage (F–V) curve');
    doc.p(['ΔF/F (%) at each membrane potential, normalized to 0 at −70 mV: ',
      r.fvCurve.voltageMV.map((mv, i) => `${mv} mV: ${fmtN(r.fvCurve.dffPercent[i])}%`).join('; '),
      r.fvCurve.source ? ' — ' : '', r.fvCurve.source ? src(r.fvCurve.source) : '']);
  }

  if (r.researchPapers.length) {
    doc.h(H(1), `Research papers using ${r.name} (${r.researchPapers.length})`);
    doc.ul(r.researchPapers.map(p => [link(p.title, p.url), ` — ${p.authors}, ${p.journal}${p.year ? ` ${p.year}` : ''}`, p.sample ? ` (${p.sample})` : '']));
  }
  return doc;
}

const dataLinks = [
  [link('llms.txt', `${BASE_URL}/llms.txt`), ' — summary for language models'],
  [link('llms-full.txt', `${BASE_URL}/llms-full.txt`), ' — every sensor in full (Markdown)'],
  [link('gevis.json', `${BASE_URL}/data/gevis.json`), ' — all values and measurements with sources (JSON)'],
  [link('gevis.csv', `${BASE_URL}/data/gevis.csv`), ' — one row per sensor (CSV)'],
];
const citeLine = ['Cite GEVIBench as: ', CITATION_PROSE.replace(CITATION_URL, ''), link(CITATION_URL, CITATION_URL)];

function footer(doc) {
  doc.h(2, 'Data and citation');
  doc.ul(dataLinks);
  doc.p(citeLine);
  doc.p(`Generated from the GEVIBench database on ${BUILD_DATE}.`);
  return doc;
}

const summaryRow = r => [
  link(r.name, r.url), String(r.year), r.category, r.polarity ?? '—',
  r.display.brightness ?? '—', r.display.kinetics ?? '—', r.display.dynamicRange ?? '—',
  r.display.subthreshold ?? '—', r.display.sensitivity ?? '—', r.display.apWidth ?? '—',
  r.display.photostability ?? '—', String(r.values.papersUsingIt),
];
const SUMMARY_HEAD = ['Sensor', 'Year', 'Category', 'Polarity', 'B/B_EGFP', 'τ_on / τ_off (ms)', 'ΔF/F per 100 mV', 'ΔF/F per mV', 'ΔF/F per AP', 'AP FWHM', 't75% @100 mW/mm²', 'Papers'];

function definitions(doc, level = 2) {
  doc.h(level, 'How the numbers are defined');
  doc.ul(METRICS.map(m => [`${m.label}: ${m.def}`]));
  return doc;
}

// ── Page templates ──
const template = readFileSync(join(DIST, 'index.html'), 'utf-8');
const HIDE_FOR_JS = `<script>document.documentElement.classList.add('js')</script><style>.js #prerender{display:none}#prerender{max-width:960px;margin:0 auto;padding:20px;font-family:sans-serif;line-height:1.5}#prerender table{border-collapse:collapse;font-size:14px}#prerender td,#prerender th{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}</style>`;

function withLiveCount(html) {
  return html.replace(/Compare \d+ (sensors|genetically encoded voltage indicators|voltage indicators)/g, `Compare ${GEVI_COUNT} $1`);
}

function renderPage({ path, title, description, bodyHtml, canonical = path }) {
  let html = template;
  const set = (re, val) => { html = html.replace(re, val); };
  set(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  set(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(description)}" />`);
  set(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${esc(BASE_URL + canonical)}" />`);
  set(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`);
  set(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(description)}" />`);
  set(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${esc(BASE_URL + path)}" />`);
  set(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  set(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  set('</head>', `  <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM summary" />\n  ${HIDE_FOR_JS}\n</head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in dist/index.html');
  html = html.replace('<div id="root"></div>', `<div id="root"><main id="prerender">\n${bodyHtml}\n</main></div>`);
  const dir = join(DIST, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), withLiveCount(html));
}

const breadcrumb = (...parts) => new Doc().p([link('GEVIBench', `${BASE_URL}/`), ...parts.flatMap(p => [' › ', p])]);

// Sensor pages
for (const r of records) {
  const doc = breadcrumb(link('All sensors', `${BASE_URL}/`), r.name);
  sensorDoc(r, doc);
  footer(doc);
  const bits = [
    r.display.kinetics && `τ_on/τ_off ${r.display.kinetics} ms`,
    r.display.dynamicRange && `ΔF/F ${r.display.dynamicRange} per 100 mV`,
    r.display.sensitivity && `${r.display.sensitivity} per AP`,
    r.display.brightness && `brightness ${r.display.brightness} EGFP`,
  ].filter(Boolean).join(', ');
  renderPage({
    path: `/gevi/${r.id}`,
    title: `${r.name} — GEVIBench`,
    description: `${r.name}: ${r.description} Category: ${r.category}.${bits ? ` ${bits}.` : ''}`,
    bodyHtml: doc.toHtml(),
  });
}

// Homepage
const homeDoc = new Doc()
  .h(1, 'GEVIBench — Genetically Encoded Voltage Indicator Benchmark')
  .p(`GEVIBench is an open database of the published performance of ${GEVI_COUNT} genetically encoded voltage indicators (GEVIs). Values are curated from the original papers and normalized to one definition per metric so that sensors can be compared directly. Every value links to its source on the sensor's page.`);
definitions(homeDoc);
homeDoc.h(2, `All sensors (${GEVI_COUNT})`).table(SUMMARY_HEAD, records.map(summaryRow));
homeDoc.h(2, 'Tools').ul([
  [link('Family tree', `${BASE_URL}/family-tree`), ' — lineage of every sensor'],
  [link('Brightness network', `${BASE_URL}/brightness-network`), ' — pairwise brightness comparisons anchored to EGFP'],
  [link('Performance scatter', `${BASE_URL}/scatter-plot`), ' — plot any two metrics, or expressions of metrics, against each other'],
  [link('Action potential simulator', `${BASE_URL}/ap-simulator`), ' — simulated optical spike responses'],
  [link('About & how to cite', `${BASE_URL}/about`)],
]);
footer(homeDoc);
renderPage({
  path: '/',
  title: 'GEVIBench — Genetically Encoded Voltage Indicator Benchmark',
  description: `GEVIBench is an open benchmark for genetically encoded voltage indicators (GEVIs). Compare ${GEVI_COUNT} sensors by speed, brightness, sensitivity, dynamic range, photostability, and popularity. Explore family trees, AP simulations, and spectral data.`,
  bodyHtml: homeDoc.toHtml(),
});

// About (+ retired /contact, /cite and /methodology, canonicalized to /about). The site
// returns 404 for paths with no file, so retired URLs that are still indexed need one.
const aboutDoc = breadcrumb('About')
  .h(1, 'About GEVIBench')
  .p("GEVIBench gathers the published performance data for genetically encoded voltage indicators, so that sensors can be compared on the same axes instead of on the claims in each paper's abstract. Brightness, dynamic range, kinetics and photostability are each normalized to one definition before they reach the table. GEVIBench reports measured values only; it does not score or rank sensors.");
definitions(aboutDoc);
aboutDoc.h(2, 'How to cite').p([`GEVIBench accompanies a review of voltage imaging in ${CITATION.journal}. Please cite: `, ...citeLine.slice(1)]);
aboutDoc.h(2, 'Contact & contribute').p('Request a sensor, report a missing or wrong number, or share a paper we should be reading.');
footer(aboutDoc);
for (const path of ['/about', '/contact', '/cite', '/methodology']) {
  renderPage({
    path, canonical: '/about',
    title: 'About & How to Cite — GEVIBench',
    description: `What GEVIBench is, how its numbers are standardized, and how to cite it: ${CITATION.authors.map(a => a.family).join(' & ')} (${CITATION.year}), "${CITATION.title}", ${CITATION.journal}.`,
    bodyHtml: aboutDoc.toHtml(),
  });
}

// Family tree: nested lineage
const children = new Map();
for (const r of records) if (r.parent) (children.get(r.parent.id) ?? children.set(r.parent.id, []).get(r.parent.id)).push(r);
const treeHtml = r => `<li><a href="${esc(r.url)}">${esc(r.name)}</a> (${r.year})${children.get(r.id)?.length ? `<ul>${children.get(r.id).sort((a, b) => a.year - b.year).map(treeHtml).join('')}</ul>` : ''}</li>`;
const treeMd = (r, depth) => [`${'  '.repeat(depth)}- [${r.name}](${r.url}) (${r.year})`, ...(children.get(r.id) ?? []).sort((a, b) => a.year - b.year).flatMap(c => treeMd(c, depth + 1))];
const roots = records.filter(r => !r.parent || !recById.has(r.parent.id));
const branches = new Map();
for (const r of roots) {
  const branch = (r.lineagePath ?? []).slice(1, -1).join(' › ') || r.category;
  (branches.get(branch) ?? branches.set(branch, []).get(branch)).push(r);
}
const familyDoc = breadcrumb('Family tree').h(1, 'GEVI family tree')
  .p('Lineage of every sensor in GEVIBench: each sensor is listed under the sensor it was engineered from, grouped by architecture branch.');
for (const [branch, rs] of [...branches].sort()) {
  familyDoc.h(2, branch);
  familyDoc.raw(`<ul>${rs.sort((a, b) => a.year - b.year).map(treeHtml).join('')}</ul>`, rs.sort((a, b) => a.year - b.year).flatMap(r => treeMd(r, 0)).join('\n'));
}
const crossLinks = records.filter(r => r.crossBranchParent);
if (crossLinks.length) {
  familyDoc.h(2, 'Cross-branch relationships').ul(crossLinks.map(r => [link(r.name, r.url), ' is also related to ', link(r.crossBranchParent.name, geviUrl(r.crossBranchParent.id))]));
}
footer(familyDoc);
renderPage({ path: '/family-tree', title: 'Family Tree — GEVIBench', description: 'Lineage tree of genetically encoded voltage indicators (GEVIs), showing how the ASAP, JEDI, ArcLight, Voltron, Arch, and other families are derived from one another.', bodyHtml: familyDoc.toHtml() });

// Brightness network: B_rel ranking + every pairwise comparison
const brightDoc = breadcrumb('Brightness network').h(1, 'Brightness network')
  .p('Molecular brightness of each sensor relative to EGFP. Sensors measured against another sensor rather than EGFP are placed through the chain of pairwise comparisons below (multiple paths combined by geometric mean).')
  .h(2, 'Brightness relative to EGFP')
  .table(['Sensor', 'B/B_EGFP'], records.filter(r => r.values.brightnessRelEGFP != null).sort((a, b) => b.values.brightnessRelEGFP - a.values.brightnessRelEGFP).map(r => [link(r.name, r.url), r.display.brightness]))
  .h(2, 'Pairwise brightness measurements')
  .ul(records.flatMap(r => r.measurements.brightness.map(e => [link(r.name, r.url), ` is ${e.ratio}× as bright as ${e.reference} — `, src(e.source)])));
footer(brightDoc);
renderPage({ path: '/brightness-network', title: 'Brightness Network — GEVIBench', description: 'Molecular brightness of genetically encoded voltage indicators (GEVIs) relative to EGFP, resolved through pairwise brightness measurements.', bodyHtml: brightDoc.toHtml() });

// Scatter + AP simulator: describe the tool and give the data it plots
const scatterDoc = breadcrumb('Performance scatter').h(1, 'Performance scatter plot')
  .p('An interactive scatter plot of any two GEVI metrics (or expressions combining them, such as ΔF/F per AP × √brightness), with linear or logarithmic axes. The values it plots are listed below.')
  .table(SUMMARY_HEAD, records.map(summaryRow));
footer(scatterDoc);
renderPage({ path: '/scatter-plot', title: 'Performance Scatter Plot — GEVIBench', description: 'Interactive scatter plot comparing genetically encoded voltage indicators (GEVIs) across speed, sensitivity, dynamic range, brightness, AP width and photostability, including custom expressions of metrics.', bodyHtml: scatterDoc.toHtml() });

const apDoc = breadcrumb('AP simulator').h(1, 'Action potential simulator')
  .p("Simulates how each genetically encoded voltage indicator reports a neuronal action potential, from the sensor's measured kinetics (τ_on, τ_off) and fluorescence–voltage curve.")
  .table(['Sensor', 'τ_on / τ_off (ms)', 'ΔF/F per AP'], records.filter(r => r.display.kinetics).map(r => [link(r.name, r.url), r.display.kinetics, r.display.sensitivity ?? '—']));
footer(apDoc);
renderPage({ path: '/ap-simulator', title: 'Action Potential Simulator — GEVIBench', description: 'Simulate how different genetically encoded voltage indicators (GEVIs) report action potentials, comparing their kinetics and sensitivity side by side.', bodyHtml: apDoc.toHtml() });

// ── llms.txt / llms-full.txt ──
const oneLine = r => {
  const bits = [
    `${r.category}, ${r.year}`,
    r.polarity && `${r.polarity}-going`,
    r.display.brightness && `B ${r.display.brightness} EGFP`,
    r.display.kinetics && `τ_on/τ_off ${r.display.kinetics} ms`,
    r.display.dynamicRange && `ΔF/F ${r.display.dynamicRange}/100 mV`,
    r.display.sensitivity && `${r.display.sensitivity}/AP`,
    r.display.photostability && `t75 ${r.display.photostability}`,
  ].filter(Boolean);
  return `- [${r.name}](${r.url}): ${bits.join('; ')}`;
};
const llmsHeader = [
  '# GEVIBench',
  '',
  `> Open benchmark of ${GEVI_COUNT} genetically encoded voltage indicators (GEVIs): published performance values curated from the original papers, normalized to one definition per metric, each linked to its source. Measured values only — no scores or rankings.`,
  '',
  'Interpretation notes:',
  ...METRICS.map(m => `- ${m.label}: ${m.def}`),
  '- Brightness values are relative to EGFP (1.0 = as bright as EGFP). Opsin-based sensors are typically 10⁻³–10⁻² and are imaged at much higher illumination.',
  '- Values from different preparations (culture, slice, in vivo; 1P vs 2P) are listed separately on each sensor page with their source.',
  '',
  `Cite as: ${CITATION_PROSE}`,
  '',
].join('\n');
const llmsTxt = [
  llmsHeader,
  '## Data',
  `- [All sensors in full](${BASE_URL}/llms-full.txt): every value, measurement, source and research paper, as Markdown`,
  `- [gevis.json](${BASE_URL}/data/gevis.json): machine-readable values and measurements with sources`,
  `- [gevis.csv](${BASE_URL}/data/gevis.csv): one row per sensor`,
  '',
  `## Sensors (${GEVI_COUNT})`,
  ...records.map(oneLine),
  '',
  '## Pages',
  `- [Family tree](${BASE_URL}/family-tree): lineage of every sensor`,
  `- [Brightness network](${BASE_URL}/brightness-network): brightness relative to EGFP and every pairwise comparison`,
  `- [About & how to cite](${BASE_URL}/about)`,
  '',
  `Generated ${BUILD_DATE}.`,
  '',
].join('\n');
writeFileSync(join(DIST, 'llms.txt'), llmsTxt);

const fullDoc = new Doc();
fullDoc.h(2, `Summary of all ${GEVI_COUNT} sensors`).table(SUMMARY_HEAD, records.map(summaryRow));
for (const r of records) sensorDoc(r, fullDoc, 2);
writeFileSync(join(DIST, 'llms-full.txt'), `${llmsHeader}\n${fullDoc.toMd()}\nGenerated ${BUILD_DATE}.\n`);

// ── Data files ──
mkdirSync(join(DIST, 'data'), { recursive: true });
writeFileSync(join(DIST, 'data', 'gevis.json'), JSON.stringify({
  name: 'GEVIBench',
  url: BASE_URL,
  generated: BUILD_DATE,
  citation: { text: CITATION_PROSE, doi: CITATION.doi },
  notes: 'display.* are the exact strings shown in the GEVIBench table; values.* are the same numbers as plain numbers. measurements.* lists every curated measurement with its source.',
  metricDefinitions: Object.fromEntries(METRICS.map(m => [m.key, `${m.label}: ${m.def}`])),
  sensors: records,
}, null, 1));

const CSV_COLS = [
  ['id', r => r.id], ['name', r => r.name], ['year', r => r.year], ['date', r => r.date], ['category', r => r.category],
  ['polarity', r => r.polarity], ['parent', r => r.parent?.name], ['peak_excitation_nm', r => r.spectrum?.peakExcitationNm],
  ['peak_emission_nm', r => r.spectrum?.peakEmissionNm], ['brightness_rel_egfp', r => r.values.brightnessRelEGFP],
  ['tau_on_ms', r => r.values.tauOnMs], ['tau_off_ms', r => r.values.tauOffMs],
  ['dff_per_100mV_pct', r => r.values.dffPer100mV], ['dff_per_100mV_median_abs_pct', r => r.values.dffPer100mVMedianAbs],
  ['dff_per_mV_pct', r => r.values.dffPerMV], ['dff_per_mV_estimated_from_fv', r => r.values.dffPerMVEstimatedFromFV],
  ['dff_per_ap_pct', r => r.values.dffPerAP], ['dff_per_ap_median_abs_pct', r => r.values.dffPerAPMedianAbs],
  ['ap_fwhm_ms', r => r.values.apWidthMs], ['t75_at_100mWmm2_s', r => r.values.t75At100mWmm2Sec],
  ['bioluminescent', r => r.bioluminescent], ['two_photon_compatible', r => r.twoPhotonCompatible],
  ['papers_using_it', r => r.values.papersUsingIt], ['paper', r => r.paper], ['paper_url', r => r.paperUrl], ['url', r => r.url],
];
const csvCell = x => (x == null ? '' : /[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
writeFileSync(join(DIST, 'data', 'gevis.csv'),
  [CSV_COLS.map(c => c[0]).join(','), ...records.map(r => CSV_COLS.map(([, f]) => csvCell(f(r))).join(','))].join('\n') + '\n');

// ── sitemap.xml ──
// /methodology, /contact and /cite are retired URLs that canonicalize to /about (scoring,
// which /methodology described, lives on the arena branch).
const sitemapPaths = ['/', '/about', '/family-tree', '/brightness-network', '/scatter-plot', '/ap-simulator',
  ...records.map(r => r.id).sort((a, b) => a.localeCompare(b)).map(id => `/gevi/${id}`)];
writeFileSync(join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapPaths.map(p => `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n  </url>`).join('\n') +
  '\n</urlset>\n');

console.log(`✓ Prerendered ${records.length} sensor pages + 8 site pages (content in #root)`);
console.log(`✓ Wrote llms.txt, llms-full.txt, data/gevis.json, data/gevis.csv`);
console.log(`✓ Generated sitemap.xml with ${sitemapPaths.length} URLs`);
