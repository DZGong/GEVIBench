import { Menu, X, ChevronDown, TreeDeciduous, GitCompare, Github, Share2, ScatterChart, Activity } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ViewTab } from '../types';

interface HeaderProps {
  activeTab: ViewTab;
  setActiveTab: (v: ViewTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  onLogoClick: () => void;
  onShowFamilyTree: () => void;
  onShowCompare: () => void;
  onShowBrightnessNetwork: () => void;
  onShowScatterPlot: () => void;
  onShowAPSimulator: () => void;
}

// Logo from external SVG file
const Logo = () => (
  <img src="/imgs/logo.svg" alt="GEVIBench logo" style={{ height: '32.4px' }} className="w-auto flex-shrink-0" />
);

export function Header({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen, onLogoClick, onShowFamilyTree, onShowCompare, onShowBrightnessNetwork, onShowScatterPlot, onShowAPSimulator }: HeaderProps) {
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const tabButtonClass = (tab: ViewTab) =>
    `label px-3 py-1.5 border-b-2 transition-colors ${activeTab === tab ? 'text-klein border-gold' : 'text-ink border-transparent hover:text-klein hover:border-gold/40'}`;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToolsClick = () => {
    setToolsMenuOpen(!toolsMenuOpen);
  };

  const handleToolSelect = (tool: 'family-tree' | 'compare' | 'brightness-network' | 'scatter-plot' | 'ap-simulator') => {
    if (tool === 'family-tree') onShowFamilyTree();
    else if (tool === 'compare') onShowCompare();
    else if (tool === 'brightness-network') onShowBrightnessNetwork();
    else if (tool === 'scatter-plot') onShowScatterPlot();
    else if (tool === 'ap-simulator') onShowAPSimulator();
    setToolsMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-surface backdrop-blur-[12px]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <button onClick={onLogoClick} className="flex flex-col items-center hover:opacity-70">
                <Logo />
                <span className="text-xs font-semibold leading-tight mt-0.5"><span className="text-klein">GEVI</span><span className="text-ink">Bench</span></span>
              </button>
            </div>
          </div>

          {/* Centered logo on mobile */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2">
            <button onClick={onLogoClick} className="flex flex-col items-center hover:opacity-70">
              <Logo />
              <span className="text-xs font-semibold leading-tight mt-0.5"><span className="text-klein">GEVI</span><span className="text-ink">Bench</span></span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden lg:flex items-center gap-2">
              <button onClick={() => setActiveTab('database')} className={tabButtonClass('database')}>
                Database
              </button>

              {/* Tools Dropdown */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  onClick={handleToolsClick}
                  className={`${tabButtonClass('tools')} flex items-center gap-1`}
                >
                  Tools
                  <ChevronDown className={`w-3 h-3 transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {toolsMenuOpen && (
                  <div className="absolute top-full mt-1 right-0 w-48 rounded-md shadow-ambient py-1 z-50 bg-surface-lowest">
                    <button
                      onClick={() => handleToolSelect('compare')}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-ink/70 hover:bg-surface-low"
                    >
                      <GitCompare className="w-4 h-4" />
                      Compare
                    </button>
                    <button
                      onClick={() => handleToolSelect('family-tree')}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-ink/70 hover:bg-surface-low"
                    >
                      <TreeDeciduous className="w-4 h-4" />
                      Family Tree
                    </button>
                    <button
                      onClick={() => handleToolSelect('brightness-network')}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-ink/70 hover:bg-surface-low"
                    >
                      <Share2 className="w-4 h-4" />
                      Brightness Network
                    </button>
                    <button
                      onClick={() => handleToolSelect('scatter-plot')}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-ink/70 hover:bg-surface-low"
                    >
                      <ScatterChart className="w-4 h-4" />
                      Performance Scatter
                    </button>
                    <button
                      onClick={() => handleToolSelect('ap-simulator')}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-ink/70 hover:bg-surface-low"
                    >
                      <Activity className="w-4 h-4" />
                      AP Simulator
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => setActiveTab('contact')} className={tabButtonClass('contact')}>
                Contact
              </button>
            </nav>

            <a
              href="https://github.com/DZGong/GEVIBench"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md text-ink/60 hover:bg-surface-low"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pb-2">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setActiveTab('database'); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left border-b-2 ${activeTab === 'database' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                Database
              </button>
              <button
                onClick={() => { onShowCompare(); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left flex items-center gap-2 border-b-2 ${activeTab === 'tools' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                <GitCompare className="w-4 h-4" />
                Compare
              </button>
              <button
                onClick={() => { onShowFamilyTree(); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left flex items-center gap-2 border-b-2 ${activeTab === 'tools' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                <TreeDeciduous className="w-4 h-4" />
                Family Tree
              </button>
              <button
                onClick={() => { onShowBrightnessNetwork(); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left flex items-center gap-2 border-b-2 ${activeTab === 'tools' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                <Share2 className="w-4 h-4" />
                Brightness Network
              </button>
              <button
                onClick={() => { onShowScatterPlot(); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left flex items-center gap-2 border-b-2 ${activeTab === 'tools' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                <ScatterChart className="w-4 h-4" />
                Performance Scatter
              </button>
              <button
                onClick={() => { onShowAPSimulator(); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left flex items-center gap-2 border-b-2 ${activeTab === 'tools' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                <Activity className="w-4 h-4" />
                AP Simulator
              </button>
              <button
                onClick={() => { setActiveTab('contact'); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left border-b-2 ${activeTab === 'contact' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
