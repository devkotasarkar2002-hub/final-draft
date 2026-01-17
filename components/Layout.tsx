import React, { useState, useEffect } from 'react';
import { SaveStatus } from '../App';
import { DateSystem } from '../types';
import { formatBSFullDateTime } from '../services/dateService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuit?: () => void;
  saveStatus?: SaveStatus;
  dateSystem?: DateSystem;
  setDateSystem?: (system: DateSystem) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab,
  onQuit,
  saveStatus = 'idle',
  dateSystem = 'BS',
  setDateSystem
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'products', label: 'Catalog', icon: '🚜' },
    { id: 'report', label: 'Reports', icon: '📉' },
    { id: 'stock', label: 'Stock', icon: '📦' },
    { id: 'finance', label: 'Finance', icon: '💸' },
    { id: 'balance', label: 'Balance', icon: '📋' },
    { id: 'customers', label: 'Clients', icon: '👥' },
    { id: 'insights', label: 'AI Intelligence', icon: '✨' },
    { id: 'settings', label: 'System', icon: '⚙️' },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  const handleToggleDateSystem = () => {
    if (setDateSystem) {
      setDateSystem(dateSystem === 'BS' ? 'AD' : 'BS');
    }
  };

  const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Menu';

  const clockDisplay = dateSystem === 'BS' 
    ? formatBSFullDateTime(currentTime)
    : currentTime.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' AD';

  const quickNavTabs = tabs.filter(t => ['dashboard', 'sales', 'billing', 'products', 'report', 'customers'].includes(t.id));

  return (
    <div className="min-h-screen flex flex-col relative bg-white dark:bg-stone-950 selection:bg-emerald-100 selection:text-emerald-900">
      <header className="flex-shrink-0 z-40 bg-white/80 dark:bg-emerald-950/80 backdrop-blur-xl text-black dark:text-white shadow-sm transition-colors border-b border-stone-200 dark:border-emerald-800/50 flex flex-col justify-center py-1 min-h-[4.5rem] sticky top-0">
        
        {/* Centered Interactive Date-Time Toggler */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <button 
            onClick={handleToggleDateSystem}
            className="flex items-center space-x-2 bg-stone-100/80 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 px-4 py-1 rounded-full border border-stone-200 dark:border-emerald-700/50 transition-all group active:scale-95"
            title={`Switch to ${dateSystem === 'BS' ? 'AD' : 'BS'}`}
          >
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-mono">
              {clockDisplay}
            </span>
            <span className="text-[10px] opacity-40 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-500">
              🔄
            </span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 w-full h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
               {activeTab !== 'dashboard' && (
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 hover:bg-stone-50 dark:hover:bg-emerald-800/50 rounded-xl transition-all border border-stone-100 dark:border-stone-800 bg-white dark:bg-emerald-900/20"
                >
                  <span className="text-lg leading-none">←</span>
                </button>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-lg md:text-xl shadow-lg shadow-emerald-500/20">🌱</div>
                <div className="hidden sm:flex flex-col">
                  <h1 className="text-lg font-black tracking-tighter uppercase leading-none text-black dark:text-white">FarmTrack</h1>
                  <div className="mt-0.5 flex items-center space-x-2">
                    <span className="text-[6px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Enterprise Edition</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <nav className="hidden lg:flex space-x-0.5">
                {tabs.slice(0, 5).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleNavClick(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                      activeTab === tab.id 
                        ? 'bg-emerald-600 text-white shadow-lg' 
                        : 'text-stone-500 hover:text-emerald-600 dark:text-emerald-100/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>

              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 rounded-xl bg-stone-900 dark:bg-emerald-800/80 text-white transition-all shadow-xl active:scale-95 flex items-center space-x-2"
              >
                <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">{currentTabLabel}</span>
                <div className="space-y-1 w-5">
                  <span className={`block h-0.5 w-full bg-white transition-all ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                  <span className={`block h-0.5 w-full bg-white transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                  <span className={`block h-0.5 w-full bg-white transition-all ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Quick Nav */}
      <div className="lg:hidden sticky bottom-0 z-50 bg-white/90 dark:bg-stone-950/90 backdrop-blur-xl border-t border-stone-100 dark:border-stone-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          {quickNavTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`flex flex-col items-center space-y-0.5 ${activeTab === tab.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isMenuOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-stone-950/40 backdrop-blur-xl transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsMenuOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-72 bg-white dark:bg-stone-950 shadow-3xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <h2 className="font-black text-lg uppercase tracking-tighter dark:text-white">Management</h2>
            <button onClick={() => setIsMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-400 hover:text-rose-500 transition-colors">✕</button>
          </div>
          <nav className="p-6 space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                className={`w-full flex items-center space-x-4 px-5 py-3 rounded-2xl text-left transition-all ${
                  activeTab === tab.id 
                    ? 'bg-emerald-600 text-white shadow-xl' 
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[9px] uppercase font-black tracking-widest">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-8 space-y-3">
            <button onClick={() => { setIsMenuOpen(false); onQuit?.(); }} className="w-full py-4 rounded-xl text-rose-500 hover:bg-rose-950/20 font-black border-2 border-rose-100 dark:border-rose-900/30 uppercase tracking-widest text-[8px] transition-all">
              Terminate Session
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
};