import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, doctorName: string, clinicName: string, targetFillRate?: number, targetNoshowRate?: number) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Clear session on browser close if "keep logged in" is unchecked
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (localStorage.getItem('keep_logged_in') === 'false') {
        supabase.auth.signOut();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const signUp = async (email: string, password: string, doctorName: string, clinicName: string, targetFillRate = 0.85, targetNoshowRate = 0.05) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { doctor_name: doctorName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!error && data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: data.user.id,
          email: data.user.email ?? email,
          display_name: doctorName,
          onboarding_completed: false,
        } as any,
        { onConflict: 'user_id' }
      );
      if (profileError) return { error: profileError };

      // Create clinic for the user
      const { error: clinicError } = await supabase.from('clinics').insert({
        user_id: data.user.id,
        name: clinicName,
        target_fill_rate: targetFillRate,
        target_noshow_rate: targetNoshowRate,
      });
      if (clinicError) return { error: clinicError };
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
