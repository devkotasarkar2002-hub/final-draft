
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SalesForm } from './components/SalesForm';
import { BillingManager } from './components/BillingManager';
import { CustomerList } from './components/CustomerList';
import { ProductManager } from './components/ProductManager';
import { StockManager } from './components/StockManager';
import { SmartInsights } from './components/SmartInsights';
import { Settings } from './components/Settings';
import { WelcomeScreen } from './components/WelcomeScreen';
import { FinanceManager } from './components/FinanceManager';
import { BalanceSheet } from './components/BalanceSheet';
import { SalesReport } from './components/SalesReport';
import { AuthPortal } from './components/AuthPortal';
import { generateProductImage } from './services/geminiService';
import { auth, db, syncToCloud } from './services/firebaseService';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Sale, Customer, Product, CurrencyCode, Currency, SUPPORTED_CURRENCIES, Expense, Liability, DateSystem, ActivityLog } from './types';

export type ThemeMode = 'light' | 'dark' | 'system';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline';

const STORAGE_KEY = 'farmtrack_local_data';
const OFFLINE_FLAG = 'farmtrack_use_offline';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => localStorage.getItem(OFFLINE_FLAG) === 'true');
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  // App Config States
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [dateSystem, setDateSystem] = useState<DateSystem>('BS');
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('USD');
  const [customCurrency, setCustomCurrency] = useState<Currency | null>(null);

  // Data State
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Navigation State
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) setIsOfflineMode(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOfflineMode) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.sales) setSales(data.sales);
          if (data.customers) setCustomers(data.customers);
          if (data.products) setProducts(data.products);
          if (data.expenses) setExpenses(data.expenses);
          if (data.liabilities) setLiabilities(data.liabilities);
          if (data.logs) setLogs(data.logs);
          if (data.themeMode) setThemeMode(data.themeMode);
          if (data.dateSystem) setDateSystem(data.dateSystem);
          if (data.currencyCode) setCurrencyCode(data.currencyCode);
          if (data.customCurrency) setCustomCurrency(data.customCurrency);
        } catch (e) {
          console.error("Local Data Parse Error", e);
        }
      }
    } else if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sales) setSales(data.sales);
          if (data.customers) setCustomers(data.customers);
          if (data.products) setProducts(data.products);
          if (data.expenses) setExpenses(data.expenses);
          if (data.liabilities) setLiabilities(data.liabilities);
          if (data.logs) setLogs(data.logs);
          if (data.themeMode) setThemeMode(data.themeMode);
          if (data.dateSystem) setDateSystem(data.dateSystem);
          if (data.currencyCode) setCurrencyCode(data.currencyCode);
          if (data.customCurrency) setCustomCurrency(data.customCurrency);
        }
      });
      return unsub;
    }
  }, [user, isOfflineMode]);

  const firstSync = useRef(true);
  useEffect(() => {
    if (!user && !isOfflineMode) return;
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }

    const triggerSync = async () => {
      setSaveStatus(isOfflineMode ? 'offline' : 'saving');
      const dataToSave = {
        sales, customers, products, expenses, liabilities, logs,
        themeMode, dateSystem, currencyCode, customCurrency,
        lastUpdated: Date.now()
      };

      if (isOfflineMode) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        setTimeout(() => setSaveStatus('idle'), 1000);
      } else if (user) {
        await syncToCloud(user.uid, dataToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    };

    const timer = setTimeout(triggerSync, 1000);
    return () => clearTimeout(timer);
  }, [sales, customers, products, expenses, liabilities, logs, themeMode, dateSystem, currencyCode, customCurrency, user, isOfflineMode]);

  const currency = useMemo(() => {
    if (currencyCode === 'CUSTOM' && customCurrency) return customCurrency;
    return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  }, [currencyCode, customCurrency]);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        document.body.style.backgroundColor = '#0c0a09';
      } else {
        root.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
      }
    };
    if (themeMode === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemDark);
    } else {
      applyTheme(themeMode === 'dark');
    }
  }, [themeMode]);

  const recordActivity = (action: ActivityLog['action'], entityName: string, customerName: string, amount: number, details: string, metadata?: any) => {
    const newLog: ActivityLog = { id: Date.now().toString() + Math.random(), action, timestamp: Date.now(), details, entityName, customerName, amount, metadata };
    setLogs(prev => [newLog, ...prev]);
  };

  const addSale = (newSale: Sale) => {
    const p = products.find(p => p.id === newSale.productId);
    const c = customers.find(c => c.id === newSale.customerId);
    setSales(prev => [newSale, ...prev]);
    setProducts(prev => prev.map(prod => prod.id === newSale.productId ? { ...prod, currentStock: Math.max(0, prod.currentStock - newSale.quantity) } : prod));
    recordActivity('Created', p?.name || 'Unknown', c?.name || 'Retail', newSale.totalAmount, `Sold ${newSale.quantity} units`);
  };

  const updateSale = (updatedSale: Sale) => {
    const oldSale = sales.find(s => s.id === updatedSale.id);
    if (!oldSale) return;
    setProducts(prev => {
      let next = [...prev];
      next = next.map(p => p.id === oldSale.productId ? { ...p, currentStock: p.currentStock + oldSale.quantity } : p);
      next = next.map(p => p.id === updatedSale.productId ? { ...p, currentStock: Math.max(0, p.currentStock - updatedSale.quantity) } : p);
      return next;
    });
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    const p = products.find(prod => prod.id === updatedSale.productId);
    const c = customers.find(cust => cust.id === updatedSale.customerId);
    recordActivity('Updated', p?.name || 'Unknown', c?.name || 'Unknown', updatedSale.totalAmount, `Adjusted quantity: ${updatedSale.quantity}, Status: ${updatedSale.paymentStatus}`);
  };

  const deleteSale = (id: string) => {
    const saleToDelete = sales.find(s => s.id === id);
    if (saleToDelete) {
      const p = products.find(prod => prod.id === saleToDelete.productId);
      const c = customers.find(cust => cust.id === saleToDelete.customerId);
      recordActivity('Deleted', p?.name || 'Unknown', c?.name || 'Unknown', saleToDelete.totalAmount, `Transaction removed from ledger`, saleToDelete);
    }
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const restoreSale = (log: ActivityLog) => {
    if (!log.metadata) return;
    const saleToRestore = log.metadata as Sale;
    if (sales.some(s => s.id === saleToRestore.id)) {
      alert("This record is already present in the active ledger.");
      return;
    }
    setSales(prev => [saleToRestore, ...prev]);
    setProducts(prev => prev.map(p => p.id === saleToRestore.productId ? { ...p, currentStock: Math.max(0, p.currentStock - saleToRestore.quantity) } : p));
    setLogs(prev => prev.filter(l => l.id !== log.id));
    recordActivity('Created', log.entityName, log.customerName, log.amount, `Restored archived transaction: ${log.details}`);
  };

  const addCustomer = (newCustomer: Customer) => setCustomers(prev => [newCustomer, ...prev]);
  
  const updateCustomer = (updatedCustomer: Customer) => {
    const oldCustomer = customers.find(c => c.id === updatedCustomer.id);
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    if (oldCustomer && oldCustomer.name !== updatedCustomer.name) {
      setLogs(prev => prev.map(log => 
        log.customerName === oldCustomer.name ? { ...log, customerName: updatedCustomer.name } : log
      ));
    }
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setSales(prev => prev.filter(s => s.customerId !== id));
  };

  const deleteLog = (id: string) => setLogs(prev => prev.filter(l => l.id !== id));

  const addExpense = (exp: Expense) => setExpenses(prev => [exp, ...prev]);
  const updateExpense = (updatedExp: Expense) => setExpenses(prev => prev.map(e => e.id === updatedExp.id ? updatedExp : e));
  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const addLiability = (lib: Liability) => setLiabilities(prev => [lib, ...prev]);
  const updateLiability = (updatedLib: Liability) => setLiabilities(prev => prev.map(l => l.id === updatedLib.id ? updatedLib : l));
  const settleLiability = (id: string) => setLiabilities(prev => prev.map(lib => lib.id === id ? { ...lib, status: 'Settled' } : lib));

  const addProduct = async (newProduct: Product) => {
    const isDuplicate = products.some(p => p.name.toLowerCase().trim() === newProduct.name.toLowerCase().trim());
    if (isDuplicate) return;
    const prodWithLoading = { ...newProduct, isGeneratingImage: true };
    setProducts(prev => [...prev, prodWithLoading]);
    const imageUrl = await generateProductImage(newProduct.name);
    setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, imageUrl: imageUrl || undefined, isGeneratingImage: false } : p));
  };

  const addProductsBulk = (newProducts: Product[]) => {
    // UPDATED: Wipe all data for new session
    setSales([]);
    setCustomers([]);
    setExpenses([]);
    setLiabilities([]);
    setLogs([]);
    
    const prodsWithLoading = newProducts.map(p => ({ ...p, isGeneratingImage: true }));
    setProducts(prodsWithLoading);
    
    prodsWithLoading.forEach(async (p) => {
      const imageUrl = await generateProductImage(p.name);
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, imageUrl: imageUrl || undefined, isGeneratingImage: false } : item));
    });
  };

  const triggerImageGeneration = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isGeneratingImage: true } : p));
    const imageUrl = await generateProductImage(product.name);
    setProducts(prev => prev.map(p => p.id === productId ? { 
      ...p, 
      imageUrl: imageUrl || p.imageUrl, 
      isGeneratingImage: false 
    } : p));
  };

  const bulkImportSales = (parsedRows: any[]) => {
    // UPDATED: Wipe previous data to continue as new session
    setExpenses([]);
    setLiabilities([]);
    setLogs([]);

    let newSales: Sale[] = [];
    let currentProducts: Product[] = [];
    let currentCustomers: Customer[] = [];

    parsedRows.forEach((row, index) => {
      let customer = currentCustomers.find(c => c.name.toLowerCase().trim() === row.Customer.toLowerCase().trim());
      if (!customer) {
        customer = { id: 'CUST-' + Date.now() + '-' + index, name: row.Customer, phone: '', createdAt: Date.now() };
        currentCustomers.push(customer);
      }
      let product = currentProducts.find(p => p.name.toLowerCase().trim() === row.Product.toLowerCase().trim());
      if (!product) {
        product = { id: 'PROD-' + Date.now() + '-' + index, name: row.Product, category: (row.Category as any) || 'General', unit: row.Unit || 'kg', basePrice: row.Amount / (row.Quantity || 1), currentStock: 0, minStockLevel: 5, isGeneratingImage: true };
        currentProducts.push(product);
      }
      const rawStatus = (row.Status || 'Paid').trim().toLowerCase();
      const finalStatus: 'Paid' | 'Pending' = rawStatus === 'paid' ? 'Paid' : 'Pending';
      const saleDate = new Date(row.DateAD).getTime() || Date.now();
      newSales.push({ id: 'SALE-' + Date.now() + '-' + index, customerId: customer.id, productId: product.id, quantity: row.Quantity, totalAmount: row.Amount, date: saleDate, paymentStatus: finalStatus, notes: 'Bulk Imported (New Session)' });
      product.currentStock = Math.max(0, product.currentStock - row.Quantity);
    });

    setSales(newSales);
    setProducts(currentProducts);
    setCustomers(currentCustomers);
  };

  const updateProduct = (updatedProduct: Product) => setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setSales(prev => prev.filter(s => s.productId !== id));
  };
  const updateStock = (productId: string, newStock: number) => setProducts(prev => prev.map(p => p.id === productId ? { ...p, currentStock: newStock } : p));

  const handleMasterRestore = (data: any) => {
    if (data.sales) setSales(data.sales);
    if (data.customers) setCustomers(data.customers);
    if (data.products) setProducts(data.products);
    if (data.expenses) setExpenses(data.expenses);
    if (data.liabilities) setLiabilities(data.liabilities);
    if (data.logs) setLogs(data.logs);
    if (data.themeMode) setThemeMode(data.themeMode);
    if (data.dateSystem) setDateSystem(data.dateSystem);
    if (data.currencyCode) setCurrencyCode(data.currencyCode);
    if (data.customCurrency) setCustomCurrency(data.customCurrency);
    alert("Master Data Restored.");
  };

  const handleLogout = async () => {
    if (!isOfflineMode) await signOut(auth);
    setUser(null);
    setIsOfflineMode(false);
    localStorage.removeItem(OFFLINE_FLAG);
  };

  const handleSkipLogin = () => {
    setIsOfflineMode(true);
    localStorage.setItem(OFFLINE_FLAG, 'true');
  };

  const handleQuickSale = (customerId: string) => {
    setPreselectedCustomerId(customerId);
    setActiveTab('sales');
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-[#0c0a09] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 font-black text-[10px] uppercase tracking-[0.4em]">Initializing Core</p>
      </div>
    );
  }

  if (!user && !isOfflineMode) {
    return <AuthPortal onAuthenticated={setUser} onSkip={handleSkipLogin} />;
  }

  if (showSplash) {
    return <WelcomeScreen onFinish={() => setShowSplash(false)} />;
  }

  const masterState = { sales, customers, products, expenses, liabilities, logs, themeMode, dateSystem, currencyCode, customCurrency };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard sales={sales} customers={customers} products={products} expenses={expenses} liabilities={liabilities} currency={currency} dateSystem={dateSystem} onNavigateToSales={() => setActiveTab('sales')} onImportSales={bulkImportSales} />;
      case 'sales': return <SalesForm sales={sales} customers={customers} products={products} logs={logs} onAddSale={addSale} onAddCustomer={addCustomer} onUpdateSale={updateSale} onDeleteSale={deleteSale} onRestoreSale={restoreSale} onUpdateProduct={updateProduct} onAddProduct={addProduct} onDeleteProduct={deleteProduct} triggerImageGeneration={triggerImageGeneration} currency={currency} dateSystem={dateSystem} onBack={() => setActiveTab('dashboard')} onNavigateToReport={() => setActiveTab('report')} onDeleteLog={deleteLog} preselectedCustomerId={preselectedCustomerId} onClearPreselected={() => setPreselectedCustomerId(null)} />;
      case 'billing': return <BillingManager products={products} customers={customers} onAddSale={addSale} currency={currency} />;
      case 'customers': return <CustomerList customers={customers} sales={sales} products={products} logs={logs} currency={currency} dateSystem={dateSystem} onUpdateSale={updateSale} onDeleteSale={deleteSale} onDeleteCustomer={deleteCustomer} onAddCustomer={addCustomer} onUpdateCustomer={updateCustomer} onAddSale={addSale} onDeleteLog={deleteLog} onQuickSale={handleQuickSale} />;
      case 'products': return <ProductManager products={products} sales={sales} customers={customers} onAddProduct={addProduct} onAddProductsBulk={addProductsBulk} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} currency={currency} />;
      case 'stock': return <StockManager products={products} sales={sales} onUpdateStock={updateStock} onDeleteProduct={deleteProduct} currency={currency} />;
      case 'finance': return <FinanceManager expenses={expenses} liabilities={liabilities} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddLiability={addLiability} onUpdateLiability={updateLiability} onSettleLiability={settleLiability} currency={currency} dateSystem={dateSystem} />;
      case 'balance': return <BalanceSheet sales={sales} expenses={expenses} liabilities={liabilities} products={products} currency={currency} dateSystem={dateSystem} />;
      case 'report': return <SalesReport sales={sales} customers={customers} products={products} currency={currency} dateSystem={dateSystem} onBack={() => setActiveTab('sales')} />;
      case 'insights': return <SmartInsights sales={sales} products={products} customers={customers} currency={currency} />;
      case 'settings': return <Settings themeMode={themeMode} setThemeMode={setThemeMode} currencyCode={currencyCode} setCurrencyCode={setCurrencyCode} customCurrency={customCurrency} setCustomCurrency={setCustomCurrency} dateSystem={dateSystem} setDateSystem={setDateSystem} masterState={masterState} onMasterRestore={handleMasterRestore} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen text-black dark:text-stone-100 transition-colors duration-300 font-medium">
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} onQuit={handleLogout} saveStatus={saveStatus} dateSystem={dateSystem} setDateSystem={setDateSystem}>
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2">{renderContent()}</div>
      </Layout>
    </div>
  );
};

export default App;
