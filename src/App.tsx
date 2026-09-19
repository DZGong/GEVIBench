import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Clock, Quote } from 'lucide-react';
import { getAllGEVIs } from './geviData';
import { FamilyTreePanel } from './components/FamilyTreePanel';
import { BrightnessNetworkPanel } from './components/BrightnessNetworkPanel';
import { ScatterPlotPanel } from './components/ScatterPlotPanel';
import { APSimulatorPanel } from './components/APSimulatorPanel';
import { Header } from './components/Header';
import { SearchFilters } from './components/SearchFilters';
import { GEVIList } from './components/GEVIList';
import { GEVIDetail } from './components/GEVIDetail';
import { ComparisonPanel } from './components/ComparisonPanel';
import { AboutPanel } from './components/AboutPanel';
import { CitationHint } from './components/CitationHint';
import { CITATION, CITATION_URL } from './citation';
import { RainbowText, getGEVIColor } from './utils';
import { COLORS } from './constants';
import { getSpikeTextureDataURI } from './spikeTexture';
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
    // /contact and /cite were separate pages before they merged into /about; both are
    // indexed and linked from elsewhere, so they keep resolving here.
    if (path === '/about' || path === '/contact' || path === '/cite') {
      setActiveTab('about');
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

      if (field === 'name') {
        // Alphabetical sort by sensor name (case-insensitive, locale-aware,
        // numeric segments compared as numbers so ASAP2 < ASAP3 < ASAP10).
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) * multiplier;
      }

      if (field === 'year') {
        // Sort by exact publication date (ISO YYYY-MM-DD) as the primary key so
        // same-year sensors order by when they were actually published. Fall back
        // to Jan 1 of the calendar year if a sensor has no recorded date.
        const aKey = a.date ?? `${a.year}-01-01`;
        const bKey = b.date ?? `${b.year}-01-01`;
        if (aKey === bKey) return 0;
        return (aKey < bKey ? -1 : 1) * multiplier;
      }

      // peakEx (λ ex/em) sort: chemigenetic GEVIs are clustered together at one
      // end of the list (bottom for ascending, top for descending) because their
      // spectrum reflects the dye partner, not the sensor itself, so it isn't
      // meaningful to interleave them with FP/opsin-based sensors.
      if (field === 'peakEx') {
        const aChemi = a.voltage?.type === 'chemi';
        const bChemi = b.voltage?.type === 'chemi';
        if (aChemi && bChemi) return b.year - a.year; // among chemi, fall back to year desc
        if (aChemi) return multiplier;   // asc → push to bottom, desc → push to top
        if (bChemi) return -multiplier;
        const aPx = a.spectrum?.peakEx ?? null;
        const bPx = b.spectrum?.peakEx ?? null;
        if (aPx == null && bPx == null) return b.year - a.year;
        if (aPx == null) return 1;
        if (bPx == null) return -1;
        return (aPx - bPx) * multiplier;
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

  // Switching top-level tabs: close any open tool panel, sync the URL, and start the
  // new view at the top — the footer's "Cite" link is reached from the bottom of a long
  // list, and landing mid-page on a short view looks like a blank screen.
  const navigateToTab = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
    setShowFamilyTree(false);
    setShowBrightnessNetwork(false);
    setShowScatterPlot(false);
    setShowAPSimulator(false);
    window.history.pushState(null, '', tab === 'database' ? '/' : `/${tab}`);
    window.scrollTo({ top: 0 });
  }, []);

  const handleSortChange = useCallback((field: SortField) => {
    setSortConfig(prev => {
      // First-click default order: text fields (name) start A→Z (asc);
      // numeric fields start high→low (desc). Clicking the active field flips.
      const defaultOrder = field === 'name' ? 'asc' : 'desc';
      const flippedOrder = defaultOrder === 'desc' ? 'asc' : 'desc';
      const sameField = prev.field === field;
      return {
        field,
        order: sameField && prev.order === defaultOrder ? flippedOrder : defaultOrder,
      };
    });
  }, []);

  // Render Database Tab
  const renderDatabaseTab = () => (
    <main className="w-full max-w-[1350px] mx-auto px-4 py-3">
      {/* Title Panel with Video Background.
          Video must be H.264 (avc1) in MP4 with the `moov` atom at the front
          (`+faststart`); MPEG-4 Visual (`mp4v`) plays in Safari but Chrome
          dropped support for it years ago, so a non-H.264 file shows a blank
          grey panel in Chrome. `preload="auto"` lets the browser fetch enough
          to start playback right away, and `disableRemotePlayback` hides the
          AirPlay/Cast affordance on Safari for a clean background loop. */}
      {/* The rounded clip lives on the inner backdrop, not the panel: the panel holds the
          citation hover card, and clipping at this level would cut it off at the border. */}
      <div className="relative rounded-xl mb-3 -mt-1">
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disableRemotePlayback
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/imgs/spike_mov3.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/25" />
        </div>
        <div className="relative text-center py-4 px-3">
          <button onClick={handleLogoClick} className="hover:opacity-80 transition-opacity">
            <h2 className="font-semibold mb-1 whitespace-nowrap" style={{ fontSize: 'clamp(16px, 4vw, 24px)' }}>
              <span className="text-white">GEVI</span><span className="text-white">Bench</span>
              <span className="font-sans font-semibold text-gray-200" style={{ fontSize: 'clamp(12px, 3vw, 20px)' }}> — Voltage Indicator Benchmark</span>
            </h2>
          </button>
          {/* The citation is the subtitle: most visitors land here and never open the nav,
              so the paper they should cite is named in full, with the title linking out. */}
          <p className="font-sans text-gray-300" style={{ fontSize: 'clamp(11px, 2.5vw, 15px)' }}>
            Described in{' '}
            <a
              href={CITATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline decoration-gold/70 hover:decoration-gold underline-offset-2 transition-colors"
            >
              {CITATION.title}
            </a>
            , <em>{CITATION.journal}</em> ({CITATION.year})
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
          // The raw values are the sensor table itself, narrowed to the selection — same
          // columns, same formatters, same sort headers as the list below.
          table={(
            <GEVIList
              gevis={compareGEVIs}
              selectedGEVI={selectedGEVI}
              onSelect={handleSelectGEVI}
              onAddToCompare={addToCompare}
              onRemoveFromCompare={removeFromCompare}
              compareGEVIs={compareGEVIs}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
            />
          )}
        />
      )}

      {/* Full-width tool panels */}
      {showAPSimulator ? (
        <APSimulatorPanel />
      ) : showScatterPlot ? (
        <ScatterPlotPanel onSelectGEVI={handleSelectGEVI} />
      ) : showBrightnessNetwork ? (
        <BrightnessNetworkPanel onSelectGEVI={handleSelectGEVI} />
      ) : showFamilyTree ? (
        <FamilyTreePanel
          onSelectGEVI={handleSelectGEVI}
          selectedGEVI={selectedGEVI}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
        />
      ) : (
        <>
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* GEVI List panel.
                · Compact (detail open): hidden on narrow screens; sticky inside the grid with its own scroll.
                · Otherwise: full width, capped at 1.2× the viewport-fit value (120vh - 20.4rem
                  ≡ 1.2 × (100vh - 17rem)) so the panel scales with the window — fills the viewport
                  on any height and extends past it by ~0.2× to give the outer page some scroll room.
                  17rem ≈ header (~80px) + title (~98px) + search (~44px) + paddings ≈ 248px.

                Two-div structure: the OUTER div owns the rounded corners +
                background + shadow + sizing + sticky/grid placement, and uses
                overflow:hidden purely to enforce the rounded clip. The INNER
                div is the actual scroll container (overflow:auto on both
                axes — horizontal lets the wide table scroll on narrow
                viewports, vertical drives the sticky <thead>). Splitting
                them prevents a long-standing Safari WebKit bug where
                position:sticky children of an overflow:auto + border-radius
                element render past the rounded corners during scroll
                (visible as row text bleeding above the sticky header).
                See https://bugs.webkit.org/show_bug.cgi?id=98643 and
                related issues. */}
            <div
              className={`rounded-lg overflow-hidden bg-surface-lowest shadow-ambient ${
                selectedGEVI && filteredGEVIs.length > 0
                  ? 'hidden md:block col-span-1 sticky top-20 max-h-[calc(100vh-6rem)]'
                  : 'col-span-3 max-h-[calc(120vh-20.4rem)]'
              }`}
            >
              <div
                ref={sideListRef}
                className={`overflow-auto ${
                  selectedGEVI && filteredGEVIs.length > 0
                    ? 'max-h-[calc(100vh-6rem)]'
                    : 'max-h-[calc(120vh-20.4rem)]'
                }`}
              >
                <GEVIList
                  gevis={filteredGEVIs}
                  selectedGEVI={selectedGEVI}
                  onSelect={handleSelectGEVI}
                  onAddToCompare={addToCompare}
                  onRemoveFromCompare={removeFromCompare}
                  compareGEVIs={compareGEVIs}
                  compact={!!selectedGEVI && filteredGEVIs.length > 0}
                  sortConfig={sortConfig}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>

            {/* Detail Panel */}
            {filteredGEVIs.length > 0 && selectedGEVI && (
            <div className="col-span-1 md:col-span-2">
              <GEVIDetail
                gevi={selectedGEVI}
                onAddToCompare={addToCompare}
                compareGEVIs={compareGEVIs}
                onClose={handleLogoClick}
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

  // Tool panels (Family Tree, Brightness Network, Performance Scatter, AP Simulator)
  // render *inside* the Database tab, so the underlying `activeTab` stays 'database'
  // when any tool is open. For the header's highlight, surface 'tools' instead so the
  // Tools menu shows as active while a tool panel is visible.
  const headerActiveTab: ViewTab =
    showFamilyTree || showBrightnessNetwork || showScatterPlot || showAPSimulator
      ? 'tools'
      : activeTab;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="spike-trace-layer" style={{ backgroundImage: getSpikeTextureDataURI() }} aria-hidden="true" />
      <Header
        activeTab={headerActiveTab}
        setActiveTab={navigateToTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLogoClick={handleLogoClick}
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
      {activeTab === 'about' && <AboutPanel />}
      {activeTab === 'tools' && (
        <FamilyTreePanel
          onSelectGEVI={handleSelectGEVI}
          selectedGEVI={selectedGEVI}
          compareGEVIs={compareGEVIs}
          onAddToCompare={addToCompare}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-2 bg-surface-low">
        <div className="max-w-[1320px] mx-auto px-4 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1 text-xs font-sans text-ink/40">
            © 2026 GEVIBench. Data sourced from published studies.
          </span>
          <CitationHint className="flex items-center gap-1 text-xs font-sans text-ink/40 hover:text-klein transition-colors">
            <Quote className="w-3 h-3" />
            Cite GEVIBench
          </CitationHint>
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
