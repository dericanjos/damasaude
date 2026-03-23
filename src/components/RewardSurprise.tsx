import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RewardSurpriseProps {
  score: number;
  streak: number;
  lost: number;
  yesterdayScore?: number | null;
  weekScores?: number[];
}

export default function RewardSurprise({ score, streak, lost, yesterdayScore, weekScores = [] }: RewardSurpriseProps) {
  const surprise = useMemo(() => {
    // Best score of the week
    if (weekScores.length > 0 && score > Math.max(...weekScores)) {
      return { emoji: '🏆', text: 'Nova melhor marca da semana!' };
    }

    // Streak milestone
    if ([7, 14, 21, 30].includes(streak)) {
      return { emoji: '🔥', text: `${streak} dias seguidos! Sua consistência está transformando seus resultados.` };
    }

    // Zero loss
    if (lost === 0) {
      return { emoji: '✨', text: 'Dia perfeito! Zero receita perdida hoje.' };
    }

    // Improvement vs yesterday
    if (yesterdayScore != null && score > yesterdayScore + 10) {
      return { emoji: '📈', text: `+${score - yesterdayScore} pontos vs ontem! Evolução clara.` };
    }

    return null;
  }, [score, streak, lost, yesterdayScore, weekScores]);

  if (!surprise) return null;

  return (
    <div className={cn(
      'w-full rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-4 text-center',
      'animate-in fade-in zoom-in duration-500'
    )}>
      <p className="text-2xl mb-1">{surprise.emoji}</p>
      <p className="text-sm font-semibold text-foreground">{surprise.text}</p>
    </div>
  );
}
