import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getAllGEVIs } from './geviData';
import { methodologyContent } from './methodology';
import { FamilyTreePanel } from './components/FamilyTreePanel';
import { BrightnessNetworkPanel } from './components/BrightnessNetworkPanel';
import { ScatterPlotPanel } from './components/ScatterPlotPanel';
import { APSimulatorPanel } from './components/APSimulatorPanel';
import { Header } from './components/Header';
import { SearchFilters } from './components/SearchFilters';
import { GEVIList } from './components/GEVIList';
import { GEVIDetail } from './components/GEVIDetail';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ContactForm } from './components/ContactForm';
import { RainbowText, getGEVIColor } from './utils';
import { COLORS } from './constants';
import type { GEVI, SortField, ViewTab, MobileView, SortConfig } from './types';
import {
  DEFAULT_CATEGORY,
  DEFAULT_YEAR,
  DEFAULT_SORT,
  MAX_COMPARE_ITEMS,
} from './constants';

const BUILD_DATE = __BUILD_DATE__;

const colors = COLORS.light;

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return '1 year ago';
  return `${diffYears} years ago`;
}

function GEVIBenchApp() {
  // State - load GEVIs synchronously via lazy initializer
  const [gevis] = useState<GEVI[]>(() => getAllGEVIs());
  const [selectedGEVI, setSelectedGEVI] = useState<GEVI | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(DEFAULT_CATEGORY);
  const [yearFilter, setYearFilter] = useState(DEFAULT_YEAR);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: DEFAULT_SORT, order: 'desc' });
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('database');
  const [compareGEVIs, setCompareGEVIs] = useState<GEVI[]>([]);
  const [showFamilyTree, setShowFamilyTree] = useState(false);
  const [showBrightnessNetwork, setShowBrightnessNetwork] = useState(false);
  const [showScatterPlot, setShowScatterPlot] = useState(false);
  const [showAPSimulator, setShowAPSimulator] = useState(false);
  const [showCompareEmpty, setShowCompareEmpty] = useState(false);
  const [peaceMode, setPeaceMode] = useState(true);
  const handleSetPeaceMode = useCallback((v: boolean) => {
    setPeaceMode(v);
    setSortConfig({ field: v ? 'year' : 'overall', order: 'desc' });
  }, []);
  const sideListRef = useRef<HTMLDivElement>(null);

  // URL ↔ state sync
  const applyUrl = useCallback((path: string, skipScroll?: boolean) => {
    const geviMatch = path.match(/^\/gevi\/(.+)$/);
    if (geviMatch) {
      const id = geviMatch[1];
      const found = gevis.find(g => g.id === id);
      if (found) {
        setSelectedGEVI(found);
        setActiveTab('database');
        setMobileView('detail');
        setShowFamilyTree(false);
        setShowBrightnessNetwork(false);
        setShowScatterPlot(false);
        setShowAPSimulator(false);
        if (!skipScroll) requestAnimationFrame(() => window.scrollTo({ top: 0 }));
        return;
      }
    }
    if (path === '/methodology') {
      setActiveTab('methodology');
      setSelectedGEVI(null);
    } else if (path === '/contact') {
      setActiveTab('contact');
      setSelectedGEVI(null);
    } else if (path === '/family-tree') {
      setActiveTab('database');
      setSelectedGEVI(null);
      setShowFamilyTree(true);
      setShowBrightnessNetwork(false);
      setShowScatterPlot(false);
      setShowAPSimulator(false);
    } else if (path === '/brightness-network') {
      setActiveTab('database');
      setSelectedGEVI(null);
      setShowBrightnessNetwork(true);
      setShowFamilyTree(false);
      setShowScatterPlot(false);
      setShowAPSimulator(false);
    } else if (path === '/scatter-plot') {
      setActiveTab('database');
      setSelectedGEVI(null);
      setShowScatterPlot(true);
      setShowFamilyTree(false);
      setShowBrightnessNetwork(false);
      setShowAPSimulator(false);
    } else if (path === '/ap-simulator') {
      setActiveTab('database');
      setSelectedGEVI(null);
      setShowAPSimulator(true);
      setShowFamilyTree(false);
      setShowBrightnessNetwork(false);
      setShowScatterPlot(false);
    } else {
      setActiveTab('database');
      setSelectedGEVI(null);
      setMobileView('list');
    }
  }, [gevis]);

  // On mount: apply initial URL
  useEffect(() => {
    applyUrl(window.location.pathname, true);
  }, [applyUrl]);

  // Listen for back/forward
  useEffect(() => {
    const onPopState = () => applyUrl(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyUrl]);

  // Derived state
  const categories = [DEFAULT_CATEGORY, ...new Set(gevis.map(g => g.category))];
  const years = [DEFAULT_YEAR, ...new Set(gevis.map(g => g.year).sort((a, b) => a - b).map(String))];

  // Filter and sort
  const filteredGEVIs = gevis
    .filter(g => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === DEFAULT_CATEGORY || g.category === categoryFilter;
      const matchesYear = yearFilter === DEFAULT_YEAR || g.year === parseInt(yearFilter, 10);
      return matchesSearch && matchesCategory && matchesYear;
    })
    .sort((a, b) => {
      const { field, order } = sortConfig;
      const multiplier = order === 'asc' ? 1 : -1;

      if (field === 'year') {
        return (a.year - b.year) * multiplier;
      }

      const aVal = a[field] ?? null;
      const bVal = b[field] ?? null;
      const aNull = aVal === null || aVal === undefined;
      const bNull = bVal === null || bVal === undefined;

      // Both null: sort by year descending
      if (aNull && bNull) return b.year - a.year;
      // Null values always go to bottom regardless of sort direction
      if (aNull) return 1;
      if (bNull) return -1;
      return ((aVal as number) - (bVal as number)) * multiplier;
    });

  // Handlers
  const addToCompare = useCallback((gevi: GEVI) => {
    setCompareGEVIs(prev => {
      if (prev.find(g => g.id === gevi.id) || prev.length >= MAX_COMPARE_ITEMS) {
        return prev;
      }
      setShowCompareEmpty(false);
      return [...prev, gevi];
    });
  }, []);

  const removeFromCompare = useCallback((geviId: string) => {
    setCompareGEVIs(prev => prev.filter(g => g.id !== geviId));
  }, []);

  const handleSelectGEVI = useCallback((gevi: GEVI) => {
    setSelectedGEVI(gevi);
    setMobileView('detail');
    setShowFamilyTree(false);
    setShowBrightnessNetwork(false);
    setShowScatterPlot(false);
    setShowAPSimulator(false);
    window.history.pushState(null, '', `/gevi/${gevi.id}`);
    // After render: scroll page to top, then scroll the side list so the selected GEVI is visible
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      if (sideListRef.current) {
        const selectedEl = sideListRef.current.querySelector(`[data-gevi-id="${gevi.id}"]`);
        if (selectedEl) {
          const container = sideListRef.current;
          const elTop = (selectedEl as HTMLElement).offsetTop;
          container.scrollTop = elTop - container.clientHeight / 3;
        }
      }
    });
  }, []);

  const handleLogoClick = useCallback(() => {
    setSelectedGEVI(null);
    setMobileView('list');
    setShowFamilyTree(false);
    setShowBrightnessNetwork(false);
    setShowScatterPlot(false);
    setShowAPSimulator(false);
    setActiveTab('database');
    window.history.pushState(null, '', '/');
  }, []);

  const handleSortChange = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // Render Database Tab
  const renderDatabaseTab = () => (
    <main className="w-full max-w-7xl mx-auto px-4 py-3">
      {/* Title Panel with Video Background */}
      <div className="relative rounded-xl overflow-hidden mb-3 -mt-1">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/imgs/spike_mov.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative text-center py-4 px-3">
          <button onClick={handleLogoClick} className="hover:opacity-80 transition-opacity">
            <h2 className="font-bold mb-1 whitespace-nowrap" style={{ fontSize: 'clamp(16px, 4vw, 24px)' }}>
              <span className="text-white">GEVI</span><span className="text-white">Bench</span>
              <span className="font-sans font-bold text-gray-200" style={{ fontSize: 'clamp(12px, 3vw, 20px)' }}> — Voltage Indicator Benchmark</span>
            </h2>
          </button>
          <p className="font-sans text-gray-300 whitespace-nowrap" style={{ fontSize: 'clamp(11px, 2.5vw, 15px)' }}>
            Standardized evaluation from published studies · Updated daily
          </p>
        </div>
      </div>

      {!showFamilyTree && !showBrightnessNetwork && !showScatterPlot && !showAPSimulator && (
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          totalCount={gevis.length}
        />
      )}


      {/* Comparison Panel - only show when there are items or explicitly shown */}
      {(compareGEVIs.length > 0 || showCompareEmpty) && (
        <ComparisonPanel
          compareGEVIs={compareGEVIs}
          onRemove={removeFromCompare}
          showEmpty={showCompareEmpty}
          onClose={() => {
            setCompareGEVIs([]);
            setShowCompareEmpty(false);
          }}
        />
      )}

      {/* Full-width tool panels */}
      {showAPSimulator ? (
        <APSimulatorPanel />
      ) : showScatterPlot ? (
        <ScatterPlotPanel onSelectGEVI={handleSelectGEVI} peaceMode={peaceMode} />
      ) : showBrightnessNetwork ? (
        <BrightnessNetworkPanel onSelectGEVI={handleSelectGEVI} peaceMode={peaceMode} />
      ) : showFamilyTree ? (
        <FamilyTreePanel
          onSelectGEVI={handleSelectGEVI}
          selectedGEVI={selectedGEVI}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
          peaceMode={peaceMode}
        />
      ) : (
        <>
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* GEVI List — hidden on narrow screens when detail is open; sticky with own scroll when detail open */}
            <div ref={sideListRef} className={`${selectedGEVI && filteredGEVIs.length > 0 ? 'hidden md:block col-span-1 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto' : 'col-span-3'}`}>
              <GEVIList
                gevis={filteredGEVIs}
                selectedGEVI={selectedGEVI}
                onSelect={handleSelectGEVI}
                onAddToCompare={addToCompare}
                compareGEVIs={compareGEVIs}
                compact={!!selectedGEVI && filteredGEVIs.length > 0}
                sortConfig={sortConfig}
                onSortChange={handleSortChange}
                peaceMode={peaceMode}
              />
            </div>

            {/* Detail Panel */}
            {filteredGEVIs.length > 0 && selectedGEVI && (
            <div className="col-span-1 md:col-span-2">
              <GEVIDetail
                gevi={selectedGEVI}
                onAddToCompare={addToCompare}
                compareGEVIs={compareGEVIs}
                onClose={handleLogoClick}
                peaceMode={peaceMode}
                onShowFamilyTree={() => {
                  setActiveTab('database');
                  setShowFamilyTree(true);
                  window.history.pushState(null, '', '/family-tree');
                }}
              />
            </div>
            )}
          </div>
        </>
      )}
    </main>
  );

  // Highlight numbers, formulas, and math symbols in text with klein blue
  const highlightNumbers = (text: string) => {
    // Match: numbers (with optional decimals, %, ×, ±, −, negative sign), math expressions,
    // Greek letters, units (mV, ms, nm, mW/mm², °C, min), variable names (τ_on, τ_off, B_rel, etc.)
    const pattern = /([−±]?\d+(?:[.,]\d+)?(?:\s*[×·]\s*\d+(?:[.,]\d+)?)*\s*(?:%|×|mV|ms|nm|mW\/mm[²2]|°C|min|pts)?)|(\b(?:τ_(?:on|off|sum)|B\/B_EGFP|B_rel|F_remaining|ΔF\/F|EC|QY|log₁₀|exp)\b)|((?:≥|≤|→|↑|↓|÷)\s*\d+(?:[.,]\d+)?(?:\s*(?:%|×|mV|ms|nm|mW\/mm[²2]|°C|min))?)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<span key={match.index} className="text-klein font-medium">{match[0]}</span>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Helper to render scoring sections
  const renderScoringSection = (
    title: string,
    description: string,
    formula: string,
    details: string[],
    benchmarks: { [key: string]: string | number }[],
    formatBench: (bench: { [key: string]: string | number }) => string,
    example?: string,
    formulaNote?: string
  ) => (
    <div className="mt-4 p-3 rounded-lg bg-surface-low">
      <h4 className={`text-md font-semibold mb-2 font-serif ${colors.text}`}>{title}</h4>
      <p className={`text-sm text-ink`}>{highlightNumbers(description)}</p>
      <div className="mt-2 p-2 rounded font-mono text-sm bg-surface-low text-klein">
        {formula}
      </div>
      {formulaNote && (
        <div className="mt-1 text-xs italic text-ink">{highlightNumbers(formulaNote)}</div>
      )}
      {example && (
        <div className={`mt-2 text-xs text-ink`}>
          <span className="font-medium">Example:</span> {highlightNumbers(example)}
        </div>
      )}
      <ul className="list-disc list-inside text-xs space-y-1 mt-2">
        {details.map((detail: string, i: number) => (
          <li key={i} className="text-ink">{highlightNumbers(detail)}</li>
        ))}
      </ul>
      <div className="mt-3">
        <span className={`text-xs font-medium text-ink`}>Benchmarks:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
          {benchmarks.map((bench: { [key: string]: string | number }, i: number) => (
            <div key={i} className="text-xs text-ink">
              {highlightNumbers(formatBench(bench))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Methodology Tab
  const renderMethodologyTab = () => (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-xl md:text-2xl font-bold mb-4 font-serif ${colors.text}`}>
          Scoring <span className="text-klein">Methodology</span>
        </h2>

        <div className="rounded-lg p-4 md:p-6 bg-surface-lowest font-sans text-justify">
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-2 font-serif ${colors.text}`}>Overview</h3>
              <p className={`text-sm text-ink`}>{highlightNumbers(methodologyContent.overview)}</p>
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-2 font-serif ${colors.text}`}>Scoring Methodology</h3>
              <p className={`text-sm text-ink mb-3`}>{methodologyContent.scoreComponents.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {methodologyContent.scoreComponents.items.map((item: { name: string; weight: string; description: string }, i: number) => (
                  <div key={i} className="p-2 rounded bg-surface-low">
                    <div className="text-sm font-medium text-ink">
                      {item.name} <span className="text-klein">{item.weight}</span>
                    </div>
                    <div className="text-xs text-ink">{highlightNumbers(item.description)}</div>
                  </div>
                ))}
              </div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {methodologyContent.scoring.steps.slice(1).map((step: string, i: number) => (
                  <li key={i} className="text-ink">{highlightNumbers(step)}</li>
                ))}
              </ul>

              {/* Brightness Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.brightnessScoring.title,
                methodologyContent.scoring.brightnessScoring.description,
                methodologyContent.scoring.brightnessScoring.formula,
                methodologyContent.scoring.brightnessScoring.details,
                methodologyContent.scoring.brightnessScoring.benchmarks,
                (bench) => `Score ${bench.score}: ${bench.brightness} EGFP (${bench.example})`,
                undefined,
                methodologyContent.scoring.brightnessScoring.formulaNote
              )}

              {/* Speed Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.kineticsScoring.title,
                methodologyContent.scoring.kineticsScoring.description,
                methodologyContent.scoring.kineticsScoring.formula,
                methodologyContent.scoring.kineticsScoring.details,
                methodologyContent.scoring.kineticsScoring.benchmarks,
                (bench) => `Score ${bench.score}: τ_on=${bench.tau_on}ms, τ_off=${bench.tau_off}ms (${bench.example})`,
                undefined,
                methodologyContent.scoring.kineticsScoring.formulaNote
              )}

              {/* Dynamic Range Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.dynamicRangeScoring.title,
                methodologyContent.scoring.dynamicRangeScoring.description,
                methodologyContent.scoring.dynamicRangeScoring.formula,
                methodologyContent.scoring.dynamicRangeScoring.details,
                methodologyContent.scoring.dynamicRangeScoring.benchmarks,
                (bench) => `Score ${bench.score}: ΔF/F ${typeof bench.deltaF === 'string' ? bench.deltaF : `= ${bench.deltaF}`}% (${bench.example})`,
                undefined,
                methodologyContent.scoring.dynamicRangeScoring.formulaNote
              )}

              {/* Sensitivity Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.sensitivityScoring.title,
                methodologyContent.scoring.sensitivityScoring.description,
                methodologyContent.scoring.sensitivityScoring.formula,
                methodologyContent.scoring.sensitivityScoring.details,
                methodologyContent.scoring.sensitivityScoring.benchmarks,
                (bench) => `Score ${bench.score}: ΔF/F/AP ${typeof bench.dfPerAP === 'string' ? bench.dfPerAP : `= ${bench.dfPerAP}`}% (${bench.example})`,
                undefined,
                methodologyContent.scoring.sensitivityScoring.formulaNote
              )}

              {/* Photostability Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.photostabilityScoring.title,
                methodologyContent.scoring.photostabilityScoring.description,
                methodologyContent.scoring.photostabilityScoring.formula,
                methodologyContent.scoring.photostabilityScoring.details,
                methodologyContent.scoring.photostabilityScoring.benchmarks,
                (bench) => `Score ${bench.score}: ${bench.remaining} remaining (${bench.example})`,
                methodologyContent.scoring.photostabilityScoring.example,
                methodologyContent.scoring.photostabilityScoring.formulaNote
              )}

              {/* Popularity Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.popularityScoring.title,
                methodologyContent.scoring.popularityScoring.description,
                methodologyContent.scoring.popularityScoring.formula,
                methodologyContent.scoring.popularityScoring.details,
                methodologyContent.scoring.popularityScoring.benchmarks,
                (bench) => `Score ${bench.score}: ${bench.papers} papers`,
                methodologyContent.scoring.popularityScoring.example,
                methodologyContent.scoring.popularityScoring.formulaNote
              )}
            </div>

            {/* Bonus Points Section */}
            <div className="mt-6">
              <h3 className={`text-lg font-semibold mb-2 font-serif ${colors.text}`}>{methodologyContent.bonusPoints.title}</h3>
              <p className={`text-sm text-ink mb-3`}>{highlightNumbers(methodologyContent.bonusPoints.description)}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {methodologyContent.bonusPoints.rules.map((rule: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-low">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-klein/10 text-klein">
                        +{rule.points} pts
                      </span>
                      <span className="text-sm font-medium text-ink">{rule.name}</span>
                    </div>
                    <div className="text-xs text-ink">{highlightNumbers(rule.description)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weakness Penalty Section */}
            <div className="mt-6">
              <h3 className={`text-lg font-semibold mb-2 font-serif ${colors.text}`}>{methodologyContent.weaknessPenalty.title}</h3>
              <p className={`text-sm text-ink`}>{highlightNumbers(methodologyContent.weaknessPenalty.description)}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen flex flex-col bg-surface-low">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'database') {
            setShowFamilyTree(false);
            setShowBrightnessNetwork(false);
            setShowScatterPlot(false);
            setShowAPSimulator(false);
            window.history.pushState(null, '', '/');
          } else {
            window.history.pushState(null, '', `/${tab}`);
          }
        }}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLogoClick={handleLogoClick}
        peaceMode={peaceMode}
        setPeaceMode={handleSetPeaceMode}
        onShowFamilyTree={() => {
          setActiveTab('database');
          setShowFamilyTree(true);
          setShowBrightnessNetwork(false);
          setShowScatterPlot(false);
          setShowAPSimulator(false);
          window.history.pushState(null, '', '/family-tree');
        }}
        onShowBrightnessNetwork={() => {
          setActiveTab('database');
          setShowBrightnessNetwork(true);
          setShowFamilyTree(false);
          setShowScatterPlot(false);
          setShowAPSimulator(false);
          window.history.pushState(null, '', '/brightness-network');
        }}
        onShowScatterPlot={() => {
          setActiveTab('database');
          setShowScatterPlot(true);
          setShowFamilyTree(false);
          setShowBrightnessNetwork(false);
          setShowAPSimulator(false);
          window.history.pushState(null, '', '/scatter-plot');
        }}
        onShowAPSimulator={() => {
          setActiveTab('database');
          setShowAPSimulator(true);
          setShowFamilyTree(false);
          setShowBrightnessNetwork(false);
          setShowScatterPlot(false);
          window.history.pushState(null, '', '/ap-simulator');
        }}
        onShowCompare={() => {
          setActiveTab('database');
          setShowFamilyTree(false);
          setShowBrightnessNetwork(false);
          setShowScatterPlot(false);
          setShowAPSimulator(false);
          setShowCompareEmpty(true);
          window.history.pushState(null, '', '/');
          // Scroll to comparison panel if there are items
          if (compareGEVIs.length > 0) {
            const comparePanel = document.getElementById('compare-panel');
            if (comparePanel) {
              comparePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }}
      />

      {activeTab === 'database' && renderDatabaseTab()}
      {activeTab === 'methodology' && renderMethodologyTab()}
      {activeTab === 'contact' && <ContactForm />}
      {activeTab === 'tools' && (
        <FamilyTreePanel
          onSelectGEVI={handleSelectGEVI}
          selectedGEVI={selectedGEVI}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
          peaceMode={peaceMode}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-2 bg-surface-low">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1 text-xs font-sans text-ink/40">
            © 2026 GEVIBench. Data sourced from published studies.
          </span>
          <span className="flex items-center gap-1 text-xs font-sans text-ink/40">
            <Clock className="w-3 h-3" />
            Updated {timeAgo(BUILD_DATE)}
          </span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return <GEVIBenchApp />;
}

export default App;
