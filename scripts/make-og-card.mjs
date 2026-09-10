#!/usr/bin/env node
/**
 * Emits the HTML for the social-share card (public/imgs/og-image.png).
 *
 * Link-preview crawlers (Slack, iMessage, X, LinkedIn, WhatsApp, Discord) will not render
 * SVG, so the card has to be a raster image. This script writes the source HTML with the
 * live sensor count baked in; screenshot it at exactly 1200x630 to regenerate the PNG:
 *
 *   node scripts/make-og-card.mjs > /tmp/og-card.html
 *   playwright-cli --headed open file:///tmp/og-card.html
 *   playwright-cli resize 1200 630
 *   playwright-cli screenshot --filename=public/imgs/og-image.png
 *
 * Re-run it when the sensor count changes or the branding moves on. The count in the
 * *text* of the preview comes from prerender.mjs and updates on every build; only this
 * image needs the manual step.
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const count = readdirSync(join(process.cwd(), 'src', 'gevis')).filter((f) => f.endsWith('.json')).length
// The logo is line art in ink on paper; on the Klein-blue card it becomes an unfilled
// paper-coloured outline, so strip its baked-in fills and strokes.
const logo = readFileSync(join(process.cwd(), 'public', 'imgs', 'logo.svg'), 'utf-8')
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/ id="Layer_1"/, '')

process.stdout.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: #002FA7;
    font-family: 'Rubik', system-ui, sans-serif;
    color: #f5f0e8;
    position: relative;
    overflow: hidden;
  }
  /* Depth without a photo: a soft warm bloom off the top-left, the way the site's
     paper surface sits against the Klein blue. */
  .bloom {
    position: absolute; top: -320px; left: -220px; width: 900px; height: 900px;
    background: radial-gradient(circle, rgba(245,240,232,0.16) 0%, rgba(245,240,232,0) 62%);
  }
  /* The whole mark, unclipped — cropping it leaves the spike waveform off the card and
     the remaining ion channels read as random tubes. */
  .art {
    position: absolute; right: 54px; top: 50%; transform: translateY(-46%);
    width: 430px; opacity: 0.2;
  }
  .art svg { width: 100%; height: auto; display: block; }
  .art svg * { fill: none !important; stroke: #f5f0e8 !important; stroke-width: 3px !important; }

  .content { position: relative; padding: 72px 76px; height: 100%; display: flex; flex-direction: column; }
  h1 { font-size: 106px; font-weight: 700; letter-spacing: -3px; line-height: 1; }
  h1 .bench { color: rgba(245,240,232,0.62); font-weight: 600; }
  .rule { width: 132px; height: 6px; background: #D4AF37; margin: 26px 0 24px; border-radius: 3px; }
  h2 { font-size: 41px; font-weight: 500; letter-spacing: -0.5px; }
  p  { font-size: 26px; font-weight: 400; line-height: 1.45; color: rgba(245,240,232,0.72); margin-top: 20px; max-width: 660px; }

  .foot { margin-top: auto; display: flex; align-items: center; gap: 14px; }
  .chip {
    font-family: 'JetBrains Mono', monospace; font-size: 19px; font-weight: 500;
    padding: 9px 17px; border: 2px solid rgba(245,240,232,0.30); border-radius: 999px;
  }
  .chip.lead { background: #D4AF37; border-color: #D4AF37; color: #1c1c19; }
  .domain {
    margin-left: auto; font-family: 'JetBrains Mono', monospace;
    font-size: 25px; font-weight: 500; color: rgba(245,240,232,0.92);
  }
</style>
</head>
<body>
  <div class="bloom"></div>
  <div class="art">${logo}</div>
  <div class="content">
    <h1>GEVI<span class="bench">Bench</span></h1>
    <div class="rule"></div>
    <h2>Voltage Indicator Benchmark</h2>
    <p>Compare genetically encoded voltage indicators by speed, brightness, sensitivity, dynamic range and photostability &mdash; every value traced to its paper.</p>
    <div class="foot">
      <span class="chip lead">${count} sensors</span>
      <span class="chip">family tree</span>
      <span class="chip">AP simulator</span>
      <span class="chip">spectra</span>
      <span class="domain">gevibench.org</span>
    </div>
  </div>
</body>
</html>
`)
