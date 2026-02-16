import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Shield, BarChart3, Zap, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';

const benefits = [
  { icon: BarChart3, text: 'Dashboard completo com métricas em tempo real' },
  { icon: CheckCircle, text: 'Check-in diário e acompanhamento de agenda' },
  { icon: Shield, text: 'Análise de motivos de perda de pacientes' },
  { icon: Zap, text: 'Ações diárias personalizadas com IA' },
];

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={logoDama} alt="DAMA" className="h-12" />
          <h1 className="text-2xl font-bold text-foreground">
            Comece a transformar sua clínica
          </h1>
          <p className="text-muted-foreground text-sm">
            Teste grátis por 15 dias. Sem compromisso.
          </p>
        </div>

        <Card className="border-primary/20 shadow-elevated">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <b.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{b.text}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-secondary p-4 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-foreground">R$ 29,90</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full h-12 text-base font-semibold gradient-primary"
              size="lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {loading ? 'Redirecionando...' : 'Começar 15 dias grátis'}
            </Button>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              Você terá 15 dias de acesso grátis. Depois, será cobrado R$ 29,90/mês.
              Você pode cancelar a qualquer momento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
