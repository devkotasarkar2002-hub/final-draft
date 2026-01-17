
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Sale, Customer, Product, Currency, Expense, Liability, DateSystem } from '../types';
import { formatFarmDate, getBSDisplay } from '../services/dateService';

interface DashboardProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  expenses: Expense[];
  liabilities: Liability[];
  currency: Currency;
  dateSystem: DateSystem;
  onNavigateToSales: () => void;
  onImportSales: (data: any[]) => void;
}

type RangePreset = 'Today' | 'Yesterday' | '7D' | '30D' | 'ALL';
type InventoryCategory = 'All' | 'Vegetables' | 'Fruits' | 'Dairy' | 'Grains' | 'General' | 'Service' | 'Other';
type PiePerspective = 'Assets' | 'Sales';

export const Dashboard: React.FC<DashboardProps> = ({ 
  sales, 
  customers, 
  products, 
  expenses, 
  liabilities, 
  currency, 
  dateSystem, 
  onNavigateToSales,
  onImportSales
}) => {
  const [rangePreset, setRangePreset] = useState<RangePreset>('7D');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory>('All');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [piePerspective, setPiePerspective] = useState<PiePerspective>('Assets');
  
  const [isVarietyDropdownOpen, setIsVarietyDropdownOpen] = useState(false);
  const [varietySearch, setVarietySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVarietyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeWindow = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let start = 0;
    let end = now.getTime();

    if (rangePreset === 'Today') {
      start = startOfToday;
    } else if (rangePreset === 'Yesterday') {
      start = startOfToday - 24 * 60 * 60 * 1000;
      end = startOfToday - 1;
    } else if (rangePreset === '7D') {
      start = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (rangePreset === '30D') {
      start = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else {
      const oldest = sales.length > 0 ? Math.min(...sales.map(s => s.date)) : Date.now() - 365 * 24 * 60 * 60 * 1000;
      start = oldest;
    }
    return { start, end };
  }, [rangePreset, sales]);

  const filteredSales = useMemo(() => {
    let result = sales.filter(s => s.date >= timeWindow.start && s.date <= timeWindow.end);
    
    if (categoryFilter !== 'All') {
      result = result.filter(s => {
        const product = products.find(p => p.id === s.productId);
        return product?.category === categoryFilter;
      });
    }

    if (selectedProductIds.length > 0) {
      const idSet = new Set(selectedProductIds);
      result = result.filter(s => idSet.has(s.productId));
    }

    return result;
  }, [sales, products, timeWindow, categoryFilter, selectedProductIds]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const filteredExpenses = expenses.filter(e => e.date >= timeWindow.start && e.date <= timeWindow.end);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0); 
    const filteredLiabilities = liabilities.filter(l => l.date >= timeWindow.start && l.date <= timeWindow.end);
    const activeLiabilities = filteredLiabilities.filter(l => l.status === 'Active').reduce((sum, l) => sum + l.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const bcRatio = totalExpenses > 0 ? totalRevenue / totalExpenses : (totalRevenue > 0 ? totalRevenue : 0);
    return { totalRevenue, totalExpenses, activeLiabilities, netProfit, bcRatio };
  }, [filteredSales, expenses, liabilities, timeWindow]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    const startDate = new Date(timeWindow.start);
    const endDate = new Date(timeWindow.end);
    const cursor = new Date(startDate);
    
    let iterations = 0;
    while (cursor <= endDate && iterations < 365) {
      const dayKey = cursor.toISOString().split('T')[0];
      dailyMap[dayKey] = 0;
      cursor.setDate(cursor.getDate() + 1);
      iterations++;
    }

    filteredSales.forEach(s => {
      const dayKey = new Date(s.date).toISOString().split('T')[0];
      if (dailyMap.hasOwnProperty(dayKey)) {
        dailyMap[dayKey] += s.totalAmount;
      }
    });

    return Object.entries(dailyMap)
      .map(([date, value]) => {
        let displayLabel = "";
        if (rangePreset === 'Today' || rangePreset === 'Yesterday') {
           displayLabel = new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
           displayLabel = dateSystem === 'BS' ? getBSDisplay(date).split(' ')[0] : date.slice(5);
        }
        return { name: displayLabel, fullDate: date, value };
      })
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [filteredSales, timeWindow, dateSystem, rangePreset]);

  const pieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    if (piePerspective === 'Assets') {
      products.forEach(p => {
        catMap[p.category] = (catMap[p.category] || 0) + (p.currentStock * p.basePrice);
      });
    } else {
      filteredSales.forEach(s => {
        const product = products.find(p => p.id === s.productId);
        const cat = product?.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + s.totalAmount;
      });
    }
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [products, filteredSales, piePerspective]);

  const totalAllocationValue = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const formatPrice = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert("CSV is empty or missing headers.");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      
      const findIdx = (keywords: string[]) => headers.findIndex(h => 
        keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
      );

      const dateAdIdx = findIdx(['date (ad)', 'date ad', 'ad date']);
      const customerIdx = findIdx(['customer', 'client']);
      const productIdx = findIdx(['product', 'item', 'mushrom']);
      const categoryIdx = findIdx(['category']);
      const quantityIdx = findIdx(['quantity', 'qty']);
      const unitIdx = findIdx(['unit']);
      const amountIdx = findIdx(['amount', 'price', 'npr']);
      const statusIdx = findIdx(['status', 'payment']);

      if (dateAdIdx === -1 || customerIdx === -1 || productIdx === -1 || amountIdx === -1) {
        alert("Required columns (Date AD, Customer, Product, Amount) not found. Please ensure headers match the system format.");
        return;
      }

      const parsedRows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        return {
          DateAD: cols[dateAdIdx],
          Customer: cols[customerIdx],
          Product: cols[productIdx],
          Category: categoryIdx !== -1 ? cols[categoryIdx] : 'Other',
          Quantity: quantityIdx !== -1 ? Number(cols[quantityIdx]) : 1,
          Unit: unitIdx !== -1 ? cols[unitIdx] : 'kg',
          Amount: Number(cols[amountIdx]),
          Status: statusIdx !== -1 ? cols[statusIdx] : 'Paid'
        };
      }).filter(r => r.Customer && r.Product && !isNaN(r.Amount));

      if (parsedRows.length > 0) {
        onImportSales(parsedRows);
      } else {
        alert("No valid rows found in CSV. Check if numeric fields are valid.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const availableProducts = products.filter(p => categoryFilter === 'All' || p.category === categoryFilter);
  const searchedProducts = availableProducts.filter(p => p.name.toLowerCase().includes(varietySearch.toLowerCase()));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {formatPrice(payload[0].value)}
          </p>
          <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Revenue Status</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const AllocationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = ((data.value / totalAllocationValue) * 100).toFixed(1);
      return (
        <div className="bg-[#0c0a09] p-4 rounded-2xl border border-stone-800 shadow-2xl animate-in fade-in zoom-in-95">
           <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">{data.name}</p>
           <p className="text-lg font-black text-white">{formatPrice(data.value)}</p>
           <div className="mt-2 pt-2 border-t border-stone-800 flex items-center justify-between gap-4">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Portfolio Share</span>
              <span className="text-[10px] font-black text-white">{percent}%</span>
           </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative pb-12">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-black text-black dark:text-stone-100 tracking-tight uppercase">Intelligence Dashboard</h2>
          <p className="text-[8px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest">Performance Metrics • {currency.name}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white dark:bg-stone-900 p-1 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
             {(['Today', 'Yesterday', '7D', '30D', 'ALL'] as RangePreset[]).map((preset) => (
               <button
                 key={preset}
                 onClick={() => setRangePreset(preset)}
                 className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all ${
                   rangePreset === preset ? 'bg-black dark:bg-emerald-600 text-white shadow-md' : 'text-stone-500 hover:text-black dark:hover:text-stone-200'
                 }`}
               >
                 {preset}
               </button>
             ))}
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[7px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-2 border border-emerald-500/20"
          >
            <span>Bulk Upload Ledger</span>
            <span className="text-sm">📂</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />

          <select 
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as InventoryCategory);
              setSelectedProductIds([]);
            }}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2 rounded-xl text-[7px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 appearance-none"
          >
            <option value="All">All Categories</option>
            {['Vegetables', 'Fruits', 'Dairy', 'Grains', 'General', 'Service', 'Other'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsVarietyDropdownOpen(!isVarietyDropdownOpen)}
              className="flex items-center gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2 rounded-xl text-[7px] font-black uppercase tracking-widest outline-none hover:border-emerald-500 transition-colors"
            >
              <span>{selectedProductIds.length === 0 ? 'All Varieties' : `${selectedProductIds.length} Selected`}</span>
              <span className={`transition-transform duration-300 ${isVarietyDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isVarietyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-stone-500">Pick Varieties (Max 30)</span>
                  <span className={`text-[8px] font-black uppercase ${selectedProductIds.length >= 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {selectedProductIds.length}/30
                  </span>
                </div>
                <input 
                  type="text"
                  placeholder="Search Varieties..."
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-emerald-500"
                  value={varietySearch}
                  onChange={e => setVarietySearch(e.target.value)}
                  autoFocus
                />
                <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1">
                  {searchedProducts.map(prod => {
                    const isSelected = selectedProductIds.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProductIds(prev => prev.filter(id => id !== prod.id));
                          } else if (selectedProductIds.length < 30) {
                            setSelectedProductIds(prev => [...prev, prod.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                          isSelected 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-md border-2 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300 dark:border-stone-700'}`}></div>
                          <span className="text-[9px] font-black uppercase tracking-tight">{prod.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard title="Revenue" value={formatPrice(stats.totalRevenue)} icon="💎" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400" context={rangePreset === 'ALL' ? 'Lifetime' : `${rangePreset} Total`} />
        <StatCard title="Net Profit" value={formatPrice(stats.netProfit)} icon="💰" color="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400" context={stats.netProfit >= 0 ? 'Surplus' : 'Deficit'} />
        <StatCard title="Efficiency" value={stats.bcRatio.toFixed(2)} icon="📈" color="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400" context="Revenue/Cost" />
        <StatCard title="Debt Flow" value={formatPrice(stats.activeLiabilities)} icon="🏛️" color="bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400" context="New Liabilities" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col min-h-[350px]">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400">Revenue Flow Analysis</h3>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[7px] font-black uppercase text-stone-500 tracking-widest">Growth Curve</span>
               </div>
               <span className="text-[7px] font-black uppercase text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                 {selectedProductIds.length === 0 ? 'Consolidated' : `Targeted (${selectedProductIds.length})`}
               </span>
             </div>
           </div>
           <div className="flex-1 w-full min-h-0">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.08} />
                   <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 7, fontWeight: 800, fill: '#94a3b8'}}
                      dy={10}
                      padding={{ left: 10, right: 10 }}
                   />
                   <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 7, fontWeight: 800, fill: '#94a3b8'}}
                      tickFormatter={(val) => `${currency.symbol}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                   />
                   <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                   <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={3.5} 
                      fillOpacity={1} 
                      fill="url(#colorValue)"
                      animationDuration={2000}
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2, shadow: '0 0 10px rgba(16,185,129,0.5)' }}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center opacity-30">
                 <span className="text-3xl mb-2">📉</span>
                 <p className="text-[7px] font-black uppercase tracking-widest text-stone-500">Awaiting Transaction Data</p>
               </div>
             )}
           </div>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col min-h-[450px]">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400">Asset Allocation</h3>
             <div className="flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
               <button onClick={() => setPiePerspective('Assets')} className={`px-3 py-1 rounded-md text-[7px] font-black uppercase transition-all ${piePerspective === 'Assets' ? 'bg-white dark:bg-stone-900 text-emerald-500 shadow-sm' : 'text-stone-500'}`}>Value</button>
               <button onClick={() => setPiePerspective('Sales')} className={`px-3 py-1 rounded-md text-[7px] font-black uppercase transition-all ${piePerspective === 'Sales' ? 'bg-white dark:bg-stone-900 text-emerald-500 shadow-sm' : 'text-stone-500'}`}>Sales</button>
             </div>
           </div>

           <div className="flex-1 relative min-h-[220px]">
              {pieData.length > 0 ? (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                     <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Total</span>
                     <span className="text-lg font-black text-stone-900 dark:text-stone-100 tracking-tighter">{formatPrice(totalAllocationValue)}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={65} 
                        outerRadius={90} 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none"
                        animationDuration={1500}
                        animationBegin={0}
                      >
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<AllocationTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30"><span className="text-3xl mb-2">⭕</span><p className="text-[7px] font-black uppercase tracking-widest">No Category Data</p></div>
              )}
           </div>

           {pieData.length > 0 && (
             <div className="mt-4 space-y-2 border-t border-stone-50 dark:border-stone-800 pt-4">
               <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-3">Top Performers</p>
               {pieData.slice(0, 3).map((item, idx) => (
                 <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                       <span className="text-[9px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-tight">{item.name}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-black text-stone-900 dark:text-stone-100">{formatPrice(item.value)}</span>
                       <span className="text-[7px] font-bold text-emerald-500 ml-2">{((item.value / totalAllocationValue) * 100).toFixed(0)}%</span>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      <button onClick={onNavigateToSales} className="fixed bottom-20 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center text-3xl shadow-[0_15px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-500 transition-all hover:scale-110 active:scale-90 z-40 border-4 border-white dark:border-stone-900 animate-in fade-in slide-in-from-bottom-4 duration-500"><span className="leading-none mt-[-2px]">+</span></button>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string, context?: string }> = ({ title, value, icon, color, context }) => (
  <div className="p-4 rounded-[1.5rem] flex flex-col items-start space-y-2 shadow-sm border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 transition-all hover:shadow-md hover:-translate-y-0.5">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg ${color} shadow-inner`}>{icon}</div>
    <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-[7px] font-black uppercase text-stone-400 tracking-[0.1em] mb-0.5">{title}</p>{context && <span className="text-[6px] font-bold text-stone-400/60 uppercase tracking-tighter mb-0.5">{context}</span>}</div><p className="text-[13px] font-black text-black dark:text-stone-100 truncate tracking-tight">{value}</p></div>
  </div>
);
