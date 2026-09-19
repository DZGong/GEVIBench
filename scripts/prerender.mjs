#!/usr/bin/env node
// Static prerendering for SEO — no browser needed.
// Reads GEVI JSON files and generates per-route HTML with proper meta tags
// and noscript content so crawlers see real text.
// Runs as a post-build step: node scripts/prerender.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const DIST = join(process.cwd(), 'dist');
const GEVIS_DIR = join(process.cwd(), 'src', 'gevis');
const BASE_URL = 'https://gevibench.org';

// The paper GEVIBench should be cited as. Same record the app reads (src/citation.ts);
// prose here rather than reference-list style, since this is crawler-visible text.
const CITATION = JSON.parse(readFileSync(join(process.cwd(), 'src', 'citation.json'), 'utf-8'));
const CITATION_URL = `https://doi.org/${CITATION.doi}`;
const CITATION_PROSE =
  `${CITATION.authors.map(a => `${a.given} ${a.family}`).join(' and ')} (${CITATION.year}). ` +
  `${CITATION.title}. ${CITATION.journal}. ${CITATION_URL}`;

// Read the built index.html as template
const template = readFileSync(join(DIST, 'index.html'), 'utf-8');

// Load all GEVI JSON files
const geviFiles = readdirSync(GEVIS_DIR).filter(f => f.endsWith('.json'));
const gevis = geviFiles.map(f => {
  const data = JSON.parse(readFileSync(join(GEVIS_DIR, f), 'utf-8'));
  return { ...data, _file: f };
});

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The sensor count appears in index.html's meta description, og:description and
// og:image:alt — the text a link preview actually shows. Rewriting it from the live file
// count means adding a GEVI can't leave the shared blurb claiming a stale number.
const GEVI_COUNT = gevis.length;
function withLiveCount(html) {
  return html.replace(
    /Compare \d+ (sensors|genetically encoded voltage indicators|voltage indicators)/g,
    `Compare ${GEVI_COUNT} $1`
  );
}

// Generate HTML for a route with custom meta tags and noscript content.
// `canonical` differs from `path` only for retired URLs that still resolve: /contact
// and /cite merged into /about, and pointing their canonical at /about keeps the three
// from competing as duplicates in search results.
function renderPage({ path, title, description, noscriptHtml, canonical = path }) {
  let html = template;

  // Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escHtml(title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escHtml(description)}" />`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escHtml(BASE_URL + canonical)}" />`
  );

  // Replace og tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escHtml(title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escHtml(description)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escHtml(BASE_URL + path)}" />`
  );

  // Replace twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escHtml(title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escHtml(description)}" />`
  );

  // Insert noscript content before closing </body>
  if (noscriptHtml) {
    html = html.replace(
      '</body>',
      `<noscript><div style="max-width:800px;margin:0 auto;padding:20px;font-family:sans-serif">${noscriptHtml}</div></noscript>\n</body>`
    );
  }

  // Write to dist
  const dir = join(DIST, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), withLiveCount(html));
}

// --- Generate GEVI detail pages ---
for (const gevi of gevis) {
  const id = gevi.id || basename(gevi._file, '.json');
  const name = gevi.name || id;
  const desc = gevi.description || '';
  const category = gevi.category || '';
  const year = gevi.year || '';
  const paper = gevi.paper || '';

  // Build noscript content with real data
  const lines = [`<h1>${escHtml(name)}</h1>`];
  if (desc) lines.push(`<p>${escHtml(desc)}</p>`);
  lines.push(`<p>Category: ${escHtml(category)} · Published: ${year} · ${escHtml(paper)}</p>`);

  if (gevi.kinetics?.[0]) {
    lines.push(`<p>Speed: τ_on=${gevi.kinetics[0].on} ms, τ_off=${gevi.kinetics[0].off} ms</p>`);
  }
  if (gevi.dynamicRangeData?.[0]) {
    lines.push(`<p>Dynamic Range: ${gevi.dynamicRangeData[0].deltaF}% ΔF/F per 100mV</p>`);
  }
  if (gevi.sensitivityData?.[0]) {
    lines.push(`<p>Sensitivity: ${gevi.sensitivityData[0].deltaF}% ΔF/F per AP</p>`);
  }
  if (gevi.brightnessData?.[0]) {
    lines.push(`<p>Brightness: ${gevi.brightnessData[0].ratio}× vs ${gevi.brightnessData[0].reference}</p>`);
  }
  if (gevi.researchPapers?.length) {
    lines.push(`<h2>Research Papers (${gevi.researchPapers.length})</h2><ul>`);
    for (const p of gevi.researchPapers) {
      lines.push(`<li>${escHtml(p.title)} — ${escHtml(p.authors)}, ${escHtml(p.journal)} ${p.year || ''}</li>`);
    }
    lines.push('</ul>');
  }

  renderPage({
    path: `/gevi/${id}`,
    title: `${name} — GEVIBench`,
    description: `${name}: ${desc} Category: ${category}. Compare speed, brightness, sensitivity, and more on GEVIBench.`,
    noscriptHtml: lines.join('\n'),
  });
}

// --- Generate tool/content pages ---
const staticPages = [
  {
    path: '/methodology',
    title: 'Scoring Methodology — GEVIBench',
    description: 'How GEVIBench scores voltage indicators: formulas for speed, brightness, sensitivity, dynamic range, photostability, and popularity.',
    noscriptHtml: '<h1>Scoring Methodology</h1><p>GEVIBench scores GEVIs using logarithmic formulas across 6 metrics: speed, brightness, sensitivity, dynamic range, photostability, and popularity. All scores are computed at runtime from raw published data.</p>',
  },
  ...['/about', '/contact', '/cite'].map(path => ({
    // /contact and /cite are the retired URLs, kept alive and pointed at /about.
    path,
    canonical: '/about',
    title: 'About & How to Cite — GEVIBench',
    description: `What GEVIBench is, how its numbers are standardized, and how to cite it: ${CITATION.authors.map(a => a.family).join(' & ')} (${CITATION.year}), "${CITATION.title}", ${CITATION.journal}.`,
    noscriptHtml:
      `<h1>About GEVIBench</h1><p>GEVIBench gathers the published performance data for genetically encoded voltage indicators, so that sensors can be compared on the same axes instead of on the claims in each paper's abstract. Brightness, dynamic range, kinetics and photostability are each normalized to one definition before they reach the table.</p>` +
      `<h2>How to cite</h2><p>GEVIBench accompanies a review of voltage imaging in ${escHtml(CITATION.journal)}. Please cite: ${escHtml(CITATION_PROSE)}</p>` +
      `<h2>Contact &amp; contribute</h2><p>Request a sensor, report a missing or wrong number, or share a paper we should be reading.</p>`,
  })),
  {
    path: '/family-tree',
    title: 'Family Tree — GEVIBench',
    description: 'Interactive lineage tree of genetically encoded voltage indicators (GEVIs), showing how the ASAP, JEDI, ArcLight, Voltron, Arch, and other families are derived from one another.',
    noscriptHtml: '<h1>GEVI Family Tree</h1><p>An interactive lineage tree showing the genetic ancestry of genetically encoded voltage indicators (GEVIs) — how each sensor was derived from its parent across the VSD-single, VSD-FRET, opsin, and chemigenetic branches.</p>',
  },
  {
    path: '/brightness-network',
    title: 'Brightness Network — GEVIBench',
    description: 'Force-directed network comparing the molecular brightness of genetically encoded voltage indicators (GEVIs) relative to EGFP and to one another.',
    noscriptHtml: '<h1>Brightness Network</h1><p>A force-directed graph comparing the molecular brightness of genetically encoded voltage indicators (GEVIs), anchored to EGFP and resolved through pairwise brightness measurements.</p>',
  },
  {
    path: '/scatter-plot',
    title: 'Performance Scatter Plot — GEVIBench',
    description: 'Interactive scatter plot comparing genetically encoded voltage indicators (GEVIs) across performance metrics such as speed, sensitivity, dynamic range, brightness, and photostability.',
    noscriptHtml: '<h1>Performance Scatter Plot</h1><p>An interactive scatter plot for comparing genetically encoded voltage indicators (GEVIs) across performance axes including kinetics, sensitivity, dynamic range, brightness, and photostability.</p>',
  },
  {
    path: '/ap-simulator',
    title: 'Action Potential Simulator — GEVIBench',
    description: 'Simulate how different genetically encoded voltage indicators (GEVIs) report action potentials, comparing their kinetics and sensitivity side by side.',
    noscriptHtml: '<h1>Action Potential Simulator</h1><p>Simulate and compare how genetically encoded voltage indicators (GEVIs) report neuronal action potentials, based on each sensor\'s measured kinetics and voltage sensitivity.</p>',
  },
];

for (const page of staticPages) {
  renderPage(page);
}

// --- Inject link directory into the main index.html for crawler discoverability ---
let mainHtml = readFileSync(join(DIST, 'index.html'), 'utf-8');
const linkLines = [
  '<noscript><div style="max-width:800px;margin:0 auto;padding:20px;font-family:sans-serif">',
  '<h1>GEVIBench — Genetically Encoded Voltage Indicator Benchmark</h1>',
  `<p>Compare ${GEVI_COUNT} voltage indicators by speed, brightness, sensitivity, dynamic range, photostability, and popularity.</p>`,
  '<h2>All Sensors</h2><ul>',
];
for (const gevi of gevis) {
  const id = gevi.id || basename(gevi._file, '.json');
  const name = gevi.name || id;
  linkLines.push(`<li><a href="/gevi/${escHtml(id)}">${escHtml(name)}</a> — ${escHtml(gevi.description || '')}</li>`);
}
linkLines.push('</ul>');
linkLines.push('<h2>Tools & Info</h2><ul>');
linkLines.push('<li><a href="/methodology">Scoring Methodology</a></li>');
linkLines.push('<li><a href="/about">About &amp; How to Cite</a></li>');
linkLines.push('</ul></div></noscript>');
mainHtml = mainHtml.replace('</body>', linkLines.join('\n') + '\n</body>');
writeFileSync(join(DIST, 'index.html'), withLiveCount(mainHtml));

// --- Generate sitemap.xml (auto-generated each build — do NOT hand-edit) ---
// Static routes mirror the app's navigable views; GEVI detail pages are derived
// from the JSON files so the sitemap can never drift out of sync with the data.
// /contact and /cite still resolve but canonicalize to /about, so only /about is listed.
const SITEMAP_STATIC_ROUTES = [
  '/', '/methodology', '/about',
  '/family-tree', '/brightness-network', '/scatter-plot', '/ap-simulator',
];
const lastmod = new Date().toISOString().slice(0, 10);
const sitemapPaths = [
  ...SITEMAP_STATIC_ROUTES,
  ...gevis
    .map(g => g.id || basename(g._file, '.json'))
    .sort((a, b) => a.localeCompare(b))
    .map(id => `/gevi/${id}`),
];
const sitemapXml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapPaths
    .map(p => `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n') +
  '\n</urlset>\n';
writeFileSync(join(DIST, 'sitemap.xml'), sitemapXml);

// --- Summary ---
const geviCount = gevis.length;
const totalPages = geviCount + staticPages.length;
console.log(`✓ Prerendered ${totalPages} pages (${geviCount} GEVIs + ${staticPages.length} static + homepage links)`);
console.log(`✓ Generated sitemap.xml with ${sitemapPaths.length} URLs`);
