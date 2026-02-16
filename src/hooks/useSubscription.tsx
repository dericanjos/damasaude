import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscribed: false,
  subscriptionStatus: 'inativo',
  subscriptionEnd: null,
  loading: true,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inativo');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const prevStatusRef = useRef<string>('inativo');
  const navigateRef = useRef<ReturnType<typeof useNavigate> | null>(null);

  // We can't use useNavigate here directly since provider may be outside Router context children
  // Navigation will be handled by consuming components

  const refresh = useCallback(async () => {
    if (!session) {
      setSubscribed(false);
      setSubscriptionStatus('inativo');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      const newStatus = data.subscription_status ?? 'inativo';
      const wasActive = prevStatusRef.current === 'testando' || prevStatusRef.current === 'ativo';
      const isNowBlocked = newStatus === 'vencido' || newStatus === 'cancelado';

      // Detect status downgrade during usage
      if (wasActive && isNowBlocked) {
        const msg = newStatus === 'vencido'
          ? 'Pagamento não confirmado. Atualize seu método de pagamento.'
          : 'Assinatura cancelada. Reative para continuar.';
        toast.error(msg, { duration: 8000 });
      }

      prevStatusRef.current = newStatus;
      setSubscribed(newStatus === 'testando' || newStatus === 'ativo');
      setSubscriptionStatus(newStatus);
      setSubscriptionEnd(data.subscription_end);
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscribed(false);
      setSubscriptionStatus('inativo');
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
