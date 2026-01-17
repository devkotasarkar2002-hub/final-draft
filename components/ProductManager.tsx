
import React, { useState, useMemo, useRef } from 'react';
import { Product, Currency, Sale, Customer } from '../types';
import { formatDualDate } from '../services/dateService';

interface ProductManagerProps {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  onAddProduct: (product: Product) => void;
  onAddProductsBulk: (products: Product[]) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  currency: Currency;
}

type CatalogFilter = 'All' | 'Zero Stock' | 'No Revenue' | 'Low Stock';

export const ProductManager: React.FC<ProductManagerProps> = ({ 
  products, 
  sales, 
  customers, 
  onAddProduct, 
  onAddProductsBulk,
  onUpdateProduct,
  onDeleteProduct, 
  currency 
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState<Product['category']>('Vegetables');
  const [initialStock, setInitialStock] = useState<number | string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [selectedProductForReport, setSelectedProductForReport] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CatalogFilter>('All');

  const [adjustingPriceId, setAdjustingPriceId] = useState<string | null>(null);
  const [tempNewPrice, setTempNewPrice] = useState<number>(0);
  const [tempNewDiscount, setTempNewDiscount] = useState<number>(0);
  const [tempNewTax, setTempNewTax] = useState<number>(0);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tempNewName, setTempNewName] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const getEmoji = (cat: string) => {
    switch(cat) {
      case 'Vegetables': return '🥦';
      case 'Fruits': return '🍎';
      case 'Dairy': return '🥛';
      case 'Grains': return '🌾';
      case 'General': return '📦';
      case 'Service': return '🛠️';
      default: return '🌱';
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setBulkError("CSV is empty or missing headers.");
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const nameIdx = headers.indexOf('name');
      const catIdx = headers.indexOf('category');
      const unitIdx = headers.indexOf('unit');
      const priceIdx = headers.indexOf('price');
      const stockIdx = headers.indexOf('stock');
      const minIdx = headers.indexOf('minlevel');

      if (nameIdx === -1 || priceIdx === -1) {
        setBulkError("Required columns 'Name' or 'Price' not found in CSV.");
        return;
      }

      const newProducts: Product[] = [];
      const existingNames = new Set(products.map(p => p.name.toLowerCase()));

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const prodName = cols[nameIdx];
        if (!prodName || existingNames.has(prodName.toLowerCase())) continue;

        const basePrice = Number(cols[priceIdx]) || 0;
        const currentStock = stockIdx !== -1 ? (Number(cols[stockIdx]) || 0) : 0;
        const minStockLevel = minIdx !== -1 ? (Number(cols[minIdx]) || Math.max(1, Math.floor(currentStock * 0.2))) : 1;

        newProducts.push({
          id: (Date.now() + i).toString(),
          name: prodName,
          category: (catIdx !== -1 ? (cols[catIdx] as any) : 'Vegetables'),
          unit: unitIdx !== -1 ? cols[unitIdx] : 'kg',
          basePrice,
          currentStock,
          minStockLevel
        });
      }

      if (newProducts.length > 0) {
        onAddProductsBulk(newProducts);
        setShowBulkModal(false);
      } else {
        setBulkError("No new unique products found to import.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedName = name.trim();
    if (!trimmedName || price < 0) return;
    const isDuplicate = products.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      setErrorMessage(`"${trimmedName}" is already in your catalog.`);
      return;
    }
    const stockValue = initialStock === '' ? 0 : Number(initialStock);
    onAddProduct({
      id: Date.now().toString(),
      name: trimmedName,
      unit,
      basePrice: price,
      category,
      currentStock: stockValue,
      minStockLevel: Math.max(1, Math.floor(stockValue * 0.2)),
      discountPercentage: discount,
      taxPercentage: tax
    });
    setName(''); setPrice(0); setInitialStock(''); setDiscount(0); setTax(0); setErrorMessage(null);
  };

  const handleUpdateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
  };

  const handleApplyPriceUpdate = (product: Product) => {
    onUpdateProduct({ ...product, basePrice: tempNewPrice, discountPercentage: tempNewDiscount, taxPercentage: tempNewTax });
    setAdjustingPriceId(null);
  };

  const handleApplyRename = (product: Product) => {
    setRenameError(null);
    const trimmed = tempNewName.trim();
    if (!trimmed) { setRenameError("Name cannot be empty"); return; }
    const isDuplicate = products.some(p => p.id !== product.id && p.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) { setRenameError("This name already exists"); return; }
    onUpdateProduct({ ...product, name: trimmed });
    setRenamingId(null);
  };

  const handleFinalDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (err) {
      setDeleteError("Error: Could not delete item. Please check your connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const productSales = sales.filter(s => s.productId === product.id);
      const totalRevenue = productSales.reduce((sum, s) => sum + s.totalAmount, 0);
      if (!matchesSearch) return false;
      switch (statusFilter) {
        case 'Zero Stock': return product.currentStock <= 0;
        case 'No Revenue': return totalRevenue === 0;
        case 'Low Stock': return product.currentStock <= product.minStockLevel;
        default: return true;
      }
    });
  }, [products, searchQuery, statusFilter, sales]);

  const productReport = useMemo(() => {
    if (!selectedProductForReport) return null;
    const productSales = sales.filter(s => s.productId === selectedProductForReport.id);
    const totalRevenue = productSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalQty = productSales.reduce((sum, s) => sum + s.quantity, 0);
    const paidAmount = productSales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + s.totalAmount, 0);
    const pendingAmount = productSales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.totalAmount, 0);
    const recentLedger = productSales.map(s => {
      const customer = customers.find(c => c.id === s.customerId);
      return { ...s, customerName: customer?.name || 'Quick Sale' };
    });
    return { totalRevenue, totalQty, paidAmount, pendingAmount, recentLedger };
  }, [selectedProductForReport, sales, customers]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-4xl font-black text-black dark:text-stone-100 tracking-tighter uppercase">Catalogue & Assets</h2>
          <p className="text-stone-500 font-bold uppercase text-xs tracking-[0.3em] mt-2">Inventory Configuration • {currency.code}</p>
        </div>
        <button 
          onClick={() => setShowBulkModal(true)}
          className="bg-stone-900 dark:bg-stone-100 text-white dark:text-black px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3"
        >
          <span>Bulk Import CSV</span>
          <span className="text-lg">📥</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 p-8 rounded-[3rem] border-2 border-stone-100 dark:border-stone-800 shadow-xl space-y-6 sticky top-8">
            <h3 className="text-xl font-black text-black dark:text-stone-100 uppercase tracking-tight flex items-center"><span className="mr-3">🚜</span> Log New Asset</h3>
            <div className="space-y-4">
               <div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Asset Identity</label><input required className={`w-full bg-stone-50 dark:bg-stone-800 border-2 rounded-2xl px-5 py-4 font-black outline-none transition-all text-black dark:text-white ${errorMessage ? 'border-rose-500' : 'border-stone-100 dark:border-stone-700 focus:border-emerald-500'}`} placeholder="e.g. Organic King Mushrooms" value={name} onChange={e => { setName(e.target.value); setErrorMessage(null); }}/>{errorMessage && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1 ml-1">{errorMessage}</p>}</div>
               <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Category</label><select className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-4 py-4 font-black text-black dark:text-white outline-none appearance-none focus:border-emerald-500" value={category} onChange={e => setCategory(e.target.value as any)}><option value="Vegetables">Vegetables</option><option value="Fruits">Fruits</option><option value="Dairy">Dairy</option><option value="Grains">Grains</option><option value="General">General</option><option value="Service">Service</option><option value="Other">Other</option></select></div><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Unit</label><select className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-4 py-4 font-black text-black dark:text-white outline-none appearance-none focus:border-emerald-500" value={unit} onChange={e => setUnit(e.target.value)}><option value="kg">kg</option><option value="piece">piece</option><option value="litres">litres</option><option value="box">box</option><option value="crate">crate</option><option value="bag">bag</option></select></div></div>
               <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Base Price ({currency.symbol})</label><input type="number" step="0.01" required className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500" value={price || ''} onChange={e => setPrice(Number(e.target.value))}/></div><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Initial Stock</label><input type="number" className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500" placeholder="0" value={initialStock} onChange={e => setInitialStock(e.target.value)}/></div></div>
               <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Default Discount (%)</label><input type="number" className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}/></div><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Tax Rate (%)</label><input type="number" className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500" value={tax || ''} onChange={e => setTax(Number(e.target.value))}/></div></div>
            </div>
            <button className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-950/40 hover:bg-emerald-500 transition-all active:scale-95">Register Asset</button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-stone-900 p-4 rounded-3xl border-2 border-stone-100 dark:border-stone-800">
             <div className="relative flex-1 w-full"><input type="text" placeholder="Search catalog..." className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none font-black text-xs text-black dark:text-white focus:ring-2 ring-emerald-500/20" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/><span className="absolute left-4 top-3 opacity-30">🔍</span></div>
             <div className="flex bg-stone-50 dark:bg-stone-800 p-1 rounded-2xl border border-stone-100 dark:border-stone-700 w-full sm:w-auto">{(['All', 'Low Stock', 'Zero Stock'] as CatalogFilter[]).map(f => (<button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-white dark:bg-stone-950 text-emerald-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>{f}</button>))}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {filteredProducts.map(product => {
                const productSales = sales.filter(s => s.productId === product.id);
                const totalRevenue = productSales.reduce((sum, s) => sum + s.totalAmount, 0);
                const totalQty = productSales.reduce((sum, s) => sum + s.quantity, 0);
                const avgSalePrice = totalQty > 0 ? totalRevenue / totalQty : 0;

                return (
               <div key={product.id} className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="flex items-start justify-between relative z-10">
                     <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-stone-100 dark:border-stone-700 overflow-hidden relative">{product.imageUrl ? (<img src={product.imageUrl} alt="" className="w-full h-full object-cover" />) : product.isGeneratingImage ? (<div className="w-full h-full bg-emerald-500/10 animate-pulse flex items-center justify-center"><span className="text-xs animate-spin">🌀</span></div>) : (getEmoji(product.category))}</div>
                        <div>{renamingId === product.id ? (<div className="flex items-center gap-2"><input className="bg-stone-50 dark:bg-stone-800 border-2 border-emerald-500 rounded-lg px-2 py-1 font-black text-sm text-black dark:text-white outline-none" value={tempNewName} onChange={e => setTempNewName(e.target.value)} autoFocus/><button onClick={() => handleApplyRename(product)} className="text-emerald-500">✓</button><button onClick={() => setRenamingId(null)} className="text-rose-500">✕</button></div>) : (<h4 className="font-black text-black dark:text-stone-100 uppercase tracking-tight text-base group-hover:text-emerald-600 transition-colors">{product.name}</h4>)}<p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">{product.category} • {product.unit}</p></div>
                     </div>
                     <div className="flex flex-col items-end space-y-2">
                       {adjustingPriceId === product.id ? (
                         <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-3xl border-2 border-emerald-500 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 min-w-[200px] relative z-50">
                            <div className="space-y-3">
                               <div className="flex items-center justify-between gap-3">
                                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Rate</span>
                                  <input type="number" step="0.01" className="w-24 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-600 outline-none" value={tempNewPrice} onChange={e => setTempNewPrice(Number(e.target.value))}/>
                               </div>
                               <div className="flex items-center justify-between gap-3">
                                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Disc%</span>
                                  <input type="number" className="w-24 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs font-black text-amber-500 outline-none" value={tempNewDiscount} onChange={e => setTempNewDiscount(Number(e.target.value))}/>
                               </div>
                               <div className="flex items-center justify-between gap-3">
                                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Tax%</span>
                                  <input type="number" className="w-24 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs font-black text-rose-500 outline-none" value={tempNewTax} onChange={e => setTempNewTax(Number(e.target.value))}/>
                               </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                               <button onClick={() => setAdjustingPriceId(null)} className="text-[9px] font-black text-stone-400 uppercase tracking-widest px-3 py-2">Cancel</button>
                               <button onClick={() => handleApplyPriceUpdate(product)} className="text-[9px] font-black text-white bg-emerald-600 rounded-lg uppercase tracking-widest px-4 py-2 shadow-lg shadow-emerald-950/20">Apply</button>
                            </div>
                         </div>
                       ) : (
                         <div onClick={() => { setAdjustingPriceId(product.id); setTempNewPrice(product.basePrice); setTempNewDiscount(product.discountPercentage || 0); setTempNewTax(product.taxPercentage || 0); }} className="text-right cursor-pointer group/price flex flex-col items-end">
                            <div className="text-[9px] font-black text-stone-400 uppercase mb-1">Standard Rate</div>
                            <div className="text-xl font-black text-stone-900 dark:text-stone-100 leading-none group-hover/price:scale-110 transition-transform">{currency.symbol}{product.basePrice.toFixed(2)}</div>
                            <div className="mt-2 flex items-center gap-1.5">
                               {product.discountPercentage ? <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">-{product.discountPercentage}%</span> : null}
                               {product.taxPercentage ? <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">+{product.taxPercentage}%</span> : null}
                            </div>
                         </div>
                       )}
                     </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 relative z-10 border-t border-stone-50 dark:border-stone-800 pt-6">
                     <div>
                        <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1">Realized Avg</p>
                        <p className={`text-lg font-black ${avgSalePrice > 0 ? 'text-emerald-500' : 'text-stone-300 dark:text-stone-700'}`}>
                           {avgSalePrice > 0 ? `${currency.symbol}${avgSalePrice.toFixed(2)}` : 'No Sales'}
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1">Current Inventory</p>
                        <p className={`text-lg font-black ${product.currentStock <= product.minStockLevel ? 'text-amber-500' : 'text-stone-900 dark:text-white'}`}>{product.currentStock} <span className="text-[10px] uppercase opacity-40">{product.unit}</span></p>
                     </div>
                  </div>

                  <div className="mt-8 flex items-end justify-between relative z-10">
                     <div className="flex items-center gap-2">
                        <button onClick={() => setEditingProduct({...product})} className="p-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-900/30" title="Full Edit">✏️</button>
                        <button onClick={() => setRenamingId(product.id)} className="p-2.5 bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-xl hover:text-emerald-600 transition-all border border-stone-100 dark:border-stone-700" title="Rename">🏷️</button>
                        <button onClick={() => { setAdjustingPriceId(product.id); setTempNewPrice(product.basePrice); setTempNewDiscount(product.discountPercentage || 0); setTempNewTax(product.taxPercentage || 0); }} className="p-2.5 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-xl hover:bg-amber-100 transition-all border border-amber-100 dark:border-amber-900/30" title="Edit Tax/Discount">⚖️</button>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedProductForReport(product)} className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-black dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Audit</button>
                        <button onClick={() => setProductToDelete(product)} className="p-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl hover:bg-rose-100 transition-all border border-rose-100 dark:border-rose-900/30">🗑️</button>
                     </div>
                  </div>
                  <span className="absolute -bottom-4 -right-4 text-7xl opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-700">{getEmoji(product.category)}</span>
               </div>
             )})}
          </div>
        </div>
      </div>

      {/* BULK CSV IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-[#0c0a09] w-full max-w-[min(540px,calc(100vw-32px))] p-10 rounded-[3rem] border border-stone-800 shadow-[0_0_100px_rgba(16,185,129,0.1)] space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Catalogue Importer</h3>
                <button onClick={() => setShowBulkModal(false)} className="text-stone-500 hover:text-white text-3xl">✕</button>
              </div>
              <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10">
                 <p className="text-xs font-bold text-stone-400 leading-relaxed">
                   Upload a CSV file with the following headers: <br/>
                   <span className="text-emerald-500 font-black">Name, Category, Unit, Price, Stock, MinLevel</span>
                 </p>
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-stone-800 rounded-[2rem] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group"
              >
                 <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</span>
                 <p className="text-[10px] font-black uppercase text-stone-500 tracking-[0.3em]">Click to select CSV Source</p>
                 <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleCsvImport} />
              </div>
              {bulkError && <p className="text-center text-rose-500 font-black uppercase text-[10px] tracking-widest">{bulkError}</p>}
              <button onClick={() => setShowBulkModal(false)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest">Back</button>
           </div>
        </div>
      )}

      {/* FULL EDIT ASSET MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-[#0c0a09] w-full max-w-[min(480px,calc(100vw-32px))] p-10 rounded-[3rem] border border-stone-800 shadow-[0_0_100px_rgba(16,185,129,0.1)] space-y-8 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between"><h3 className="text-2xl font-black text-white uppercase tracking-tighter">Edit Asset Details</h3><button onClick={() => setEditingProduct(null)} className="text-stone-500 hover:text-white text-3xl">✕</button></div>
              <form onSubmit={handleUpdateAsset} className="space-y-6">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Asset Identity</label><input required className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 text-white" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}/></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Category</label><select className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-4 py-4 font-black outline-none appearance-none focus:border-emerald-500 text-white" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}><option value="Vegetables">Vegetables</option><option value="Fruits">Fruits</option><option value="Dairy">Dairy</option><option value="Grains">Grains</option><option value="General">General</option><option value="Service">Service</option><option value="Other">Other</option></select></div><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Unit</label><select className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-4 py-4 font-black outline-none appearance-none focus:border-emerald-500 text-white" value={editingProduct.unit} onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}><option value="kg">kg</option><option value="piece">piece</option><option value="litres">litres</option><option value="box">box</option><option value="crate">crate</option><option value="bag">bag</option></select></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Price ({currency.symbol})</label><input type="number" step="0.01" className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 text-white" value={editingProduct.basePrice} onChange={e => setEditingProduct({...editingProduct, basePrice: Number(e.target.value)})}/></div><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Min. Stock Alert</label><input type="number" className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 text-white" value={editingProduct.minStockLevel} onChange={e => setEditingProduct({...editingProduct, minStockLevel: Number(e.target.value)})}/></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Discount (%)</label><input type="number" className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 text-white" value={editingProduct.discountPercentage || 0} onChange={e => setEditingProduct({...editingProduct, discountPercentage: Number(e.target.value)})}/></div><div className="space-y-1.5"><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Tax (%)</label><input type="number" className="w-full bg-[#1c1917] border-2 border-stone-800 rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 text-white" value={editingProduct.taxPercentage || 0} onChange={e => setEditingProduct({...editingProduct, taxPercentage: Number(e.target.value)})}/></div></div>
                <div className="flex flex-col gap-3 pt-6"><button className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest active:scale-95 shadow-xl shadow-emerald-950/40 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"><span>Update Asset Record</span><span className="text-xl">✅</span></button><button type="button" onClick={() => setEditingProduct(null)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Abort Changes</button></div>
              </form>
           </div>
        </div>
      )}

      {/* PERFORMANCE DRAWER & DELETE MODAL */}
      {selectedProductForReport && productReport && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex items-center justify-end animate-in fade-in slide-in-from-right-10 duration-500">
           <div className="h-full w-full max-w-2xl bg-white dark:bg-stone-950 shadow-2xl flex flex-col overflow-hidden relative">
              <button onClick={() => setSelectedProductForReport(null)} className="absolute top-8 left-8 w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-xl font-black z-20">←</button>
              <div className="flex-1 overflow-y-auto no-scrollbar p-10 md:p-16 space-y-16">
                 <div className="text-center space-y-6"><div className="w-32 h-32 bg-stone-50 dark:bg-stone-900 rounded-[2rem] mx-auto flex items-center justify-center text-6xl shadow-inner relative overflow-hidden">{selectedProductForReport.imageUrl ? (<img src={selectedProductForReport.imageUrl} alt="" className="w-full h-full object-cover" />) : (getEmoji(selectedProductForReport.category))}</div><div><h2 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter">{selectedProductForReport.name}</h2><p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.5em] mt-2">Logistical Health Audit</p></div></div>
                 <div className="grid grid-cols-2 gap-4"><div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800/40"><span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Total Revenue</span><p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{currency.symbol}{productReport.totalRevenue.toFixed(2)}</p></div><div className="bg-stone-50 dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-100 dark:border-stone-800"><span className="text-[9px] font-black text-stone-500 uppercase tracking-widest block mb-2">Volume Sold</span><p className="text-3xl font-black text-black dark:text-white">{productReport.totalQty} <span className="text-sm opacity-40 uppercase">{selectedProductForReport.unit}</span></p></div></div>
                 <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] px-2">Liquidity Analysis</h4>
                    <div className="bg-[#0c0a09] rounded-[2.5rem] p-8 border border-stone-800 space-y-8 shadow-2xl"><div className="flex items-end justify-between"><div className="space-y-1"><span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">Cash Collected</span><p className="text-2xl font-black text-white">{currency.symbol}{productReport.paidAmount.toFixed(2)}</p></div><div className="text-right space-y-1"><span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em]">Accounts Receivable</span><p className="text-2xl font-black text-white">{currency.symbol}{productReport.pendingAmount.toFixed(2)}</p></div></div><div className="h-3 w-full bg-stone-900 rounded-full overflow-hidden flex border border-stone-800"><div className="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${(productReport.paidAmount / (productReport.totalRevenue || 1)) * 100}%` }}></div><div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${(productReport.pendingAmount / (productReport.totalRevenue || 1)) * 100}%` }}></div></div></div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] px-2">Movement Ledger</h4>
                    <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 overflow-hidden shadow-xl"><table className="min-w-full divide-y-2 divide-stone-100 dark:divide-stone-800"><thead className="bg-stone-50 dark:bg-stone-950"><tr><th className="px-6 py-4 text-left text-[9px] font-black uppercase text-stone-400 tracking-widest">Client</th><th className="px-6 py-4 text-center text-[9px] font-black uppercase text-stone-400 tracking-widest">Qty</th><th className="px-6 py-4 text-right text-[9px] font-black uppercase text-stone-400 tracking-widest">Amount</th></tr></thead><tbody className="divide-y divide-stone-100 dark:divide-stone-800">{productReport.recentLedger.map(sale => (<tr key={sale.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"><td className="px-6 py-5"><p className="font-black text-xs text-black dark:text-stone-100 uppercase">{sale.customerName}</p><p className="text-[8px] font-bold text-stone-400 mt-1 uppercase tracking-tighter">{formatDualDate(sale.date)}</p></td><td className="px-6 py-5 text-center font-black text-xs text-stone-600 dark:text-stone-400">{sale.quantity}{selectedProductForReport.unit}</td><td className="px-6 py-5 text-right font-black text-sm text-emerald-600">{currency.symbol}{sale.totalAmount.toFixed(2)}</td></tr>))}</tbody></table></div>
                 </div>
              </div>
           </div>
        </div>
      )}
      {productToDelete && (<div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300"><div className="bg-[#0c0a09] w-full max-sm p-12 rounded-[3.5rem] shadow-3xl border border-stone-800 text-center space-y-8"><div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-5xl mx-auto border border-rose-500/20 shadow-inner">🗑️</div><div><h4 className="text-2xl font-black text-white uppercase tracking-tighter">Destroy Asset?</h4><p className="text-stone-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 px-2 leading-relaxed">You are about to permanently wipe <span className="text-rose-500 font-black">"{productToDelete.name}"</span> from the enterprise catalog. This cannot be reversed.</p></div>{deleteError && (<div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">{deleteError}</div>)}<div className="flex flex-col gap-3"><button onClick={handleFinalDelete} disabled={isDeleting} className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl shadow-rose-950/20 hover:bg-rose-500 transition-all flex items-center justify-center space-x-3">{isDeleting ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>Wiping Records...</span></>) : (<span>Delete Permanently</span>)}</button><button onClick={() => setProductToDelete(null)} disabled={isDeleting} className="w-full py-4 bg-stone-900 text-stone-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">Abort Action</button></div></div></div>)}
    </div>
  );
};
