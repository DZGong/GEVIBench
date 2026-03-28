import { useState, useCallback, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { getAllGEVIs } from './geviData';
import { methodologyContent } from './methodology';
import { FamilyTreePanel } from './components/FamilyTreePanel';
import { BrightnessNetworkPanel } from './components/BrightnessNetworkPanel';
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
  const [showCompareEmpty, setShowCompareEmpty] = useState(false);

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
  }, []);

  const handleLogoClick = useCallback(() => {
    setSelectedGEVI(null);
    setMobileView('list');
    setShowFamilyTree(false);
    setShowBrightnessNetwork(false);
    setActiveTab('database');
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
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/imgs/spike_mov.mp4" type="video/mp4" />
        </video>
        {/* Dark Overlay for readability */}
                {/* Title Content */}
        <div className="relative text-center py-4 px-3">
          <button onClick={handleLogoClick} className="hover:opacity-80 transition-opacity">
            <h2 className="font-sans font-bold mb-1 text-white whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: 'clamp(16px, 4vw, 24px)' }}>
              GEVIBench <span className="text-blue-300 font-semibold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>— Voltage Indicator Benchmark</span>
            </h2>
          </button>
          <p className="text-gray-200 whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', fontSize: 'clamp(11px, 2.5vw, 16px)' }}>
            Independent, standardized evaluation from publicly available datasets
          </p>
        </div>
      </div>

      {!showFamilyTree && (
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
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

      {/* Brightness Network - full width */}
      {showBrightnessNetwork ? (
        <BrightnessNetworkPanel onSelectGEVI={handleSelectGEVI} />
      ) : showFamilyTree ? (
        <FamilyTreePanel
          onSelectGEVI={handleSelectGEVI}
          selectedGEVI={selectedGEVI}
          onCloseDetail={() => {
            setShowFamilyTree(false);
            if (selectedGEVI) {
              setMobileView('detail');
            }
          }}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
        />
      ) : (
        <>
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* GEVI List */}
            <div className={`${selectedGEVI && filteredGEVIs.length > 0 ? 'col-span-1' : 'col-span-3'}`}>
              <GEVIList
                gevis={filteredGEVIs}
                selectedGEVI={selectedGEVI}
                onSelect={handleSelectGEVI}
                onAddToCompare={addToCompare}
                compareGEVIs={compareGEVIs}
                compact={!!selectedGEVI && filteredGEVIs.length > 0}
                sortConfig={sortConfig}
                onSortChange={handleSortChange}
              />
            </div>

            {/* Detail Panel - only rendered when there are results (prevents narrow wrapping with 0 results) */}
            {filteredGEVIs.length > 0 && (
            <div className={`col-span-1 ${mobileView === 'list' ? 'sm:col-span-2' : 'col-span-1 md:col-span-2'}`}>
              {selectedGEVI && mobileView === 'detail' && (
                <>
                  {mobileView === 'detail' && (
                    <button
                      onClick={() => setMobileView('list')}
                      className={`sm:hidden mb-3 text-sm flex items-center gap-1 ${colors.accent}`}
                    >
                      ← Back to list
                    </button>
                  )}
                  <GEVIDetail
                    gevi={selectedGEVI}
                    onAddToCompare={addToCompare}
                    compareGEVIs={compareGEVIs}
                    onClose={handleLogoClick}
                    onShowFamilyTree={() => {
                      setActiveTab('database');
                      setShowFamilyTree(true);
                    }}
                  />
                </>
              )}
            </div>
            )}
          </div>
        </>
      )}
    </main>
  );

  // Render Methodology Tab
  const renderMethodologyTab = () => (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-xl md:text-2xl font-bold mb-4 ${colors.text}`}>
          Scoring <span className="text-blue-400">Methodology</span>
        </h2>

        <div className="border rounded-lg p-4 md:p-6 bg-paper border-gray-200">
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Overview</h3>
              <p className={`text-sm ${colors.textSecondary}`}>{methodologyContent.overview}</p>
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Two Data Sources</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2 text-gray-800">1. Public Raw Datasets</h4>
                  <p className={`text-sm ${colors.textTertiary}`}>{methodologyContent.twoApproaches.rawData.description}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2 text-gray-800">2. Published Parameters</h4>
                  <p className={`text-sm ${colors.textTertiary}`}>{methodologyContent.twoApproaches.literature.description}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Scoring Methodology</h3>
              <p className={`text-sm ${colors.textSecondary}`}>{methodologyContent.scoring.approach}</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                {methodologyContent.scoring.steps.map((step: string, i: number) => (
                  <li key={i} className={colors.textTertiary}>{step}</li>
                ))}
              </ul>

              {/* Kinetics Scoring Rule */}
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
                (bench) => `Score ${bench.score}: ΔF/F=${bench.deltaF}% (${bench.example})`,
                undefined,
                methodologyContent.scoring.dynamicRangeScoring.formulaNote
              )}

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

              {/* SNR Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.sensitivityScoring.title,
                methodologyContent.scoring.sensitivityScoring.description,
                methodologyContent.scoring.sensitivityScoring.formula,
                methodologyContent.scoring.sensitivityScoring.details,
                methodologyContent.scoring.sensitivityScoring.benchmarks,
                (bench) => `Score ${bench.score}: ΔF/F/AP = ${bench.dfPerAP}% (${bench.example})`,
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
                (bench) => `Score ${bench.score}: ${bench.papers} papers (${bench.example})`,
                methodologyContent.scoring.popularityScoring.example,
                methodologyContent.scoring.popularityScoring.formulaNote
              )}
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Score Components</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {methodologyContent.metrics.items.map((item: { name: string; weight: string; description: string }, i: number) => (
                  <div key={i} className="p-2 rounded bg-gray-50">
                    <div className="text-sm font-medium text-gray-800">
                      {item.name} <span className="text-blue-500">{item.weight}</span>
                    </div>
                    <div className={`text-xs ${colors.textMuted}`}>{item.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus Points Section */}
            <div className="mt-6">
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>{methodologyContent.bonusPoints.title}</h3>
              <p className={`text-sm ${colors.textSecondary} mb-3`}>{methodologyContent.bonusPoints.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {methodologyContent.bonusPoints.rules.map((rule: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border bg-paper border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        +{rule.points} pts
                      </span>
                      <span className="text-sm font-medium text-gray-800">{rule.name}</span>
                    </div>
                    <div className={`text-xs ${colors.textMuted}`}>{rule.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weakness Penalty Section */}
            <div className="mt-6">
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>{methodologyContent.weaknessPenalty.title}</h3>
              <p className={`text-sm ${colors.textSecondary}`}>{methodologyContent.weaknessPenalty.description}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

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
    <div className="mt-4 p-3 rounded-lg bg-blue-50">
      <h4 className={`text-md font-semibold mb-2 ${colors.text}`}>{title}</h4>
      <p className={`text-sm ${colors.textSecondary}`}>{description}</p>
      <div className="mt-2 p-2 rounded font-mono text-sm bg-paper text-green-700">
        {formula}
      </div>
      {formulaNote && (
        <div className={`mt-1 text-xs italic ${colors.textTertiary}`}>{formulaNote}</div>
      )}
      {example && (
        <div className={`mt-2 text-xs ${colors.textSecondary}`}>
          <span className="font-medium">Example:</span> {example}
        </div>
      )}
      <ul className="list-disc list-inside text-xs space-y-1 mt-2">
        {details.map((detail: string, i: number) => (
          <li key={i} className={colors.textTertiary}>{detail}</li>
        ))}
      </ul>
      <div className="mt-3">
        <span className={`text-xs font-medium ${colors.textSecondary}`}>Benchmarks:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
          {benchmarks.map((bench: { [key: string]: string | number }, i: number) => (
            <div key={i} className={`text-xs ${colors.textTertiary}`}>
              {formatBench(bench)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'database') setShowFamilyTree(false);
        }}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLogoClick={handleLogoClick}
        onShowFamilyTree={() => {
          setActiveTab('database');
          setShowFamilyTree(true);
          setShowBrightnessNetwork(false);
        }}
        onShowBrightnessNetwork={() => {
          setActiveTab('database');
          setShowBrightnessNetwork(true);
          setShowFamilyTree(false);
        }}
        onShowCompare={() => {
          setActiveTab('database');
          setShowCompareEmpty(true);
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
          onCloseDetail={() => {
            setSelectedGEVI(null);
          }}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-4 border-t bg-gray-50 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-4">
          <p className="text-sm text-gray-500">
            © 2026 GEVIBench. Data sourced from published studies.
          </p>
          <span className="flex items-center gap-1 text-xs text-gray-400">
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
