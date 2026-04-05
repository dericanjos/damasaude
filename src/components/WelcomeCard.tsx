import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function WelcomeCard() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-[#D4AF37]/20 p-6 shadow-card space-y-4">
      <div className="text-center space-y-2">
        <p className="text-4xl">🎯</p>
         <h2 className="text-xl font-bold text-foreground">Bem-vindo ao DAMA Clínica!</h2>
        <p className="text-sm text-muted-foreground">
          O DAMA Clínica transforma dados da sua agenda em inteligência. Faça seu primeiro check-in para ativar:
        </p>
      </div>

      <div className="space-y-2.5 px-2">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📊</span>
          <p className="text-sm text-foreground/80">Índice IDEA de eficiência</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">💰</span>
          <p className="text-sm text-foreground/80">Receita estimada vs. perdida</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🔥</span>
          <p className="text-sm text-foreground/80">Streak de consistência</p>
        </div>
      </div>

      <div className="text-center space-y-2 pt-1">
        <Button
          onClick={() => navigate('/checkin')}
          className="w-full rounded-xl font-bold text-base h-12"
        >
          Fazer primeiro check-in →
        </Button>
        <p className="text-xs text-muted-foreground">Menos de 1 minuto</p>
      </div>
    </div>
  );
}
