import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface UpsellCardProps {
  onDismiss?: () => void;
}

export default function UpsellCard({ onDismiss }: UpsellCardProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);

  const handleDismiss = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ upsell_dismissed_at: new Date().toISOString() } as any)
        .eq('user_id', user.id);
    }
    setVisible(false);
    onDismiss?.();
  };

  const handleContact = () => {
    window.open(
      'https://wa.me/5521959214292?text=Oi!%20Uso%20o%20App%20DAMA%20Sa%C3%BAde%20e%20meus%20n%C3%BAmeros%20indicam%20oportunidades%20de%20melhoria.%20Gostaria%20de%20entender%20como%20posso%20otimizar%20minha%20cl%C3%ADnica.',
      '_blank'
    );
  };

  if (!visible) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[hsl(220,40%,12%)] to-[hsl(220,35%,18%)] border border-[#D4AF37]/30 p-5 shadow-elevated space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-[#D4AF37]" />
        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Parceria Premium</p>
      </div>
      <p className="text-sm font-semibold text-foreground">
        Seus números indicam oportunidade de crescimento
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Clínicas com perfil semelhante ao seu costumam recuperar até 47% mais receita com acompanhamento especializado.
      </p>
      <div className="flex flex-col gap-2 pt-1">
        <Button
          onClick={handleContact}
          className="w-full h-10 rounded-xl font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #B8962E)', color: '#1a1a2e' }}
        >
          Falar com um especialista
        </Button>
        <Button
          variant="ghost"
          onClick={handleDismiss}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Agora não
        </Button>
      </div>
    </div>
  );
}
