#!/usr/bin/env node
/**
 * Emits the HTML for the social-share card (public/imgs/og-image.png).
 *
 * Link-preview crawlers (Slack, iMessage, X, LinkedIn, WhatsApp, Discord) will not render
 * SVG, so the card has to be a raster image. Screenshot this HTML at exactly 1200x630:
 *
 *   node scripts/make-og-card.mjs > /tmp/og-card.html
 *   playwright-cli open --headed file:///tmp/og-card.html
 *   playwright-cli resize 1200 630
 *   playwright-cli screenshot --filename=public/imgs/og-image.png
 *
 * Deliberately just the header mark — logo over the GEVI/Bench wordmark on the site's
 * paper colour. Previews are shown small (often cropped toward a square), and the page
 * title is already printed as text under the image, so anything more is unreadable
 * clutter. Everything sits in the centre so a square crop keeps the whole mark.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

// Same line-art logo the site header shows (ink strokes, paper fill), unmodified.
const logo = readFileSync(join(process.cwd(), 'public', 'imgs', 'logo.svg'), 'utf-8')
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/ id="Layer_1"/, '')

process.stdout.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@600&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: #f5f0e8;
    font-family: 'Rubik', system-ui, sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .logo { width: 460px; }
  .logo svg { width: 100%; height: auto; display: block; }
  h1 { margin-top: 26px; font-size: 104px; font-weight: 600; letter-spacing: -2px; line-height: 1; }
  .gevi { color: #002FA7; }
  .bench { color: #1c1c19; }
</style>
</head>
<body>
  <div class="logo">${logo}</div>
  <h1><span class="gevi">GEVI</span><span class="bench">Bench</span></h1>
</body>
</html>
`)
