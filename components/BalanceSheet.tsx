
import React, { useMemo, useState } from 'react';
import { Sale, Expense, Liability, Product, Currency, DateSystem } from '../types';
import { getBSDisplay } from '../services/dateService';

interface BalanceSheetProps {
  sales: Sale[];
  expenses: Expense[];
  liabilities: Liability[];
  products: Product[];
  currency: Currency;
  dateSystem: DateSystem;
}

export const BalanceSheet: React.FC<BalanceSheetProps> = ({ sales, expenses, liabilities, products, currency, dateSystem }) => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const financialData = useMemo(() => {
    const startTs = new Date(startDate).setHours(0,0,0,0);
    const endTs = new Date(endDate).setHours(23,59,59,999);

    const filteredSales = sales.filter(s => s.date >= startTs && s.date <= endTs);
    const filteredExpenses = expenses.filter(e => e.date >= startTs && e.date <= endTs);
    const filteredLiabilities = liabilities.filter(l => (l.date || l.dueDate) >= startTs && (l.date || l.dueDate) <= endTs);

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const activeLiabilities = filteredLiabilities.filter(l => l.status === 'Active').reduce((sum, l) => sum + l.amount, 0);
    
    const bcRatio = totalExpenses > 0 ? totalRevenue / totalExpenses : (totalRevenue > 0 ? 99 : 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Inventory is usually "current" value, not filtered by date, but we use the filtered products context if needed
    const stockValue = products.reduce((sum, p) => sum + (p.currentStock * p.basePrice), 0);
    
    const revenuePaid = filteredSales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + s.totalAmount, 0);
    const accountsReceivable = filteredSales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.totalAmount, 0);
    
    // Categorized Expenses
    const expenseBreakdown = filteredExpenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      totalExpenses,
      activeLiabilities,
      bcRatio,
      netProfit,
      stockValue,
      revenuePaid,
      accountsReceivable,
      expenseBreakdown,
      totalAssets: revenuePaid + accountsReceivable + stockValue,
      totalLiabilitiesAndEquity: totalExpenses + activeLiabilities + netProfit
    };
  }, [sales, expenses, liabilities, products, startDate, endDate]);

  const formatPrice = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getHealthStatus = () => {
    if (financialData.bcRatio > 2) return { label: 'Highly Profitable', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (financialData.bcRatio >= 1) return { label: 'Sustainable', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    if (financialData.totalRevenue === 0 && financialData.totalExpenses === 0) return { label: 'No Activity', color: 'text-stone-400', bg: 'bg-stone-100' };
    return { label: 'Loss Warning', color: 'text-rose-500', bg: 'bg-rose-500/10' };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-6xl mx-auto pb-24 px-1">
      {/* PROFESSIONAL HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📊</div>
             <div>
                <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">Financial Statement</h2>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mt-1">Audit-Ready Performance Report</p>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-50 dark:bg-stone-800/50 p-3 rounded-3xl border border-stone-100 dark:border-stone-800">
          <DateFilterBox label="Report Start" value={startDate} onChange={setStartDate} system={dateSystem} />
          <div className="hidden sm:block text-stone-300">→</div>
          <DateFilterBox label="Report End" value={endDate} onChange={setEndDate} system={dateSystem} />
        </div>
      </header>

      {/* EXECUTIVE SCORECARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Profitability (BCR)" 
          value={financialData.bcRatio.toFixed(2)} 
          subValue={health.label}
          subColor={health.color}
          icon="📈" 
          description="Revenue vs Costs Ratio. Above 1.0 means you're making money."
        />
        <MetricCard 
          title="Net Surplus" 
          value={formatPrice(financialData.netProfit)} 
          icon="💰" 
          description="Your actual take-home earnings after all period costs."
          valueColor={financialData.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}
        />
        <MetricCard 
          title="Cash on Hand" 
          value={formatPrice(financialData.revenuePaid)} 
          icon="🏦" 
          description="Cleared payments currently available in your vault/bank."
        />
        <MetricCard 
          title="Locked Capital" 
          value={formatPrice(financialData.stockValue)} 
          icon="📦" 
          description="Value of current items in stock waiting to be sold."
        />
      </div>

      {/* THE BALANCE SHEET */}
      <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-100 dark:divide-stone-800">
          
          {/* ASSETS SECTION */}
          <div className="p-8 md:p-12 space-y-10">
            <header className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight flex items-center">
                <span className="w-4 h-4 bg-emerald-500 rounded-full mr-4 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span> Assets
              </h3>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-100 dark:bg-stone-900 px-3 py-1 rounded-full">Current Value</span>
            </header>

            <div className="space-y-8">
              <div className="space-y-4">
                <FinancialRow 
                  label="Liquid Cash" 
                  description="Money already collected from sales" 
                  value={formatPrice(financialData.revenuePaid)} 
                />
                <FinancialRow 
                  label="Accounts Receivable" 
                  description="Money clients owe you for delivered goods" 
                  value={formatPrice(financialData.accountsReceivable)} 
                  color="text-amber-500"
                />
                <FinancialRow 
                  label="Inventory Asset" 
                  description="Market value of unsold warehouse items" 
                  value={formatPrice(financialData.stockValue)} 
                />
              </div>

              <div className="pt-8 border-t-2 border-stone-100 dark:border-stone-800 flex justify-between items-center">
                <div>
                  <span className="font-black text-black dark:text-white uppercase text-base">Total Farm Assets</span>
                  <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-1">Sum of cash, debts, and stock</p>
                </div>
                <span className="font-black text-black dark:text-white text-3xl tracking-tighter">{formatPrice(financialData.totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* LIABILITIES & BREAKDOWN SECTION */}
          <div className="p-8 md:p-12 space-y-10 bg-stone-50/30 dark:bg-stone-900/40">
            <header className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight flex items-center">
                <span className="w-4 h-4 bg-rose-500 rounded-full mr-4 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span> Costs & Equity
              </h3>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-100 dark:bg-stone-900 px-3 py-1 rounded-full">Period Total</span>
            </header>

            <div className="space-y-8">
              <div className="space-y-6">
                 {/* Expense Breakdown */}
                 <div className="space-y-3">
                   <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Operating Expenditure</p>
                   {Object.keys(financialData.expenseBreakdown).length > 0 ? Object.entries(financialData.expenseBreakdown).map(([cat, amt]) => (
                     <div key={cat} className="flex justify-between items-center px-4 py-2 bg-white dark:bg-stone-800/40 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm">
                        <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase">{cat}</span>
                        {/* Fix: cast 'amt' to number to resolve 'unknown' to 'number' assignment error in formatPrice call */}
                        <span className="text-[12px] font-black text-rose-500">{formatPrice(amt as number)}</span>
                     </div>
                   )) : (
                     <p className="text-[10px] italic text-stone-400 ml-1">No categorized expenses in this period.</p>
                   )}
                 </div>

                 <FinancialRow 
                  label="Outstanding Liabilities" 
                  description="Unsettled loans or debts logged" 
                  value={formatPrice(financialData.activeLiabilities)} 
                  color="text-rose-500"
                />
              </div>

              <div className="pt-8 border-t-2 border-stone-100 dark:border-stone-800 flex justify-between items-center">
                 <div>
                   <span className="font-black text-black dark:text-white uppercase text-base">Capital & Liabilities</span>
                   <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-1">Balance of equity and debts</p>
                 </div>
                 <span className="font-black text-black dark:text-white text-3xl tracking-tighter">
                   {formatPrice(financialData.totalLiabilitiesAndEquity)}
                 </span>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* PROFESSIONAL FOOTER / INFO */}
      <footer className="bg-[#12100e] p-8 rounded-[2.5rem] border border-stone-800 text-center space-y-4">
        <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.5em]">FarmTrack Ledger Integrity Protocol</p>
        <div className="flex flex-wrap justify-center gap-6">
          <LegendItem label="BC Ratio" text="Sales ÷ Expenses. High is good." />
          <LegendItem label="Receivable" text="Money promised but not yet in hand." />
          <LegendItem label="Equity" text="Value of the farm minus what you owe." />
        </div>
      </footer>
    </div>
  );
};

const DateFilterBox: React.FC<{ label: string, value: string, onChange: (v: string) => void, system: DateSystem }> = ({ label, value, onChange, system }) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-1.5 px-1">
       <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest">{label}</span>
       <span className="text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
         {getBSDisplay(value)}
       </span>
    </div>
    <input 
      type="date"
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:ring-2 ring-emerald-500/20 text-black dark:text-white transition-all"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const MetricCard: React.FC<{ title: string, value: string, icon: string, description: string, subValue?: string, subColor?: string, valueColor?: string }> = ({ title, value, icon, description, subValue, subColor = "text-stone-400", valueColor = "text-black dark:text-white" }) => (
  <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-100 dark:border-stone-800 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-stone-200 group">
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {subValue && (
          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-stone-50 dark:bg-stone-950 ${subColor}`}>
            {subValue}
          </span>
        )}
      </div>
      <div>
        <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{title}</h4>
        <p className={`text-2xl font-black truncate tracking-tighter ${valueColor}`}>{value}</p>
      </div>
    </div>
    <p className="text-[8px] font-bold text-stone-400 uppercase leading-relaxed mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
      {description}
    </p>
  </div>
);

const FinancialRow: React.FC<{ label: string, description: string, value: string, color?: string }> = ({ label, description, value, color = "text-black dark:text-stone-300" }) => (
  <div className="flex justify-between items-start group">
    <div className="space-y-1">
      <span className="text-[11px] font-black text-stone-500 uppercase tracking-widest block transition-colors group-hover:text-black dark:group-hover:text-white">{label}</span>
      <p className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter leading-none">{description}</p>
    </div>
    <span className={`text-base font-black tracking-tight ${color}`}>{value}</span>
  </div>
);

const LegendItem: React.FC<{ label: string, text: string }> = ({ label, text }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-black text-emerald-500 uppercase border border-emerald-500/30 px-2 py-0.5 rounded-md">{label}</span>
    <span className="text-[9px] font-bold text-stone-500 uppercase">{text}</span>
  </div>
);
