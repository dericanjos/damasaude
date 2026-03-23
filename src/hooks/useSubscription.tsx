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
  // STRIPE TEMPORARILY DISABLED — all users treated as subscribed
  const value: SubscriptionContextType = {
    subscribed: true,
    subscriptionStatus: 'ativo',
    // TODO: restaurar lógica real quando Stripe for reativado
    subscriptionEnd: '2099-12-31T23:59:59Z',
    loading: false,
    refresh: async () => {},
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
