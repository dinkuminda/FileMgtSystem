import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, type UserProfile, type UserRole } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setUserProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid: string) {
    // Fetch the profile from the 'profiles' table which is synced via trigger
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!error && data) {
      setUserProfile(data as UserProfile);
    } else {
      // Fallback/Retry logic if trigger is slow or not configured
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isAdminByEmail = user.email === 'dinkuh12@gmail.com'; 
        setUserProfile({
          id: user.id,
          email: user.email || '',
          role: isAdminByEmail ? 'admin' : 'staff',
          full_name: user.user_metadata?.full_name
        });
      }
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-red-100">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-red-100 rounded-full">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Setup Required</h1>
            <p className="text-gray-600">
              Please configure your Supabase environment variables in the <strong>Settings &rarr; Secrets</strong> panel to start the application.
            </p>
            <div className="w-full space-y-2 text-sm text-left bg-gray-50 p-4 rounded-lg font-mono">
              <p>SUPABASE_URL</p>
              <p>SUPABASE_ANON_KEY</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {!session ? (
        <Auth />
      ) : (
        <Dashboard userProfile={userProfile} />
      )}
    </div>
  );
}
