
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer, Product, Currency, Sale } from '../types';

interface BillingManagerProps {
  products: Product[];
  customers: Customer[];
  onAddSale: (sale: Sale) => void;
  onAddCustomer?: (customer: Customer) => void;
  currency: Currency;
}

interface BillItem {
  id: string;
  productId: string;
  quantity: number;
  rate: number;
  discountApplied: number;
  taxApplied: number;
}

interface ProcessedBill {
  customer: Customer;
  items: { 
    product: Product; 
    quantity: number; 
    rate: number;
    discountAmt: number;
    taxAmt: number;
    netTotal: number;
  }[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  date: number;
  txnId: string;
}

export const BillingManager: React.FC<BillingManagerProps> = ({ 
  products, 
  customers, 
  onAddSale, 
  onAddCustomer,
  currency 
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [billingProductId, setBillingProductId] = useState('');
  const [billingQty, setBillingQty] = useState<number>(1);
  const [billingRate, setBillingRate] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastBill, setLastBill] = useState<ProcessedBill | null>(null);

  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [custError, setCustError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const addBillItem = () => {
    if (!billingProductId || billingQty <= 0) return;
    const prod = products.find(p => p.id === billingProductId);
    if (!prod) return;

    const newItem: BillItem = {
      id: Date.now().toString(),
      productId: billingProductId,
      quantity: billingQty,
      rate: billingRate,
      discountApplied: prod.discountPercentage || 0,
      taxApplied: prod.taxPercentage || 0
    };
    setBillItems([...billItems, newItem]);
    setBillingProductId('');
    setBillingQty(1);
    setBillingRate(0);
  };

  const removeBillItem = (id: string) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const calculateItemTotals = (item: BillItem) => {
    const prod = products.find(p => p.id === item.productId);
    const gross = item.quantity * item.rate;
    const discountAmt = gross * (item.discountApplied / 100);
    const taxable = gross - discountAmt;
    const taxAmt = taxable * (item.taxApplied / 100);
    const netTotal = taxable + taxAmt;
    return { gross, discountAmt, taxAmt, netTotal };
  };

  const totalBillAmount = billItems.reduce((sum, item) => {
    return sum + calculateItemTotals(item).netTotal;
  }, 0);

  const handleCreateCustomer = () => {
    const trimmedName = newCustName.trim();
    if (!trimmedName) { setCustError("Name is mandatory."); return; }
    if (customers.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) { setCustError(`"${trimmedName}" exists.`); return; }
    const newCust: Customer = { id: Date.now().toString(), name: trimmedName, phone: newCustPhone.trim(), createdAt: Date.now() };
    if (onAddCustomer) onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setCustomerSearch(newCust.name);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setCustError(null);
  };

  const handleProcessCheckout = () => {
    if (!selectedCustomerId || billItems.length === 0) return;
    
    setIsProcessing(true);
    const txnId = `TXN-${Date.now().toString().slice(-6)}`;
    const currentCustomer = customers.find(c => c.id === selectedCustomerId)!;
    
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    // Prepare bill data for printing before clearing items
    const processedItems = billItems.map(item => {
      const prod = products.find(p => p.id === item.productId)!;
      const { gross, discountAmt, taxAmt, netTotal } = calculateItemTotals(item);
      
      subtotal += gross;
      totalDiscount += discountAmt;
      totalTax += taxAmt;

      return {
        product: prod,
        quantity: item.quantity,
        rate: item.rate,
        discountAmt,
        taxAmt,
        netTotal
      };
    });

    setLastBill({
      customer: currentCustomer,
      items: processedItems,
      subtotal,
      totalDiscount,
      totalTax,
      total: totalBillAmount,
      date: Date.now(),
      txnId: txnId
    });
    
    // Process each item as an individual sale record
    billItems.forEach(item => {
      const { netTotal } = calculateItemTotals(item);
      onAddSale({
        id: Date.now().toString() + Math.random(),
        customerId: selectedCustomerId,
        productId: item.productId,
        quantity: item.quantity,
        totalAmount: netTotal,
        date: Date.now(),
        paymentStatus: 'Paid',
        notes: `Dedicated Multi-Item Invoice ${txnId}`
      });
    });

    // Reset UI state
    setTimeout(() => {
        setBillItems([]);
        setSelectedCustomerId('');
        setCustomerSearch('');
        setIsProcessing(false);
        setShowConfirmModal(false);
        setShowPrintModal(true);
    }, 400);
  };

  const downloadPremiumBill = () => {
    if (!lastBill) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${lastBill.txnId}</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1c1917; margin: 0; padding: 40px; background: #fafaf9; line-height: 1.5; }
          .invoice-box { max-width: 850px; margin: auto; padding: 60px; background: #fff; border-radius: 40px; border: 1px solid #e7e5e4; box-shadow: 0 40px 100px rgba(0,0,0,0.04); position: relative; overflow: hidden; }
          .invoice-box::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 10px; background: #059669; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
          .brand-logo { width: 50px; height: 50px; background: #059669; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 15px; }
          .brand-name { font-size: 24px; font-weight: 900; letter-spacing: -1.5px; color: #1c1917; text-transform: uppercase; }
          .invoice-meta { text-align: right; }
          .meta-label { font-size: 10px; font-weight: 800; color: #a8a29e; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
          .meta-value { font-size: 16px; font-weight: 700; color: #44403c; }
          .billing-info { display: grid; grid-cols: 2; gap: 40px; margin-bottom: 60px; }
          .info-block h4 { font-size: 11px; font-weight: 800; color: #a8a29e; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0; }
          .info-block p { margin: 0; font-size: 15px; font-weight: 600; color: #1c1917; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { text-align: left; padding: 20px 15px; border-bottom: 2px solid #f5f5f4; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #a8a29e; letter-spacing: 1.5px; }
          td { padding: 25px 15px; border-bottom: 1px solid #f5f5f4; font-size: 14px; color: #44403c; }
          .item-name { font-weight: 800; color: #1c1917; display: block; }
          .item-meta { font-size: 11px; color: #a8a29e; font-weight: 600; margin-top: 4px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .summary { display: flex; justify-content: flex-end; }
          .summary-table { width: 320px; }
          .summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; font-weight: 600; color: #57534e; }
          .summary-row.total { padding-top: 25px; margin-top: 15px; border-top: 2px solid #f5f5f4; color: #1c1917; }
          .total-label { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
          .total-value { font-size: 32px; font-weight: 900; color: #059669; letter-spacing: -1px; }
          .footer { margin-top: 80px; padding-top: 40px; border-top: 1px solid #f5f5f4; text-align: center; font-size: 11px; color: #a8a29e; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="brand-logo">🌱</div>
              <div class="brand-name">FarmTrack</div>
            </div>
            <div class="invoice-meta">
              <div class="meta-label">Invoice Number</div>
              <div class="meta-value">${lastBill.txnId}</div>
              <div class="meta-label" style="margin-top: 20px;">Date Issued</div>
              <div class="meta-value">${new Date(lastBill.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
            </div>
          </div>
          
          <div class="billing-info">
            <div class="info-block">
              <h4>Billed To</h4>
              <p>${lastBill.customer.name}</p>
              <p style="color: #78716c; font-weight: 500;">${lastBill.customer.phone}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Rate</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lastBill.items.map(item => `
                <tr>
                  <td>
                    <span class="item-name">${item.product.name}</span>
                    <div class="item-meta">
                      ${item.product.category} 
                      ${item.discountAmt > 0 ? `• Discount Applied` : ''}
                      ${item.taxAmt > 0 ? `• Tax Included` : ''}
                    </div>
                  </td>
                  <td class="text-center font-bold">${currency.symbol}${item.rate.toFixed(2)}</td>
                  <td class="text-center">${item.quantity} ${item.product.unit}</td>
                  <td class="text-right font-bold">${currency.symbol}${item.netTotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-table">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${currency.symbol}${lastBill.subtotal.toFixed(2)}</span>
              </div>
              ${lastBill.totalDiscount > 0 ? `
                <div class="summary-row" style="color: #d97706;">
                  <span>Total Discount</span>
                  <span>-${currency.symbol}${lastBill.totalDiscount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${lastBill.totalTax > 0 ? `
                <div class="summary-row">
                  <span>Tax Amount</span>
                  <span>+${currency.symbol}${lastBill.totalTax.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="summary-row total">
                <span class="total-label">Grand Total</span>
                <span class="total-value">${currency.symbol}${lastBill.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            Thank you for choosing FarmTrack Enterprise • Empowering Modern Agriculture
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FarmTrack_Invoice_${lastBill.txnId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowPrintModal(false);
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <h2 className="text-4xl font-black text-black dark:text-stone-100 tracking-tighter uppercase">Smart Billing</h2>
          <p className="text-stone-500 font-bold uppercase text-xs tracking-[0.3em] mt-2">Enterprise POS • Multi-Item Checkout</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Selection & Addition */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-xl space-y-6">
              <div className="relative" ref={customerDropdownRef}>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Choose Client</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="Search Client..."
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                  />
                  <button type="button" onClick={() => { setCustError(null); setShowNewCustomerModal(true); }} className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 px-4 py-3 rounded-2xl font-black hover:bg-emerald-600 hover:text-white transition-all active:scale-90" title="Enroll New Client">+</button>
                </div>
                {isCustomerDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-3xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                    {filteredCustomers.map(c => (
                      <button key={c.id} type="button" onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); setIsCustomerDropdownOpen(false); }} className="w-full text-left px-5 py-4 hover:bg-emerald-600/10 font-black text-xs text-stone-800 dark:text-stone-100 uppercase border-b border-stone-100 dark:border-stone-800/50">{c.name}</button>
                    ))}
                    <button type="button" onClick={() => { setCustError(null); setShowNewCustomerModal(true); setIsCustomerDropdownOpen(false); }} className="w-full text-left px-5 py-4 text-emerald-500 font-black text-[10px] uppercase bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">+ Add New Profile</button>
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-4 border-t border-stone-100 dark:border-stone-800">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Add Product</label>
                    <select 
                      className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500 appearance-none transition-all"
                      value={billingProductId}
                      disabled={!selectedCustomerId}
                      onChange={e => {
                        const pid = e.target.value;
                        setBillingProductId(pid);
                        const prod = products.find(p => p.id === pid);
                        if (prod) setBillingRate(prod.basePrice);
                      }}
                    >
                      <option value="">Choose Variety</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currentStock}{p.unit})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Rate ({currency.symbol})</label>
                       <input 
                        type="number"
                        className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500"
                        value={billingRate}
                        disabled={!billingProductId}
                        onChange={e => setBillingRate(Number(e.target.value))}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Qty</label>
                       <input 
                        type="number"
                        className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-5 py-4 font-black text-black dark:text-white outline-none focus:border-emerald-500"
                        value={billingQty}
                        disabled={!billingProductId}
                        onChange={e => setBillingQty(Number(e.target.value))}
                       />
                    </div>
                  </div>

                  <button 
                    onClick={addBillItem}
                    disabled={!billingProductId}
                    className="w-full py-5 bg-black dark:bg-stone-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] active:scale-95 shadow-xl transition-all disabled:opacity-20 hover:bg-emerald-600"
                  >
                    Add To Ledger
                  </button>
              </div>
           </div>
        </div>

        {/* Right Section: Bill Ledger & Checkout */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col min-h-[550px]">
              <div className="p-8 bg-emerald-600/5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-black dark:text-stone-100 uppercase tracking-tighter leading-none">Invoice Ledger</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">
                       {selectedCustomer ? `Billed To: ${selectedCustomer.name}` : 'Awaiting Client Selection'}
                    </p>
                 </div>
                 <div className="text-right">
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-[0.3em]">Transaction ID</span>
                    <p className="text-xs font-bold text-stone-400">TXN-{Date.now().toString().slice(-6)}</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                 <table className="min-w-full divide-y divide-stone-100 dark:divide-stone-800">
                    <thead className="bg-stone-50/50 dark:bg-stone-950/50">
                       <tr>
                          <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">Description</th>
                          <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">Adjustments</th>
                          <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">Qty</th>
                          <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Net Value</th>
                          <th className="px-4 py-5"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                       {billItems.map(item => {
                          const prod = products.find(p => p.id === item.productId);
                          const { netTotal } = calculateItemTotals(item);
                          return (
                            <tr key={item.id} className="group hover:bg-stone-50 dark:hover:bg-stone-800/20 transition-colors">
                               <td className="px-8 py-5">
                                  <span className="font-black text-sm text-black dark:text-stone-100 uppercase block leading-none">{prod?.name || 'Unknown Item'}</span>
                                  <span className="text-[9px] font-bold text-stone-400 mt-1 uppercase block">{currency.symbol}{item.rate.toFixed(2)} per {prod?.unit}</span>
                               </td>
                               <td className="px-4 py-5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                     {item.discountApplied > 0 && <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">-{item.discountApplied}% OFF</span>}
                                     {item.taxApplied > 0 && <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase">+{item.taxApplied}% TAX</span>}
                                     {item.discountApplied === 0 && item.taxApplied === 0 && <span className="text-[8px] font-black text-stone-300">Standard</span>}
                                  </div>
                               </td>
                               <td className="px-4 py-5 text-center">
                                  <span className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-lg font-black text-xs text-stone-600 dark:text-stone-400">
                                    {item.quantity}{prod?.unit}
                                  </span>
                               </td>
                               <td className="px-8 py-5 text-right font-black text-base text-emerald-600 tracking-tight">{currency.symbol}{netTotal.toFixed(2)}</td>
                               <td className="px-4 py-5 text-right">
                                  <button onClick={() => removeBillItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors hover:scale-125">✕</button>
                               </td>
                            </tr>
                          );
                       })}
                       {billItems.length === 0 && (
                          <tr>
                             <td colSpan={5} className="py-32 text-center opacity-20">
                                <span className="text-6xl block mb-6 grayscale">🛒</span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Ledger</p>
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              <div className="p-8 bg-stone-50 dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                 <div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 block">Payable Balance</span>
                    <p className="text-5xl font-black text-emerald-600 tracking-tighter">{currency.symbol}{totalBillAmount.toFixed(2)}</p>
                 </div>
                 <button 
                  onClick={() => setShowConfirmModal(true)}
                  disabled={billItems.length === 0 || !selectedCustomerId || isProcessing}
                  className="px-12 py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-sm tracking-[0.3em] active:scale-95 shadow-2xl shadow-emerald-500/40 disabled:opacity-20 disabled:grayscale transition-all hover:bg-emerald-500"
                 >
                   {isProcessing ? 'SYNCHRONIZING...' : 'CHECKOUT NOW'}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* NEW CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md p-10 rounded-[3.5rem] border-2 border-stone-100 dark:border-stone-800 shadow-3xl space-y-10">
            <div className="text-center"><h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter">Register Client</h3><p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-2">Create New Billing Profile</p></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Identity Name</label><input className={`w-full bg-stone-50 dark:bg-stone-800 border-2 rounded-2xl px-6 py-5 font-black outline-none focus:border-emerald-500 text-black dark:text-white text-lg ${custError ? 'border-rose-500' : 'border-stone-100 dark:border-stone-700'}`} placeholder="e.g. Liam T." value={newCustName} onChange={e => { setNewCustName(e.target.value); setCustError(null); }} autoFocus />{custError && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1">{custError}</p>}</div>
              <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Phone Reference</label><input className="w-full bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-2xl px-6 py-5 font-black outline-none focus:border-emerald-500 text-black dark:text-white text-lg" placeholder="+977..." value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} /></div>
              <div className="flex flex-col gap-3 pt-6"><button onClick={handleCreateCustomer} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl">Complete Registration</button><button onClick={() => setShowNewCustomerModal(false)} className="w-full py-4 text-stone-500 font-black uppercase text-[10px] tracking-widest">Abort</button></div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm p-10 rounded-[3rem] border-2 border-stone-100 dark:border-stone-800 shadow-3xl text-center space-y-8">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-4xl mx-auto border border-emerald-200">💰</div>
            <div>
              <h4 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Finalize Sale?</h4>
              <p className="text-stone-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-4 leading-relaxed">
                Confirm processing for {selectedCustomer?.name}. Inventory, discounts, and taxes will be applied to the records.
              </p>
            </div>
            <div className="flex flex-col gap-3">
               <button 
                onClick={handleProcessCheckout}
                disabled={isProcessing}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl shadow-emerald-950/40"
               >
                 {isProcessing ? 'Processing...' : 'Yes, Complete Order'}
               </button>
               <button 
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="w-full py-4 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-rose-500 transition-colors"
               >
                 No, Back to Cart
               </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PROMPT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm p-10 rounded-[3rem] border-2 border-stone-100 dark:border-stone-800 shadow-3xl text-center space-y-8">
            <div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center text-4xl mx-auto shadow-2xl">✨</div>
            <div>
              <h4 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Success!</h4>
              <p className="text-stone-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-4 leading-relaxed">
                Sale registered successfully. Would you like to generate a premium printable bill with adjusted taxes and discounts?
              </p>
            </div>
            <div className="flex flex-col gap-3">
               <button 
                onClick={downloadPremiumBill}
                className="w-full py-5 bg-black dark:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl flex items-center justify-center gap-3"
               >
                 <span>Download Premium Bill</span>
                 <span className="text-xl">📄</span>
               </button>
               <button 
                onClick={() => setShowPrintModal(false)}
                className="w-full py-4 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-black transition-colors"
               >
                 Dismiss
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
