import { Menu, X, ChevronDown, TreeDeciduous, GitCompare, Github, Share2, Swords, Leaf } from 'lucide-react';
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
  peaceMode: boolean;
  setPeaceMode: (v: boolean) => void;
}

// Logo from external SVG file
const Logo = () => (
  <img src="/imgs/logo.svg" alt="GEVIBench logo" style={{ height: '32.4px' }} className="w-auto flex-shrink-0" />
);

export function Header({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen, onLogoClick, onShowFamilyTree, onShowCompare, onShowBrightnessNetwork, peaceMode, setPeaceMode }: HeaderProps) {
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const tabButtonClass = (tab: ViewTab) =>
    `label px-3 py-1.5 border-b-2 transition-colors ${activeTab === tab ? 'text-klein border-gold' : 'text-ink border-transparent hover:text-klein'}`;

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

  const handleToolSelect = (tool: 'family-tree' | 'compare' | 'brightness-network') => {
    if (tool === 'family-tree') onShowFamilyTree();
    else if (tool === 'compare') onShowCompare();
    else if (tool === 'brightness-network') onShowBrightnessNetwork();
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
                <span className="text-xs font-bold leading-tight mt-0.5"><span className="text-klein">GEVI</span><span className="text-ink">Bench</span></span>
              </button>
            </div>
          </div>

          {/* Centered logo on mobile */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2">
            <button onClick={onLogoClick} className="flex flex-col items-center hover:opacity-70">
              <Logo />
              <span className="text-xs font-bold leading-tight mt-0.5"><span className="text-klein">GEVI</span><span className="text-ink">Bench</span></span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden lg:flex items-center gap-2">
              <button onClick={() => setActiveTab('database')} className={tabButtonClass('database')}>
                Database
              </button>
              <button onClick={() => setActiveTab('methodology')} className={tabButtonClass('methodology')}>
                Methodology
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
                  </div>
                )}
              </div>

              <button onClick={() => setActiveTab('contact')} className={tabButtonClass('contact')}>
                Contact
              </button>
            </nav>

            <div className="relative group">
              <button
                onClick={() => setPeaceMode(!peaceMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full label transition-colors ${
                  peaceMode
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-klein/10 text-klein hover:bg-klein/20'
                }`}
              >
                {peaceMode ? <Leaf className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
                {peaceMode ? 'Peace' : 'Arena'}
              </button>
              <div className="pointer-events-none absolute right-0 top-full mt-2 w-56 rounded-md shadow-ambient px-3 py-2.5 z-50 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-low border border-ink/10">
                {peaceMode ? (
                  <>
                    <p className="text-xs font-semibold text-green-700 mb-1">Peace Mode</p>
                    <p className="text-xs text-ink/70 font-sans leading-snug">Scores are hidden. Sensors are listed by publication year — explore without rankings.</p>
                    <p className="text-xs text-ink/50 font-sans mt-1.5">Click to switch to Arena Mode.</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-klein mb-1">Arena Mode</p>
                    <p className="text-xs text-ink/70 font-sans leading-snug">Sensors are ranked by overall score — a weighted combination of brightness, speed, dynamic range, and more.</p>
                    <p className="text-xs text-ink/50 font-sans mt-1.5">Click to switch to Peace Mode.</p>
                  </>
                )}
              </div>
            </div>

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
                onClick={() => { setActiveTab('methodology'); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left border-b-2 ${activeTab === 'methodology' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                Methodology
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
                onClick={() => { setActiveTab('contact'); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left border-b-2 ${activeTab === 'contact' ? 'text-klein border-gold' : 'text-ink border-transparent'}`}
              >
                Contact
              </button>
              <button
                onClick={() => { setPeaceMode(!peaceMode); setMobileMenuOpen(false); }}
                className={`label px-3 py-2 text-left flex items-center gap-2 rounded-full ${
                  peaceMode ? 'text-green-700' : 'text-klein'
                }`}
              >
                {peaceMode ? <Leaf className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                {peaceMode ? 'Peace Mode' : 'Arena Mode'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
