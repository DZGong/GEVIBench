// Export a live on-page <svg> as a standalone, editable vector SVG file.
//
// The exported file is meant to open cleanly in Illustrator/Inkscape, whose SVG
// importers are SVG 1.1-era, so the clone is rewritten rather than serialized as-is:
//   - CSS `filter: drop-shadow(...)` glows become a blurred copy placed *beneath* the
//     shape (SVG 1.1 feGaussianBlur). The visible shape itself carries no filter —
//     Illustrator hid every filtered node when the shadow sat on the node.
//   - `paint-order="stroke"` label halos become a stroke-only copy under a fill-only copy.
//   - `dominant-baseline` is folded into the y position (Illustrator ignores it).
//   - `currentColor` and rgba() are resolved to plain rgb + opacity.
//   - Hover hit areas (fill="transparent") and [data-export="skip"] elements are dropped.
// A background rect matching the plot's on-page background and a "gevibench.org"
// watermark (bottom right) are added. Elements tagged [data-export-reset-transform]
// (pan/zoom groups) have their transform removed so the whole plot is exported.

const NS = 'http://www.w3.org/2000/svg';

export interface SvgLegendItem { label: string; color: string }

export interface SvgExportOptions {
  filename: string;
  /** Color → name key appended below the plot, for charts whose legend is HTML on the page. */
  legend?: SvgLegendItem[];
}

const WATERMARK = 'gevibench.org';

/** Nearest non-transparent background behind the element, as shown on the page. */
function pageBackground(el: Element): string {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return '#ffffff';
}

/** Split a CSS color into an SVG 1.1-safe color + optional opacity. */
function splitColor(color: string): { color: string; opacity?: string } {
  const m = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
  if (!m) return { color };
  const rgb = `rgb(${m[1]},${m[2]},${m[3]})`;
  if (m[4] === undefined) return { color: rgb };
  const a = m[4].endsWith('%') ? String(parseFloat(m[4]) / 100) : m[4];
  return a === '1' ? { color: rgb } : { color: rgb, opacity: a };
}

/** Parse the first drop-shadow() of a CSS filter value (either argument order). */
function parseDropShadow(filter: string): { color: string; blur: number } | null {
  const m = filter.match(/drop-shadow\(([^()]*(?:\([^()]*\)[^()]*)*)\)/);
  if (!m) return null;
  const body = m[1];
  const color = body.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b|\b[a-z]+\b/)?.[0] ?? 'black';
  const lengths = [...body.replace(color, '').matchAll(/(-?[\d.]+)(px)?/g)].map(x => parseFloat(x[1]));
  return { color, blur: lengths[2] ?? 0 };
}

// Style properties that are purely interactive and meaningless in a file.
const INTERACTIVE_STYLE = ['cursor', 'user-select', '-webkit-user-select', 'pointer-events', 'touch-action'];
const GENERIC_FONTS = /^(system-ui|ui-sans-serif|sans-serif|serif|monospace)$/i;

export function exportSvg(live: SVGSVGElement, { filename, legend }: SvgExportOptions) {
  const clone = live.cloneNode(true) as SVGSVGElement;

  // Resolve inherited/computed values against the live DOM while the trees still
  // correspond one-to-one (before any element is removed or inserted).
  const liveEls = [live, ...Array.from(live.querySelectorAll('*'))];
  const cloneEls = [clone, ...Array.from(clone.querySelectorAll('*'))];
  const fontSizes = new Map<Element, number>();
  liveEls.forEach((l, i) => {
    const c = cloneEls[i];
    const cs = getComputedStyle(l);
    for (const attr of ['fill', 'stroke']) {
      if (c.getAttribute(attr) === 'currentColor') c.setAttribute(attr, cs.color);
    }
    if (l.tagName === 'text' || l.tagName === 'tspan') fontSizes.set(c, parseFloat(cs.fontSize) || 10);
  });

  const svgEl = (tag: string) => document.createElementNS(NS, tag);

  clone.querySelectorAll('[data-export="skip"]').forEach(el => el.remove());
  clone.querySelectorAll('[fill="transparent"]').forEach(el => {
    if (!el.getAttribute('stroke') || el.getAttribute('stroke') === 'none') el.remove();
  });
  clone.querySelectorAll('[data-export-reset-transform]').forEach(el => {
    el.removeAttribute('transform');
    el.removeAttribute('data-export-reset-transform');
  });

  const defs = svgEl('defs');
  const blurIds = new Map<number, string>();
  const blurFilter = (blur: number) => {
    let id = blurIds.get(blur);
    if (!id) {
      id = `export-glow-${blurIds.size}`;
      blurIds.set(blur, id);
      const f = svgEl('filter');
      f.setAttribute('id', id);
      f.setAttribute('x', '-100%');
      f.setAttribute('y', '-100%');
      f.setAttribute('width', '300%');
      f.setAttribute('height', '300%');
      const g = svgEl('feGaussianBlur');
      // CSS drop-shadow blur radius ≈ 2 × SVG stdDeviation
      g.setAttribute('stdDeviation', String(blur / 2));
      f.appendChild(g);
      defs.appendChild(f);
    }
    return id;
  };

  for (const el of Array.from(clone.querySelectorAll<SVGElement>('*'))) {
    const style = el.style;
    if (style) {
      const shadow = style.filter && style.filter !== 'none' ? parseDropShadow(style.filter) : null;
      style.removeProperty('filter');
      INTERACTIVE_STYLE.forEach(p => style.removeProperty(p));
      if (GENERIC_FONTS.test(style.fontFamily.trim())) style.removeProperty('font-family');
      if (shadow && shadow.blur > 0) {
        const halo = el.cloneNode(false) as SVGElement;
        const { color, opacity } = splitColor(shadow.color);
        halo.setAttribute('fill', color);
        halo.removeAttribute('fill-opacity');
        if (opacity) halo.setAttribute('fill-opacity', opacity);
        halo.setAttribute('stroke', 'none');
        halo.removeAttribute('stroke-dasharray');
        halo.removeAttribute('style');
        halo.setAttribute('filter', `url(#${blurFilter(shadow.blur)})`);
        el.parentNode!.insertBefore(halo, el);
      }
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    }
    el.removeAttribute('class');

    // rgba() fills/strokes → rgb + *-opacity
    for (const attr of ['fill', 'stroke'] as const) {
      const v = el.getAttribute(attr);
      if (v && v.startsWith('rgba')) {
        const { color, opacity } = splitColor(v);
        el.setAttribute(attr, color);
        if (opacity && !el.hasAttribute(`${attr}-opacity`)) el.setAttribute(`${attr}-opacity`, opacity);
      }
    }

    if (el.tagName === 'text') {
      // dominant-baseline middle/central → shift the baseline by ~0.35em
      const db = el.getAttribute('dominant-baseline');
      if (db === 'middle' || db === 'central') {
        const fs = fontSizes.get(el) ?? 10;
        el.setAttribute('y', String(parseFloat(el.getAttribute('y') || '0') + 0.35 * fs));
        el.removeAttribute('dominant-baseline');
      }
      // paint-order="stroke" halo → stroke-only copy beneath a fill-only copy
      if (el.getAttribute('paint-order') === 'stroke' && el.getAttribute('stroke')) {
        el.removeAttribute('paint-order');
        const halo = el.cloneNode(true) as SVGElement;
        halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke-linejoin', 'round');
        el.parentNode!.insertBefore(halo, el);
        el.removeAttribute('stroke');
        el.removeAttribute('stroke-width');
      }
    }
  }
  if (defs.childNodes.length) clone.insertBefore(defs, clone.firstChild);

  // Measure the cleaned clone off-screen to get the full content extent — covers
  // overflow="visible" labels and pan/zoom plots that have no viewBox.
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:2000px;height:2000px;visibility:hidden;';
  host.appendChild(clone);
  document.body.appendChild(host);
  const bb = clone.getBBox();
  host.remove();

  // Frame = the drawing's real extent + an even margin on every side. The source
  // viewBox is deliberately ignored: plots leave uneven slack inside it (the scatter
  // has ~10px under its X title and none left of its Y title), which looks lopsided
  // once the plot stands alone as a file.
  const margin = 12;
  const x0 = bb.x - margin, y0 = bb.y - margin;
  const x1 = bb.x + bb.width + margin;
  let contentBottom = bb.y + bb.height;
  const width = x1 - x0;
  const fontFamily = getComputedStyle(live).fontFamily || 'sans-serif';

  // Legend rows below the plot, wrapped to the plot width.
  if (legend?.length) {
    const fs = Math.max(10, width * 0.022);
    const g = svgEl('g');
    let cx = x0 + margin, cy = contentBottom + fs * 1.8;
    for (const item of legend) {
      const w = fs * 1.6 + item.label.length * fs * 0.58;
      if (cx + w > x1 && cx > x0 + margin) { cx = x0 + margin; cy += fs * 1.6; }
      const dot = svgEl('circle');
      dot.setAttribute('cx', String(cx + fs * 0.4));
      dot.setAttribute('cy', String(cy - fs * 0.35));
      dot.setAttribute('r', String(fs * 0.4));
      dot.setAttribute('fill', item.color);
      const t = svgEl('text');
      t.setAttribute('x', String(cx + fs * 1.1));
      t.setAttribute('y', String(cy));
      t.setAttribute('font-size', String(fs));
      t.setAttribute('font-weight', '500');
      t.setAttribute('fill', '#374151');
      t.textContent = item.label;
      g.append(dot, t);
      cx += w + fs;
    }
    clone.appendChild(g);
    contentBottom = cy + fs * 0.3;
  }

  // Watermark: right-aligned just under the lowest content, inside the bottom
  // margin, so it adds (almost) no height of its own and never overlaps the plot.
  const wmSize = Math.max(8, Math.min(14, width * 0.013));
  const wmBaseline = contentBottom + 2 + wmSize * 0.8;
  const y1 = Math.max(contentBottom + margin, wmBaseline + wmSize * 0.35);
  const wm = svgEl('text');
  wm.setAttribute('x', String(x1 - margin));
  wm.setAttribute('y', String(wmBaseline));
  wm.setAttribute('text-anchor', 'end');
  wm.setAttribute('font-size', String(wmSize));
  wm.setAttribute('font-weight', '500');
  wm.setAttribute('fill', '#9ca3af');
  wm.textContent = WATERMARK;
  clone.appendChild(wm);

  const height = y1 - y0;
  const bgRect = svgEl('rect');
  bgRect.setAttribute('x', String(x0));
  bgRect.setAttribute('y', String(y0));
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  const bg = splitColor(pageBackground(live));
  bgRect.setAttribute('fill', bg.color);
  if (bg.opacity) bgRect.setAttribute('fill-opacity', bg.opacity);
  clone.insertBefore(bgRect, defs.parentNode ? defs.nextSibling : clone.firstChild);

  for (const a of ['class', 'style', 'preserveAspectRatio', 'overflow']) clone.removeAttribute(a);
  const r = (n: number) => String(Math.round(n * 100) / 100);
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('viewBox', `${r(x0)} ${r(y0)} ${r(width)} ${r(height)}`);
  clone.setAttribute('width', r(width));
  clone.setAttribute('height', r(height));
  clone.setAttribute('font-family', fontFamily);
  clone.setAttribute('color', getComputedStyle(live).color);

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
