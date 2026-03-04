import { useState, useEffect } from 'react';
import { getTodayCategory, calculateChecklistPoints, POINTS_PER_ITEM, COMPLETION_BONUS } from '@/lib/checklist';
import { useTodayChecklist, useSaveChecklist } from '@/hooks/useChecklist';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            <p className="text-sm font-semibold text-foreground mt-0.5">{category.title}</p>
          </div>
          {saved && (
            <div className="flex items-center gap-1 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">+{points}pts</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-3">
        {category.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <p className={cn(
              'text-sm text-foreground flex-1',
              saved && answers[i] && 'text-muted-foreground line-through'
            )}>
              {item.question}
            </p>
            <Switch
              checked={answers[i] ?? false}
              onCheckedChange={(v) => handleToggle(i, v)}
              disabled={saved}
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
