
import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebaseService';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';

interface AuthPortalProps {
  onAuthenticated: (user: any) => void;
  onSkip: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onAuthenticated, onSkip }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuthenticated(cred.user);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        onAuthenticated(cred.user);
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase:', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onAuthenticated(result.user);
    } catch (err: any) {
      setError(err.message.replace('Firebase:', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) return setError("Please enter your email first.");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0c0a09] flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
      
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4 animate-bounce">🌱</div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">FarmTrack</h1>
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em]">Enterprise Access</p>
        </div>

        <div className="bg-stone-900/50 backdrop-blur-2xl border border-stone-800 p-8 rounded-[3rem] shadow-2xl">
          <div className="flex bg-black p-1 rounded-2xl border border-stone-800 mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1">Work Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-black border border-stone-800 rounded-2xl px-6 py-4 text-white font-black text-sm outline-none focus:border-emerald-500 transition-all"
                placeholder="name@enterprise.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest ml-1">Access Key</label>
              <input 
                type="password" 
                required
                className="w-full bg-black border border-stone-800 rounded-2xl px-6 py-4 text-white font-black text-sm outline-none focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-1">
                {error}
              </p>
            )}

            <button 
              disabled={loading}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-emerald-950/40 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                isLogin ? 'Establish Session' : 'Create Account'
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-800"></div>
            </div>
            <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.3em]">
              <span className="bg-[#1c1917] px-4 text-stone-500">Or Federated Access</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest border border-stone-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Account
            </button>

            <button
              onClick={onSkip}
              disabled={loading}
              className="w-full py-4 bg-stone-900/50 hover:bg-stone-800 text-stone-400 hover:text-emerald-400 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-stone-800 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <span className="text-lg">📵</span>
              Local Only Mode
            </button>
          </div>

          {isLogin && (
            <button 
              onClick={handleReset}
              className="w-full mt-6 text-[9px] font-black text-stone-500 uppercase tracking-widest hover:text-emerald-500 transition-colors"
            >
              Forgot Access Key?
            </button>
          )}
        </div>

        <p className="mt-8 text-center text-stone-600 text-[8px] font-black uppercase tracking-[0.5em]">
          Encrypted By FarmTrack Security Protocol
        </p>
      </div>
    </div>
  );
};
