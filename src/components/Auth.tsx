import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, Eye, EyeOff, Fingerprint, Scan, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'staff' // Default role
            }
          }
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: `${email.includes('@') ? email : email + '@ics.gov.et'}`, // Allow simple username if mocked
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#dce1e7] flex items-center justify-center p-4 md:p-0">
      <div className="w-full max-w-6xl h-full md:h-[80vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Login Form */}
        <div className="w-full md:w-[60%] bg-[#e5e9f0] p-8 md:p-16 flex flex-col justify-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto w-full"
          >
            <div className="mb-12 text-center">
              <h1 className="text-xl font-bold text-gray-500 mb-2">Login To</h1>
              <h2 className="text-lg font-bold text-gray-700 leading-tight">Immigration and Citizenship Service System</h2>
            </div>

            <form onSubmit={handleAuth} className="flex gap-6">
              <div className="flex-1 space-y-5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded focus:border-blue-600 outline-none transition-all text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded focus:border-blue-600 outline-none transition-all text-sm pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded focus:border-blue-600 outline-none transition-all text-sm"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                    {error}
                  </p>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#405470] hover:bg-[#34445c] text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In'}
                  </button>
                </div>

                <div className="mt-4 flex justify-between items-center text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-blue-600 hover:underline"
                  >
                    {isSignUp ? 'Already have an account? Log In' : "Sign Up"}
                  </button>
                </div>
              </div>

              {/* Fingerprint Scan Mock UI */}
              <div className="w-32 hidden sm:flex flex-col items-center">
                <div className="text-[10px] font-bold text-gray-500 mb-2 flex items-center gap-1">
                  Fingerprint <RefreshCw className="w-3 h-3 text-blue-500 cursor-pointer" />
                </div>
                <div className="w-full aspect-square bg-[#d4d9e2] rounded-xl flex items-center justify-center border-2 border-white/50 shadow-inner group cursor-pointer hover:bg-[#ccd1db] transition-colors mb-4">
                  <Fingerprint className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <button type="button" className="w-full py-2.5 bg-[#405470]/10 text-[#405470] text-[10px] font-black uppercase rounded-lg hover:bg-[#405470]/20 transition-all mb-4">
                  Scan
                </button>
                <div className="flex gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </div>
                    Single
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer opacity-50">
                    <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
                    Step
                  </label>
                </div>
              </div>
            </form>

            <div className="absolute bottom-12 left-16 text-[10px] font-bold text-gray-400 tracking-tighter uppercase">
              V1.5.0-PRODUCTION-Central
            </div>
          </motion.div>
        </div>

        {/* Right Side - Branding Panel */}
        <div className="hidden md:flex w-[40%] bg-[#0d2d5e] items-center justify-center p-12 text-white relative">
          {/* Subtle pattern background could go here */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mb-8 flex justify-center">
              <Fingerprint className="w-32 h-32 md:w-48 md:h-48 text-[#54b1f4] opacity-90" />
            </div>
            
            <h1 className="text-8xl font-black mb-4 tracking-tighter">ICS</h1>
            
            <div className="space-y-2 px-10">
              <p className="text-2xl font-bold font-serif leading-tight">የኢሚግሬሽንና የዜግነት አገልግሎት</p>
              <div className="h-px w-full bg-white/20 my-4" />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#54b1f4]">
                Immigration and Citizenship Service
              </p>
            </div>
          </motion.div>

          {/* Bottom decorative elements */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#54b1f4]/30" />
        </div>
      </div>
    </div>
  );
}


