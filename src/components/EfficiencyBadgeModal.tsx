import { useEffect, useState } from 'react';
import { useEfficiencyBadge } from '@/hooks/useEfficiencyBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Award } from 'lucide-react';

function useBadgeProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['badge-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('badge_seen_at, badge_lost_seen')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { badge_seen_at: string | null; badge_lost_seen: boolean } | null;
    },
    enabled: !!user,
  });
}

export default function EfficiencyBadgeModal() {
  const { user } = useAuth();
  const { data: hasBadge } = useEfficiencyBadge();
  const { data: profile } = useBadgeProfile();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const updateProfile = async (updates: Record<string, any>) => {
    if (!user) return;
    await supabase.from('profiles').update(updates as any).eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['badge-profile'] });
  };

  useEffect(() => {
    if (hasBadge === undefined || profile === undefined) return;

    if (hasBadge) {
      if (!profile?.badge_seen_at) {
        setShowModal(true);
        updateProfile({ badge_seen_at: new Date().toISOString(), badge_lost_seen: false });
      }
    } else {
      if (profile?.badge_seen_at && !profile?.badge_lost_seen) {
        toast.error(
          'Atenção! Sua performance caiu e o Selo de Clínica Eficiente foi temporariamente removido. Recupere sua média de 80 para conquistá-lo novamente.',
          { duration: 8000 }
        );
        updateProfile({ badge_lost_seen: true, badge_seen_at: null });
      }
    }
  }, [hasBadge, profile]);

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
