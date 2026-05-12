// Shared source/citation UI used by metric cards and the spectrum/voltage panels.
// - NoteTip: small sticky-note icon with hover tooltip carrying the `note` text
// - SourceLink: renders `sourceFigure · <citation link>`; DOI sources become external links

import { ExternalLink, StickyNote } from 'lucide-react';
import { getDoiCitationMap } from '../geviData';

export function sourceToUrl(source: string): string | null {
  if (!source) return null;
  if (source.startsWith('doi:')) return `https://doi.org/${source.slice(4)}`;
  if (source.startsWith('http')) return source;
  return null;
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
  let label = 'Source';
  if (source.startsWith('doi:')) {
    const doi = source.slice(4);
    const citationMap = getDoiCitationMap();
    label = citationMap[doi] || source;
  }
  if (!url) return <span className="text-[10px] text-ink">{sourceFigure && `${sourceFigure} · `}{source}</span>;
  return (
    <span className="text-[10px] whitespace-nowrap">
      {sourceFigure && <span className="text-ink/50">{sourceFigure} · </span>}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-klein hover:underline">
        {label} <ExternalLink className="w-2.5 h-2.5 inline" />
      </a>
    </span>
  );
}
