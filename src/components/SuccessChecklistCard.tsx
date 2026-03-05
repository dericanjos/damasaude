import { useState, useEffect } from 'react';
import { getTodayCategory, calculateChecklistPoints, POINTS_PER_ITEM, COMPLETION_BONUS, CHECKLIST_CATEGORIES } from '@/lib/checklist';
import { useTodayChecklist, useSaveChecklist } from '@/hooks/useChecklist';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

function getNextCategory(currentDay: number) {
  if (currentDay >= 5) return null; // Friday or weekend
  return CHECKLIST_CATEGORIES.find(c => c.dayOfWeek === currentDay + 1) ?? null;
}

export default function SuccessChecklistCard() {
  const category = getTodayCategory();
  const { data: existing } = useTodayChecklist();
  const saveChecklist = useSaveChecklist();

  const [answers, setAnswers] = useState<boolean[]>([]);
  const [saved, setSaved] = useState(false);
  const [showSeal, setShowSeal] = useState(false);

  useEffect(() => {
    if (!category) return;
    if (existing?.answers) {
      const parsed = (existing.answers as any[]).map((a: any) => a.answered);
      setAnswers(parsed);
      setSaved(true);
      if (existing.completed) setShowSeal(true);
    } else {
      setAnswers(category.items.map(() => false));
      setSaved(false);
    }
  }, [existing?.id, category?.dayOfWeek]);

  if (!category) return null; // Weekend

  const { points, completed } = calculateChecklistPoints(answers);

  const handleToggle = (index: number, value: boolean) => {
    if (saved) return;
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  };

  const handleSave = async () => {
    try {
      const result = await saveChecklist.mutateAsync(answers);
      setSaved(true);
      if (result.completed) {
        setShowSeal(true);
        toast.success(`Parabéns! Você completou o checklist e ganhou +${result.points} pontos no seu Índice IDEA.`);
      } else {
        toast.success(`Checklist salvo! +${result.points} pontos no IDEA.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar checklist');
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {category.emoji} Checklist de Sucesso
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Dia {category.dayOfWeek} de 5: {category.title}
            </p>
          </div>
          {saved && (
            <div className="flex items-center gap-1 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">+{points}pts</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map(d => (
            <div
              key={d}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                d <= category.dayOfWeek ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-3">
        {category.items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm text-foreground leading-snug',
                saved && answers[i] && 'text-muted-foreground line-through'
              )}>
                {item.question}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                💡 {item.tip}
              </p>
            </div>
            <Switch
              checked={answers[i] ?? false}
              onCheckedChange={(v) => handleToggle(i, v)}
              disabled={saved}
              className="mt-0.5 shrink-0"
            />
          </div>
        ))}
      </div>

      {!saved && (
        <div className="px-4 pb-4">
          <Button
            onClick={handleSave}
            className="w-full rounded-xl text-sm"
            disabled={saveChecklist.isPending}
            size="sm"
          >
            {saveChecklist.isPending ? 'Salvando...' : `Salvar checklist (+${points}pts)`}
          </Button>
        </div>
      )}

      {/* Tomorrow preview */}
      {(() => {
        const next = getNextCategory(category.dayOfWeek);
        return (
          <div className="px-4 pb-3">
            <p className="text-[11px] text-muted-foreground text-center">
              {next
                ? `Amanhã: ${next.emoji} ${next.title}`
                : '✅ Semana concluída com sucesso!'}
            </p>
          </div>
        );
      })()}

      {showSeal && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">{category.sealName}</p>
              <p className="text-xs text-muted-foreground">
                Bônus de conclusão: +{COMPLETION_BONUS}pts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
