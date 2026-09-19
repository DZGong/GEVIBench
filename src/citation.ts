import citationRecord from './citation.json';

interface CitationRecord {
  authors: { given: string; family: string }[];
  title: string;
  journal: string;
  year: number;
  /** Null until Elsevier assigns the issue — the article is online ahead of print. */
  volume: string | null;
  pages: string | null;
  doi: string;
  siteUrl: string;
}

/**
 * The citable reference for GEVIBench.
 *
 * The site is the companion resource to a Neuron review, so that paper is what
 * users should cite. The About page's citation card and the hover hint in the
 * header and footer all render from this one record. It lives in citation.json
 * because scripts/prerender.mjs reads it too, for the crawler-visible text on
 * /about.
 */
export const CITATION = citationRecord as CitationRecord;

export const CITATION_URL = `https://doi.org/${CITATION.doi}`;

/** "Adam E." → "A.E." — the initials-only form journals use in reference lists. */
function initials(given: string): string {
  return given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map(part => `${part[0]}.`)
    .join('');
}

/** "Cohen, A.E., and Gong, D." — the comma before "and" is reference-list style. */
export const authorList = (() => {
  const names = CITATION.authors.map(a => `${a.family}, ${initials(a.given)}`);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
})();

/** "Neuron 114, 1234–1250" once the issue exists; just "Neuron" while in press. */
const journalLocator = [
  CITATION.journal,
  [CITATION.volume, CITATION.pages].filter(Boolean).join(', '),
]
  .filter(Boolean)
  .join(' ');

/** The full reference, Cell Press author-date style. */
export const plainCitation =
  `${authorList} (${CITATION.year}). ${CITATION.title}. ${journalLocator}. ${CITATION_URL}`;
