import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

export default function DailyVerseCard() {
  const [verse, setVerse] = useState<{ verse_text: string; verse_reference: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVerse = async () => {
      setLoading(true);
      const { data, error: err } = await supabase.rpc('get_daily_verse').single();
      if (err || !data) {
        setError(true);
      } else {
        setVerse({ verse_text: data.verse_text, verse_reference: data.verse_reference });
      }
      setLoading(false);
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
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'versiculo-dama.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Versículo do Dia - DAMA' });
        return;
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        window.location.href = 'instagram://story-camera';
        toast.success('Imagem copiada! Cole no Stories do Instagram.', { duration: 5000 });
      } catch {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'versiculo-dama.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Imagem salva! Abra o Instagram e compartilhe nos Stories.');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('Não foi possível compartilhar. Tente novamente.');
      }
    } finally {
      setSharing(false);
    }
  };

  if (loading) return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(222,47%,14%)] to-[hsl(222,47%,10%)] p-5 animate-pulse h-32" />
  );

  if (error) return (
    <div className="rounded-2xl border border-destructive/20 bg-gradient-to-br from-[hsl(222,47%,14%)] to-[hsl(222,47%,10%)] p-5">
      <p className="text-xs text-muted-foreground">Não foi possível carregar o versículo de hoje.</p>
    </div>
  );

  if (!verse) return null;

  const textLength = verse.verse_text.length;
  const verseFontClass = textLength > 200 ? 'text-xs' : textLength > 150 ? 'text-sm' : textLength > 100 ? 'text-[13px]' : 'text-sm';

  return (
    <>
      {/* Shareable card (rendered for screenshot) */}
      <div
        ref={cardRef}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(222,47%,14%)] to-[hsl(222,47%,10%)] p-5 shadow-card overflow-hidden relative max-h-[280px]"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col justify-center h-full">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Versículo do Dia</p>
          </div>

          <p className={`${verseFontClass} font-medium text-foreground leading-relaxed italic`}>
            "{verse.verse_text}"
          </p>
          <p className="text-xs font-semibold text-muted-foreground mt-2">
            — {verse.verse_reference}
          </p>

          {/* DAMA branding */}
          <div className="flex flex-col mt-4 pt-3 border-t border-border/30">
            <p className="text-[9px] text-muted-foreground/60 font-medium tracking-wider">DAMA • Gestão Inteligente</p>
            <p className="text-[8px] text-white/50 uppercase tracking-widest mt-0.5">Gestão inteligente para médicos</p>
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
