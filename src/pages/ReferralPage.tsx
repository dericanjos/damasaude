import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, MessageCircle, ArrowLeft, Users, UserCheck, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';
import FounderBadge from '@/components/FounderBadge';

function generateCode(doctorName: string): string {
  const clean = (doctorName || 'MEDICO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `DAMA-DR${clean}-${rand}`;
}

export default function ReferralPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [founderCount, setFounderCount] = useState(0);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Check for existing code
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

      // Fetch stats
      const { data: allRefs } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', user.id) as any;

      if (allRefs) {
        setStats({
          total: allRefs.length,
          completed: allRefs.filter((r: any) => r.status === 'completed').length,
        });
      }

      // Check founder status
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('tier')
        .eq('user_id', user.id)
        .maybeSingle() as any;
      setIsFounder((profileRow as any)?.tier === 'founder');

      // Count total founders
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'founder') as any;
      setFounderCount(count || 0);

      setLoading(false);
    })();
  }, [user, clinic]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const handleCopyLink = () => {
    const link = `https://damasaude.com.br/auth?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Oi! Estou usando o DAMA Saúde, um app que mostra quanto sua clínica perde por mês com faltas e cancelamentos. Me ajudou muito a entender onde estou perdendo dinheiro. Usa meu código ${code} pra entrar: https://damasaude.com.br/auth?ref=${code}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
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

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">INDIQUE COLEGAS</h1>
          <p className="text-sm text-muted-foreground">
            Compartilhe o DAMA Saúde com médicos que precisam recuperar receita.
          </p>
        </div>

        {/* Founder card */}
        {isFounder && (
          <div className="rounded-2xl bg-gradient-to-br from-[hsl(220,40%,12%)] to-[hsl(40,50%,15%)] border border-[#D4AF37]/30 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#D4AF37]" />
              <p className="text-base font-bold text-foreground">Você é Founder DAMA 👑</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Como founder, você tem acesso vitalício gratuito ao DAMA Saúde.
            </p>
            <p className="text-sm text-muted-foreground">
              Ajude a DAMA a crescer: indique colegas médicos.
            </p>
            <p className="text-xs text-[#D4AF37]/70">Vagas founder restantes: {Math.max(0, 200 - founderCount)}/200</p>
          </div>
        )}

        {/* Code card */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-6 text-center space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seu código exclusivo</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-2xl font-mono font-bold text-[#D4AF37] tracking-wider">{code}</p>
            <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleWhatsApp}
            className="w-full h-12 rounded-xl text-base font-semibold"
            style={{ backgroundColor: '#25D366', color: 'white' }}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Compartilhar via WhatsApp
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar link
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 text-center">
            <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">colegas indicados</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 text-center">
            <UserCheck className="h-5 w-5 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">completaram cadastro</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Como funciona?</p>
          <div className="space-y-3">
            {[
              { n: '1', text: 'Compartilhe seu código' },
              { n: '2', text: 'Seu colega baixa o app e insere o código no cadastro' },
              { n: '3', text: 'Vocês dois ganham destaque na comunidade DAMA' },
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
      </div>
    </div>
  );
}
