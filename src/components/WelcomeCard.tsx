import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function WelcomeCard() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl gradient-primary p-6 shadow-premium text-white space-y-4">
      <div className="text-center space-y-2">
        <p className="text-4xl">🎯</p>
        <h2 className="text-xl font-bold">Bem-vindo ao seu copiloto!</h2>
        <p className="text-sm text-white/80">
          O DAMA Saúde transforma dados da sua agenda em inteligência. Faça seu primeiro check-in para ativar:
        </p>
      </div>

      <div className="space-y-2.5 px-2">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📊</span>
          <p className="text-sm text-white/90">Índice IDEA de eficiência</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">💰</span>
          <p className="text-sm text-white/90">Receita estimada vs. perdida</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🔥</span>
          <p className="text-sm text-white/90">Streak de consistência</p>
        </div>
      </div>

      <div className="text-center space-y-2 pt-1">
        <Button
          onClick={() => navigate('/checkin')}
          className="w-full rounded-xl bg-white text-primary hover:bg-white/90 font-bold text-base h-12"
        >
          Fazer primeiro check-in →
        </Button>
        <p className="text-xs text-white/60">Leva menos de 60 segundos</p>
      </div>
    </div>
  );
}
