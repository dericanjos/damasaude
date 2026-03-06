import { cn } from '@/lib/utils';
import { getIdeaStatus, getIdeaLabel } from '@/lib/idea';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';

interface IdeaScoreCardProps {
  score: number;
  comparison?: number | null;
}

export default function IdeaScoreCard({ score, comparison }: IdeaScoreCardProps) {
  const navigate = useNavigate();
  const status = getIdeaStatus(score);
  const label = getIdeaLabel(status);
  const diff = comparison != null ? score - comparison : null;

  return (
    <div
      onClick={() => navigate('/idea')}
      className={cn(
        'rounded-2xl p-6 text-center shadow-elevated cursor-pointer transition-transform active:scale-[0.98]',
        status === 'critical' && 'idea-critical',
        status === 'attention' && 'idea-attention',
        status === 'stable' && 'idea-stable',
      )}
    >
      <div className="flex items-center justify-center gap-1">
        <p className="text-sm font-medium text-primary-foreground/80">Índice IDEA</p>
        <Info className="h-3 w-3 text-primary-foreground/50" />
      </div>
      <p className="mt-1 text-5xl font-extrabold tracking-tight text-primary-foreground animate-count-up">
        {score}
      </p>
      <p className="mt-1 text-sm font-semibold text-primary-foreground/90">{label}</p>
      <p className="text-[10px] text-primary-foreground/50 mt-0.5">Índice DAMA de Eficiência do Atendimento</p>
      {diff != null && (
        <p className="mt-2 text-xs text-primary-foreground/70">
          {diff > 0 ? `+${diff}` : diff} vs ontem
        </p>
      )}
    </div>
  );
}
