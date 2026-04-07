import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, MessageCircle, ArrowLeft, Users, UserCheck, Gift, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';

function generateCode(doctorName: string): string {
  const clean = (doctorName || 'MEDICO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `DAMA-DR${clean}-${rand}`;
}

type ReferralRow = {
  id: string;
  code: string;
  status: string;
  referred_subscription_status: string;
  reward_granted: boolean;
  referred_id: string | null;
  referred_user_id: string | null;
};

export default function ReferralPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get or create referral code
      const { data: existing } = await supabase
        .from('referrals')
        .select('code')
        .eq('referrer_id', user.id)
        .limit(1) as any;

      if (existing && existing.length > 0) {
        setCode(existing[0].code);
      } else {
        const doctorName = (clinic as any)?.doctor_name || user.user_metadata?.doctor_name || '';
        const newCode = generateCode(doctorName);
        await supabase.from('referrals').insert({
          referrer_id: user.id,
          code: newCode,
          status: 'pending',
        } as any);
        setCode(newCode);
      }

      // Fetch all referrals with new fields
      const { data: allRefs } = await supabase
        .from('referrals')
        .select('id, code, status, referred_subscription_status, reward_granted, referred_id, referred_user_id')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false }) as any;

      if (allRefs) {
        setReferrals(allRefs);
      }

      // Fetch credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_credits')
        .eq('user_id', user.id)
        .maybeSingle() as any;
      setCredits((profile as any)?.referral_credits || 0);

      setLoading(false);
    })();
  }, [user, clinic]);

  const referredReferrals = referrals.filter(r => r.referred_id || r.referred_user_id);
  const paidCount = referrals.filter(r => r.referred_subscription_status === 'paid').length;

  const handleCopyLink = () => {
    const link = `https://damasaude.com.br/auth?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handleWhatsApp = () => {
    const link = `https://damasaude.com.br/auth?ref=${code}`;
    const msg = encodeURIComponent(
      `Estou usando o DAMA Clinic pra gerenciar minha clínica e tem me ajudado muito! Crie sua conta com meu link: ${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Pagou ✅', icon: CheckCircle2, color: 'text-green-400' };
      case 'trialing':
        return { label: 'No trial', icon: Clock, color: 'text-yellow-400' };
      case 'churned':
        return { label: 'Cancelou', icon: XCircle, color: 'text-red-400' };
      default:
        return { label: 'Pendente', icon: Clock, color: 'text-muted-foreground' };
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="mx-auto max-w-lg px-4 py-5 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={logoDama} alt="DAMA" className="h-7" />
        </div>

        {/* Hero card */}
        <div className="rounded-2xl bg-gradient-to-br from-[hsl(220,40%,12%)] to-[hsl(40,50%,15%)] border border-[#D4AF37]/30 p-6 text-center space-y-3">
          <Gift className="h-8 w-8 text-[#D4AF37] mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Indique e ganhe!</h1>
          <p className="text-sm text-muted-foreground">
            Para cada colega que assinar, você ganha <span className="text-[#D4AF37] font-semibold">1 mês grátis</span>. Sem limite!
          </p>
        </div>

        {/* Code */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-6 text-center space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seu código de indicação</p>
          <p className="text-2xl font-mono font-bold text-[#D4AF37] tracking-wider">{code}</p>
        </div>

        {/* Action buttons side by side */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="h-12 rounded-xl text-sm font-semibold"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar link
          </Button>
          <Button
            onClick={handleWhatsApp}
            className="h-12 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#25D366', color: 'white' }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>

        {/* Stats panel */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{referredReferrals.length}</p>
            <p className="text-[10px] text-muted-foreground">indicações</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 text-center">
            <UserCheck className="h-4 w-4 text-green-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{paidCount}</p>
            <p className="text-[10px] text-muted-foreground">pagaram</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 text-center">
            <Gift className="h-4 w-4 text-[#D4AF37] mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{credits}</p>
            <p className="text-[10px] text-muted-foreground">meses grátis</p>
          </div>
        </div>

        {/* Referral list */}
        {referredReferrals.length > 0 && (
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Suas indicações</p>
            <div className="space-y-2">
              {referredReferrals.map((ref) => {
                const info = getStatusInfo(ref.referred_subscription_status);
                const StatusIcon = info.icon;
                return (
                  <div key={ref.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Indicado</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${info.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {info.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Como funciona?</p>
          <div className="space-y-3">
            {[
              { n: '1', text: 'Compartilhe seu link com colegas médicos' },
              { n: '2', text: 'Seu colega cria a conta e usa o app por 21 dias grátis' },
              { n: '3', text: 'Quando ele pagar a 1ª mensalidade, você ganha 1 mês grátis' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold">
                  {n}
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* // Implementar no webhook de pagamento (Apple IAP / Stripe):
            // Quando a renovação mensal for processada, verificar referral_credits > 0.
            // Se sim, pular a cobrança daquele mês e decrementar referral_credits em 1. */}
      </div>
    </div>
  );
}
