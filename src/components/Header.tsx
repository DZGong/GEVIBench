import { Search, Beaker, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { ViewTab } from '../types';

interface HeaderProps {
  activeTab: ViewTab;
  setActiveTab: (v: ViewTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  onLogoClick: () => void;
}

// Custom logo: hexagon with action potential waveform
const Logo = ({ darkMode }: { darkMode: boolean }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
    {/* Hexagon */}
    <path
      d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
      fill="none"
      stroke={darkMode ? '#60a5fa' : '#1e40af'}
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    {/* Action potential waveform */}
    <path
      d="M2 16 L8 16 L10 10 L14 22 L18 8 L22 20 L26 16 L30 16"
      fill="none"
      stroke={darkMode ? '#60a5fa' : '#1e40af'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Header({ activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen, onLogoClick }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useTheme();

  const tabButtonClass = (tab: ViewTab) =>
    `text-sm px-3 py-1.5 rounded-md ${activeTab === tab ? 'bg-blue-900 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`;

  return (
    <header className={`sticky top-0 z-50 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Logo darkMode={darkMode} />
                <span className="text-lg font-bold text-blue-500">GEVI</span>
                <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Bench</span>
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            <button onClick={() => setActiveTab('database')} className={tabButtonClass('database')}>
              Database
            </button>
            <button onClick={() => setActiveTab('methodology')} className={`${tabButtonClass('methodology')} flex items-center gap-1`}>
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Methodology</span>
            </button>
            <button onClick={() => setActiveTab('contact')} className={`${tabButtonClass('contact')} flex items-center gap-1`}>
              <Beaker className="w-4 h-4" />
              <span className="hidden sm:inline">Contact</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-md ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pb-2">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setActiveTab('database'); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left ${activeTab === 'database' ? 'bg-blue-900 text-white' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Database
              </button>
              <button
                onClick={() => { setActiveTab('methodology'); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left ${activeTab === 'methodology' ? 'bg-blue-900 text-white' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Methodology
              </button>
              <button
                onClick={() => { setActiveTab('contact'); setMobileMenuOpen(false); }}
                className={`text-sm px-3 py-2 rounded-md text-left ${activeTab === 'contact' ? 'bg-blue-900 text-white' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Contact
              </button>
              <a href="#" className={`text-sm flex items-center gap-1 px-3 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                GitHub
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
