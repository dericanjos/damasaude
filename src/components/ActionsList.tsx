import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Action {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface ActionsListProps {
  actions: Action[];
  onComplete: (id: string) => void;
  onRegenerate: () => void;
  loading?: boolean;
}

export default function ActionsList({ actions, onComplete, onRegenerate, loading }: ActionsListProps) {
  const doneCount = actions.filter(a => a.status === 'done').length;

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            3 Ações do Dia
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{doneCount}/{actions.length} concluídas</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={loading} className="text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Regerar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Faça o check-in do dia para gerar as ações.
          </p>
        )}
        {actions.map((action, index) => {
          const isCritical = index === 0 && actions.length > 0;
          return (
            <div key={action.id}>
              {isCritical && action.status !== 'done' && (
                <div className="mb-1.5 rounded-t-xl bg-destructive/10 border border-b-0 border-destructive/20 px-3 py-1.5">
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">⚡ Ação crítica de hoje</p>
                  <p className="text-[10px] text-destructive/70">Esta é a ação com maior potencial de impacto no seu resultado de hoje.</p>
                </div>
              )}
              <div
                className={cn(
                  'flex items-start gap-3 border border-border/50 p-3 transition-all',
                  isCritical && action.status !== 'done'
                    ? 'rounded-b-xl border-destructive/20 bg-destructive/5'
                    : 'rounded-xl',
                  action.status === 'done' && 'bg-accent/50 opacity-70 rounded-xl'
                )}
              >
                <button
                  onClick={() => action.status !== 'done' && onComplete(action.id)}
                  disabled={action.status === 'done'}
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    action.status === 'done'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 hover:border-primary'
                  )}
                >
                  {action.status === 'done' && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    action.status === 'done' && 'line-through text-muted-foreground'
                  )}>
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-normal break-words">{action.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
