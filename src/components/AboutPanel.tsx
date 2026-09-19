import { useState, useEffect } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { CITATION, CITATION_URL, authorList, plainCitation } from '../citation';
import { ContactForm } from './ContactForm';

/** Icon-only copy button; a failure says so rather than silently doing nothing. */
function CopyCitationButton() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const Icon = state === 'copied' ? Check : state === 'failed' ? AlertCircle : Copy;

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(plainCitation).then(() => setState('copied'), () => setState('failed'))}
      title={state === 'failed' ? 'Copy failed' : 'Copy citation'}
      aria-label="Copy citation"
      className={`flex-shrink-0 p-1.5 rounded-md border transition-colors ${
        state === 'failed'
          ? 'border-red-300 text-red-600'
          : state === 'copied'
            ? 'border-gold text-klein'
            : 'border-ink/15 text-ink/50 hover:border-gold hover:text-ink'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export function AboutPanel() {
  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-6">
      <section className="rounded-lg p-6 bg-surface-lowest border border-ink/10 shadow-ambient">
        <p className="text-sm leading-relaxed text-ink/75">
          GEVIBench gathers the published performance data for genetically encoded voltage
          indicators, so that sensors can be compared on the same axes instead of on the claims in
          each paper's abstract. Brightness, dynamic range, kinetics and photostability are each
          normalized to one definition before they reach the table.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          The measurements come from different labs, preparations and microscopes, so comparisons
          across studies are approximate. Every value cites the figure or table it was read from,
          and the sensor pages show the curves behind it.
        </p>
      </section>

      <section className="mt-4 rounded-lg p-6 bg-surface-lowest border border-ink/10 shadow-ambient">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="label mb-1.5 text-ink/50">How to cite</h3>
            <p className="text-sm leading-relaxed text-ink">
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
              {CITATION.pages ? `, ${CITATION.pages}` : ''}.{' '}
              {/* Same face and size as the rest of the reference — only dimmer. And
                  overflow-wrap:anywhere keeps the unbreakable DOI from widening the page
                  on a phone, while leaving it intact wherever there is room. */}
              <span className="text-ink/45 [overflow-wrap:anywhere]">{CITATION_URL}</span>
            </p>
          </div>
          <CopyCitationButton />
        </div>
      </section>

      <section className="mt-4 rounded-lg p-6 bg-surface-lowest border border-ink/10 shadow-ambient">
        <h3 className="label mb-1.5 text-ink/50">Contact &amp; contribute</h3>
        <p className="mb-4 text-sm leading-relaxed text-ink/60">
          Request a sensor, report a missing or wrong number, or share a paper we should be reading.
        </p>
        <ContactForm />
      </section>
    </main>
  );
}
