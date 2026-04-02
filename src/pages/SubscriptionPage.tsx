import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Shield, BarChart3, Zap, Sparkles, AlertTriangle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logoTagline from '@/assets/logo-dama-tagline.png';
import authBg from '@/assets/auth-bg.png';

const benefits = [
  { icon: BarChart3, text: 'Dashboard completo com métricas em tempo real' },
  { icon: CheckCircle, text: 'Check-in diário e acompanhamento de agenda' },
  { icon: Shield, text: 'Análise de motivos de perda de pacientes' },
  { icon: Zap, text: 'Ações diárias personalizadas' },
];

const reasonMessages: Record<string, { title: string; description: string }> = {
  vencido: {
    title: 'Pagamento não confirmado',
    description: 'Para continuar usando o DAMA, atualize seu método de pagamento.',
  },
  cancelado: {
    title: 'Assinatura cancelada',
    description: 'Para voltar a usar o DAMA, reative sua assinatura.',
  },
};

interface SubscriptionPageProps {
  reason?: string;
}

export default function SubscriptionPage({ reason }: SubscriptionPageProps) {
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();
  const reasonInfo = reason ? reasonMessages[reason] : null;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      handleCheckout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto w-full max-w-sm space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={logoTagline}
            alt="DAMA - Time Estratégico Comercial para Médicos"
            className="h-32 w-auto object-contain drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold text-white">
            {reasonInfo ? reasonInfo.title : 'Comece a transformar sua clínica'}
          </h1>
          <p className="text-white/70 text-sm">
            {reasonInfo ? reasonInfo.description : 'Teste grátis por 21 dias. Sem compromisso.'}
          </p>
        </div>

        {/* Warning banner for blocked users */}
        {reasonInfo && (
          <div className="flex items-start gap-3 rounded-lg border border-red-400/30 bg-red-500/10 backdrop-blur-sm p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
            <p className="text-sm text-white/90">{reasonInfo.description}</p>
          </div>
        )}

        <Card className="border-white/10 bg-white/10 backdrop-blur-md shadow-elevated">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <b.icon className="h-3.5 w-3.5 text-white/80" />
                  </div>
                  <span className="text-sm text-white/90">{b.text}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white/10 p-4 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-white">R$ 29,90</span>
                <span className="text-sm text-white/60">/mês</span>
              </div>
            </div>

            {reason === 'vencido' || reason === 'cancelado' ? (
              <Button
                onClick={handleManageSubscription}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-white text-blue-900 hover:bg-white/90"
                size="lg"
              >
                {loading ? 'Redirecionando...' : reason === 'vencido' ? 'Atualizar pagamento' : 'Reativar assinatura'}
              </Button>
            ) : (
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-white text-blue-900 hover:bg-white/90"
                size="lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {loading ? 'Redirecionando...' : 'Começar 15 dias grátis'}
              </Button>
            )}

            {!(reason === 'vencido' || reason === 'cancelado') && (
              <p className="text-center text-xs text-white/50 leading-relaxed">
                Você terá 15 dias de acesso grátis. Depois, será cobrado R$ 29,90/mês.
                Você pode cancelar a qualquer momento.
              </p>
            )}
          </CardContent>
        </Card>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
