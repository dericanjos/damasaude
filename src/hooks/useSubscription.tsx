import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscribed: false,
  subscriptionStatus: 'inactive',
  subscriptionEnd: null,
  loading: true,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setSubscribed(false);
      setSubscriptionStatus('inactive');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscribed(data.subscribed);
      setSubscriptionStatus(data.subscription_status);
      setSubscriptionEnd(data.subscription_end);
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscribed(false);
      setSubscriptionStatus('inactive');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [session, refresh]);

  return (
    <SubscriptionContext.Provider value={{ subscribed, subscriptionStatus, subscriptionEnd, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
