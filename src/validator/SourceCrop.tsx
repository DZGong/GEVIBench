import { useRef, useState } from 'react'
import { Crosshair, Minus, Plus, X } from 'lucide-react'

/**
 * The digitized figure with a click-to-place crosshair, for reading a point's position
 * off the axes while editing curve values. Hovering shows a faint guide; clicking locks
 * a solid one so the eye can travel along it to the axis labels without losing the spot.
 *
 * The position is stored as a fraction of the image, so zooming keeps the crosshair on
 * the same feature.
 */

interface Point { x: number; y: number }

export function SourceCrop({ src, alt = 'source figure' }: { src: string; alt?: string }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [locked, setLocked] = useState<Point | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)

  const toFraction = (e: React.MouseEvent): Point | null => {
    const rect = imgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    }
  }

  return (
    <div className="rounded border border-ink/10 bg-white p-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-ink/40">
        <Crosshair size={11} />
        <span>source crop — click to place a crosshair</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="rounded border border-ink/15 p-0.5 hover:bg-ink/5" title="Zoom out">
            <Minus size={10} />
          </button>
          <span className="w-8 text-center tabular-nums normal-case text-ink/50">{zoom}×</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(6, z + 0.5))} className="rounded border border-ink/15 p-0.5 hover:bg-ink/5" title="Zoom in">
            <Plus size={10} />
          </button>
          {locked && (
            <button type="button" onClick={() => setLocked(null)} className="rounded border border-ink/15 p-0.5 hover:bg-ink/5" title="Clear crosshair">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-auto">
        <div className="relative inline-block" style={{ width: `${zoom * 100}%` }}>
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            draggable={false}
            className="block w-full select-none"
            onClick={(e) => setLocked(toFraction(e))}
            onMouseMove={(e) => setHover(toFraction(e))}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'crosshair' }}
          />
          {hover && !samePoint(hover, locked) && <Guides at={hover} faint />}
          {locked && <Guides at={locked} />}
        </div>
      </div>
    </div>
  )
}

function samePoint(a: Point, b: Point | null): boolean {
  return !!b && Math.abs(a.x - b.x) < 0.002 && Math.abs(a.y - b.y) < 0.002
}

/** Full-width/height rules through the point, so both axes can be read at once. */
function Guides({ at, faint = false }: { at: Point; faint?: boolean }) {
  const color = faint ? 'rgba(0,47,167,0.35)' : '#002FA7'
  const dash = faint ? '3 3' : undefined
  return (
    <>
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `${at.x * 100}%`, borderLeft: `1px ${dash ? 'dashed' : 'solid'} ${color}` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{ top: `${at.y * 100}%`, borderTop: `1px ${dash ? 'dashed' : 'solid'} ${color}` }}
      />
      {!faint && (
        <div
          className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-klein ring-2 ring-white"
          style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
        />
      )}
    </>
  )
}
