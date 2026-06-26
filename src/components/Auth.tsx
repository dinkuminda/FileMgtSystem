import React, { useState } from 'react';
import { EthiopiaFingerprint } from './EthiopiaFingerprint';
import { supabase } from '../lib/supabase';
import { Loader2, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import EthiopianImmigrationLogo from './EthiopianImmigrationLogo';

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
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }
        if (data.session) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
          if (sessionError) throw sessionError;
        } else {
          throw new Error('Establishment of secure credential matrix failed.');
        }
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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-full max-w-[440px] bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-xl relative flex flex-col my-auto`}
    >
      {/* Back link */}
      {!isInline && (
        onClose ? (
          <button 
            type="button"
            onClick={onClose}
            className="absolute left-6 sm:left-10 top-6 sm:top-8 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1b54ac] transition-all group cursor-pointer border-none bg-transparent outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Home
          </button>
        ) : (
          <Link 
            to="/" 
            className="absolute left-6 sm:left-10 top-6 sm:top-8 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1b54ac] transition-all group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Home
          </Link>
        )
      )}

      {/* Logo Section */}
      <div className="flex flex-col items-center mb-8 text-center w-full pt-6 select-none">
        <div className="flex items-center justify-center">
          <EthiopianImmigrationLogo className="h-12 w-auto flex-shrink-0" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'forgot-password' ? (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 w-full text-left"
          >
            <div className="text-center">
              <h2 className="text-lg font-extrabold text-slate-900">Reset Password</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your registered email address to receive a secure password recovery link.</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              {error && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1b54ac] hover:bg-[#164894] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-[#1b54ac]/10 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer font-black border-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Link</span>}
              </button>
              
              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={() => changeView('login')} 
                  className="text-[#1b54ac] hover:text-[#164894] text-xs font-bold transition-all border-none bg-transparent cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 w-full text-left"
          >
            <form onSubmit={handleAuth} className="space-y-4">
              {view === 'signup' && (
                <div className="space-y-1.5">
                  <label htmlFor="signup-name" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="E.g. Abel Tesfaye"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  {view === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => changeView('forgot-password')}
                      className="text-[#1b54ac] hover:text-[#164894] text-xs font-bold transition-all border-none bg-transparent cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none pr-12 focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {view === 'signup' && (
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none pr-12 focus:border-[#1b54ac] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                  {message}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1b54ac] hover:bg-[#164894] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-[#1b54ac]/10 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer font-black border-none"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{view === 'signup' ? 'Create Account' : 'Sign In'}</span>}
                </button>
              </div>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => changeView(view === 'login' ? 'signup' : 'login')}
                className="text-slate-500 hover:text-slate-850 text-xs font-semibold transition-colors border-none bg-transparent cursor-pointer"
              >
                {view === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (isInline) {
    return cardElement;
  }

  return (
    <div className={isModal ? "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 font-sans overflow-y-auto" : "min-h-screen bg-slate-55 bg-gradient-to-br from-slate-50 to-blue-50/40 flex flex-col items-center justify-center pt-24 pb-12 p-6 font-sans relative"}>
      {!isModal && !isInline && (
        <header className="fixed top-0 left-0 right-0 border-b border-slate-200 backdrop-blur-md bg-white/85 z-50 h-20 flex items-center">
          <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
            <Link to="/" className="flex items-center select-none text-slate-800 font-sans">
              <EthiopianImmigrationLogo className="h-9 w-auto shrink-0" />
            </Link>
            
            <Link 
              to="/" 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98]"
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
