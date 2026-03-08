import { useState, useCallback, useMemo } from 'react';
import gevisData from './data.json';
import { methodologyContent } from './methodology';
import { SpectrumViewer } from './SpectrumViewer';
import { FamilyTree } from './FamilyTree';
import { FamilyTreePanel } from './components/FamilyTreePanel';
import { Header } from './components/Header';
import { SearchFilters } from './components/SearchFilters';
import { GEVIList } from './components/GEVIList';
import { GEVIDetail } from './components/GEVIDetail';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ContactForm } from './components/ContactForm';
import { RainbowText, getGEVIColor } from './utils';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import type { GEVI, SortField, ViewTab, MobileView, SortConfig } from './types';
import {
  DEFAULT_CATEGORY,
  DEFAULT_YEAR,
  DEFAULT_SORT,
  MAX_COMPARE_ITEMS,
  COLORS,
  METRICS,
} from './constants';

const gevis = gevisData as GEVI[];

// Inner component that uses the theme context
function GEVIBenchApp() {
  const { darkMode, colors } = useTheme();

  // State
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

      const aVal = a[field] || 0;
      const bVal = b[field] || 0;
      return (aVal - bVal) * multiplier;
    });

  // Handlers
  const addToCompare = useCallback((gevi: GEVI) => {
    setCompareGEVIs(prev => {
      if (prev.find(g => g.id === gevi.id) || prev.length >= MAX_COMPARE_ITEMS) {
        return prev;
      }
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
  }, []);

  const handleLogoClick = useCallback(() => {
    setSelectedGEVI(null);
    setMobileView('list');
  }, []);

  const handleSortChange = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // Render helpers
  const getGEVISortValue = (field: SortField) => {
    return sortConfig.field === field ? (sortConfig.order === 'desc' ? '↓' : '↑') : '';
  };

  // Render Database Tab
  const renderDatabaseTab = () => (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <button onClick={handleLogoClick} className="hover:opacity-80 transition-opacity">
          <h2 className={`text-xl md:text-2xl font-bold mb-2 ${colors.text}`}>
            GEVIBench <span className="text-blue-400">— Voltage Indicator Benchmark</span>
          </h2>
        </button>
        <p className={`text-sm md:text-base px-2 ${colors.textTertiary}`}>
          Independent, standardized evaluation from publicly available datasets
        </p>
      </div>

      <SearchFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        categories={categories}
        years={years}
      />

      {/* Mobile View Toggle */}
      <div className="sm:hidden flex mb-4 gap-2">
        <div className="flex-1">
          <button
            onClick={() => setMobileView('list')}
            className={`w-1/2 py-2 text-sm font-medium rounded-l-md ${
              mobileView === 'list' ? 'bg-blue-900 text-white' : `${colors.bgTertiary} ${colors.textSecondary}`
            }`}
          >
            List ({filteredGEVIs.length})
          </button>
          <button
            onClick={() => setMobileView('detail')}
            className={`w-1/2 py-2 text-sm font-medium rounded-r-md ${
              mobileView === 'detail' ? 'bg-blue-900 text-white' : `${colors.bgTertiary} ${colors.textSecondary}`
            }`}
          >
            Details
          </button>
        </div>
        <select
          value={sortConfig.field}
          onChange={(e) => handleSortChange(e.target.value as SortField)}
          className={`text-xs px-2 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
        >
          <option value="overall">Overall</option>
          <option value="brightness">Brightness</option>
          <option value="speed">Speed</option>
          <option value="snr">SNR</option>
          <option value="dynamicRange">Range</option>
          <option value="photostability">Stable</option>
          <option value="paperCount">Papers</option>
          <option value="year">Year</option>
        </select>
        <button
          onClick={() => handleSortChange(sortConfig.field)}
          className={`text-xs px-2 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          title={sortConfig.order === 'desc' ? 'Ascending' : 'Descending'}
        >
          {sortConfig.order === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Comparison Panel */}
      {compareGEVIs.length > 0 && (
        <ComparisonPanel
          compareGEVIs={compareGEVIs}
          onRemove={removeFromCompare}
          darkMode={darkMode}
        />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar - GEVI List */}
        <div className={`hidden sm:block ${selectedGEVI ? 'col-span-1' : 'col-span-3'}`}>
          <GEVIList
            gevis={filteredGEVIs}
            selectedGEVI={selectedGEVI}
            onSelect={handleSelectGEVI}
            onAddToCompare={addToCompare}
            compareGEVIs={compareGEVIs}
            darkMode={darkMode}
            compact={!!selectedGEVI}
            sortConfig={sortConfig}
            onSortChange={handleSortChange}
          />
        </div>

        {/* Mobile List View */}
        {mobileView === 'list' && (
          <div className="sm:hidden col-span-1 space-y-2">
            {filteredGEVIs.map((gevi, idx) => {
              const geviColor = getGEVIColor(gevi);
              return (
                <button
                  key={gevi.id}
                  onClick={() => handleSelectGEVI(gevi)}
                  className={`w-full p-3 text-left border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${colors.textMuted}`}>{idx + 1}.</span>
                      {geviColor.color === 'rainbow' ? (
                        <RainbowText text={gevi.name} />
                      ) : (
                        <span className="font-semibold text-base" style={{ color: geviColor.color }}>{gevi.name}</span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 bg-blue-900 text-white rounded">{gevi.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{gevi.year}</span>
                      <span className="text-base font-bold text-blue-500">{gevi.overall}</span>
                    </div>
                  </div>
                  <div className={`text-xs ${colors.textTertiary}`}>
                    {gevi.description}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Detail Panel / Family Tree */}
        <div className={`col-span-1 ${mobileView === 'list' ? 'sm:col-span-2' : 'col-span-1 md:col-span-2'}`}>
          {/* Family Tree or Detail Panel */}
          {showFamilyTree ? (
            <FamilyTreePanel
              darkMode={darkMode}
              onSelectGEVI={handleSelectGEVI}
              selectedGEVI={selectedGEVI}
              onCloseDetail={() => {
                // Go back to previous view (GEVI detail if a GEVI was selected, otherwise main database)
                setShowFamilyTree(false);
                if (selectedGEVI) {
                  setMobileView('detail');
                }
              }}
              compareGEVIs={compareGEVIs}
              onAddToCompare={addToCompare}
            />
          ) : (
            selectedGEVI && mobileView === 'detail' && (
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
                  darkMode={darkMode}
                  onClose={handleLogoClick}
                  onShowFamilyTree={() => {
                    setActiveTab('database');
                    setShowFamilyTree(true);
                  }}
                />
              </>
            )
          )}
        </div>
      </div>
    </main>
  );

  // Render Methodology Tab
  const renderMethodologyTab = () => (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-xl md:text-2xl font-bold mb-4 ${colors.text}`}>
          Scoring <span className="text-blue-400">Methodology</span>
        </h2>

        <div className={`border rounded-lg p-4 md:p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Overview</h3>
              <p className={`text-sm ${colors.textSecondary}`}>{methodologyContent.overview}</p>
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Two Data Sources</h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>1. Public Raw Datasets</h4>
                  <p className={`text-sm ${colors.textTertiary}`}>{methodologyContent.twoApproaches.rawData.description}</p>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>2. Published Parameters</h4>
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
                (bench) => `Score ${bench.score}: τ_on=${bench.tau_on}ms, τ_off=${bench.tau_off}ms (${bench.example})`
              )}

              {/* Dynamic Range Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.dynamicRangeScoring.title,
                methodologyContent.scoring.dynamicRangeScoring.description,
                methodologyContent.scoring.dynamicRangeScoring.formula,
                methodologyContent.scoring.dynamicRangeScoring.details,
                methodologyContent.scoring.dynamicRangeScoring.benchmarks,
                (bench) => `Score ${bench.score}: ΔF/F=${bench.deltaF}% (${bench.example})`
              )}

              {/* Photostability Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.photostabilityScoring.title,
                methodologyContent.scoring.photostabilityScoring.description,
                methodologyContent.scoring.photostabilityScoring.formula,
                methodologyContent.scoring.photostabilityScoring.details,
                methodologyContent.scoring.photostabilityScoring.benchmarks,
                (bench) => `Score ${bench.score}: ${bench.remaining}% remaining (${bench.example})`,
                methodologyContent.scoring.photostabilityScoring.example
              )}

              {/* Popularity Scoring Rule */}
              {renderScoringSection(
                methodologyContent.scoring.popularityScoring.title,
                methodologyContent.scoring.popularityScoring.description,
                methodologyContent.scoring.popularityScoring.formula,
                methodologyContent.scoring.popularityScoring.details,
                methodologyContent.scoring.popularityScoring.benchmarks,
                (bench) => `Score ${bench.score}: ${bench.papers} papers (${bench.example})`,
                methodologyContent.scoring.popularityScoring.example
              )}
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>Score Components</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {methodologyContent.metrics.items.map((item: { name: string; weight: string; description: string }, i: number) => (
                  <div key={i} className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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
                  <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                        +{rule.points} pts
                      </span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{rule.name}</span>
                    </div>
                    <div className={`text-xs ${colors.textMuted}`}>{rule.description}</div>
                  </div>
                ))}
              </div>
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
    example?: string
  ) => (
    <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
      <h4 className={`text-md font-semibold mb-2 ${colors.text}`}>{title}</h4>
      <p className={`text-sm ${colors.textSecondary}`}>{description}</p>
      <div className={`mt-2 p-2 rounded font-mono text-sm ${darkMode ? 'bg-gray-800 text-green-400' : 'bg-white text-green-700'}`}>
        {formula}
      </div>
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLogoClick={handleLogoClick}
        onShowFamilyTree={() => {
          setActiveTab('database');
          setShowFamilyTree(true);
        }}
      />

      {activeTab === 'database' && renderDatabaseTab()}
      {activeTab === 'methodology' && renderMethodologyTab()}
      {activeTab === 'contact' && <ContactForm darkMode={darkMode} />}
      {activeTab === 'tools' && (
        <FamilyTreePanel
          darkMode={darkMode}
          onSelectGEVI={handleSelectGEVI}
          selectedGEVI={selectedGEVI}
          onCloseDetail={() => {
            setSelectedGEVI(null);
          }}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <GEVIBenchApp />
    </ThemeProvider>
  );
}

export default App;
