// Plain-text form of each headline value exactly as the database table shows it.
// Shared by the table (GEVIList) and the build-time prerender (scripts/prerender.mjs),
// so the text crawlers and LLMs read can never drift from what the site displays.

import type { GEVI } from './types';
import { fmtDuration, isBioluminescent } from './geviData';

export type MetricKey = 'brightness' | 'kinetics' | 'dynamicRange' | 'subthreshold' | 'sensitivity' | 'apWidth' | 'photostability';

export function fmtTau(v: number): string {
  if (v < 1) return v.toFixed(2);
  if (v < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

/** The table cell's text for a metric, or null when the sensor has no value. */
export function metricText(gevi: GEVI, key: MetricKey): string | null {
  switch (key) {
    case 'brightness':
      return gevi.bRel != null ? `${gevi.bRel.toFixed(2)}×` : null;
    case 'kinetics': {
      const on = gevi.displayTauOn, off = gevi.displayTauOff;
      if (on == null && off == null) return null;
      return `${on != null ? fmtTau(on) : '—'} / ${off != null ? fmtTau(off) : '—'}`;
    }
    case 'dynamicRange': {
      const dr = gevi.dynamicRangeData?.[0];
      return dr ? `${dr.deltaF > 0 ? '+' : ''}${dr.deltaF}%` : null;
    }
    case 'subthreshold':
      return gevi.displaySubthreshold != null ? `${parseFloat(gevi.displaySubthreshold.toPrecision(2))}%` : null;
    case 'sensitivity': {
      const sens = gevi.sensitivityData?.[0];
      return sens ? `${sens.deltaF}%` : null;
    }
    case 'apWidth':
      return gevi.displayApWidth != null ? `${parseFloat(gevi.displayApWidth.toPrecision(2))} ms` : null;
    case 'photostability':
      if (isBioluminescent(gevi)) return 'bioluminescent (no photobleaching)';
      return gevi.displayT75 != null ? fmtDuration(gevi.displayT75) : null;
  }
}
