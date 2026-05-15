import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, Eye, EyeOff, FolderTree, ShieldCheck, Database, Files } from 'lucide-react';
import { motion } from 'motion/react';

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
          email,
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
    <div className="min-h-screen bg-white transition-colors flex flex-col md:flex-row">
      {/* Branding Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white border-b md:border-b-0 md:border-r border-gray-100">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center max-w-sm"
        >
          {/* File Management Icon Illustration */}
          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 bg-blue-100 blur-3xl rounded-full scale-150 opacity-50" />
            <div className="relative flex items-center justify-center">
              <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-200 transform -rotate-6">
                <FolderTree className="w-16 h-16 text-white" />
              </div>
              <div className="absolute -top-4 -right-4 p-4 bg-white rounded-2xl shadow-xl border border-gray-100 transform rotate-12">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -bottom-2 -left-6 p-4 bg-gray-50 rounded-2xl shadow-lg border border-gray-100 transform rotate-12">
                <Database className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#155fc3]">ICS</h1>
            <div className="pt-2">
              <p className="text-blue-900 font-bold text-lg leading-tight">የኢሚግሬሽንና የዜግነት አገልግሎት</p>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Immigration and Citizenship Service</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-24">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-4xl font-bold text-[#155fc3] mb-2 leading-tight">
              {isSignUp ? 'Create Account' : 'Login'}
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              {isSignUp ? 'Join the ICS Digital Portal' : ''}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="relative">
                <input
                  type="text"
                  required
                  id="fullName"
                  className="peer w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-xl focus:border-blue-600 outline-none transition-all placeholder-transparent"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                />
                <label 
                  htmlFor="fullName"
                  className="absolute left-4 -top-2.5 bg-white px-1 text-sm font-medium text-blue-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                >
                  Full Name *
                </label>
              </div>
            )}

            <div className="relative">
              <input
                type="email"
                required
                id="email"
                className="peer w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-xl focus:border-blue-600 outline-none transition-all placeholder-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
              />
              <label 
                htmlFor="email"
                className="absolute left-4 -top-2.5 bg-white px-1 text-sm font-medium text-blue-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
              >
                Email Address *
              </label>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                id="password"
                className="peer w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-xl focus:border-blue-600 outline-none transition-all placeholder-transparent pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <label 
                htmlFor="password"
                className="absolute left-4 -top-2.5 bg-white px-1 text-sm font-medium text-blue-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
              >
                Password *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </p>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-lg">{isSignUp ? 'Create Account' : 'Log In'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-gray-50">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:underline font-bold"
            >
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
          
          <p className="text-center text-[10px] text-gray-400 mt-12 uppercase tracking-widest font-bold">
            Authorized personnel only
          </p>
        </motion.div>
      </div>
    </div>
  );
}
