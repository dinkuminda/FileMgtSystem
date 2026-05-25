import React, { useState } from 'react';
import { EthiopiaFingerprint } from './EthiopiaFingerprint';
import { supabase } from '../lib/supabase';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onClose?: () => void;
  isModal?: boolean;
  isInline?: boolean;
}

export default function Auth({ onClose, isModal = false, isInline = false }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changeView = (newView: 'login' | 'signup' | 'forgot-password') => {
    setView(newView);
    setError(null);
    setMessage(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              role: 'staff' // Default role
            }
          }
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setMessage('Reset link sent to your email.');
      }
    } catch (err: any) {
      console.error('Auth action failed:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const cardElement = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-full max-w-[440px] bg-[#f0f4fa] rounded-[3.5rem] p-8 md:p-14 ${isInline ? 'pt-12 pb-10 shadow-2xl border border-white/50' : 'pt-16 shadow-[0_20px_50px_rgba(0,0,0,0.3)]'} relative flex flex-col items-center my-auto`}
    >
      {/* Back link */}
      {!isInline && (
        onClose ? (
          <button 
            type="button"
            onClick={onClose}
            className="absolute left-8 top-8 flex items-center gap-1.5 text-xs font-bold text-[#1a2b4b]/60 hover:text-[#1b54ac] transition-all group cursor-pointer border-none bg-transparent outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Home Info
          </button>
        ) : (
          <Link 
            to="/" 
            className="absolute left-8 top-8 flex items-center gap-1.5 text-xs font-bold text-[#1a2b4b]/60 hover:text-[#1b54ac] transition-all group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Home System Info
          </Link>
        )
      )}
      {/* Logo Section */}
      <div className="flex flex-col items-center mb-10 text-center w-full">
        <div className="flex items-center gap-4 justify-center mb-8 select-none">
          <div className="w-20 h-20 bg-[#d7e2f1]/80 rounded-[2rem] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-white/30">
            <EthiopiaFingerprint className="w-12 h-12 drop-shadow-md" />
          </div>
          <div className="text-5xl font-black text-[#1b54ac] tracking-tighter select-none">
            ICS
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-[#1a2b4b] font-extrabold text-sm tracking-tight leading-tight select-none">የኢሚግሬሽንና የዜግነት አገልግሎት</p>
          <p className="text-[#3c5071] text-[10px] font-black uppercase tracking-[0.12em] opacity-85 select-none">
            Immigration and Citizenship Services
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'forgot-password' ? (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 w-full animate-none"
          >
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1a2b4b]">Reset Password</h2>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <input
                type="email"
                required
                className="w-full px-6 py-4 bg-[#e6edf7] border border-transparent focus:bg-white focus:shadow-sm rounded-2xl outline-none transition-all placeholder:text-[#9fb0c7] text-[#1a2b4b] font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
              />

              {error && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50/50 border border-rose-100/50 p-3.5 rounded-xl text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50/50 border border-emerald-100/50 p-3.5 rounded-xl text-center">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4.5 bg-[#1b54ac] hover:bg-[#164894] text-white text-lg font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#1b54ac]/20"
              >
                Send Reset Link
              </button>
              <div className="text-center">
                <button type="button" onClick={() => changeView('login')} className="text-[#1b54ac] text-base font-bold">Back to Login</button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8 w-full animate-none"
          >
            <form onSubmit={handleAuth} className="space-y-4">
              {view === 'signup' && (
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-[#e6edf7] border border-transparent focus:bg-white focus:shadow-sm rounded-2xl outline-none transition-all placeholder:text-[#9fb0c7] text-[#1a2b4b] font-medium"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                />
              )}

              <input
                type="email"
                required
                className="w-full px-6 py-4 bg-[#e6edf7] border border-transparent focus:bg-white focus:shadow-sm rounded-2xl outline-none transition-all placeholder:text-[#9fb0c7] text-[#1a2b4b] font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-6 py-4 bg-[#e6edf7] border border-transparent focus:bg-white focus:shadow-sm rounded-2xl outline-none transition-all placeholder:text-[#9fb0c7] text-[#1a2b4b] font-medium pr-14"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9fb0c7] hover:text-[#1b54ac] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {view === 'signup' && (
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="w-full px-6 py-4 bg-[#e6edf7] border border-transparent focus:bg-white focus:shadow-sm rounded-2xl outline-none transition-all placeholder:text-[#9fb0c7] text-[#1a2b4b] font-medium pr-14"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9fb0c7] hover:text-[#1b54ac] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              )}

              {view === 'login' && (
                <div className="flex justify-end pt-1">
                  <button 
                    type="button" 
                    onClick={() => changeView('forgot-password')}
                    className="text-[#1b54ac] text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50/50 border border-rose-100/50 p-3.5 rounded-xl text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50/50 border border-emerald-100/50 p-3.5 rounded-xl text-center">
                  {message}
                </div>
              )}

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4.5 bg-[#1b54ac] hover:bg-[#164894] text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-[#1b54ac]/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 font-black"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{view === 'signup' ? 'Sign Up' : 'Sign In'}</span>}
                </button>
              </div>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => changeView(view === 'login' ? 'signup' : 'login')}
                className="text-[#1b54ac] text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
              >
                {view === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-1/2 h-px bg-[#d7e2f1] my-10" />

      <div className="flex items-center justify-center gap-2.5 animate-none">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-[9px] font-black text-[#1a2b4b] uppercase tracking-[0.15em] opacity-40">System Status: Online</span>
      </div>
    </motion.div>
  );

  if (isInline) {
    return cardElement;
  }

  return (
    <div className={isModal ? "fixed inset-0 z-50 bg-[#07132a]/85 backdrop-blur-md flex items-center justify-center p-6 font-sans overflow-y-auto" : "min-h-screen bg-[#07132a] flex flex-col items-center justify-center pt-24 pb-12 p-6 font-sans relative"}>
      {!isModal && !isInline && (
        <header className="fixed top-0 left-0 right-0 border-b border-white/5 backdrop-blur-md bg-[#07132a]/80 z-50 h-20 flex items-center">
          <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 sm:gap-4 select-none">
              <EthiopiaFingerprint className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-sm flex-shrink-0" />
              <div className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-none select-none">
                ICS
              </div>
              <div className="w-px h-8 sm:h-10 bg-white/10 mx-1 sm:mx-2" />
              <div className="flex flex-col justify-center text-left">
                <h1 className="text-white font-extrabold text-xs sm:text-base tracking-tight leading-tight">የኢሚግሬሽንና የዜግነት አገልግሎት</h1>
                <p className="text-[8px] sm:text-[11px] text-blue-400 font-extrabold uppercase tracking-[0.08em] mt-0.5 sm:mt-1 font-black">Immigration and Citizenship Services</p>
              </div>
            </Link>
            
            <Link 
              to="/" 
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              Back to Portal
            </Link>
          </div>
        </header>
      )}
      {cardElement}
    </div>
  );
}
