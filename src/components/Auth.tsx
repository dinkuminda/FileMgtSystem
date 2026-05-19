import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
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
        setMessage('Check your email for the confirmation link! (Check spam folder if not received)');
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
        setMessage('Reset link sent to your registered email. (Check spam folder)');
      }
    } catch (err: any) {
      console.error('Auth action failed:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071c35] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] bg-[#eef4fb] rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-24 h-24 bg-[#cfdef3] rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
            <Fingerprint className="w-12 h-12 text-[#1b54ac]" />
          </div>
          
          <h1 className="text-5xl font-black text-[#0c213d] tracking-tighter mb-2">
            ICS ITA
          </h1>
          
          <div className="space-y-1">
            <p className="text-[#0c213d] font-bold text-sm tracking-tight">የኢሚግሬሽንና የዜግነት አገልግሎት</p>
            <p className="text-[#4b607a] text-[10px] font-bold uppercase tracking-widest opacity-80">
              Immigration and Citizenship Service
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
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[#0c213d]">Reset Password</h2>
                <p className="text-sm text-[#4b607a] font-medium leading-relaxed">
                  We'll send a recovery link to your registered email.
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="relative group">
                  <input
                    type="email"
                    required
                    className="w-full px-6 py-4 bg-white/50 border border-transparent focus:border-[#1b54ac]/30 rounded-2xl outline-none transition-all placeholder:text-[#5e6d82] text-[#0c213d] font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                  />
                </div>

                {message && (
                  <p className="text-[10px] font-bold text-green-600 bg-green-50 p-3 rounded-xl border border-green-100 uppercase tracking-wider">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="text-[10px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 uppercase tracking-wider">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#1b54ac] hover:bg-[#164894] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-[#1b54ac]/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Send Reset Link</span>}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(null); setMessage(null); }}
                    className="text-[#1b54ac] text-sm font-bold hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key={view}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <form onSubmit={handleAuth} className="space-y-4">
                {view === 'signup' && (
                  <div className="relative group">
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-white/50 border border-transparent focus:border-[#1b54ac]/30 rounded-2xl outline-none transition-all placeholder:text-gray-400 text-gray-700"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                    />
                  </div>
                )}

                <div className="relative group">
                  <input
                    type="email"
                    required
                    className="w-full px-6 py-4 bg-white/50 border border-transparent focus:border-[#1b54ac]/30 rounded-2xl outline-none transition-all placeholder:text-[#5e6d82] text-[#0c213d] font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                  />
                </div>

                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-6 py-4 bg-white/50 border border-transparent focus:border-[#1b54ac]/30 rounded-2xl outline-none transition-all placeholder:text-[#5e6d82] text-[#0c213d] font-medium pr-14"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#5e6d82] hover:text-[#1b54ac] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {view === 'signup' && (
                  <div className="relative group">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full px-6 py-4 bg-white/50 border border-transparent focus:border-[#1b54ac]/30 rounded-2xl outline-none transition-all placeholder:text-[#5e6d82] text-[#0c213d] font-medium pr-14"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[#5e6d82] hover:text-[#1b54ac] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}

                {view === 'login' && (
                  <div className="flex justify-end pr-2">
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot-password'); setError(null); setMessage(null); }}
                      className="text-[#1b54ac] text-xs font-bold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {message && (
                  <p className="text-[10px] font-bold text-green-600 bg-green-50 p-3 rounded-xl border border-green-100 uppercase tracking-wider">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="text-[10px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 uppercase tracking-wider">
                    {error}
                  </p>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#1b54ac] hover:bg-[#164894] text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-[#1b54ac]/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>{view === 'signup' ? 'Create Account' : 'Sign In'}</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }}
                  className="text-[#1b54ac] text-sm font-bold hover:underline"
                >
                  {view === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
