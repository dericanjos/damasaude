import { useState, useEffect } from 'react';
import { calculateChecklistPoints, checklistToItems, POINTS_PER_ITEM, COMPLETION_BONUS, getWorkingDaysPerWeek, LEVEL_NAMES } from '@/lib/checklist';
import { useTodayChecklist, useWeeklyChecklistCount, useSaveChecklist } from '@/hooks/useChecklist';
import { useClinic } from '@/hooks/useClinic';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle2, Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuccessChecklistCard() {
  const { checklist, existingAnswer, isWorkDay, unlockedLevel } = useTodayChecklist();
  const { data: weekCount = 0 } = useWeeklyChecklistCount();
  const { data: clinic } = useClinic();
  const saveChecklist = useSaveChecklist();

  const workingDays = (clinic as any)?.working_days ?? ['seg', 'ter', 'qua', 'qui', 'sex'];
  const totalDaysPerWeek = getWorkingDaysPerWeek(workingDays as string[]);

  const [answers, setAnswers] = useState<boolean[]>([false, false, false]);
  const [saved, setSaved] = useState(false);
  const [showSeal, setShowSeal] = useState(false);

  useEffect(() => {
    if (existingAnswer?.answers?.items) {
      const parsed = (existingAnswer.answers.items as any[]).map((a: any) => a.answered);
      setAnswers(parsed);
      setSaved(true);
      if (existingAnswer.completed) setShowSeal(true);
    } else {
      setAnswers([false, false, false]);
      setSaved(false);
      setShowSeal(false);
    }
  }, [existingAnswer?.id]);

  // Don't show on non-working days
  if (!isWorkDay) return null;
  // No checklist available
  if (!checklist) return null;

  const items = checklistToItems(checklist);
  const { points, completed } = calculateChecklistPoints(answers);
  const weeklyDone = saved ? weekCount : Math.max(0, weekCount);
  const weeklyProgress = (weeklyDone / totalDaysPerWeek) * 100;

  const handleToggle = (index: number, value: boolean) => {
    if (saved) return;
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  };

  const handleSave = async () => {
    try {
      const result = await saveChecklist.mutateAsync({ answers, checklist });
      setSaved(true);
      if (result.completed) {
        setShowSeal(true);
        toast.success(`Parabéns! Checklist completo! +${result.points} pontos no IDEA.`);
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
              ✅ Checklist de Sucesso
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Checklist {weeklyDone}/{totalDaysPerWeek} da semana: {checklist.category}
            </p>
          </div>
          {saved && (
            <div className="flex items-center gap-1 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">+{existingAnswer?.points_earned ?? points}pts</span>
            </div>
          )}
        </div>
        {/* Weekly progress bar */}
        <div className="mt-2">
          <Progress value={weeklyProgress} className="h-1.5" />
        </div>
        {/* Level badge */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Nível {checklist.level}: {LEVEL_NAMES[checklist.level]}
          </span>
          {unlockedLevel < 3 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Nível {unlockedLevel + 1} em breve
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-3">
        {items.map((item, i) => (
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

      {showSeal && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">🏆 Selo: {checklist.category}</p>
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
