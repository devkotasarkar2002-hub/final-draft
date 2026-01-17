
import React, { useState, useEffect } from 'react';
import { getSmartInsights, getMarketPrices, speakInsight } from '../services/geminiService';
import { Sale, Product, Customer, Currency } from '../types';

interface SmartInsightsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  currency: Currency;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ sales, products, customers, currency }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [marketQuery, setMarketQuery] = useState('');
  const [marketData, setMarketData] = useState<{ text: string, sources: any[] } | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchInsights = async () => {
    if (!isOnline) return;
    if (sales.length < 3) {
      alert("Record more sales for deep AI analysis.");
      return;
    }
    setLoading(true);
    const result = await getSmartInsights(sales, products, customers, currency);
    setInsight(result || null);
    setLoading(false);
  };

  const handleSpeak = async () => {
    if (!insight) return;
    setSpeaking(true);
    await speakInsight(insight);
    setSpeaking(false);
  };

  const searchMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketQuery) return;
    setMarketLoading(true);
    const data = await getMarketPrices(marketQuery);
    setMarketData(data);
    setMarketLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/30 px-6 py-2 rounded-full border border-emerald-100 dark:border-emerald-800">
           <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`}></span>
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-400">
             {isOnline ? 'Enterprise Intelligence Active' : 'Offline Mode: Reconnect for AI'}
           </span>
        </div>
        <h2 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">Command Intelligence</h2>
        <p className="text-stone-500 dark:text-stone-400 max-w-2xl mx-auto font-medium text-lg leading-relaxed">
          Advanced analytics and global market grounding for your {currency.name} enterprise.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Col: Analysis */}
        <div className="space-y-8">
           <div className="bg-white dark:bg-stone-900 p-10 rounded-[3rem] border border-stone-200 dark:border-stone-800 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight dark:text-white">Business Analysis</h3>
                <span className="text-3xl">📊</span>
              </div>
              
              <button
                onClick={fetchInsights}
                disabled={loading || !isOnline}
                className={`w-full py-6 rounded-3xl font-black text-white text-base transition-all shadow-xl flex items-center justify-center space-x-4 ${
                  loading || !isOnline 
                    ? 'bg-stone-300 dark:bg-stone-800 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95'
                }`}
              >
                {loading ? (
                  <><span className="animate-spin">⏳</span> <span>SYNTHESIZING...</span></>
                ) : (
                  <><span className="text-xl">✨</span> <span>GENERATE PREMIUM REPORT</span></>
                )}
              </button>

              {insight && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="prose prose-stone dark:prose-invert max-w-none">
                    <div className="whitespace-pre-line text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                      {insight}
                    </div>
                  </div>
                  <button 
                    onClick={handleSpeak}
                    disabled={speaking}
                    className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-black uppercase text-[10px] tracking-widest hover:opacity-70 transition-opacity"
                  >
                    <span>{speaking ? '🔊 SPEAKING...' : '🔈 PLAY VOICE BRIEFING'}</span>
                  </button>
                </div>
              )}
           </div>
        </div>

        {/* Right Col: Market Grounding */}
        <div className="space-y-8">
          <div className="bg-[#12100e] p-10 rounded-[3rem] border border-stone-800 shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Global Market Search</h3>
              <span className="text-3xl">🌍</span>
            </div>
            
            <form onSubmit={searchMarket} className="relative">
              <input 
                type="text" 
                className="w-full bg-stone-900 border-2 border-stone-800 rounded-3xl px-8 py-5 text-white font-black placeholder-stone-600 outline-none focus:border-emerald-500 transition-all"
                placeholder="Search crop prices (e.g. Tomatoes in London)"
                value={marketQuery}
                onChange={e => setMarketQuery(e.target.value)}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg">
                →
              </button>
            </form>

            {marketLoading && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Grounding with Google Search...</span>
              </div>
            )}

            {marketData && !marketLoading && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-stone-300 font-medium leading-relaxed bg-stone-900/50 p-6 rounded-2xl border border-stone-800">
                  {marketData.text}
                </div>
                {marketData.sources.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Verified Sources</span>
                    <div className="flex flex-wrap gap-2">
                      {marketData.sources.map((s, idx) => (
                        <a 
                          key={idx} 
                          href={s.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-stone-800 hover:bg-emerald-900/40 px-4 py-2 rounded-xl text-[10px] font-black text-emerald-400 border border-stone-700 hover:border-emerald-500 transition-all"
                        >
                          🔗 {s.title.substring(0, 25)}...
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-100 dark:border-stone-800">
               <span className="text-2xl block mb-2">🎯</span>
               <h4 className="font-black text-xs uppercase tracking-widest dark:text-white">Price Optimization</h4>
               <p className="text-[10px] text-stone-500 font-bold mt-1">AI-suggested rates based on inventory velocity.</p>
             </div>
             <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-100 dark:border-stone-800">
               <span className="text-2xl block mb-2">🤝</span>
               <h4 className="font-black text-xs uppercase tracking-widest dark:text-white">Client Retention</h4>
               <p className="text-[10px] text-stone-500 font-bold mt-1">Automated loyalty scoring for top customers.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
