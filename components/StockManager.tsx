
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Currency, Sale } from '../types';

interface StockManagerProps {
  products: Product[];
  sales: Sale[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onDeleteProduct: (id: string) => void;
  currency: Currency;
}

type AdjustmentMode = 'add' | 'remove' | 'set';

export const StockManager: React.FC<StockManagerProps> = ({ products, sales, onUpdateStock, onDeleteProduct, currency }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('add');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  
  // Filter products: Only show if they have stock OR if they have active sales history.
  // This ensures that if a sale is deleted and the product has 0 stock, it disappears from this view.
  const visibleProducts = useMemo(() => {
    return products.filter(p => {
      const hasActiveSales = sales.some(s => s.productId === p.id);
      return p.currentStock > 0 || hasActiveSales;
    });
  }, [products, sales]);

  const notifiedProducts = useRef<Set<string>>(new Set());
  const lowStockProducts = visibleProducts.filter(p => p.currentStock <= p.minStockLevel);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const newlyLow = visibleProducts.filter(p => 
      p.currentStock <= p.minStockLevel && !notifiedProducts.current.has(p.id)
    );

    if (newlyLow.length > 0 && notifPermission === "granted") {
      newlyLow.forEach(p => {
        try {
          new Notification("Low Stock Alert! 🚜", {
            body: `${p.name} is running low (${p.currentStock} ${p.unit} remaining). Time to restock!`,
            icon: 'https://cdn-icons-png.flaticon.com/512/135/135620.png'
          });
          notifiedProducts.current.add(p.id);
        } catch (e) {
          console.error("Notification failed", e);
        }
      });
    }

    products.forEach(p => {
      if (p.currentStock > p.minStockLevel && notifiedProducts.current.has(p.id)) {
        notifiedProducts.current.delete(p.id);
      }
    });
  }, [visibleProducts, products, notifPermission]);

  const requestPermission = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    Notification.requestPermission().then(permission => {
      setNotifPermission(permission);
    });
  };

  const calculateNewStock = (current: number) => {
    if (adjustmentMode === 'add') return current + editValue;
    if (adjustmentMode === 'remove') return Math.max(0, current - editValue);
    return Math.max(0, editValue);
  };

  const handleSave = (product: Product) => {
    const finalValue = calculateNewStock(product.currentStock);
    onUpdateStock(product.id, finalValue);
    setEditingId(null);
    setEditValue(0);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-4xl font-black text-black dark:text-stone-100 tracking-tighter uppercase">Inventory Flow</h2>
          <p className="text-stone-500 dark:text-stone-500 font-bold uppercase text-xs tracking-[0.3em] mt-2">Logistics Control • {currency.code}</p>
        </div>
        <div className="flex items-center space-x-4">
          {notifPermission !== "granted" && (
            <button 
              onClick={requestPermission}
              className="bg-stone-900/10 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-stone-200 dark:border-stone-800"
            >
              Enable Notifications
            </button>
          )}
          <div className="bg-amber-500/10 px-5 py-3 rounded-2xl border border-amber-500/20 text-center min-w-[100px]">
            <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Low Items</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-500 leading-none">{lowStockProducts.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {visibleProducts.map(product => {
          const isLow = product.currentStock <= product.minStockLevel;
          const isEditing = editingId === product.id;

          return (
            <div key={product.id} className={`bg-[#0c0a09] p-10 rounded-[3rem] border transition-all shadow-2xl relative flex flex-col ${isLow ? 'border-amber-500/40 ring-4 ring-amber-500/5' : 'border-stone-800'}`}>
              
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center space-x-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-4xl bg-stone-900 border border-stone-800 shadow-inner`}>
                    {product.category === 'Dairy' ? '🥛' : product.category === 'Vegetables' ? '🥦' : product.category === 'Fruits' ? '🍎' : '🌱'}
                  </div>
                  <div>
                    <h4 className="font-black text-white leading-none text-2xl uppercase tracking-tighter">{product.name}</h4>
                    <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.3em] mt-2">{product.category}</p>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm(`PERMANENTLY remove "${product.name}" from inventory?`)) onDeleteProduct(product.id); 
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-stone-900 border border-stone-800 rounded-2xl text-stone-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 group"
                  title="Remove Asset"
                >
                  <span className="text-xl">🗑️</span>
                </button>
              </div>

              <div className="flex-1 space-y-8">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] mb-3">Asset Volume</span>
                    <span className={`text-6xl font-black leading-none tracking-tighter ${isLow ? 'text-amber-500' : 'text-white'}`}>
                      {product.currentStock}
                      <span className="text-xl font-black ml-4 opacity-40 uppercase tracking-widest">{product.unit}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] mb-2 block">Min Level</span>
                    <p className="font-black text-stone-500 text-base">{product.minStockLevel} {product.unit}</p>
                  </div>
                </div>

                <div className="h-4 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-800 p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isLow ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                    style={{ width: `${Math.max(4, Math.min(100, (product.currentStock / (product.minStockLevel * 4)) * 100))}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-10">
                {isEditing ? (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
                    <div className="flex bg-stone-900 p-1.5 rounded-2xl border border-stone-800">
                       {(['add', 'remove', 'set'] as AdjustmentMode[]).map(mode => (
                         <button 
                           key={mode}
                           onClick={() => setAdjustmentMode(mode)}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adjustmentMode === mode ? 'bg-white text-black shadow-lg' : 'text-stone-500 hover:text-white'}`}
                         >
                           {mode}
                         </button>
                       ))}
                    </div>

                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-stone-500">
                          {adjustmentMode === 'add' ? '+' : adjustmentMode === 'remove' ? '-' : '='}
                        </span>
                        <input 
                          type="number"
                          min="0"
                          className="w-full bg-stone-900 border-2 border-emerald-500/50 rounded-2xl pl-12 pr-6 py-5 font-black text-3xl text-emerald-500 outline-none focus:ring-8 ring-emerald-500/5 transition-all"
                          value={editValue || ''}
                          onChange={e => setEditValue(Number(e.target.value))}
                          onFocus={e => e.target.select()}
                          autoFocus
                        />
                      </div>
                      <button 
                        onClick={() => handleSave(product)}
                        className="bg-emerald-600 text-white px-10 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-2xl shadow-emerald-950/40 active:scale-95 hover:bg-emerald-500"
                      >
                        Confirm
                      </button>
                    </div>

                    <div className="bg-stone-900/50 p-5 rounded-2xl border border-dashed border-stone-800 text-center">
                       <span className="text-[10px] font-black uppercase text-stone-600 tracking-[0.3em]">Projection: </span>
                       <span className="text-base font-black text-white ml-2">
                          {product.currentStock} {adjustmentMode === 'add' ? '+' : adjustmentMode === 'remove' ? '-' : '→'} {editValue} = <span className="text-emerald-500">{calculateNewStock(product.currentStock)} {product.unit}</span>
                       </span>
                    </div>

                    <button 
                      onClick={() => { setEditingId(null); setEditValue(0); }}
                      className="w-full py-2 text-[10px] font-black uppercase text-stone-500 hover:text-rose-500 tracking-[0.4em] transition-colors"
                    >
                      Cancel Adjustment
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingId(product.id);
                      setEditValue(0);
                      setAdjustmentMode('add');
                    }}
                    className="w-full flex items-center justify-center space-x-4 py-6 bg-stone-900 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.4em] transition-all hover:bg-stone-800 active:scale-[0.98] border border-stone-800 shadow-xl"
                  >
                    <span className="text-lg">⚙️</span>
                    <span>Adjust Logistics</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {visibleProducts.length === 0 && (
        <div className="py-32 text-center opacity-20">
           <span className="text-7xl block mb-8">📦</span>
           <p className="text-sm font-black uppercase tracking-[0.5em]">Inventory Empty</p>
           <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mt-4">Restock items or record sales to activate assets.</p>
        </div>
      )}
    </div>
  );
};
