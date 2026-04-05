import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NPSModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NPSModal({ open, onClose }: NPSModalProps) {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [step, setStep] = useState<'score' | 'feedback'>('score');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const category = score !== null ? (score >= 9 ? 'promoter' : score >= 7 ? 'neutral' : 'detractor') : null;

  const handleSelectScore = (s: number) => {
    setScore(s);
  };

  const handleSubmitScore = () => {
    if (score === null) return;
    setStep('feedback');
  };

  const handleSubmit = async () => {
    if (!user || score === null) return;
    setSubmitting(true);
    try {
      await supabase.from('nps_responses').insert({
        user_id: user.id,
        score,
        comment: comment.trim() || null,
      } as any);

      await supabase
        .from('profiles')
        .update({ nps_prompted: true } as any)
        .eq('user_id', user.id);

      toast.success('Obrigado pelo seu feedback!', { description: 'Sua opinião nos ajuda a melhorar.' });
      onClose();
    } catch {
      toast.error('Erro ao enviar feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoterAction = async () => {
    // Save the score first
    await handleSubmit();
  };

  const getScoreColor = (s: number) => {
    if (s >= 9) return 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30';
    if (s >= 7) return 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30';
    return 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30';
  };

  const getSelectedColor = (s: number) => {
    if (s >= 9) return 'bg-green-500 border-green-500 text-white';
    if (s >= 7) return 'bg-amber-500 border-amber-500 text-white';
    return 'bg-red-500 border-red-500 text-white';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'score' ? 'Como está sendo sua experiência?' : (
              category === 'promoter' ? '🎉 Que bom que você está gostando!' :
              category === 'neutral' ? 'Obrigado pelo feedback!' :
              'Sentimos muito.'
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'score' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              De 0 a 10, quanto recomendaria o DAMA a um colega médico?
            </p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectScore(i)}
                  className={cn(
                    'h-9 rounded-lg border text-sm font-bold transition-all',
                    score === i ? getSelectedColor(i) : getScoreColor(i)
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
            <Button
              onClick={handleSubmitScore}
              disabled={score === null}
              className="w-full rounded-xl"
            >
              Enviar
            </Button>
          </div>
        )}

        {step === 'feedback' && category === 'promoter' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Uma avaliação na store ajuda outros médicos a descobrirem o DAMA Clínica.
            </p>
            <Button onClick={handlePromoterAction} className="w-full rounded-xl" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Avaliar na store'}
            </Button>
            <button
              onClick={handleSubmit}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              disabled={submitting}
            >
              Agora não, obrigado
            </button>
          </div>
        )}

        {step === 'feedback' && category === 'neutral' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              O que podemos melhorar?
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Sua sugestão nos ajuda a evoluir..."
              className="min-h-[80px] rounded-xl"
            />
            <Button onClick={handleSubmit} className="w-full rounded-xl" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar feedback'}
            </Button>
          </div>
        )}

        {step === 'feedback' && category === 'detractor' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              O que está faltando?
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte pra gente o que podemos fazer melhor..."
              className="min-h-[80px] rounded-xl"
            />
            <Button onClick={handleSubmit} className="w-full rounded-xl" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar feedback'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
