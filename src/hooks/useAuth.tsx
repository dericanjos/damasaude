import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, doctorName: string, clinicName: string, targetFillRate?: number, targetNoshowRate?: number, phone?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // On first sign-in after email confirmation, complete profile & clinic setup
      if (_event === 'SIGNED_IN' && session?.user) {
        const meta = session.user.user_metadata;
        if (meta?.doctor_name && meta?.clinic_name) {
          await ensureProfileAndClinic(
            session.user.id,
            session.user.email ?? '',
            meta.doctor_name,
            meta.clinic_name,
            meta.target_fill_rate ?? 0.85,
            meta.target_noshow_rate ?? 0.05,
            meta.phone ?? ''
          );
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, doctorName: string, clinicName: string, targetFillRate = 0.85, targetNoshowRate = 0.05, phone = '') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { doctor_name: doctorName, clinic_name: clinicName, target_fill_rate: targetFillRate, target_noshow_rate: targetNoshowRate, phone },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!error && data.user && data.session) {
      // Session exists (auto-confirm or immediate login) — create profile & clinic now
      await ensureProfileAndClinic(data.user.id, data.user.email ?? email, doctorName, clinicName, targetFillRate, targetNoshowRate, phone);
    }
    // If no session (email confirmation required), the trigger creates the basic profile.
    // Profile & clinic will be completed on first login via onAuthStateChange.

    return { error };
  };

  const ensureProfileAndClinic = async (userId: string, email: string, doctorName: string, clinicName: string, targetFillRate: number, targetNoshowRate: number, phone: string) => {
    await supabase.from('profiles').upsert(
      {
        user_id: userId,
        email,
        display_name: doctorName,
        phone,
        onboarding_completed: false,
      } as any,
      { onConflict: 'user_id' }
    );

    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingClinic) {
      await supabase.from('clinics').insert({
        user_id: userId,
        name: clinicName,
        target_fill_rate: targetFillRate,
        target_noshow_rate: targetNoshowRate,
      });
    }
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
