
import React, { useState, useMemo, useEffect } from 'react';
import NepaliDate from 'https://esm.sh/nepali-date-converter';
import { Sale, Customer, Currency, Product, DateSystem, ActivityLog } from '../types';
import { formatDualDate, getBSDisplay } from '../services/dateService';

interface CustomerListProps {
  customers: Customer[];
  sales: Sale[];
  products: Product[];
  logs: ActivityLog[];
  currency: Currency;
  dateSystem: DateSystem;
  onUpdateSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onDeleteCustomer: (id: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onAddSale: (sale: Sale) => void;
  onDeleteLog?: (id: string) => void;
  onQuickSale?: (customerId: string) => void;
}

type ProfileViewMode = 'Transactions' | 'DeletedHistory';
type SortBy = 'name' | 'outstanding' | 'newest';
type EntrySystem = 'AD' | 'BS';

export const CustomerList: React.FC<CustomerListProps> = ({ 
  customers, 
  sales, 
  products, 
  logs,
  currency, 
  dateSystem,
  onUpdateSale, 
  onDeleteSale,
  onDeleteCustomer,
  onUpdateCustomer,
  onAddCustomer,
  onDeleteLog,
  onQuickSale
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Overlay States for Confirmation
  const [confirmToggleSale, setConfirmToggleSale] = useState<Sale | null>(null);
  const [confirmDeleteSale, setConfirmDeleteSale] = useState<Sale | null>(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState<Customer | null>(null);
  const [profileViewMode, setProfileViewMode] = useState<ProfileViewMode>('Transactions');

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editDateValue, setEditDateValue] = useState('');
  const [editDateMode, setEditDateMode] = useState<EntrySystem>(dateSystem);

  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustError, setEditCustError] = useState<string | null>(null);

  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustError, setNewCustError] = useState<string | null>(null);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const customerStats = useMemo(() => {
    if (!selectedCustomerId || !selectedCustomer) return null;
    const custSales = sales.filter(s => s.customerId === selectedCustomerId).sort((a, b) => b.date - a.date);
    const totalSpent = custSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const outstanding = custSales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.totalAmount, 0);
    const paid = custSales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + s.totalAmount, 0);
    const deletionLogs = logs.filter(l => l.customerName === selectedCustomer.name).sort((a, b) => b.timestamp - a.timestamp);
    return { count: custSales.length, totalSpent, outstanding, paid, custSales, deletionLogs };
  }, [selectedCustomerId, selectedCustomer, sales, logs]);

  const processedCustomers = useMemo(() => {
    let result = [...customers].filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
    switch (sortBy) {
      case 'outstanding':
        result.sort((a, b) => {
          const outA = sales.filter(s => s.customerId === a.id && s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.totalAmount, 0);
          const outB = sales.filter(s => s.customerId === b.id && s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.totalAmount, 0);
          return outB - outA;
        });
        break;
      case 'newest': result.sort((a, b) => b.createdAt - a.createdAt); break;
      case 'name':
      default: result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return result;
  }, [customers, searchTerm, sortBy, sales]);

  const formatPrice = (amount: number) => `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handleToggleConfirm = () => {
    if (confirmToggleSale) {
      onUpdateSale({ ...confirmToggleSale, paymentStatus: confirmToggleSale.paymentStatus === 'Paid' ? 'Pending' : 'Paid' });
      setConfirmToggleSale(null);
    }
  };

  const handleFinalDeleteSale = () => {
    if (confirmDeleteSale) {
      onDeleteSale(confirmDeleteSale.id);
      setConfirmDeleteSale(null);
    }
  };

  const handleFinalDeleteCustomer = () => {
    if (confirmDeleteCustomer) {
      onDeleteCustomer(confirmDeleteCustomer.id);
      setConfirmDeleteCustomer(null);
      setSelectedCustomerId(null);
    }
  };

  const handleStartEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditCustName(selectedCustomer.name);
    setEditCustPhone(selectedCustomer.phone);
    setEditCustError(null);
    setShowEditCustomerModal(true);
  };

  const handleUpdateCustomerDetails = () => {
    if (!selectedCustomer) return;
    const trimmedName = editCustName.trim();
    if (!trimmedName) return;
    if (customers.some(c => c.id !== selectedCustomer.id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setEditCustError(`Identity "${trimmedName}" already exists.`);
      return;
    }
    onUpdateCustomer({ ...selectedCustomer, name: trimmedName, phone: editCustPhone.trim() });
    setShowEditCustomerModal(false);
  };

  const handleCreateCustomer = () => {
    const trimmed = newCustName.trim();
    if (!trimmed) { setNewCustError("Client name is required."); return; }
    if (customers.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) { setNewCustError(`"${trimmed}" is already catalogued.`); return; }
    onAddCustomer({ id: Date.now().toString(), name: trimmed, phone: newCustPhone.trim(), createdAt: Date.now() });
    setNewCustName(''); setNewCustPhone(''); setNewCustError(null);
    setShowNewCustomerModal(false);
  };

  const handleStartEditSale = (sale: Sale) => {
    setEditingSale({ ...sale });
    setEditRate(sale.totalAmount / (sale.quantity || 1));
    const d = new Date(sale.date);
    setEditDateMode(dateSystem);
    setEditDateValue(dateSystem === 'BS' ? new NepaliDate(d).format('YYYY-MM-DD') : d.toISOString().split('T')[0]);
  };

  const handleSaveSaleEdit = () => {
    if (!editingSale) return;
    let finalDate: number;
    try {
      finalDate = editDateMode === 'BS' ? new NepaliDate(editDateValue).toJsDate().getTime() : new Date(editDateValue).getTime();
    } catch { finalDate = editingSale.date; }
    onUpdateSale({ ...editingSale, date: finalDate });
    setEditingSale(null);
  };

  if (selectedCustomerId && selectedCustomer && customerStats) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 pb-20">
        <header className="py-6 px-4 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-stone-100 dark:border-stone-800 mb-8 sticky top-0 bg-white/90 dark:bg-stone-950/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setSelectedCustomerId(null)} className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xl shadow-inner hover:bg-emerald-600 hover:text-white transition-all">←</button>
            <div>
              <h3 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{selectedCustomer.name}</h3>
              <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.4em] mt-3">{selectedCustomer.phone || 'Standard Profile'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button onClick={() => onQuickSale?.(selectedCustomer.id)} className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-500 transition-all active:scale-95">Create Order</button>
             <button onClick={handleStartEditCustomer} className="px-6 py-4 bg-stone-100 dark:bg-stone-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-black dark:text-white hover:bg-emerald-600 hover:text-white transition-all">Settings</button>
             <button onClick={() => setConfirmDeleteCustomer(selectedCustomer)} className="px-6 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 shadow-xl transition-all">Destroy</button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 mb-10">
          <ProfileStat label="Turnover" value={formatPrice(customerStats.totalSpent)} icon="💎" />
          <ProfileStat label="Paid" value={formatPrice(customerStats.paid)} icon="✅" />
          <ProfileStat label="Outstanding" value={formatPrice(customerStats.outstanding)} icon="⏳" highlight={customerStats.outstanding > 0} />
          <ProfileStat label="Ledger Entries" value={customerStats.count.toString()} icon="📦" />
        </div>

        <div className="px-4 pb-4 flex items-center justify-between border-b border-stone-100 dark:border-stone-800 mb-6">
          <div className="flex bg-stone-100 dark:bg-stone-900 p-1 rounded-[1.5rem]">
             {(['Transactions', 'DeletedHistory'] as ProfileViewMode[]).map(mode => (
               <button key={mode} onClick={() => setProfileViewMode(mode)} className={`px-8 md:px-12 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${profileViewMode === mode ? 'bg-white dark:bg-stone-800 text-emerald-600 shadow-lg' : 'text-stone-400'}`}>{mode === 'Transactions' ? 'Ledger' : 'Audit Logs'}</button>
             ))}
          </div>
        </div>

        <div className="px-4 space-y-4">
          {profileViewMode === 'Transactions' ? (
            customerStats.custSales.length > 0 ? (
              <div className="space-y-4">
                {customerStats.custSales.map(sale => {
                  const product = products.find(p => p.id === sale.productId);
                  return (
                    <div key={sale.id} className="p-6 md:p-8 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[2.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-emerald-500/40 transition-all">
                       <div className="flex items-center gap-6"><div className="w-16 h-16 bg-stone-50 dark:bg-stone-950 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-stone-100 dark:border-stone-800">{product?.category === 'Vegetables' ? '🥦' : product?.category === 'Fruits' ? '🍎' : '🌾'}</div><div><span className="font-black text-lg text-black dark:text-stone-100 uppercase block truncate">{product?.name || 'Redacted Asset'}</span><span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1 block">{formatDualDate(sale.date)}</span></div></div>
                       <div className="flex items-center justify-between sm:justify-end gap-10"><div className="text-right"><p className="font-black text-2xl text-emerald-600">{formatPrice(sale.totalAmount)}</p><button onClick={() => setConfirmToggleSale(sale)} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mt-2 ${sale.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{sale.paymentStatus}</button></div><div className="flex items-center gap-3"><button onClick={() => handleStartEditSale(sale)} className="w-12 h-12 flex items-center justify-center bg-stone-50 dark:bg-stone-800 rounded-xl hover:text-emerald-500 transition-all">✏️</button><button onClick={() => setConfirmDeleteSale(sale)} className="w-12 h-12 flex items-center justify-center bg-stone-50 dark:bg-stone-800 rounded-xl hover:text-rose-500 transition-all">🗑️</button></div></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-32 text-center opacity-20"><span className="text-7xl block mb-6">🏜️</span><p className="text-sm font-black uppercase tracking-[0.5em]">No Data Recorded</p></div>
            )
          ) : (
            customerStats.deletionLogs.length > 0 ? (
              <div className="space-y-4">
                 {customerStats.deletionLogs.map(log => (
                   <div key={log.id} className="p-6 md:p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 flex items-center justify-between group"><div className="flex items-center gap-6"><div className={`w-14 h-14 ${log.action === 'Deleted' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'} rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-stone-100 dark:border-stone-800`}>{log.action === 'Deleted' ? '🗑️' : '📝'}</div><div><p className="font-black text-sm text-black dark:text-stone-300 uppercase leading-tight">{log.details}</p><span className="text-[9px] font-black text-stone-500 uppercase tracking-widest mt-2 block">{log.action} • {formatDualDate(log.timestamp)}</span></div></div><div className="flex items-center gap-8"><p className="font-black text-xl text-black dark:text-stone-100">{formatPrice(log.amount)}</p>{onDeleteLog && (<button onClick={() => { if(confirm("Permanently erase this audit log?")) onDeleteLog(log.id); }} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all">✕</button>)}</div></div>
                 ))}
              </div>
            ) : (
              <div className="py-32 text-center opacity-20"><span className="text-7xl block mb-6">📜</span><p className="text-sm font-black uppercase tracking-[0.5em]">Audit Trail Clear</p></div>
            )
          )}
        </div>
        {renderActionModals()}
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <header className="py-6 px-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h2 className="text-3xl font-black text-black dark:text-stone-100 tracking-tighter uppercase leading-none">Identity Manager</h2><p className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Enterprise Client Database</p></div>
        <button onClick={() => { setNewCustError(null); setShowNewCustomerModal(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"><span>Register Identity</span><span className="text-xl leading-none">+</span></button>
      </header>

      <div className="px-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1"><input type="text" placeholder="Filter by name or reference..." className="w-full bg-white dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl px-12 py-4 font-black text-xs uppercase tracking-widest outline-none focus:border-emerald-500 transition-all text-black dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/><span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-lg">🔍</span></div>
          <div className="flex items-center bg-white dark:bg-stone-900/40 p-1.5 rounded-2xl border border-stone-100 dark:border-stone-800">{['name', 'outstanding', 'newest'].map(s => (<button key={s} onClick={() => setSortBy(s as SortBy)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${sortBy === s ? 'bg-emerald-600 text-white shadow-md' : 'text-stone-400'}`}>{s === 'name' ? 'A-Z' : s === 'outstanding' ? 'Debt' : 'Joined'}</button>))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {processedCustomers.map(c => {
          const custSales = sales.filter(s => s.customerId === c.id);
          const outstanding = custSales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.totalAmount, 0);
          return (
            <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setProfileViewMode('Transactions'); }} className="bg-white dark:bg-stone-900 rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 p-8 flex items-center justify-between hover:border-emerald-500 transition-all group active:scale-[0.98] shadow-sm hover:shadow-xl"><div className="flex items-center gap-5 overflow-hidden"><div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-3xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">👤</div><div className="text-left overflow-hidden"><h4 className="font-black text-base uppercase leading-none truncate dark:text-white">{c.name}</h4><p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-2 truncate">{c.phone || 'Access Restricted'}</p></div></div><div className="text-right flex-shrink-0">{outstanding > 0 ? (<div className="flex flex-col items-end"><span className="text-[7px] font-black text-amber-500 uppercase tracking-widest mb-1">Unpaid</span><span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">{formatPrice(outstanding)}</span></div>) : (<span className="text-[10px] font-black text-emerald-500/40 uppercase">Clear</span>)}</div></button>
          );
        })}
      </div>
      {renderActionModals()}
    </div>
  );

  function renderActionModals() {
    return (
      <>
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-stone-900 w-full max-w-md p-10 rounded-[3.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-3xl space-y-10">
              <div className="text-center"><h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter">Identity Enrollment</h3><p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-2">New Enterprise Profile</p></div>
              <div className="space-y-6">
                <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Client Name</label><input className={`w-full bg-stone-50 dark:bg-stone-800 border-2 rounded-2xl px-6 py-5 font-black outline-none transition-all text-black dark:text-white text-lg ${newCustError ? 'border-rose-500' : 'border-stone-100 dark:border-stone-700 focus:border-emerald-500'}`} placeholder="e.g. Liam T." value={newCustName} onChange={e => { setNewCustName(e.target.value); setNewCustError(null); }} autoFocus />{newCustError && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">{newCustError}</p>}</div>
                <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Phone Reference</label><input className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-6 py-5 font-black outline-none focus:border-emerald-500 text-black dark:text-white text-lg" placeholder="+977..." value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} /></div>
                <div className="flex flex-col gap-3 pt-6"><button onClick={handleCreateCustomer} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl">Establish Record</button><button onClick={() => setShowNewCustomerModal(false)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest">Abort</button></div>
              </div>
            </div>
          </div>
        )}
        {editingSale && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
            <div className="bg-stone-950 w-full max-w-md p-10 rounded-[3.5rem] border border-stone-800 shadow-3xl space-y-10"><div className="text-center"><h3 className="text-2xl font-black text-white uppercase tracking-tighter">Adjust Ledger</h3><p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mt-1">Manual Override</p></div><div className="space-y-6"><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-stone-500 tracking-widest">Volume</label><input type="number" step="0.01" className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 font-black text-white text-lg outline-none focus:border-emerald-500" value={editingSale.quantity} onChange={e => { const q = Number(e.target.value); setEditingSale({...editingSale, quantity: q, totalAmount: q * editRate}); }} /></div><div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-stone-500 tracking-widest">Total Valuation</label><input type="number" step="0.01" className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 font-black text-emerald-500 text-lg outline-none focus:border-emerald-500" value={editingSale.totalAmount} onChange={e => { const t = Number(e.target.value); setEditingSale({...editingSale, totalAmount: t}); setEditRate(t / (editingSale.quantity || 1)); }} /></div></div><div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-stone-500 tracking-widest">Backdate Session ({editDateMode})</label><input type={editDateMode === 'BS' ? 'text' : 'date'} className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 font-black text-white outline-none" value={editDateValue} onChange={e => setEditDateValue(e.target.value)} /></div><div className="flex flex-col gap-3 pt-4"><button onClick={handleSaveSaleEdit} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl">Confirm Update</button><button onClick={() => setEditingSale(null)} className="w-full py-3 text-stone-500 font-black uppercase text-[10px] tracking-widest">Cancel</button></div></div></div>
          </div>
        )}
        {confirmDeleteCustomer && (
          <div className="fixed inset-0 z-[600] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in"><div className="bg-[#0c0a09] w-full max-w-sm p-12 rounded-[4rem] border-4 border-rose-900/30 text-center space-y-10 shadow-3xl"><div className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-2xl animate-pulse">⚠️</div><div><h4 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Terminate Identity?</h4><p className="text-rose-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-6 px-4">Permanently wipe <span className="text-white">"{confirmDeleteCustomer.name}"</span>?<br/>Total Ledger and Debt history removal.</p></div><div className="flex flex-col gap-4"><button onClick={handleFinalDeleteCustomer} className="w-full py-6 bg-rose-600 text-white rounded-full font-black uppercase text-sm tracking-[0.3em] active:scale-95 shadow-2xl">DESTROY DATA</button><button onClick={() => setConfirmDeleteCustomer(null)} className="w-full py-4 text-stone-500 font-black uppercase text-[11px] tracking-widest hover:text-white transition-colors">Keep Record</button></div></div></div>
        )}
        {showEditCustomerModal && selectedCustomer && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white dark:bg-stone-900 w-full max-w-sm p-10 rounded-[3.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-3xl space-y-10"><div className="text-center"><h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter">Modify Identity</h3><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-2">Update Core Profile</p></div><div className="space-y-6"><div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Official Name</label><input className={`w-full bg-stone-50 dark:bg-stone-800 border-2 rounded-2xl px-6 py-5 font-black outline-none transition-all text-black dark:text-white text-lg ${editCustError ? 'border-rose-500' : 'border-stone-100 dark:border-stone-700 focus:border-emerald-500'}`} value={editCustName} onChange={e => { setEditCustName(e.target.value); setEditCustError(null); }} autoFocus />{editCustError && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">{editCustError}</p>}</div><div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Phone</label><input className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-6 py-5 font-black outline-none focus:border-emerald-500 text-black dark:text-white text-lg" value={editCustPhone} onChange={e => setEditCustPhone(e.target.value)} /></div><div className="flex flex-col gap-3 pt-6"><button onClick={handleUpdateCustomerDetails} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl">Apply Changes</button><button onClick={() => setShowEditCustomerModal(false)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest">Cancel</button></div></div></div></div>
        )}
        {confirmDeleteSale && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in"><div className="bg-stone-950 w-full max-w-sm p-12 rounded-[3.5rem] border border-stone-800 text-center space-y-10"><div className="text-6xl">🗑️</div><h4 className="text-2xl font-black text-white uppercase tracking-tighter">Remove Entry?</h4><div className="flex flex-col gap-3"><button onClick={handleFinalDeleteSale} className="w-full py-5 bg-rose-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl">Confirm Delete</button><button onClick={() => setConfirmDeleteSale(null)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest">Discard</button></div></div></div>
        )}
        {confirmToggleSale && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white dark:bg-stone-900 w-full max-w-sm p-10 rounded-[3rem] border-2 border-stone-100 dark:border-stone-800 text-center space-y-8"><div className="text-6xl">💸</div><h3 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Adjust Billing?</h3><p className="text-stone-500 font-bold text-[10px] uppercase tracking-widest">Mark as <span className="text-emerald-500">{confirmToggleSale.paymentStatus === 'Paid' ? 'PENDING' : 'PAID'}</span>?</p><div className="flex flex-col gap-3"><button onClick={handleToggleConfirm} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Apply Status</button><button onClick={() => setConfirmToggleSale(null)} className="w-full py-4 text-stone-400 font-black uppercase text-[10px] tracking-widest">Cancel</button></div></div></div>
        )}
      </>
    );
  }
};

const ProfileStat: React.FC<{ label: string, value: string, icon: string, highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className={`p-6 rounded-[2.5rem] border-2 flex flex-col items-center text-center space-y-2 transition-all ${highlight ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-300'}`}><span className="text-3xl mb-1">{icon}</span><div><span className="text-[8px] font-black uppercase tracking-widest block opacity-60">{label}</span><p className="text-xl font-black tracking-tighter truncate leading-none mt-1.5">{value}</p></div></div>
);
