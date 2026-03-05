import { useEffect, useState } from 'react';
import { useEfficiencyBadge } from '@/hooks/useEfficiencyBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Award } from 'lucide-react';

const BADGE_SEEN_KEY = 'dama_badge_seen';
const BADGE_LOST_KEY = 'dama_badge_lost_seen';

export default function EfficiencyBadgeModal() {
  const { data: hasBadge } = useEfficiencyBadge();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (hasBadge === undefined) return;

    if (hasBadge) {
      const seen = localStorage.getItem(BADGE_SEEN_KEY);
      if (!seen) {
        setShowModal(true);
        localStorage.setItem(BADGE_SEEN_KEY, 'true');
      }
      // Reset lost key so if they lose it again we can notify
      localStorage.removeItem(BADGE_LOST_KEY);
    } else {
      // If they had it and lost it
      const wasSeen = localStorage.getItem(BADGE_SEEN_KEY);
      const lostSeen = localStorage.getItem(BADGE_LOST_KEY);
      if (wasSeen && !lostSeen) {
        toast.error(
          'Atenção! Sua performance caiu e o Selo de Clínica Eficiente foi temporariamente removido. Recupere sua média de 80 para conquistá-lo novamente.',
          { duration: 8000 }
        );
        localStorage.setItem(BADGE_LOST_KEY, 'true');
        localStorage.removeItem(BADGE_SEEN_KEY);
      }
    }
  }, [hasBadge]);

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <Award className="h-9 w-9 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl">🏅 Parabéns!</DialogTitle>
          <DialogDescription className="text-sm mt-2 leading-relaxed">
            Você conquistou o <span className="font-bold text-foreground">Selo de Clínica Eficiente</span> por manter uma performance de excelência nos últimos 30 dias.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => setShowModal(false)} className="w-full rounded-xl mt-2">
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
