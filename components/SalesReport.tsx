
import React, { useState, useMemo } from 'react';
import NepaliDate from 'https://esm.sh/nepali-date-converter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Sale, Customer, Product, Currency, DateSystem } from '../types';
import { formatDualDate, getBSDisplay, formatFarmDate } from '../services/dateService';

interface SalesReportProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  currency: Currency;
  dateSystem: DateSystem;
  onBack?: () => void;
}

type SortField = 'date' | 'customer' | 'product' | 'qty' | 'amount';
type SortOrder = 'asc' | 'desc';

export const SalesReport: React.FC<SalesReportProps> = ({ sales, customers, products, currency, dateSystem, onBack }) => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('All');
  const [selectedProductId, setSelectedProductId] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return Array.from(set).sort();
  }, [products]);

  const filteredData = useMemo(() => {
    const startTs = new Date(startDate).setHours(0,0,0,0);
    const endTs = new Date(endDate).setHours(23,59,59,999);

    let result = sales.filter(s => {
      const matchesDate = s.date >= startTs && s.date <= endTs;
      const matchesCustomer = selectedCustomerId === 'All' || s.customerId === selectedCustomerId;
      const matchesProduct = selectedProductId === 'All' || s.productId === selectedProductId;
      const product = products.find(p => p.id === s.productId);
      const matchesCategory = selectedCategory === 'All' || product?.category === selectedCategory;
      return matchesDate && matchesCustomer && matchesProduct && matchesCategory;
    });

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'customer':
          valA = customers.find(c => c.id === a.customerId)?.name || '';
          valB = customers.find(c => c.id === b.customerId)?.name || '';
          break;
        case 'product':
          valA = products.find(p => p.id === a.productId)?.name || '';
          valB = products.find(p => p.id === b.productId)?.name || '';
          break;
        case 'qty':
          valA = a.quantity;
          valB = b.quantity;
          break;
        case 'amount':
          valA = a.totalAmount;
          valB = b.totalAmount;
          break;
        case 'date':
        default:
          valA = a.date;
          valB = b.date;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [sales, customers, products, startDate, endDate, selectedCustomerId, selectedProductId, selectedCategory, sortField, sortOrder]);

  const trendData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cursor = new Date(start);
    
    while (cursor <= end) {
      dailyMap[cursor.toISOString().split('T')[0]] = 0;
      cursor.setDate(cursor.getDate() + 1);
    }

    filteredData.forEach(s => {
      const dateKey = new Date(s.date).toISOString().split('T')[0];
      if (dailyMap.hasOwnProperty(dateKey)) {
        dailyMap[dateKey] += s.totalAmount;
      }
    });

    return Object.entries(dailyMap)
      .map(([date, amount]) => ({ 
        date, 
        amount,
        displayDate: dateSystem === 'BS' ? getBSDisplay(date).split(' ')[0] : date.slice(5) 
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData, dateSystem, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, s) => sum + s.totalAmount, 0);
    const avgDaily = trendData.length > 0 ? totalRevenue / trendData.length : 0;
    return {
      count: filteredData.length,
      revenue: totalRevenue,
      qty: filteredData.reduce((sum, s) => sum + s.quantity, 0),
      avgDaily
    };
  }, [filteredData, trendData]);

  const formatPrice = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ["Date (AD)", "Date (BS)", "Customer", "Product", "Category", "Quantity", "Unit", "Amount (" + currency.code + ")", "Status"];
    const rows = filteredData.map(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const product = products.find(p => p.id === s.productId);
      const date = new Date(s.date);
      let bsDate = "";
      try { bsDate = new NepaliDate(date).format('YYYY-MM-DD'); } catch (e) {}
      return [date.toISOString().split('T')[0], bsDate, customer?.name || "Retail", product?.name || "Unknown", product?.category || "N/A", s.quantity, product?.unit || "", s.totalAmount.toFixed(2), s.paymentStatus];
    });
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FarmTrack_Sales_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0c0a09] border border-[#1c1917] p-4 rounded-2xl shadow-3xl">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-lg font-black text-emerald-500">
            {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2 lg:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
           <h2 className="text-4xl font-black text-black dark:text-stone-100 tracking-tighter uppercase">Enterprise Sales Audit</h2>
           <p className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Data Intelligence & Reporting • {currency.code}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3"><span>Download CSV</span><span className="text-xl">📊</span></button>
          {onBack && <button onClick={onBack} className="bg-stone-100 dark:bg-stone-800 text-stone-500 p-4 rounded-2xl border-2 border-transparent hover:border-stone-200 transition-all">✕</button>}
        </div>
      </header>

      <section className="bg-white dark:bg-stone-900 p-8 rounded-[3rem] border border-stone-200 dark:border-stone-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Period From</label><input type="date" className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-xl px-4 py-3 font-black text-black dark:text-white outline-none focus:border-emerald-500" value={startDate} onChange={e => setStartDate(e.target.value)}/></div>
        <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Period To</label><input type="date" className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-xl px-4 py-3 font-black text-black dark:text-white outline-none focus:border-emerald-500" value={endDate} onChange={e => setEndDate(e.target.value)}/></div>
        <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Client Profile</label><select className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-xl px-4 py-3 font-black text-black dark:text-white outline-none appearance-none focus:border-emerald-500" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}><option value="All">All Customers</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Variety Asset</label><select className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-xl px-4 py-3 font-black text-black dark:text-white outline-none appearance-none focus:border-emerald-500" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}><option value="All">All Varieties</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Category</label><select className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-xl px-4 py-3 font-black text-black dark:text-white outline-none appearance-none focus:border-emerald-500" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}><option value="All">All Categories</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-8 rounded-[3rem] border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col min-h-[400px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Daily Revenue Performance</h3>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Revenue</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-rose-500 opacity-40"></span>
                    <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Average</span>
                 </div>
              </div>
           </div>
           <div className="flex-1 w-full min-h-0">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.08} />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} tickFormatter={(val) => `${currency.symbol}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#10b981', opacity: 0.04}} />
                    <ReferenceLine y={stats.avgDaily} stroke="#ef4444" strokeDasharray="5 5" opacity={0.3} />
                    <Bar dataKey="amount" radius={[8, 8, 2, 2]} barSize={24} animationDuration={1800}>
                      {trendData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.amount > 0 ? "#10b981" : "#e2e8f0"} 
                          fillOpacity={entry.amount > 0 ? 0.9 : 0.08} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20"><span className="text-4xl mb-4">📉</span><p className="text-[10px] font-black uppercase tracking-[0.5em]">No Data For Period</p></div>
              )}
           </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Scorecard label="Total Records" value={stats.count.toString()} icon="🔢" />
          <Scorecard label="Filtered Revenue" value={formatPrice(stats.revenue)} icon="💵" highlight />
          <Scorecard label="Avg Daily Order" value={formatPrice(stats.avgDaily)} icon="🎯" />
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[3rem] border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between"><h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Transaction Ledger</h3><span className="text-[8px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-3 py-1 rounded-full">Sorted By {sortField.toUpperCase()} ({sortOrder.toUpperCase()})</span></div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-stone-100 dark:divide-stone-800">
            <thead className="bg-stone-50/50 dark:bg-stone-950/50">
              <tr>
                <SortHeader label="Execution Date" field="date" activeField={sortField} order={sortOrder} onClick={toggleSort} />
                <SortHeader label="Customer" field="customer" activeField={sortField} order={sortOrder} onClick={toggleSort} />
                <SortHeader label="Product" field="product" activeField={sortField} order={sortOrder} onClick={toggleSort} />
                <SortHeader label="Quantity" field="qty" activeField={sortField} order={sortOrder} onClick={toggleSort} />
                <SortHeader label="Net Value" field="amount" activeField={sortField} order={sortOrder} onClick={toggleSort} alignment="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
              {filteredData.map(s => {
                const customer = customers.find(c => c.id === s.customerId);
                const product = products.find(p => p.id === s.productId);
                return (
                  <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="px-8 py-6"><span className="font-black text-xs text-black dark:text-stone-100 uppercase block">{formatDualDate(s.date)}</span></td>
                    <td className="px-8 py-6"><span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter block">{customer?.name || "Retail"}</span></td>
                    <td className="px-8 py-6"><span className="font-black text-[11px] text-black dark:text-stone-100 uppercase">{product?.name || "Unknown"}</span><span className="block text-[8px] text-stone-400 font-bold uppercase mt-0.5">{product?.category}</span></td>
                    <td className="px-8 py-6"><span className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-lg font-black text-[10px] text-stone-600 dark:text-stone-400 uppercase tracking-tight">{s.quantity} {product?.unit}</span></td>
                    <td className="px-8 py-6 text-right"><span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{formatPrice(s.totalAmount)}</span><span className={`block text-[8px] font-black uppercase tracking-widest mt-1 ${s.paymentStatus === 'Paid' ? 'text-emerald-500/60' : 'text-amber-500/60'}`}>{s.paymentStatus}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Scorecard: React.FC<{ label: string, value: string, icon: string, highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className={`p-6 rounded-[2.5rem] border transition-all hover:-translate-y-1 flex flex-col items-center text-center space-y-2 ${highlight ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl shadow-emerald-950/20' : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 shadow-sm'}`}>
    <span className="text-3xl leading-none mb-1">{icon}</span>
    <div><span className={`text-[9px] font-black uppercase tracking-widest block ${highlight ? 'text-emerald-100' : 'text-stone-400'}`}>{label}</span><p className="text-xl font-black tracking-tighter">{value}</p></div>
  </div>
);

const SortHeader: React.FC<{ label: string, field: SortField, activeField: SortField, order: SortOrder, onClick: (f: SortField) => void, alignment?: 'left' | 'right' | 'center' }> = ({ label, field, activeField, order, onClick, alignment = 'left' }) => {
  const isActive = activeField === field;
  return (<th className={`px-8 py-5 text-${alignment} cursor-pointer group transition-colors hover:bg-stone-100 dark:hover:bg-stone-800`} onClick={() => onClick(field)}><div className={`flex items-center gap-2 ${alignment === 'right' ? 'justify-end' : alignment === 'center' ? 'justify-center' : ''}`}><span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-emerald-600' : 'text-stone-400 group-hover:text-black dark:group-hover:text-white'}`}>{label}</span>{isActive && <span className="text-[10px] animate-in slide-in-from-top-1">{order === 'asc' ? '↑' : '↓'}</span>}</div></th>);
};
