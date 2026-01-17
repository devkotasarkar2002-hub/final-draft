
import React, { useState, useMemo } from 'react';
import NepaliDate from 'https://esm.sh/nepali-date-converter';
import { Expense, Liability, Currency, DateSystem } from '../types';
import { getBSDisplay, formatDualDate, bsToAdString } from '../services/dateService';

interface FinanceManagerProps {
  expenses: Expense[];
  liabilities: Liability[];
  onAddExpense: (exp: Expense) => void;
  onUpdateExpense: (exp: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddLiability: (lib: Liability) => void;
  onUpdateLiability: (lib: Liability) => void;
  onSettleLiability: (id: string) => void;
  currency: Currency;
  dateSystem: DateSystem;
}

const EXPENSE_CATEGORIES = [
  { id: 'seeds', label: 'Seeds & Planting', icon: '🌱', group: 'Operating' },
  { id: 'labor', label: 'Labor & Wages', icon: '👥', group: 'Operating' },
  { id: 'fertilizer', label: 'Chemicals & Fert.', icon: '🧪', group: 'Operating' },
  { id: 'fuel', label: 'Fuel & Energy', icon: '⛽', group: 'Operating' },
  { id: 'logistics', label: 'Logistics/Transport', icon: '🚚', group: 'Operating' },
  { id: 'equipment', label: 'Equipment Maint.', icon: '🔧', group: 'Capital' },
  { id: 'infra', label: 'Infrastructure', icon: '🏗️', group: 'Capital' },
  { id: 'tax', label: 'Tax & Compliance', icon: '⚖️', group: 'Admin' },
  { id: 'utility', label: 'Utilities', icon: '💧', group: 'Operating' },
  { id: 'other', label: 'Miscellaneous', icon: '📦', group: 'Other' },
];

type EntryMode = 'AD' | 'BS';
type FinanceTab = 'Operating' | 'Liabilities' | 'Audit';

export const FinanceManager: React.FC<FinanceManagerProps> = ({
  expenses,
  liabilities,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddLiability,
  onUpdateLiability,
  onSettleLiability,
  currency,
  dateSystem
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('Operating');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBS = new NepaliDate().format('YYYY-MM-DD');

  // Unified dashboard stats
  const summary = useMemo(() => {
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const activeLib = liabilities.filter(l => l.status === 'Active').reduce((s, l) => s + l.amount, 0);
    const settledLib = liabilities.filter(l => l.status === 'Settled').reduce((s, l) => s + l.amount, 0);
    const capEx = expenses.filter(e => {
        const cat = EXPENSE_CATEGORIES.find(c => c.label === e.category);
        return cat?.group === 'Capital';
    }).reduce((s, e) => s + e.amount, 0);

    return { totalExp, activeLib, settledLib, capEx };
  }, [expenses, liabilities]);

  // Form States
  const [entryMode, setEntryMode] = useState<EntryMode>(dateSystem);
  const [dateValue, setDateValue] = useState(dateSystem === 'BS' ? todayBS : todayStr);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Seeds & Planting');
  
  const [libSource, setLibSource] = useState('');
  const [libAmount, setLibAmount] = useState('');
  const [libInterest, setLibInterest] = useState('');
  const [libDueDate, setLibDueDate] = useState('');

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    
    let ts: number;
    try {
      ts = entryMode === 'BS' ? new NepaliDate(dateValue).toJsDate().getTime() : new Date(dateValue).getTime();
    } catch { ts = Date.now(); }

    onAddExpense({
      id: Date.now().toString(),
      description: desc,
      amount: Number(amount),
      category: category,
      date: ts
    });
    setDesc(''); setAmount(''); setDateValue(entryMode === 'BS' ? todayBS : todayStr);
  };

  const handleLiabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libSource || !libAmount) return;

    let ts: number;
    let dueTs: number;
    try {
      ts = entryMode === 'BS' ? new NepaliDate(dateValue).toJsDate().getTime() : new Date(dateValue).getTime();
      dueTs = libDueDate ? (entryMode === 'BS' ? new NepaliDate(libDueDate).toJsDate().getTime() : new Date(libDueDate).getTime()) : ts;
    } catch { ts = Date.now(); dueTs = Date.now(); }

    onAddLiability({
      id: Date.now().toString(),
      source: libSource,
      amount: Number(libAmount),
      interestRate: Number(libInterest) || 0,
      date: ts,
      dueDate: dueTs,
      status: 'Active'
    });
    setLibSource(''); setLibAmount(''); setLibInterest(''); setLibDueDate('');
  };

  const formatPrice = (v: number) => `${currency.symbol}${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-24 px-2 md:px-0">
      
      {/* ENTERPRISE FINANCIAL DASHBOARD */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <FinStat label="Total Burn (Costs)" value={formatPrice(summary.totalExp)} color="text-rose-500" icon="📉" />
        <FinStat label="Active Exposure" value={formatPrice(summary.activeLib)} color="text-amber-500" icon="🏛️" />
        <FinStat label="Capital Assets" value={formatPrice(summary.capEx)} color="text-blue-500" icon="🏗️" />
        <FinStat label="Debt Retired" value={formatPrice(summary.settledLib)} color="text-emerald-500" icon="✅" />
      </section>

      {/* PRIMARY NAVIGATION TABS */}
      <nav className="flex bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl md:rounded-[2rem] border border-stone-200 dark:border-stone-800">
        {(['Operating', 'Liabilities', 'Audit'] as FinanceTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-white dark:bg-stone-800 text-emerald-600 shadow-xl' : 'text-stone-400 hover:text-emerald-500'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Operating' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Expense Form */}
          <div className="lg:col-span-5">
             <form onSubmit={handleExpenseSubmit} className="bg-white dark:bg-stone-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-xl space-y-6">
                <header className="flex items-center justify-between">
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-black dark:text-white">Log Cost</h3>
                  <div className="flex bg-stone-50 dark:bg-stone-800 p-1 rounded-lg">
                    {(['AD', 'BS'] as EntryMode[]).map(m => (
                      <button key={m} type="button" onClick={() => { setEntryMode(m); setDateValue(m === 'BS' ? todayBS : todayStr); }} className={`px-3 py-1 rounded-md text-[8px] font-black transition-all ${entryMode === m ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-400'}`}>{m}</button>
                    ))}
                  </div>
                </header>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Date of Transaction</label>
                    <input type={entryMode === 'BS' ? 'text' : 'date'} required className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white focus:border-emerald-500 outline-none" value={dateValue} onChange={e => setDateValue(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Detail / Memo</label>
                    <input required className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white focus:border-emerald-500 outline-none" placeholder="e.g. Purchase of Organic Compost" value={desc} onChange={e => setDesc(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Amount ({currency.symbol})</label>
                      <input type="number" step="0.01" required className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-emerald-600 outline-none focus:border-emerald-500" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Category</label>
                      <select className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-4 py-4 font-black text-black dark:text-white outline-none appearance-none" value={category} onChange={e => setCategory(e.target.value)}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.label}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button className="w-full py-5 bg-black dark:bg-emerald-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] active:scale-95 shadow-2xl transition-all hover:bg-rose-600">Register Transaction</button>
             </form>
          </div>

          {/* Quick Category Insight */}
          <div className="lg:col-span-7 space-y-6">
             <div className="bg-white dark:bg-stone-900 p-8 rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-sm">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-6">Recent Outflow Ledger</h4>
                <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                   {expenses.length > 0 ? [...expenses].sort((a,b) => b.date - a.date).slice(0, 10).map(e => (
                     <div key={e.id} className="p-5 bg-stone-50 dark:bg-stone-800/40 rounded-[2rem] flex items-center justify-between border border-transparent hover:border-stone-200 dark:hover:border-stone-700 transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white dark:bg-stone-900 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                              {EXPENSE_CATEGORIES.find(cat => cat.label === e.category)?.icon || '💸'}
                           </div>
                           <div>
                              <p className="font-black text-sm text-black dark:text-stone-100 uppercase truncate max-w-[150px] md:max-w-none">{e.description}</p>
                              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">{e.category} • {formatDualDate(e.date)}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="font-black text-lg text-rose-500">{formatPrice(e.amount)}</span>
                           <button onClick={() => onDeleteExpense(e.id)} className="p-2 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-all">🗑️</button>
                        </div>
                     </div>
                   )) : (
                     <div className="py-20 text-center opacity-30"><p className="text-[10px] font-black uppercase tracking-widest">Awaiting First Cost Entry</p></div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Liabilities' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Liability Form */}
           <div className="lg:col-span-5">
              <form onSubmit={handleLiabilitySubmit} className="bg-stone-900 p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] border border-stone-800 shadow-3xl space-y-8">
                 <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">New Liability</h3>
                 <div className="space-y-5">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Lender / Financial Source</label>
                       <input required className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-6 py-4 font-black text-white focus:border-amber-500 outline-none" placeholder="e.g. Agricultural Development Bank" value={libSource} onChange={e => setLibSource(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Principal Amount</label>
                          <input type="number" required className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-6 py-4 font-black text-amber-500 outline-none" value={libAmount} onChange={e => setLibAmount(e.target.value)} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Interest % (Annual)</label>
                          <input type="number" step="0.1" className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-6 py-4 font-black text-white outline-none" value={libInterest} onChange={e => setLibInterest(e.target.value)} />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Maturity / Due Date</label>
                       <input type={entryMode === 'BS' ? 'text' : 'date'} className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-amber-500" value={libDueDate} onChange={e => setLibDueDate(e.target.value)} />
                    </div>
                 </div>
                 <button className="w-full py-5 bg-amber-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] active:scale-95 shadow-xl hover:bg-amber-500 transition-all">Establish Liability</button>
              </form>
           </div>

           {/* Active Debts Tracker */}
           <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-stone-900 p-6 md:p-10 rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-sm">
                 <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-8">Industrial Exposure Monitor</h4>
                 <div className="space-y-6">
                    {liabilities.length > 0 ? [...liabilities].sort((a,b) => a.status === 'Active' ? -1 : 1).map(l => (
                      <div key={l.id} className={`p-6 md:p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${l.status === 'Active' ? 'bg-amber-500/[0.03] border-amber-500/20' : 'bg-stone-50 dark:bg-stone-950 border-stone-100 dark:border-stone-800 opacity-60'}`}>
                         <div className="flex items-start justify-between relative z-10">
                            <div>
                               <p className="font-black text-lg md:text-xl text-black dark:text-stone-100 uppercase tracking-tighter leading-none mb-2">{l.source}</p>
                               <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${l.status === 'Active' ? 'bg-amber-500 text-white border-amber-500' : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200'}`}>{l.status}</span>
                            </div>
                            <div className="text-right">
                               <p className="text-2xl font-black text-black dark:text-white leading-none">{formatPrice(l.amount)}</p>
                               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">{l.interestRate}% Interest Yield</p>
                            </div>
                         </div>
                         <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div className="space-y-1">
                               <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Period Maturity</p>
                               <p className="text-xs font-black text-stone-600 dark:text-stone-300">{formatDualDate(l.dueDate)}</p>
                            </div>
                            {l.status === 'Active' && (
                              <button onClick={() => onSettleLiability(l.id)} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Settle Account</button>
                            )}
                         </div>
                         <div className="absolute -bottom-10 -right-10 text-9xl opacity-[0.02] pointer-events-none">{l.status === 'Active' ? '🏛️' : '⚖️'}</div>
                      </div>
                    )) : (
                      <div className="py-24 text-center opacity-30 flex flex-col items-center">
                        <span className="text-6xl mb-6">🏛️</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Active Liabilities</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'Audit' && (
        <div className="bg-white dark:bg-stone-900 rounded-[3rem] border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xl">
           <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-stone-400 uppercase tracking-[0.2em]">Comprehensive Financial Ledger</h3>
           </div>
           <div className="overflow-x-auto no-scrollbar">
              <table className="min-w-full divide-y divide-stone-100 dark:divide-stone-800">
                 <thead className="bg-stone-50 dark:bg-stone-950">
                    <tr>
                       <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Date/Log</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Category</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Description</th>
                       <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Amount</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {[...expenses, ...liabilities].sort((a,b) => b.date - a.date).map((item, idx) => {
                       const isExp = 'description' in item;
                       return (
                         <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                            <td className="px-8 py-6 whitespace-nowrap">
                               <span className="font-black text-xs text-black dark:text-stone-100 block">{formatDualDate(item.date)}</span>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                               <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${isExp ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                  {isExp ? item.category : 'Liability'}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                               <span className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase">{isExp ? item.description : `Loan from ${item.source}`}</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <span className={`font-black text-sm ${isExp ? 'text-rose-600' : 'text-amber-600'}`}>{formatPrice(item.amount)}</span>
                            </td>
                         </tr>
                       )
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

const FinStat: React.FC<{ label: string, value: string, color: string, icon: string }> = ({ label, value, color, icon }) => (
  <div className="bg-white dark:bg-stone-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col items-center text-center space-y-1.5 md:space-y-2 transition-transform hover:-translate-y-1">
     <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-lg md:text-xl shadow-inner mb-1">{icon}</div>
     <div>
        <p className="text-[7px] md:text-[9px] font-black text-stone-400 uppercase tracking-widest">{label}</p>
        <p className={`text-sm md:text-xl font-black tracking-tighter ${color}`}>{value}</p>
     </div>
  </div>
);
