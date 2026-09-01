import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, TextContent, TextItem } from 'pdfjs-dist/types/src/display/api'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Minus, Plus, Search } from 'lucide-react'
import { pdfUrl } from './api'
import { figureQuery, PRECEDED_BY_SUPPLEMENTARY, type FigurePattern } from './figureSearch'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface Box { left: number; top: number; width: number; height: number }

/** One occurrence of the cited figure somewhere in the document. */
interface Hit {
  page: number
  start: number
  end: number
  /** How caption-like this occurrence is; see captionScore(). */
  score: number
}

/** Concatenated page text plus the item index each character came from. */
function flattenText(content: TextContent) {
  let text = ''
  const spans: { start: number; end: number; item: TextItem }[] = []
  for (const raw of content.items) {
    if (!('str' in raw)) continue
    const item = raw as TextItem
    spans.push({ start: text.length, end: text.length + item.str.length, item })
    text += item.str
    if (item.hasEOL) text += '\n'
  }
  return { text, spans }
}

/**
 * How strongly an occurrence looks like the item's own caption rather than a mention of
 * it. The caption is where the numbers live, so the reviewer should land there.
 *
 *   3  "Table S2. Voltage sensitivities of HVI series…" — punctuation then a title
 *   2  punctuation, but little text after
 *   1  opens a text block — often a contents list ("Legend for table S2"), so it must
 *      not outrank a real caption elsewhere in the document
 *   0  parenthesised, i.e. an inline pointer: "(Fig. 2a)"
 */
function captionScore(text: string, start: number, end: number, spanStarts: Set<number>): number {
  if (text[start - 1] === '(') return 0
  const after = text.slice(end, end + 90)
  const punctuated = /^\s*[.:|–—]/.test(after)
  const words = after.replace(/^\s*[.:|–—]\s*/, '').split(/\s+/).filter(Boolean).length
  if (punctuated) return words >= 4 ? 3 : 2
  return spanStarts.has(start) && words >= 4 ? 1 : 0
}

interface Props {
  rel: string | null
  figure?: string
  page: number
  onPageChange: (page: number) => void
  /** Changing this re-runs the search, so moving between two entries that cite the same
   *  figure still lands on it rather than sitting wherever the last one left off. */
  entryKey: string
  /** Numbers from the entry, offered as one-click searches when the citation names no
   *  figure ("Main text") — the value itself is then the only way to find the claim. */
  suggestions?: string[]
}

export function PdfPane({ rel, figure, page, onPageChange, entryKey, suggestions = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textCache = useRef(new Map<number, TextContent>())
  const renderToken = useRef(0)

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  /** Boxes for the current page, tagged with the hit they belong to. */
  const [boxes, setBoxes] = useState<(Box & { hit: number })[]>([])
  const [hits, setHits] = useState<Hit[]>([])
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState(figure ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Let the search read the current page without depending on it — a dependency would
  // re-scan on every page turn and drag the view back to the first hit.
  const pageRef = useRef(page)
  useEffect(() => { pageRef.current = page })

  const search = useMemo(() => {
    const parsed = figureQuery(query)
    if (parsed) return parsed
    // Free text typed into the find box: match it literally, no figure semantics.
    const q = query.trim()
    if (!q) return null
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    return { groups: [[{ re, kind: 'number' } as FigurePattern]], hasPanel: false, isSupp: false }
  }, [query])

  /** True when `figure` actually names a figure/table, rather than "Main text"/"FPbase". */
  const isFigureRef = useMemo(() => !!figureQuery(figure), [figure])

  // Searching literally for "Main text" only ever reports "no match", which reads as a
  // broken tool. Leave the box empty and offer the entry's own numbers instead.
  useEffect(() => { setQuery(isFigureRef ? figure ?? '' : '') }, [figure, isFigureRef])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- load the document ----
  useEffect(() => {
    if (!rel) { setDoc(null); setNumPages(0); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    textCache.current = new Map()
    const task = pdfjsLib.getDocument({ url: pdfUrl(rel) })
    task.promise.then(
      (d) => {
        if (cancelled) return
        setDoc(d)
        setNumPages(d.numPages)
        setLoading(false)
        // A page carried over from a longer document (or a bookmark saved against one)
        // would otherwise sit out of range, showing "16 / 14".
        if (pageRef.current > d.numPages || pageRef.current < 1) onPageChange(1)
      },
      (e: Error) => { if (!cancelled) { setError(e.message); setLoading(false) } },
    )
    return () => { cancelled = true; task.destroy() }
  }, [rel, onPageChange])

  const getText = useCallback(async (pageNum: number) => {
    const cached = textCache.current.get(pageNum)
    if (cached) return cached
    const p = await doc!.getPage(pageNum)
    const content = await p.getTextContent()
    textCache.current.set(pageNum, content)
    return content
  }, [doc])

  // ---- find every occurrence, then land on the most useful one ----
  useEffect(() => {
    if (!doc || !search) { setHits([]); return }
    let cancelled = false
    ;(async () => {
      for (const group of search.groups) {
        const found: Hit[] = []
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) return
          const { text, spans } = flattenText(await getText(p))
          const spanStarts = new Set(spans.map((s) => s.start))
          // Merge the group's spellings, keeping the longest match at each position so a
          // panel hit ("Fig. 2a,b") supersedes the number-only one at the same spot.
          const byStart = new Map<number, Hit>()
          for (const { re, kind } of group) {
            re.lastIndex = 0
            for (let m = re.exec(text); m; m = re.exec(text)) {
              const end = m.index + m[0].length
              const score = captionScore(text, m.index, end, spanStarts)

              // "Fig. 3" also appears inside "Supplementary Fig. 3" — a different figure.
              if (!search.isSupp && PRECEDED_BY_SUPPLEMENTARY.test(text.slice(Math.max(0, m.index - 20), m.index))) continue
              // When a panel was cited, the number-only spelling is for finding the
              // caption. Accepting it in prose too would highlight every sibling panel
              // ("Fig. 3a", "Fig. 3b", …) and bury the one occurrence that matters.
              if (kind === 'number' && search.hasPanel && score === 0) continue

              const prev = byStart.get(m.index)
              if (prev && prev.end - prev.start >= m[0].length) continue
              byStart.set(m.index, { page: p, start: m.index, end, score })
            }
          }
          found.push(...[...byStart.values()].sort((a, b) => a.start - b.start))
        }
        if (found.length > 0) {
          if (cancelled) return
          setHits(found)
          // Land on the most caption-like occurrence — a real caption beats a contents-
          // list entry, which beats prose. Ties keep document order.
          let best = 0
          for (let i = 1; i < found.length; i++) if (found[i].score > found[best].score) best = i
          setActive(best)
          if (found[best].page !== pageRef.current) onPageChange(found[best].page)
          return
        }
      }
      if (!cancelled) { setHits([]); setActive(0) }
    })()
    return () => { cancelled = true }
  }, [doc, search, getText, onPageChange, entryKey])

  const goToHit = useCallback((index: number) => {
    if (hits.length === 0) return
    const i = (index + hits.length) % hits.length
    setActive(i)
    if (hits[i].page !== pageRef.current) onPageChange(hits[i].page)
  }, [hits, onPageChange])

  // ---- render the current page + its highlight boxes ----
  useEffect(() => {
    if (!doc || !containerWidth) return
    const token = ++renderToken.current
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null
    ;(async () => {
      const pdfPage = await doc.getPage(Math.min(Math.max(page, 1), doc.numPages))
      if (token !== renderToken.current) return
      const base = pdfPage.getViewport({ scale: 1 })
      const scale = ((containerWidth - 24) / base.width) * zoom
      const viewport = pdfPage.getViewport({ scale })
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      task = pdfPage.render({ canvas, canvasContext: ctx, viewport })
      await task.promise.catch(() => { /* superseded by a newer render */ })
      if (token !== renderToken.current) return

      const onThisPage = hits.map((h, i) => ({ h, i })).filter(({ h }) => h.page === pdfPage.pageNumber)
      if (onThisPage.length === 0) { setBoxes([]); return }
      const { spans } = flattenText(await getText(pdfPage.pageNumber))
      const out: (Box & { hit: number })[] = []
      for (const { h, i } of onThisPage) {
        for (const span of spans) {
          if (span.end <= h.start || span.start >= h.end) continue
          const tx = pdfjsLib.Util.transform(viewport.transform, span.item.transform)
          const height = Math.hypot(tx[2], tx[3])
          out.push({ left: tx[4], top: tx[5] - height, width: span.item.width * scale, height, hit: i })
        }
      }
      if (token === renderToken.current) setBoxes(out)
    })()
    return () => { task?.cancel() }
  }, [doc, page, zoom, containerWidth, hits, getText])

  // ---- keep the active hit in view ----
  useEffect(() => {
    const box = boxes.find((b) => b.hit === active)
    if (!box || !scrollRef.current) return
    scrollRef.current.scrollTo({ top: Math.max(0, box.top - 140), behavior: 'smooth' })
  }, [boxes, active])

  // ---- n / p step through occurrences ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey || hits.length === 0) return
      if (e.key === 'n') { e.preventDefault(); goToHit(active + 1) }
      else if (e.key === 'p') { e.preventDefault(); goToHit(active - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, hits, goToHit])

  const go = (delta: number) => onPageChange(Math.min(Math.max(page + delta, 1), numPages || 1))
  const hitPages = useMemo(() => [...new Set(hits.map((h) => h.page))], [hits])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#e8e2d8]">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-surface-low px-3 py-2 text-xs">
        <button onClick={() => go(-1)} disabled={page <= 1} className="rounded border border-ink/15 p-1 disabled:opacity-30 hover:bg-ink/5" title="Previous page">
          <ChevronLeft size={14} />
        </button>
        <span className="tabular-nums text-ink/70">
          <input
            type="number"
            value={page}
            min={1}
            max={numPages || 1}
            onChange={(e) => onPageChange(Number(e.target.value) || 1)}
            className="w-12 rounded border border-ink/15 bg-white px-1 py-0.5 text-center tabular-nums"
          />
          <span className="ml-1">/ {numPages || '—'}</span>
        </span>
        <button onClick={() => go(1)} disabled={numPages === 0 || page >= numPages} className="rounded border border-ink/15 p-1 disabled:opacity-30 hover:bg-ink/5" title="Next page">
          <ChevronRight size={14} />
        </button>

        <div className="ml-1 flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))} className="rounded border border-ink/15 p-1 hover:bg-ink/5" title="Zoom out"><Minus size={14} /></button>
          <span className="w-10 text-center tabular-nums text-ink/60">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.2))} className="rounded border border-ink/15 p-1 hover:bg-ink/5" title="Zoom in"><Plus size={14} /></button>
        </div>

        <label className="flex items-center gap-1 rounded border border-ink/15 bg-white px-2 py-1">
          <Search size={12} className="text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="find in PDF"
            className="w-28 bg-transparent text-xs outline-none"
          />
        </label>

        {hits.length > 0 ? (
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => goToHit(active - 1)} className="rounded border border-ink/15 p-1 hover:bg-ink/5" title="Previous occurrence (p)"><ChevronUp size={13} /></button>
            <button onClick={() => goToHit(active + 1)} className="rounded border border-ink/15 p-1 hover:bg-ink/5" title="Next occurrence (n)"><ChevronDown size={13} /></button>
            <span className="tabular-nums text-ink/60">
              {active + 1}/{hits.length}
              {(hits[active]?.score ?? 0) >= 2 && <span className="ml-1 rounded bg-gold/30 px-1 font-medium text-ink/70">caption</span>}
            </span>
            <span className="flex items-center gap-1 text-ink/50">
              {hitPages.slice(0, 8).map((p) => (
                <button
                  key={p}
                  onClick={() => goToHit(hits.findIndex((h) => h.page === p))}
                  className={`rounded px-1.5 py-0.5 tabular-nums ${p === page ? 'bg-klein text-white' : 'bg-ink/10 hover:bg-ink/20'}`}
                >
                  {p}
                </button>
              ))}
            </span>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1.5 text-ink/50">
            {query.trim() && doc && <span className="text-ink/40">no match for “{query}”</span>}
            {!isFigureRef && figure && !query.trim() && (
              <span className="text-ink/40">“{figure}” names no figure —</span>
            )}
            {suggestions.length > 0 && doc && (
              <>
                <span className="text-ink/40">search value:</span>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setQuery(s)} className="rounded bg-ink/10 px-1.5 py-0.5 font-mono tabular-nums hover:bg-ink/20">
                    {s}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto p-3">
        {!rel && <div className="flex h-full items-center justify-center text-sm text-ink/40">No PDF selected for this source.</div>}
        {loading && <div className="flex h-full items-center justify-center gap-2 text-sm text-ink/50"><Loader2 size={16} className="animate-spin" /> loading PDF…</div>}
        {error && <div className="p-4 text-sm text-red-700">Could not open PDF: {error}</div>}
        <div className="relative inline-block">
          <canvas ref={canvasRef} className={`shadow-ambient ${rel && !loading && !error ? '' : 'hidden'}`} />
          {boxes.map((b, i) => (
            <div
              key={i}
              className={`pointer-events-none absolute rounded-sm ${b.hit === active ? 'bg-klein/30 ring-2 ring-klein' : 'bg-gold/35 ring-1 ring-gold/70'}`}
              style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
