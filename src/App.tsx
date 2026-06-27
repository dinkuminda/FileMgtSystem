import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured, type UserProfile, logger, mapDbRoleToFrontend } from './lib/supabase';
import Auth from './components/Auth';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Presentation from './components/Presentation';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        logger.log('LOGIN', 'System', 'Session initialized');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        if (event === 'SIGNED_IN') {
          logger.log('LOGIN', 'User', 'User signed in');
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle distinct realtime channel subscription and poll fallback for profile updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;
    const channelName = `profile-changes-${userId}`;

    const channel = supabase.channel(channelName);
    
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      },
      () => {
        fetchProfile(userId);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  async function fetchProfile(uid: string) {
    // Fetch the profile from the 'profiles' table which is synced via trigger
    let { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, modules')
      .eq('id', uid)
      .single();

    if (error) {
      console.warn("Profile fetch failed, attempting on-the-fly backend profile sync for user:", uid);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const res = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              fullName: user.user_metadata?.full_name
            })
          });
          if (res.ok) {
            const syncResult = await res.json();
            if (syncResult.profile) {
              // Retry fetching the profile from DB now that it has been created/ensured
              const retry = await supabase
                .from('profiles')
                .select('id, email, full_name, role, modules')
                .eq('id', uid)
                .single();
              if (!retry.error && retry.data) {
                data = retry.data;
                error = null;
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to ensure profile on the fly:", e);
      }
    }

    if (!error && data) {
      const profile = {
        ...data,
        role: mapDbRoleToFrontend(data.role)
      } as UserProfile;
      // Fail-safe check: guarantee weleba ephrem has base modules active
      if (profile.email?.toLowerCase().includes('weleba') || profile.full_name?.toLowerCase().includes('weleba')) {
        if (!profile.modules || !Array.isArray(profile.modules)) {
          profile.modules = ['OVERVIEW', 'VISA'];
        }
      }
      setUserProfile(profile);
    } else {
      // Fallback/Retry logic if trigger is slow or not configured
      console.warn("Profile fetch fallback activated for user:", uid);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminEmail = (import.meta as any).env.VITE_ADMIN_EMAIL || 'dinkuh12@gmail.com';
        const isAdminByEmail = user.email === adminEmail; 
        const isWeleba = user.email?.toLowerCase().includes('weleba') || user.user_metadata?.full_name?.toLowerCase().includes('weleba');
        
        console.log("Fallback determined role:", isAdminByEmail ? 'admin' : isWeleba ? 'staff' : 'staff', "for email:", user.email);
        
        setUserProfile({
          id: user.id,
          email: user.email || '',
          role: mapDbRoleToFrontend(isAdminByEmail ? 'admin' : isWeleba ? 'staff' : 'staff'),
          full_name: user.user_metadata?.full_name || (isWeleba ? 'weleba ephrem' : undefined),
          modules: isWeleba ? ['OVERVIEW', 'VISA'] : undefined
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans transition-colors duration-300">
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Auth /> : <Navigate to="/" replace />} 
        />
        <Route path="/presentation" element={<Presentation />} />
        {session ? (
          <Route 
            path="/*" 
            element={<Dashboard userProfile={userProfile} onProfileUpdate={() => session?.user?.id && fetchProfile(session.user.id)} />} 
          />
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}
