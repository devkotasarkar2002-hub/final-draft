
import React, { useEffect, useState } from 'react';

interface WelcomeScreenProps {
  onFinish: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFinish }) => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-1000">
        <div className="flex flex-col items-center">
          <div className="text-8xl mb-4 drop-shadow-2xl animate-bounce">🌱</div>
          <h1 className="text-6xl font-black text-white tracking-tighter mb-2">
            Farm<span className="text-emerald-300">Track</span>
          </h1>
          <p className="text-emerald-100/80 font-medium tracking-widest uppercase text-sm">
            Grow • Record • Prosper
          </p>
        </div>

        {showButton && (
          <button
            onClick={onFinish}
            className="group relative px-10 py-4 bg-white text-emerald-800 rounded-full font-black text-xl shadow-2xl hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-10 duration-700"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <span>Start Tracking</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
            <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-20 group-hover:opacity-0 transition-opacity"></div>
          </button>
        )}
      </div>

      {/* Environmental Ground Line */}
      <div className="absolute bottom-16 left-0 w-full h-1 bg-white/10 blur-[1px]"></div>

      {/* Moving Tractor Animation Container */}
      <div className="absolute bottom-16 left-0 w-full overflow-hidden h-32 pointer-events-none">
        <div className="tractor-container absolute flex items-end">
          <TractorSVG />
        </div>
      </div>

      <style>{`
        @keyframes drive {
          0% { transform: translateX(-250px); }
          100% { transform: translateX(calc(100vw + 250px)); }
        }
        @keyframes engine-rumble {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1.5px) rotate(0.2deg); }
          50% { transform: translateY(0.5px) rotate(-0.1deg); }
          75% { transform: translateY(-1px) rotate(0.1deg); }
        }
        @keyframes wheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes smoke-puff {
          0% { transform: translateY(0) scale(0.4); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-35px) translateX(15px) scale(2.2); opacity: 0; }
        }
        .tractor-container {
          animation: drive 12s linear infinite;
        }
        .tractor-body {
          animation: engine-rumble 0.12s linear infinite;
        }
        .wheel {
          animation: wheel-spin 0.6s linear infinite;
          transform-origin: center;
        }
        .smoke {
          animation: smoke-puff 0.8s ease-out infinite;
          transform-origin: bottom center;
        }
      `}</style>
    </div>
  );
};

const TractorSVG = () => (
  <svg width="150" height="100" viewBox="0 0 150 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="tractor-body">
    <defs>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
      <linearGradient id="cabGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#065f46" />
        <stop offset="100%" stopColor="#042f2e" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="1" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Enhanced Smoke Particles */}
    <g className="smoke" style={{ animationDelay: '0s' }}>
      <circle cx="118" cy="18" r="5" fill="white" opacity="0.6" />
    </g>
    <g className="smoke" style={{ animationDelay: '0.3s' }}>
      <circle cx="118" cy="18" r="4" fill="white" opacity="0.4" />
    </g>
    <g className="smoke" style={{ animationDelay: '0.6s' }}>
      <circle cx="118" cy="18" r="6" fill="white" opacity="0.2" />
    </g>
    
    {/* Main Body Chassis */}
    <rect x="30" y="45" width="90" height="35" rx="6" fill="url(#bodyGrad)" filter="url(#shadow)" />
    
    {/* Front Grille Section */}
    <rect x="100" y="50" width="25" height="25" rx="3" fill="#047857" />
    <g opacity="0.4">
      <line x1="105" y1="55" x2="120" y2="55" stroke="black" strokeWidth="1.5" />
      <line x1="105" y1="60" x2="120" y2="60" stroke="black" strokeWidth="1.5" />
      <line x1="105" y1="65" x2="120" y2="65" stroke="black" strokeWidth="1.5" />
      <line x1="105" y1="70" x2="120" y2="70" stroke="black" strokeWidth="1.5" />
    </g>

    {/* Premium Cab */}
    <rect x="35" y="15" width="45" height="35" rx="5" fill="url(#cabGrad)" />
    <rect x="42" y="20" width="32" height="15" rx="2" fill="#6ee7b7" opacity="0.25" /> {/* Front Window */}
    <rect x="40" y="20" width="5" height="25" rx="1" fill="#6ee7b7" opacity="0.1" /> {/* Side Window */}
    
    {/* Exhaust System */}
    <rect x="115" y="15" width="4" height="35" rx="1" fill="#1f2937" />
    <path d="M113 15 L121 15 L119 12 L115 12 Z" fill="#1f2937" />
    
    {/* Headlights */}
    <circle cx="122" cy="58" r="3.5" fill="#fef08a" />
    <circle cx="122" cy="58" r="1.5" fill="white" />

    {/* Steering Wheel Detail */}
    <circle cx="75" cy="40" r="4" fill="none" stroke="#1f2937" strokeWidth="1.5" />
    <line x1="75" y1="40" x2="75" y2="45" stroke="#1f2937" strokeWidth="1.5" />

    {/* Rear Wheel (Heavy Duty) */}
    <g className="wheel" style={{ transformBox: 'fill-box' }}>
      <circle cx="55" cy="75" r="22" fill="#111827" />
      <circle cx="55" cy="75" r="17" fill="#1f2937" />
      <circle cx="55" cy="75" r="8" fill="#4b5563" />
      {/* Tire Treads */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <rect 
          key={deg} 
          x="53" y="53" width="4" height="8" 
          fill="#000" 
          transform={`rotate(${deg}, 55, 75)`} 
        />
      ))}
      <circle cx="55" cy="75" r="3" fill="#9ca3af" />
    </g>
    
    {/* Front Wheel (Standard) */}
    <g className="wheel" style={{ transformBox: 'fill-box' }}>
      <circle cx="110" cy="82" r="13" fill="#111827" />
      <circle cx="110" cy="82" r="10" fill="#1f2937" />
      <circle cx="110" cy="82" r="5" fill="#4b5563" />
      {[0, 60, 120, 180, 240, 300].map(deg => (
        <rect 
          key={deg} 
          x="109" y="69" width="2" height="5" 
          fill="#000" 
          transform={`rotate(${deg}, 110, 82)`} 
        />
      ))}
      <circle cx="110" cy="82" r="2" fill="#9ca3af" />
    </g>

    {/* Mudguards */}
    <path d="M30 70 C30 55 45 45 65 45" stroke="#064e3b" strokeWidth="5" fill="none" />
    <path d="M95 80 C95 72 105 68 120 68" stroke="#064e3b" strokeWidth="3" fill="none" />
  </svg>
);
