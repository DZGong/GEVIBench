import { useState, useRef } from 'react';
import { BonusBadges } from './BonusBadges';
import { BookOpen, ExternalLink, Plus, X, Sun, Zap, Activity, TrendingUp, Clock, Dna, ChevronDown, ChevronUp, Users, Waves, Ruler } from 'lucide-react';
import { SpectrumViewer, SpectrumData } from '../SpectrumViewer';
import { VoltageCurveViewer } from '../VoltageCurveViewer';
import { PhotobleachGallery } from '../PhotobleachViewer';
import { getPhotobleachCompanions, fmtDuration, isBioluminescent } from '../geviData';
import { GEVILineage } from './GEVILineage';
import { DistributionRadar } from './DistributionRadar';
import { NoteTip, SourceLink } from './SourceCitation';
import { computeSampleSummary, SAMPLE_CATEGORY_ORDER } from '../utils';

function formatRatio(ratio: number): string {
  return parseFloat(ratio.toPrecision(2)).toString();
}

// Detail-page metric tiles. τ_on and τ_off are shown in a single "kinetics"
// tile (matching the radar's combined axis); the per-entry table still
// surfaces on and off as separate columns so the underlying numbers are
// preserved. N_used is the 6th tile and mirrors the radar's 6th axis.
//
// `desc` mirrors the column-header tooltip text in the GEVI list so the
// two surfaces stay aligned. If you edit a description here, also update
// the corresponding entry in `src/components/GEVIList.tsx`.
const metrics = [
  { key: 'brightness',     name: <>B/B<sub>EGFP</sub></>,                      icon: Sun,        desc: 'Relative molecular brightness vs EGFP' },
  { key: 'kinetics',       name: <>τ<sub>on</sub>/τ<sub>off</sub> (ms)</>,     icon: Zap,        desc: 'Activation and decay time constants' },
  { key: 'dynamicRange',   name: <>ΔF/F per 100mV</>,                          icon: TrendingUp, desc: 'Steady-state fluorescence change per 100 mV' },
  { key: 'subthreshold',   name: <>ΔF/F per mV</>,                             icon: Waves,      desc: 'Subthreshold sensitivity — fluorescence change per mV near rest (−90 to −50 mV)' },
  { key: 'sensitivity',    name: <>ΔF/F per AP</>,                             icon: Activity,   desc: 'Fluorescence change per single action potential' },
  { key: 'apWidth',        name: <>FWHM<sub>AP</sub> (ms)</>,                   icon: Ruler,      desc: 'Full width at half maximum of the spike fluorescence waveform' },
  { key: 'photostability', name: <>t<sub>75%</sub></>,                          icon: Clock,      desc: 'Time to 75% of initial fluorescence, dose-scaled to 100 mW/mm². 2P curves shown at native power.' },
  { key: 'nUsed',          name: <>N<sub>used</sub></>,                        icon: Users,      desc: 'Number of independent published studies that have applied this sensor' },
];

interface GEVIDetailProps {
  gevi: any;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  onClose: () => void;
  onShowFamilyTree?: () => void;
}

export function GEVIDetail({ gevi, onAddToCompare, compareGEVIs, onClose, onShowFamilyTree }: GEVIDetailProps) {
  const [papersExpanded, setPapersExpanded] = useState(false);
  const papersRef = useRef<HTMLDivElement>(null);

  // Use spectrum data directly from gevi prop
  const spectrumData = gevi.spectrum || null;

  return (
    <div className="rounded-lg p-4 md:p-6 mb-6 bg-surface-lowest shadow-ambient">
      {/* Header: name + links share the top row with the action buttons; the
          description and tags span the card's full width below so they don't
          wrap prematurely in the narrow (split list+detail) layout. */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl md:text-2xl font-semibold mb-1 text-ink flex items-baseline gap-2">
              <span className="text-ink">{gevi.name}</span>
              {gevi.lastUpdated && (
                <span className="text-xs font-normal text-ink/40">Updated {gevi.lastUpdated}</span>
              )}
            </h3>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <a href={gevi.paperUrl} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1 text-klein hover:underline">
                <BookOpen className="w-4 h-4" />{gevi.paper}<ExternalLink className="w-3 h-3" />
              </a>
              {gevi.addgene ? (
                <a href={gevi.addgene.url} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1 text-green-700 hover:underline">
                  <Dna className="w-4 h-4" /> Addgene #{gevi.addgene.id}<ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-sm inline-flex items-center gap-1 text-ink/40">
                  <Dna className="w-4 h-4" /> Addgene: Coming soon
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onAddToCompare(gevi)}
              disabled={compareGEVIs.find(g => g.id === gevi.id) || compareGEVIs.length >= 5}
              className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${
                compareGEVIs.find(g => g.id === gevi.id)
                  ? 'text-green-500 border-green-500'
                  : 'border-ink/15 text-ink/60 hover:text-gold hover:border-gold'
              }`}
            >
              <Plus className="w-3 h-3" /> {compareGEVIs.find(g => g.id === gevi.id) ? 'Added' : 'Compare'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-surface-low text-ink/50"
              title="Close and return to list"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-sm mt-2 mb-2 text-ink font-sans">{gevi.description}</p>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 bg-klein text-white rounded font-medium">{gevi.category}</span>
          <BonusBadges gevi={gevi} variant="pill" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
        {metrics.map((metric) => {
          // Optional panel: only render the subthreshold tile when the GEVI has
          // that data, since most sensors don't report subthreshold slope.
          // AP width always renders (with a "Not reported" empty state) so the
          // panel is consistent across every GEVI.
          if (metric.key === 'subthreshold' && !(gevi.subthresholdData?.length > 0) && gevi.displaySubthreshold == null) return null;
          return (
          <div key={metric.key} className="border rounded-lg p-2 md:p-3 bg-surface-low border-ink/10">
            <div className="flex items-center gap-1.5">
              <metric.icon className="w-3 h-3" />
              <span className="text-sm md:text-sm font-medium text-ink">{metric.name}</span>
            </div>
            {metric.desc && (
              <div className="text-[10px] text-ink/50 leading-snug mt-0.5 mb-1.5">
                {metric.desc}
              </div>
            )}
            {/* Combined τ_on / τ_off — bare numbers per kinetics entry (the
                tile header already says "τ_on/τ_off (ms)", so labels and units
                inside the row would be redundant). */}
            {metric.key === 'kinetics' && gevi.kinetics?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.kinetics.map((k: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.kinetics.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink">
                        <span className="font-semibold">{k.on} / {k.off}</span>
                        {k.temperature ? <span className="text-ink/60"> ({k.temperature})</span> : null}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <NoteTip note={k.note} />
                        <SourceLink source={k.source} sourceFigure={k.sourceFigure} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* AP width (FWHM) */}
            {metric.key === 'apWidth' && gevi.apWidthData?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.apWidthData.map((a: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.apWidthData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink">
                        <span className="font-semibold">{a.fwhm} ms</span>
                        {a.samplingRate ? <span className="text-ink/60"> @ {Math.round(a.samplingRate)} Hz</span> : null}
                        {a.modality && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-ink/10 text-ink/70 font-semibold">{a.modality}</span>}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <NoteTip note={a.note} />
                        <SourceLink source={a.source} sourceFigure={a.sourceFigure} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* AP width — empty state; the panel is always shown for consistency */}
            {metric.key === 'apWidth' && !(gevi.apWidthData?.length > 0) && (
              <div className="mt-2 text-xs text-ink/40">Not reported</div>
            )}
            {/* Sensitivity */}
            {metric.key === 'sensitivity' && gevi.sensitivityData?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.sensitivityData.map((s: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.sensitivityData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="font-semibold">{s.deltaF}%</span> <span className="text-ink"></span>
                        {s.dye && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-klein/10 text-klein font-semibold">{s.dye}</span>}
                        {s.modality && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-ink/10 text-ink/70 font-semibold">{s.modality}</span>}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <NoteTip note={s.note} />
                        <SourceLink source={s.source} sourceFigure={s.sourceFigure} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Subthreshold sensitivity */}
            {metric.key === 'subthreshold' && gevi.subthresholdData?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.subthresholdData.map((s: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.subthresholdData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink"><span className="font-semibold">{s.slope}</span> %/mV</span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <NoteTip note={s.note} />
                        <SourceLink source={s.source} sourceFigure={s.sourceFigure} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Subthreshold — F-V-derived estimate (shown only when no value is directly reported) */}
            {metric.key === 'subthreshold' && !(gevi.subthresholdData?.length > 0) && gevi.subthresholdDerived && gevi.displaySubthreshold != null && (
              <div className="mt-2 text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="text-ink whitespace-nowrap"><span className="font-semibold">{gevi.displaySubthreshold}</span> %</span>
                  <span className="text-[10px] text-ink/50 leading-snug">Estimated from d(ΔF/F)/dV (V=−70).</span>
                </div>
              </div>
            )}
            {/* Dynamic Range */}
            {metric.key === 'dynamicRange' && gevi.dynamicRangeData?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.dynamicRangeData.map((d: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.dynamicRangeData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="font-semibold">
                          {d.sign === 'negative' ? '-' : '+'}{Math.abs(d.deltaF)}%
                        </span>
                        {d.responseType === 'peak' && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-gold/20 text-gold font-semibold whitespace-nowrap" title="Measured at the transient peak of the step response, not the steady-state plateau">peak state</span>}
                        {d.dye && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-klein/10 text-klein font-semibold">{d.dye}</span>}
                        {d.modality && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-ink/10 text-ink/70 font-semibold">{d.modality}</span>}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <NoteTip note={d.note} />
                        <SourceLink source={d.source} sourceFigure={d.sourceFigure} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Photostability — t₇₅ (model-free), swapped in for the old F_remain listing */}
            {metric.key === 'photostability' && isBioluminescent(gevi) && (
              <div className="mt-2 text-xs text-ink">Bioluminescent — no photobleaching</div>
            )}
            {metric.key === 'photostability' && !isBioluminescent(gevi) && gevi.photobleach?.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.photobleach.map((p: any, i: number) => {
                  const landmark = p.t75 ?? p.t50;
                  const label = p.t75 != null ? <>t<sub>75%</sub></> : <>t<sub>50</sub></>;
                  const scalable = p.modality === '1P' && p.intensityMWmm2 != null && landmark != null;
                  const scaled = scalable ? landmark * (p.intensityMWmm2 / 100) : null;
                  return (
                    <div key={i} className={`py-1 ${i < gevi.photobleach.length - 1 ? 'border-b border-ink/10' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink">
                          {scaled != null ? (
                            <>
                              <span className="font-semibold">{fmtDuration(scaled)}</span>
                              <span className="text-ink/60"> @100 mW/mm²{p.extrapolated ? ' (extrap.)' : ''}</span>
                              <span className="text-ink/40"> · {label} {fmtDuration(landmark)} @ {p.illumination}</span>
                            </>
                          ) : landmark != null ? (
                            <>
                              <span className="font-semibold">{label} {fmtDuration(landmark)}</span>
                              <span className="text-ink/60"> @ {p.illumination}{p.extrapolated ? ' (extrap.)' : ''}</span>
                            </>
                          ) : (
                            <span className="text-ink/60">curve digitized — never falls to 75% @ {p.illumination}</span>
                          )}
                          {p.modality && <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-ink/10 text-ink/70 font-semibold">{p.modality}</span>}
                        </span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <NoteTip note={p.note} />
                          <SourceLink source={p.source} sourceFigure={p.sourceFigure} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {metric.key === 'photostability' && !isBioluminescent(gevi) && !(gevi.photobleach?.length > 0) && (
              <div className="mt-2 text-xs text-ink/40">Not reported</div>
            )}
            {/* Brightness — derived B/B_EGFP first (computed via the brightness graph), then raw entries */}
            {metric.key === 'brightness' && (gevi.bRel != null || gevi.brightnessData?.length > 0) && (
              <div className="mt-2 text-xs space-y-1">
                {gevi.bRel != null && (
                  <div className={`py-1 ${gevi.brightnessData?.length > 0 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink">
                        <span className="font-semibold">{formatRatio(gevi.bRel)}×</span> vs EGFP
                        <span className="text-ink/40 ml-1">(derived)</span>
                      </span>
                    </div>
                  </div>
                )}
                {gevi.brightnessData?.map((b: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.brightnessData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink"><span className="font-semibold">{formatRatio(b.ratio)}×</span> vs {b.reference}</span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <NoteTip note={b.note} />
                        <SourceLink source={b.source} sourceFigure={b.sourceFigure} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* N_used — paper count plus per-organism breakdown derived from each
                paper's `sample` string. Categories with zero matches are hidden.
                A "View papers" jump expands the research-papers section below
                and scrolls it into view. */}
            {metric.key === 'nUsed' && (() => {
              const total = gevi.researchPapers?.length ?? 0;
              const summary = computeSampleSummary(gevi.researchPapers);
              const breakdown = SAMPLE_CATEGORY_ORDER
                .filter(cat => (summary[cat] ?? 0) > 0)
                .map(cat => ({ category: cat, count: summary[cat] }));
              const jumpToPapers = () => {
                setPapersExpanded(true);
                // setTimeout so the expanded content has a chance to render
                // before we measure scroll position.
                setTimeout(() => {
                  papersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 0);
              };
              return (
                <div className="mt-2 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="text-ink">N<sub>used</sub>:</span>
                    <span className="text-ink font-semibold">{total}</span>
                    <span className="text-ink/50">{total === 1 ? 'paper' : 'papers'}</span>
                  </div>
                  {total > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); jumpToPapers(); }}
                      className="mt-1 inline-flex items-center gap-1 text-klein hover:underline"
                    >
                      <BookOpen className="w-3 h-3" />
                      View papers
                    </button>
                  )}
                  {breakdown.length > 0 && (
                    <div className="mt-1.5 pt-1.5 space-y-0.5 border-t border-ink/15">
                      {breakdown.map((e, i) => (
                        <div key={e.category} className={`flex items-center justify-between py-0.5 ${i < breakdown.length - 1 ? 'border-b border-ink/10' : ''}`}>
                          <span className="text-ink">{e.category}</span>
                          <span className="text-ink font-semibold">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          );
        })}
      </div>

      {/* Radar Chart + Sample Usage | Lineage */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-6">
        {/* Left column: radar on top, sample chart below */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="border rounded-lg p-4 md:p-6 bg-surface-low border-ink/10">
            <h4 className="text-sm font-semibold mb-3 md:mb-4 text-ink">Performance Profile</h4>
            <div className="w-full max-w-sm aspect-[6/5]">
              <DistributionRadar gevi={gevi} compact expandHex />
            </div>
          </div>

          {/* Spectrum Viewer */}
          <div>
            <SpectrumViewer
              spectrumData={spectrumData}
              geviName={gevi.name}
              bioluminescent={gevi.category === 'Bioluminescent GEVI' || gevi.photostabilityData === 'bioluminescent'}
            />
          </div>
        </div>

        {/* Right column: Genetic Lineage */}
        <div
          className={`flex-shrink-0 cursor-pointer ${onShowFamilyTree ? 'hover:ring-2 hover:ring-blue-500/50 rounded-lg' : ''}`}
          onClick={onShowFamilyTree}
        >
          <GEVILineage gevi={gevi} />
        </div>
      </div>

      {/* Voltage Response Curve */}
      <div className="border rounded-lg p-4 md:p-6 mt-4 md:mt-6 bg-surface-low border-ink/10">
        <h4 className="text-sm font-semibold mb-3 md:mb-4 text-ink">ΔF/F - Voltage Curve</h4>
        <VoltageCurveViewer voltageData={gevi.voltage || null} geviName={gevi.name} />
      </div>

      {/* Photobleaching curve(s) + t75% metric (only for GEVIs with a digitized bleach curve).
          Multiple curves (e.g. different papers / illumination) become a swipeable, full-size
          gallery; each curve overlays the other GEVIs measured in the same figure (t₇₅% marked
          only for this GEVI). */}
      {gevi.photobleach && gevi.photobleach.length > 0 && (
        <div className="border rounded-lg p-4 md:p-6 mt-4 md:mt-6 bg-surface-low border-ink/10">
          <h4 className="text-sm font-semibold mb-3 md:mb-4 text-ink">
            Photobleaching Curve{gevi.photobleach.length > 1 ? 's' : ''}
            <span className="font-normal text-ink/50"> ({gevi.photobleach.some(pb => pb.t50 != null && pb.t75 == null) ? 't₇₅% / t₅₀' : 't₇₅%'})</span>
          </h4>
          <PhotobleachGallery
            geviName={gevi.name}
            entries={gevi.photobleach.map(pb => ({
              data: pb,
              companions: getPhotobleachCompanions(gevi.id, pb.source, pb.sourceFigure),
            }))}
          />
        </div>
      )}

      {/* Research Papers with Representative Figures */}
      {gevi.researchPapers && gevi.researchPapers.length > 0 && (
        <div ref={papersRef} className="border rounded-lg p-4 md:p-6 mt-4 md:mt-6 bg-surface-low border-ink/10">
          <button
            onClick={() => setPapersExpanded(!papersExpanded)}
            className="w-full text-sm font-semibold flex items-center gap-2 text-ink hover:text-ink transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Research Papers Using {gevi.name}
            <span className="text-xs font-normal text-ink ml-1">({gevi.researchPapers.length})</span>
            <span className="ml-auto">
              {papersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {papersExpanded && <div className="space-y-4 mt-4">
            {gevi.researchPapers.map((paper: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-surface-low">
                <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-klein hover:underline">
                  {paper.title}
                </a>
                <div className="text-xs mt-1 text-ink">
                  {paper.authors} • <span className="font-medium italic">{paper.journal}</span>{paper.year && ` • ${paper.year}`}
                </div>
                {paper.sample && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {paper.sample.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-ink" style={{ backgroundColor: '#FF91AF30' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {paper.applications && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {paper.applications.map((app: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-ink" style={{ backgroundColor: '#FF91AF30' }}>{app}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
}
