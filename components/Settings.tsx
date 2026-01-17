
import React, { useState, useRef } from 'react';
import { CurrencyCode, Currency, SUPPORTED_CURRENCIES, DateSystem } from '../types';
import { ThemeMode } from '../App';

interface SettingsProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  currencyCode: CurrencyCode;
  setCurrencyCode: (code: CurrencyCode) => void;
  customCurrency: Currency | null;
  setCustomCurrency: (currency: Currency | null) => void;
  dateSystem: DateSystem;
  setDateSystem: (system: DateSystem) => void;
  masterState: any;
  onMasterRestore: (data: any) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  themeMode,
  setThemeMode,
  currencyCode,
  setCurrencyCode,
  customCurrency,
  setCustomCurrency,
  dateSystem,
  setDateSystem,
  masterState,
  onMasterRestore
}) => {
  const [showCustomForm, setShowCustomForm] = useState(currencyCode === 'CUSTOM');
  const [tempCode, setTempCode] = useState(customCurrency?.code || '');
  const [tempSymbol, setTempSymbol] = useState(customCurrency?.symbol || '');
  const [tempName, setTempName] = useState(customCurrency?.name || '');
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleSaveCustom = () => {
    if (!tempCode || !tempSymbol || !tempName) return;
    const newCustom: Currency = { code: tempCode.toUpperCase(), symbol: tempSymbol, name: tempName };
    setCustomCurrency(newCustom);
    setCurrencyCode('CUSTOM');
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(masterState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `FarmTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("This will replace all current data. Are you sure you want to restore this backup?")) {
          onMasterRestore(data);
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-2">
      <header>
        <h2 className="text-3xl font-black text-black dark:text-stone-100 tracking-tight">Preferences</h2>
        <p className="text-stone-600 dark:text-stone-400 mt-1 font-bold">Localization and interface management.</p>
      </header>

      <div className="space-y-8">
        <section className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">🛡️</div>
            <div>
              <h3 className="text-xl font-black text-black dark:text-stone-100">Enterprise Data Node</h3>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Backup & Continuity</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button onClick={handleExportBackup} className="p-6 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-500 transition-all flex flex-col items-center gap-3 group">
                <span className="text-3xl group-hover:scale-110 transition-transform">💾</span>
                <div className="text-center">
                   <span className="block font-black text-[10px] uppercase tracking-widest text-black dark:text-white">Export Master Data</span>
                   <span className="text-[8px] text-stone-400 uppercase font-bold">Catalogue, Sales & Ledger</span>
                </div>
             </button>
             <button onClick={() => restoreInputRef.current?.click()} className="p-6 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-500 transition-all flex flex-col items-center gap-3 group">
                <span className="text-3xl group-hover:scale-110 transition-transform">📂</span>
                <div className="text-center">
                   <span className="block font-black text-[10px] uppercase tracking-widest text-black dark:text-white">Restore Session</span>
                   <span className="text-[8px] text-stone-400 uppercase font-bold">Import enterprise state</span>
                </div>
                <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestoreBackup} />
             </button>
          </div>
        </section>

        <section className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🌗</div>
            <div><h3 className="text-xl font-black text-black dark:text-stone-100">Interface Theme</h3><p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Global Style</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ThemeButton label="Light Mode" icon="☀️" isActive={themeMode === 'light'} onClick={() => setThemeMode('light')} styleClass={themeMode === 'light' ? 'bg-emerald-50 border-emerald-500 text-black' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-transparent text-black'}/>
            <ThemeButton label="Dark Mode" icon="🌙" isActive={themeMode === 'dark'} onClick={() => setThemeMode('dark')} styleClass={themeMode === 'dark' ? 'bg-stone-800 border-emerald-500 text-white' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-transparent text-black'}/>
            <ThemeButton label="Sync System" icon="🖥️" isActive={themeMode === 'system'} onClick={() => setThemeMode('system')} styleClass={themeMode === 'system' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-black dark:text-emerald-400' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-transparent text-black'}/>
          </div>
        </section>

        <section className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📅</div>
            <div><h3 className="text-xl font-black text-black dark:text-stone-100">Calendar System</h3><p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Date Visualization</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setDateSystem('AD')} className={`flex items-center space-x-4 p-6 rounded-2xl border-2 transition-all ${dateSystem === 'AD' ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-black dark:text-amber-400' : 'border-stone-100 dark:border-stone-800 text-stone-400'}`}><span className="text-2xl">🌎</span><div className="text-left"><span className="block font-black text-sm uppercase tracking-widest">Anno Domini (AD)</span><span className="text-[10px] opacity-60">International standard Gregorian calendar.</span></div></button>
            <button onClick={() => setDateSystem('BS')} className={`flex items-center space-x-4 p-6 rounded-2xl border-2 transition-all ${dateSystem === 'BS' ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-black dark:text-amber-400' : 'border-stone-100 dark:border-stone-800 text-stone-400'}`}><span className="text-2xl">🇳🇵</span><div className="text-left"><span className="block font-black text-sm uppercase tracking-widest">Bikram Sambat (BS)</span><span className="text-[10px] opacity-60">Nepali national calendar system.</span></div></button>
          </div>
        </section>

        <section className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🌍</div>
            <div><h3 className="text-xl font-black text-black dark:text-stone-100">Local Currency</h3><p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Financial Context</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
            {SUPPORTED_CURRENCIES.map((currency) => (
              <button key={currency.code} onClick={() => { setCurrencyCode(currency.code as CurrencyCode); setShowCustomForm(false); }} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${currencyCode === currency.code ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-black dark:text-emerald-400 shadow-xl ring-2 ring-emerald-500/10' : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-emerald-400 dark:hover:border-stone-700 text-black dark:text-stone-400 shadow-sm'}`}><span className="text-2xl font-black mb-1 opacity-80 group-hover:scale-110 transition-transform">{currency.symbol}</span><span className="text-[10px] font-black uppercase tracking-widest">{currency.code}</span></button>
            ))}
            <button onClick={() => setShowCustomForm(true)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currencyCode === 'CUSTOM' || showCustomForm ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-black dark:text-emerald-400 shadow-xl ring-2 ring-emerald-500/10' : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-emerald-400 dark:hover:border-stone-700 text-black dark:text-stone-400 shadow-sm'}`}><span className="text-2xl mb-1">➕</span><span className="text-[10px] font-black uppercase tracking-widest">Custom</span></button>
          </div>
          {showCustomForm && (
            <div className="bg-stone-50 dark:bg-stone-800/40 p-8 rounded-[2rem] border-2 border-dashed border-stone-200 dark:border-stone-700 animate-in fade-in slide-in-from-top-4 duration-300">
              <h4 className="text-sm font-black text-black dark:text-stone-100 uppercase tracking-widest mb-6 flex items-center">Define Custom Localization</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Currency Code</label><input className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 font-bold text-sm uppercase text-black dark:text-white" placeholder="e.g. NPR" maxLength={5} value={tempCode} onChange={e => setTempCode(e.target.value)}/></div>
                <div><label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Symbol</label><input className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 font-bold text-sm text-black dark:text-white" placeholder="e.g. ₨" value={tempSymbol} onChange={e => setTempSymbol(e.target.value)}/></div>
                <div><label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Full Name</label><input className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 font-bold text-sm text-black dark:text-white" placeholder="e.g. Nepalese Rupee" value={tempName} onChange={e => setTempName(e.target.value)}/></div>
              </div>
              <button onClick={handleSaveCustom} className="mt-6 w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Apply Custom Currency</button>
            </div>
          )}
        </section>

        <div className="p-8 bg-emerald-700 rounded-[2.5rem] text-white shadow-2xl overflow-hidden relative group">
           <div className="relative z-10 flex items-center justify-between">
              <div className="max-w-md"><h4 className="font-black text-xl mb-2 tracking-tight">Security & Backups</h4><p className="text-emerald-100 text-sm font-medium leading-relaxed">FarmTrack stores all your data locally on this device. For maximum safety, avoid clearing browser storage or using Master Data Export for external sessions.</p></div>
              <div className="hidden md:block text-7xl transition-transform group-hover:scale-110 group-hover:rotate-12 duration-500 opacity-30">💾</div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ThemeButton: React.FC<{ label: string, icon: string, isActive: boolean, onClick: () => void, styleClass: string }> = ({ label, icon, isActive, onClick, styleClass }) => (
  <button onClick={onClick} className={`w-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 group ${styleClass} ${isActive ? 'scale-105 shadow-xl ring-4 ring-emerald-500/10' : 'hover:bg-stone-50 dark:hover:bg-stone-700'}`}><span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{icon}</span><span className="font-black text-[10px] uppercase tracking-widest">{label}</span></button>
);
