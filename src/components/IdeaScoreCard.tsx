import { cn } from '@/lib/utils';
import { getIdeaStatus, getIdeaLabel } from '@/lib/idea';

interface IdeaScoreCardProps {
  score: number;
  comparison?: number | null;
}

export default function IdeaScoreCard({ score, comparison }: IdeaScoreCardProps) {
  const status = getIdeaStatus(score);
  const label = getIdeaLabel(status);
  const diff = comparison != null ? score - comparison : null;

  return (
    <div
      className={cn(
        'rounded-2xl p-6 text-center shadow-elevated',
        status === 'critical' && 'idea-critical',
        status === 'attention' && 'idea-attention',
        status === 'stable' && 'idea-stable',
      )}
    >
      <p className="text-sm font-medium text-primary-foreground/80">Índice IDEA</p>
      <p className="mt-1 text-5xl font-extrabold tracking-tight text-primary-foreground animate-count-up">
        {score}
      </p>
      <p className="mt-1 text-sm font-semibold text-primary-foreground/90">{label}</p>
      {diff != null && (
        <p className="mt-2 text-xs text-primary-foreground/70">
          {diff > 0 ? `+${diff}` : diff} vs ontem
        </p>
      )}
    </div>
  );
}
