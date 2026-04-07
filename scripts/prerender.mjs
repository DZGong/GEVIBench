// Post-build prerendering script
// Launches a local server, visits each route with Puppeteer, and saves the rendered HTML.
// Skips gracefully if Puppeteer/Chrome is not available (e.g. on Vercel).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('Puppeteer not available — skipping prerender.');
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = 4173;

// Collect all routes to prerender
function getRoutes() {
  const geviDir = path.resolve(__dirname, '..', 'src', 'gevis');
  const geviIds = fs.readdirSync(geviDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  return [
    '/',
    '/methodology',
    '/contact',
    '/family-tree',
    '/brightness-network',
    '/scatter-plot',
    '/ap-simulator',
    ...geviIds.map(id => `/gevi/${id}`),
  ];
}

// Simple static file server for dist/
function startServer() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
      // SPA fallback: if file doesn't exist, serve index.html
      if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html');
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function prerender() {
  const routes = getRoutes();
  console.log(`Prerendering ${routes.length} routes...`);

  const server = await startServer();
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  } catch (err) {
    console.log(`Chrome not available — skipping prerender. (${err.message})`);
    server.close();
    process.exit(0);
  }

  for (const route of routes) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 15000 });
    // Wait a bit for React to settle
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

    const html = await page.content();

    // Write to dist — e.g. /gevi/asap3 → dist/gevi/asap3/index.html
    const outDir = route === '/' ? DIST : path.join(DIST, route);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    await page.close();

    const shortRoute = route.length > 30 ? route.slice(0, 27) + '...' : route;
    process.stdout.write(`  ✓ ${shortRoute}\n`);
  }

  await browser.close();
  server.close();
  console.log(`Done — ${routes.length} pages prerendered.`);
}

prerender().catch(err => { console.error(err); process.exit(1); });
