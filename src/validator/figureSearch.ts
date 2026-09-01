/**
 * Turns a curated `sourceFigure` string into patterns to look for in the paper's text.
 *
 * Three things make this harder than a substring search, and each rule below exists
 * because of a specific way the naive version went wrong:
 *
 * 1. A supplementary figure is cited one way and printed another: the curated value is
 *    "Fig. S6" while the supplement's caption reads "Supplementary Figure 6" — the number
 *    with no S in front of it.
 * 2. A value is usually cited in several places (caption, prose, a table), so every
 *    occurrence has to be found, not just the first.
 * 3. But "Fig. 3f" must NOT drag in Fig. 3a, 3b, 3c… The number-only spelling is needed to
 *    find the caption (which prints "Fig. 3 |" with no panel letter) and nothing else, so
 *    when a panel is named the number-only pattern is accepted only for caption-like text.
 */

const FIG = '(?:fig(?:ure)?s?\\.?)'
const TABLE = '(?:tables?\\.?)'
/** "Supplementary", "Supplemental", "Suppl.", "Supp" — all followed by Fig/Table. */
const SUPP = '(?:supp[a-z]*\\.?\\s*)'
const EXT_DATA = `(?:ext(?:ended)?\\.?\\s*data\\s*${FIG})`

/** Does the text immediately before `start` read "Supplementary "/"Suppl. " etc.? */
export const PRECEDED_BY_SUPPLEMENTARY = /supp[a-z]*\.?\s*$/i

export interface FigurePattern {
  re: RegExp
  /** `panel` includes the cited panel letter; `number` is the figure number alone. */
  kind: 'panel' | 'number'
}

export interface FigureQuery {
  /** Pattern groups in descending confidence; use the first group that matches anything. */
  groups: FigurePattern[][]
  /** The citation named a panel ("Fig. 3f"), so number-only hits are caption-only. */
  hasPanel: boolean
  /** The citation is supplementary, so "Supplementary Figure N" spellings are wanted. */
  isSupp: boolean
}

/**
 * Does this string actually cite a figure or table? Without this check any number is
 * treated as one — typing "2.1" into the find box would quietly search for "Figure 2"
 * instead of the literal text, and "Main text"/"FPbase" would match nothing at all.
 */
const CITES_FIGURE = /fig|table|ext\.?\s*data|^\s*s\s*\d/i

export function figureQuery(figure?: string): FigureQuery | null {
  if (!figure) return null
  const f = figure.trim()
  if (!CITES_FIGURE.test(f)) return null
  const m = f.match(/S?\s*(\d+)\s*([a-z])?\b/i)
  if (!m) return null
  const [, number, letter] = m

  // Supplementary either by the "S" glued to the number ("Fig. S6") or by the word.
  const isSupp = /(^|[^a-z])s\s*\d/i.test(f) || /supp/i.test(f)
  const kind = /table/i.test(f) ? TABLE : /ext(ended)?\.?\s*data/i.test(f) ? EXT_DATA : FIG

  const bodies: string[] = []
  if (kind === EXT_DATA) {
    bodies.push(`${EXT_DATA}\\s*${number}`)
  } else if (isSupp) {
    bodies.push(`(?:${kind}\\s*S\\s*|${SUPP}${kind}\\s*)${number}`)
    // Last resort: a supplement that numbers its own items plainly, printing "Table 1"
    // for what the curated value calls "Table S1".
    bodies.push(`${kind}\\s*${number}`)
  } else {
    bodies.push(`${kind}\\s*${number}`)
  }

  const groups = bodies.map((body) => {
    const patterns: FigurePattern[] = []
    // Panel lists and ranges count: "Fig. 3e,f" and "Fig. 3c-f" both cite panel f.
    if (letter) patterns.push({ re: new RegExp(`${body}\\s*(?:[a-z]\\s*[,–-]\\s*)*${letter}\\b`, 'gi'), kind: 'panel' })
    patterns.push({ re: new RegExp(`${body}(?![0-9])`, 'gi'), kind: 'number' })
    return patterns
  })

  return { groups, hasPanel: !!letter, isSupp }
}
