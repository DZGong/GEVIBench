import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { CITATION, CITATION_URL, authorList } from '../citation';

interface CitationHintProps {
  /** Trigger content — the visible "Cite" affordance. */
  children: React.ReactNode;
  /** Classes for the trigger itself; the card is styled independently. */
  className?: string;
}

/**
 * The footer's citation affordance: hovering reveals the full reference with a link
 * to the paper, instead of sending the reader to another page for it. Opens upward,
 * since it lives at the bottom of the page.
 *
 * The card is a DOM child of the trigger's wrapper and sits flush against it (the
 * padding on the positioning layer is the bridge), so moving the mouse onto the link
 * does not fire mouseleave and close it.
 */
export function CitationHint({ children, className = '' }: CitationHintProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Hover and tap have to be mutually exclusive. A touchscreen still fires mouseenter
  // and focus just before click, so handling both would open the card and immediately
  // close it again on the toggle — it would never appear on a phone.
  const hoverCapable = useRef(true);
  useEffect(() => {
    hoverCapable.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  // The trigger sits wherever the footer's flex row puts it, so on a narrow screen a
  // centred card runs off the edge. Nudge it back in after it opens.
  const card = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    if (!open || !card.current) {
      setShift(0);
      return;
    }
    const margin = 8;
    const box = card.current.getBoundingClientRect();
    const overflowRight = box.right - (window.innerWidth - margin);
    const overflowLeft = margin - box.left;
    setShift(overflowRight > 0 ? -overflowRight : overflowLeft > 0 ? overflowLeft : 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapper}
      className="relative"
      onMouseEnter={() => { if (hoverCapable.current) setOpen(true); }}
      onMouseLeave={() => { if (hoverCapable.current) setOpen(false); }}
      // Keyboard focus opens it, but only where hover already does: a tap also focuses
      // the button, and opening here would fight the click toggle below.
      onFocus={() => { if (hoverCapable.current) setOpen(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <button
        type="button"
        onClick={() => { if (!hoverCapable.current) setOpen(v => !v); }}
        aria-expanded={open}
        className={className}
      >
        {children}
      </button>

      {open && (
        <div role="tooltip" className="absolute z-50 bottom-full pb-2 left-1/2 -translate-x-1/2">
          <div
            ref={card}
            style={shift ? { transform: `translateX(${shift}px)` } : undefined}
            className="w-80 max-w-[calc(100vw-1rem)] rounded-lg p-3 text-left bg-surface-lowest border border-ink/10 shadow-ambient"
          >
            <p className="text-xs font-sans normal-case tracking-normal leading-relaxed text-ink">
              {authorList} ({CITATION.year}).{' '}
              <a
                href={CITATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-klein hover:underline"
              >
                {CITATION.title}
              </a>
              . <em>{CITATION.journal}</em>
              {CITATION.volume ? ` ${CITATION.volume}` : ''}
              {CITATION.pages ? `, ${CITATION.pages}` : ''}.
            </p>
            <a
              href={CITATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 font-mono text-[11px] normal-case tracking-normal text-ink/45 hover:text-klein transition-colors [overflow-wrap:anywhere]"
            >
              doi.org/{CITATION.doi}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
