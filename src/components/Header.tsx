import { Menu, X, ChevronDown, TreeDeciduous, GitCompare, Github, Share2 } from 'lucide-react';
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
}

// Custom logo: hexagon with action potential waveform
const Logo = () => {
  const bg = '#fcf9f4';
  const color = '#002FA7';
  const wavePath = "M1,18 L12,18 C12,18 12.5,1 13.5,1 C14.5,1 15,25 16.5,24.5 C17.5,24 19,18 20,18 L31,18";
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0" overflow="visible">
      {/* Hexagon — back layer, slightly faded */}
      <path
        d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      {/* Gap knock-out: background-colored halo punches through hexagon border */}
      <path d={wavePath} fill="none" stroke={bg} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Waveform — front layer, full color */}
      <path d={wavePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export function Header({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen, onLogoClick, onShowFamilyTree, onShowCompare, onShowBrightnessNetwork }: HeaderProps) {
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const tabButtonClass = (tab: ViewTab) =>
    `text-sm font-sans px-3 py-1.5 rounded-md ${activeTab === tab ? 'bg-klein text-white' : 'text-ink/70 hover:bg-surface-low'}`;

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
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-[12px]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Logo />
                <span className="text-lg font-bold text-klein">GEVI</span>
                <span className="text-lg font-bold text-ink">Bench</span>
              </button>
            </div>
          </div>

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

          <div className="flex items-center gap-2">
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
                className={`text-sm px-3 py-2 rounded-md text-left ${activeTab === 'database' ? 'bg-klein text-white' : 'text-ink/60'}`}
              >
                Database
              </button>
              <button
                onClick={() => { setActiveTab('methodology'); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left ${activeTab === 'methodology' ? 'bg-klein text-white' : 'text-ink/60'}`}
              >
                Methodology
              </button>
              <button
                onClick={() => { onShowCompare(); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left flex items-center gap-2 ${activeTab === 'tools' ? 'bg-klein text-white' : 'text-ink/60'}`}
              >
                <GitCompare className="w-4 h-4" />
                Compare
              </button>
              <button
                onClick={() => { onShowFamilyTree(); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left flex items-center gap-2 ${activeTab === 'tools' ? 'bg-klein text-white' : 'text-ink/60'}`}
              >
                <TreeDeciduous className="w-4 h-4" />
                Family Tree
              </button>
              <button
                onClick={() => { onShowBrightnessNetwork(); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left flex items-center gap-2 ${activeTab === 'tools' ? 'bg-klein text-white' : 'text-ink/60'}`}
              >
                <Share2 className="w-4 h-4" />
                Brightness Network
              </button>
              <button
                onClick={() => { setActiveTab('contact'); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left ${activeTab === 'contact' ? 'bg-klein text-white' : 'text-ink/60'}`}
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
