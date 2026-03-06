import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function DailyVerseCard() {
  const [verse, setVerse] = useState<{ verse_text: string; verse_reference: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVerse = async () => {
      const day = getDayOfYear();
      const { data } = await supabase
        .from('daily_verses')
        .select('verse_text, verse_reference')
        .eq('day_of_year', day)
        .maybeSingle();
      if (data) setVerse(data);
    };
    fetchVerse();
  }, []);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0f1729',
      });

      // Convert to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `versiculo-${getDayOfYear()}.png`, { type: 'image/png' });

      // Try native share (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Versículo do Dia - DAMA',
          text: `"${verse?.verse_text}" — ${verse?.verse_reference}`,
        });
      } else {
        // Fallback: upload to storage and open Instagram deep link
        const fileName = `verse-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('verse-images')
          .upload(fileName, blob, { contentType: 'image/png', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('verse-images')
          .getPublicUrl(fileName);

        const publicUrl = urlData?.publicUrl;
        if (publicUrl) {
          // Try Instagram deep link
          const instagramUrl = `instagram://share?source_application=DAMA`;
          window.open(instagramUrl, '_blank');
          // Also copy link
          await navigator.clipboard?.writeText(publicUrl);
          toast.success('Imagem gerada! Link copiado para a área de transferência.');
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('Não foi possível compartilhar. Tente novamente.');
      }
    } finally {
      setSharing(false);
    }
  };

  if (!verse) return null;

  return (
    <>
      {/* Shareable card (rendered for screenshot) */}
      <div
        ref={cardRef}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(222,47%,14%)] to-[hsl(222,47%,10%)] p-5 shadow-card overflow-hidden relative"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Versículo do Dia</p>
          </div>

          <p className="text-sm font-medium text-foreground leading-relaxed italic">
            "{verse.verse_text}"
          </p>
          <p className="text-xs font-semibold text-muted-foreground mt-2">
            — {verse.verse_reference}
          </p>

          {/* DAMA branding */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
            <p className="text-[9px] text-muted-foreground/60 font-medium tracking-wider">DAMA • Gestão Inteligente</p>
          </div>
        </div>
      </div>

      {/* Share button (outside ref so it's not in the screenshot) */}
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl mt-2 text-xs"
        onClick={handleShare}
        disabled={sharing}
      >
        {sharing ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
        )}
        Compartilhar no Stories
      </Button>
    </>
  );
}
