// Shared source/citation UI used by metric cards and the spectrum/voltage panels.
// - NoteTip: small sticky-note icon with hover tooltip carrying the `note` text
// - SourceLink: renders `sourceFigure · <citation link>`; DOI sources become external links

import { ExternalLink, StickyNote } from 'lucide-react';
import { getDoiCitationMap } from '../geviData';

// FPbase protein slug: lowercase, transliterate κ→kappa (e.g. mKOκ→mkokappa),
// then collapse any remaining non-alphanumerics to hyphens (e.g. "Superfolder GFP"
// →"superfolder-gfp"). Matches FPbase's own slugs for the proteins used here.
function fpbaseSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/κ/g, 'kappa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sourceToUrl(source: string): string | null {
  if (!source) return null;
  if (source.startsWith('doi:')) return `https://doi.org/${source.slice(4)}`;
  if (source.startsWith('http')) return source;
  // FPbase spectra: a clean single FP name → its protein page. FRET composites
  // ("<donor> / <acceptor>") and annotated/non-protein entries (a parenthetical
  // like "(parent)", or a dye "conjugate" — which have no standalone protein page)
  // → an FPbase search, so the link never 404s.
  if (source.startsWith('FPbase:')) {
    const parts = source.slice('FPbase:'.length).split('/').map((s) => s.trim()).filter(Boolean);
    const first = parts[0] || '';
    const isCleanSingle = parts.length === 1 && !/[()]/.test(first) && !/conjugate/i.test(first);
    if (isCleanSingle) return `https://www.fpbase.org/protein/${fpbaseSlug(first)}/`;
    const term = first.replace(/\(.*?\)/g, '').trim() || first;
    if (term) return `https://www.fpbase.org/search/?name__icontains=${encodeURIComponent(term)}`;
    return 'https://www.fpbase.org/';
  }
  return null;
}

// Compact display form for figure citations — "Extended Data Fig./Figure"
// abbreviates to "Ext. Data Fig.", "Extended Fig./Figure" to "Ext. Fig.".
// Applied at render time so the underlying JSON stays human-readable.
export function abbreviateFigure(s: string): string {
  return s
    .replace(/\bExtended Data Fig(?:ure|\.)/g, 'Ext. Data Fig.')
    .replace(/\bExtended Fig(?:ure|\.)/g, 'Ext. Fig.');
}

export function NoteTip({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <span className="group relative inline-flex items-center">
      <StickyNote className="w-3 h-3 text-ink/40 hover:text-ink/70 cursor-help" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden group-hover:block z-50 w-56 px-2 py-1 text-[10px] italic text-white bg-ink rounded shadow-md normal-case leading-snug whitespace-normal">
        {note}
      </span>
    </span>
  );
}

export function SourceLink({ source, sourceFigure }: { source?: string; sourceFigure?: string }) {
  if (!source) return null;
  const url = sourceToUrl(source);
  const isFpbase = source.startsWith('FPbase:');
  let label = 'Source';
  if (source.startsWith('doi:')) {
    const doi = source.slice(4);
    const citationMap = getDoiCitationMap();
    label = citationMap[doi] || source;
  } else if (isFpbase) {
    // Show the full "FPbase: <name>" as the (clickable) label.
    label = source;
  }
  // Suppress a figure label that merely duplicates the "FPbase" source prefix
  // (the curator convention sets sourceFigure:"FPbase" alongside source:"FPbase: …").
  const showFigure = !!sourceFigure && !(isFpbase && sourceFigure.trim().toLowerCase() === 'fpbase');
  const figureLabel = showFigure ? abbreviateFigure(sourceFigure!) : undefined;
  // Wrapping policy: each segment (figure label, citation link) stays together
  // on its own line via inline whitespace-nowrap. The " · " separator is kept
  // OUTSIDE both nowrap spans (as a regular text node with surrounding spaces)
  // so the browser can wrap at the separator when the container is too narrow.
  // JSX collapses inter-element whitespace, so the literal `{' · '}` is required
  // — leaving a bare newline between the two elements would yield no wrap point.
  // Result: "Fig. 1d · Land 2026" can wrap as
  //   "Fig. 1d"
  //   "Land 2026"
  // on tight viewports.
  if (!url) return (
    <span className="text-[10px] text-ink leading-snug">
      {figureLabel && <span className="whitespace-nowrap">{figureLabel}</span>}
      {figureLabel && ' · '}
      <span className="whitespace-nowrap">{source}</span>
    </span>
  );
  return (
    <span className="text-[10px] leading-snug">
      {figureLabel && <span className="text-ink/50 whitespace-nowrap">{figureLabel}</span>}
      {figureLabel && <span className="text-ink/50">{' · '}</span>}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-klein hover:underline whitespace-nowrap">
        {label} <ExternalLink className="w-2.5 h-2.5 inline" />
      </a>
    </span>
  );
}
