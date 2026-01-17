
import React, { useState, useEffect, useMemo, useRef } from 'react';
import NepaliDate from 'https://esm.sh/nepali-date-converter';
import { Sale, Customer, Product, Currency, DateSystem, ActivityLog } from '../types';
import { getBSDisplay, bsToAdString, formatDualDate, formatFarmDate } from '../services/dateService';

interface SalesFormProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  logs: ActivityLog[];
  onAddSale: (sale: Sale) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onRestoreSale: (log: ActivityLog) => void;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  triggerImageGeneration?: (productId: string) => void;
  currency: Currency;
  dateSystem: DateSystem;
  onBack?: () => void;
  onNavigateToReport?: () => void;
  onDeleteLog?: (id: string) => void;
  preselectedCustomerId?: string | null;
  onClearPreselected?: () => void;
}

type EntrySystem = 'AD' | 'BS';

export const SalesForm: React.FC<SalesFormProps> = ({ 
  sales, 
  customers, 
  products, 
  onAddSale, 
  onAddCustomer, 
  onUpdateSale,
  onUpdateProduct,
  onAddProduct,
  triggerImageGeneration,
  currency, 
  dateSystem,
  onBack,
  onNavigateToReport,
  preselectedCustomerId,
  onClearPreselected
}) => {
  const getInitialDate = () => {
    if (dateSystem === 'BS') {
      return new NepaliDate().format('YYYY-MM-DD');
    }
    return new Date().toISOString().split('T')[0];
  };

  const [entrySystem] = useState<EntrySystem>(dateSystem);
  const [entryDate, setEntryDate] = useState(getInitialDate());
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState(0);
  const [price, setPrice] = useState(0);
  const [isManuallyPriced, setIsManuallyPriced] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [custError, setCustError] = useState<string | null>(null);

  const [showQuickAddProductModal, setShowQuickAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<Product['category']>('Vegetables');
  const [newProdUnit, setNewProdUnit] = useState('kg');
  const [newProdPrice, setNewProdPrice] = useState<number>(0);
  const [prodError, setProdError] = useState<string | null>(null);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  useEffect(() => {
    if (preselectedCustomerId) {
      const cust = customers.find(c => c.id === preselectedCustomerId);
      if (cust) {
        setSelectedCustomerId(cust.id);
        setCustomerSearch(cust.name);
      }
      onClearPreselected?.();
    }
  }, [preselectedCustomerId, customers, onClearPreselected]);

  useEffect(() => {
    const isOverlayOpen = showNewCustomerModal || showQuickAddProductModal;
    document.body.style.overflow = isOverlayOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showNewCustomerModal, showQuickAddProductModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedProducts = useMemo(() => {
    const lastSaleTimeMap: Record<string, number> = {};
    sales.forEach(s => {
      if (!lastSaleTimeMap[s.productId] || s.date > lastSaleTimeMap[s.productId]) {
        lastSaleTimeMap[s.productId] = s.date;
      }
    });
    return [...products].sort((a, b) => {
      const timeA = lastSaleTimeMap[a.id] || 0;
      const timeB = lastSaleTimeMap[b.id] || 0;
      if (timeB === timeA) return a.name.localeCompare(b.name);
      return timeB - timeA;
    });
  }, [products, sales]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const allFilteredSalesData = useMemo(() => {
    return sales.filter(s => {
      const product = products.find(p => p.id === s.productId);
      const customer = customers.find(c => c.id === s.customerId);
      const matchesSearch = 
        product?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => b.date - a.date);
  }, [sales, products, customers, searchQuery]);

  const salesGroups = useMemo(() => {
    const groups: { date: string; items: Sale[] }[] = [];
    allFilteredSalesData.forEach(sale => {
      const dateLabel = formatFarmDate(sale.date, dateSystem);
      const existingGroup = groups.find(g => g.date === dateLabel);
      if (existingGroup) {
        existingGroup.items.push(sale);
      } else {
        groups.push({ date: dateLabel, items: [sale] });
      }
    });
    return groups;
  }, [allFilteredSalesData, dateSystem]);

  useEffect(() => {
    if (selectedProduct && !isManuallyPriced) {
      setRate(selectedProduct.basePrice);
    }
  }, [selectedProductId, products, isManuallyPriced, selectedProduct]);

  useEffect(() => {
    if (!isManuallyPriced) setPrice(rate * quantity);
  }, [rate, quantity, isManuallyPriced]);

  const handleRateUpdateInCatalog = () => {
    if (selectedProduct) {
      onUpdateProduct({ ...selectedProduct, basePrice: rate });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedCustomerId) return;
    let saleDateJs: Date;
    try {
      saleDateJs = entrySystem === 'BS' ? new NepaliDate(entryDate).toJsDate() : new Date(entryDate);
    } catch { saleDateJs = new Date(); }
    const now = new Date();
    saleDateJs.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    onAddSale({ id: Date.now().toString(), customerId: selectedCustomerId, productId: selectedProductId, quantity, totalAmount: price, date: saleDateJs.getTime(), paymentStatus: paymentStatus, notes });
    
    // UI RESET: Clear customer and other input states for next entry
    setSelectedCustomerId('');
    setCustomerSearch('');
    setQuantity(1);
    setNotes('');
    setIsManuallyPriced(false);
  };

  const handleCreateCustomer = () => {
    const trimmedName = newCustName.trim();
    if (!trimmedName) { setCustError("Identity name is mandatory."); return; }
    if (customers.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) { setCustError(`"${trimmedName}" is already enrolled.`); return; }
    const newCust: Customer = { id: Date.now().toString(), name: trimmedName, phone: newCustPhone.trim(), createdAt: Date.now() };
    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setCustomerSearch(newCust.name);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setCustError(null);
  };

  const handleQuickAddProduct = () => {
    const trimmedName = newProdName.trim();
    if (!trimmedName) { setProdError("Asset identity is required."); return; }
    const isDuplicate = products.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) { setProdError(`"${trimmedName}" is already catalogued.`); return; }
    const newId = Date.now().toString();
    onAddProduct({ 
      id: newId, name: trimmedName, category: newProdCategory, unit: newProdUnit, basePrice: newProdPrice, currentStock: 0, minStockLevel: 5 
    });
    setSelectedProductId(newId);
    setShowQuickAddProductModal(false);
    setNewProdName('');
    setNewProdPrice(0);
    setProdError(null);
  };

  const getEmoji = (cat: string) => {
    switch(cat) {
      case 'Vegetables': return '🥦';
      case 'Fruits': return '🍎';
      case 'Dairy': return '🥛';
      case 'Grains': return '🌾';
      default: return '🌱';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <section className="bg-stone-900/10 p-3 rounded-[2.5rem] border border-stone-800/10">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1 px-1">
          <button onClick={() => { setProdError(null); setShowQuickAddProductModal(true); }} className="flex-shrink-0 flex flex-col items-center justify-center w-[90px] h-[100px] md:w-[100px] md:h-[110px] rounded-[1.5rem] border-2 border-dashed border-stone-800/40 bg-stone-900/20 hover:border-emerald-500/50 transition-all group"><span className="text-3xl text-stone-600 group-hover:text-emerald-500 mb-1 leading-none">+</span><span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight text-stone-500 group-hover:text-emerald-500">Add Item</span></button>
          {sortedProducts.map(product => (
            <div key={product.id} className="relative group/card">
              <button 
                onClick={() => setSelectedProductId(product.id)} 
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[90px] h-[100px] md:w-[100px] md:h-[110px] rounded-[1.5rem] border-2 transition-all relative overflow-hidden ${selectedProductId === product.id ? 'border-emerald-500 bg-emerald-500/10 scale-95 shadow-lg' : 'border-stone-800/20 bg-stone-900/40'}`}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 mb-1 flex items-center justify-center text-xl md:text-2xl overflow-hidden rounded-xl bg-stone-800/20 shadow-inner relative">
                  {product.isGeneratingImage ? (
                    <div className="absolute inset-0 bg-emerald-500/20 animate-pulse flex items-center justify-center z-10">
                      <span className="text-[12px] animate-spin">🌀</span>
                    </div>
                  ) : null}
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className={product.isGeneratingImage ? 'blur-sm' : ''}>{getEmoji(product.category)}</span>
                  )}
                </div>
                <span className="text-[8px] md:text-[9px] font-black uppercase text-stone-100 line-clamp-1 px-1">{product.name}</span>
                <span className="text-[6px] md:text-[7px] font-bold text-stone-400 mt-1 uppercase">{currency.symbol}{product.basePrice}</span>
              </button>
              {!product.imageUrl && !product.isGeneratingImage && (
                <button onClick={(e) => { e.stopPropagation(); triggerImageGeneration?.(product.id); }} className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover/card:opacity-100 transition-opacity border-2 border-[#12100e] active:scale-90" title="Generate AI Visual">✨</button>
              )}
              {product.imageUrl && !product.isGeneratingImage && (
                <button onClick={(e) => { e.stopPropagation(); triggerImageGeneration?.(product.id); }} className="absolute -top-1 -right-1 w-5 h-5 bg-stone-800/80 text-emerald-400 rounded-full flex items-center justify-center text-[8px] shadow-lg opacity-0 group-hover/card:opacity-100 transition-opacity border border-stone-700 active:scale-90" title="Regenerate">🔄</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="bg-[#12100e] p-5 md:p-8 rounded-[2rem] border border-stone-800 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-white uppercase">Execution Entry</h2>
          <div className="flex gap-2">
            <button onClick={onNavigateToReport} className="text-emerald-500 font-black text-[9px] uppercase tracking-widest border border-emerald-500/20 px-3 py-1.5 rounded-xl">View Reports</button>
            {onBack && <button onClick={onBack} className="text-stone-500 p-2">✕</button>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-500 uppercase">Fulfillment Date ({entrySystem})</label><input type={entrySystem === 'BS' ? 'text' : 'date'} className="w-full bg-[#0c0a09] border border-stone-800 text-stone-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" value={entryDate} onChange={e => setEntryDate(e.target.value)}/></div>
            <div className="relative" ref={customerDropdownRef}>
              <label className="text-[9px] font-black text-stone-500 uppercase">Client Selection</label>
              <div className="flex gap-2">
                <input className="flex-1 bg-[#0c0a09] border border-stone-800 text-stone-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" placeholder="Search Database..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }} onFocus={() => setIsCustomerDropdownOpen(true)}/>
                <button type="button" onClick={() => { setCustError(null); setShowNewCustomerModal(true); }} className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 px-4 py-3 rounded-xl font-black hover:bg-emerald-600 hover:text-white transition-all active:scale-90" title="Enroll New Client">+</button>
              </div>
              {isCustomerDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-stone-900 border border-stone-800 rounded-xl shadow-3xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                  {filteredCustomers.map(c => (
                    <button key={c.id} type="button" onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); setIsCustomerDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-emerald-600/10 font-black text-xs text-stone-100 uppercase border-b border-stone-800/50">{c.name}</button>
                  ))}
                  <button type="button" onClick={() => { setCustError(null); setShowNewCustomerModal(true); setIsCustomerDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-emerald-500 font-black text-[10px] uppercase bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">+ Add New Client Identity</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[9px] font-black text-stone-500 uppercase">Volume (Qty)</label><input type="number" step="0.1" className="w-full bg-[#0c0a09] border border-stone-800 text-stone-100 rounded-xl px-4 py-3 font-black" value={quantity} onChange={e => { setQuantity(Number(e.target.value)); setIsManuallyPriced(false); }}/></div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-500 uppercase flex justify-between">
                <span>Unit Price ({currency.symbol})</span>
                {selectedProduct && rate !== selectedProduct.basePrice && (
                  <button type="button" onClick={handleRateUpdateInCatalog} className="text-[8px] text-emerald-500 bg-emerald-500/10 px-2 rounded-md hover:bg-emerald-500 hover:text-white transition-all">Update Catalog Rate</button>
                )}
              </label>
              <input type="number" step="0.01" className="w-full bg-[#0c0a09] border border-stone-800 text-stone-100 rounded-xl px-4 py-3 font-black" value={rate} onChange={e => { setRate(Number(e.target.value)); setIsManuallyPriced(false); }}/>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-6">
              <div className="w-full md:w-auto">
                <span className="text-[9px] font-black text-stone-500 uppercase block mb-1">Ledger Valuation Override</span>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-emerald-500 ml-0.5">{currency.symbol}</span>
                  <input type="number" step="0.01" className="bg-transparent border-none text-4xl font-black text-emerald-500 outline-none w-full pl-8" value={price} onChange={e => { setPrice(Number(e.target.value)); setIsManuallyPriced(true); }} />
                </div>
              </div>
              <div className="flex bg-stone-900 p-1 rounded-xl">
                 {(['Paid', 'Pending'] as const).map(s => (
                   <button key={s} type="button" onClick={() => setPaymentStatus(s)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${paymentStatus === s ? (s === 'Paid' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-amber-500 text-white shadow-lg') : 'text-stone-500 hover:text-stone-300'}`}>{s}</button>
                 ))}
              </div>
            </div>
            <button className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] ${paymentStatus === 'Paid' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20'}`}>Confirm Transaction</button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest">Audit Ledger (Every Entry)</h3>
          <div className="relative w-48 md:w-64">
            <input type="text" placeholder="Audit Search..." className="w-full bg-[#12100e] border border-stone-800 rounded-full px-4 py-2 text-[10px] font-black uppercase text-stone-100 outline-none focus:border-emerald-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="space-y-8">
          {salesGroups.length > 0 ? salesGroups.map(group => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center gap-4 px-2">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">{group.date}</span>
                <div className="h-[1px] flex-1 bg-stone-200 dark:bg-stone-800 opacity-30"></div>
              </div>
              {group.items.map(sale => {
                const customer = customers.find(c => c.id === sale.customerId);
                const product = products.find(p => p.id === sale.productId);
                return (
                  <div key={sale.id} className="p-5 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[1.75rem] flex items-center justify-between animate-in slide-in-from-bottom-2 shadow-sm hover:shadow-md transition-all">
                    <div className="grid grid-cols-12 items-center w-full gap-4">
                      {/* Customer Identity - BOLD BLOCK LETTERS */}
                      <div className="col-span-4 border-r border-stone-100 dark:border-stone-800/50 pr-4">
                         <p className="font-black text-sm md:text-lg text-black dark:text-stone-100 uppercase tracking-tight leading-tight">
                            {customer?.name || 'RETAIL CLIENT'}
                         </p>
                         <p className="text-[7px] font-bold text-stone-400 uppercase tracking-widest mt-1">Client Identity</p>
                      </div>

                      {/* Catalogue/Product Section - CENTERED */}
                      <div className="col-span-4 text-center flex flex-col items-center justify-center">
                         <span className="text-xl mb-1">{product ? getEmoji(product.category) : '📦'}</span>
                         <p className="font-black text-[10px] md:text-[11px] text-stone-600 dark:text-stone-400 uppercase tracking-[0.3em] leading-none">
                            {product?.name || 'UNKNOWN ASSET'}
                         </p>
                         <span className="text-[7px] font-bold text-stone-400 uppercase tracking-widest mt-2">{sale.quantity} {product?.unit || 'units'}</span>
                      </div>

                      {/* Stats Section */}
                      <div className="col-span-4 flex items-center justify-end gap-6 pl-4">
                         <div className="text-right">
                            <p className="font-black text-sm md:text-base text-emerald-600 leading-none">{currency.symbol}{sale.totalAmount.toFixed(2)}</p>
                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full mt-2 inline-block ${sale.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {sale.paymentStatus}
                            </span>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )) : (
            <div className="py-20 text-center opacity-20"><p className="text-[10px] font-black uppercase tracking-widest">Awaiting Transaction Data</p></div>
          )}
        </div>
      </div>

      {showNewCustomerModal && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md p-10 rounded-[3.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-3xl space-y-10">
            <div className="text-center"><h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter">Client Registry</h3><p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-2">Add New Enterprise Profile</p></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Identity Name</label><input className={`w-full bg-stone-50 dark:bg-stone-800 border-2 rounded-2xl px-6 py-5 font-black outline-none focus:border-emerald-500 text-black dark:text-white text-lg ${custError ? 'border-rose-500' : 'border-stone-100 dark:border-stone-700 focus:border-emerald-500'}`} placeholder="e.g. Liam T." value={newCustName} onChange={e => { setNewCustName(e.target.value); setCustError(null); }} autoFocus />{custError && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">{custError}</p>}</div>
              <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Phone Reference</label><input className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-6 py-5 font-black outline-none focus:border-emerald-500 text-black dark:text-white text-lg" placeholder="+977..." value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} /></div>
              <div className="flex flex-col gap-3 pt-6"><button onClick={handleCreateCustomer} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl">Complete Registration</button><button onClick={() => setShowNewCustomerModal(false)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest">Abort</button></div>
            </div>
          </div>
        </div>
      )}

      {showQuickAddProductModal && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-[#0c0a09] w-full max-w-sm p-8 md:p-10 rounded-[3rem] border border-stone-800 shadow-3xl space-y-8">
            <h3 className="text-xl font-black text-white uppercase text-center tracking-widest">Enumerate Asset</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-500 uppercase ml-1">Variety Identity</label>
                <input className={`w-full bg-black border ${prodError ? 'border-rose-500' : 'border-stone-800'} rounded-xl px-5 py-4 text-white font-black uppercase text-xs outline-none focus:border-emerald-500 transition-all`} placeholder="e.g. Red Potatoes" value={newProdName} onChange={e => { setNewProdName(e.target.value); setProdError(null); }} autoFocus />
                {prodError && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1 ml-1">{prodError}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-500 uppercase ml-1">Category</label>
                <select className="w-full bg-black border border-stone-800 rounded-xl px-5 py-4 text-white font-black uppercase text-xs outline-none focus:border-emerald-500" value={newProdCategory} onChange={e => setNewProdCategory(e.target.value as any)}>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Grains">Grains</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-500 uppercase ml-1">Standard Rate ({currency.symbol})</label>
                <input type="number" step="0.01" className="w-full bg-black border border-stone-800 rounded-xl px-5 py-4 text-white font-black text-xs outline-none focus:border-emerald-500" placeholder="0.00" value={newProdPrice || ''} onChange={e => setNewProdPrice(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={handleQuickAddProduct} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-500 transition-all active:scale-95">Add to Catalog</button>
              <button onClick={() => { setShowQuickAddProductModal(false); setProdError(null); }} className="w-full py-3 text-stone-500 font-black uppercase text-[10px] tracking-widest hover:text-stone-300">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
