import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function VersePage() {
  const navigate = useNavigate();
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

  const handleContinue = () => {
    localStorage.setItem('verse_seen_date', new Date().toISOString().slice(0, 10));
    navigate('/', { replace: true });
  };

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
      const file = new File([blob], `versiculo-${getDayOfYear()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Versículo do Dia - DAMA',
          text: `"${verse?.verse_text}" — ${verse?.verse_reference}`,
        });
      } else {
        const fileName = `verse-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('verse-images')
          .upload(fileName, blob, { contentType: 'image/png', upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('verse-images')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          window.open(`instagram://share?source_application=DAMA`, '_blank');
          await navigator.clipboard?.writeText(urlData.publicUrl);
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

  if (!verse) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-10"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, hsl(222,47%,12%) 55%, hsl(222,47%,10%) 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex-shrink-0 pt-4">
        <img src={logoDama} alt="DAMA" className="h-[100px] object-contain" />
      </div>

      {/* Verse content (shareable area) */}
      <div
        ref={cardRef}
        className="flex flex-col items-center justify-center text-center max-w-sm rounded-2xl p-8"
        style={{ border: '1px solid rgba(212,175,55,0.3)' }}
      >
        {/* Decorative quote mark */}
        <div className="font-serif leading-none mb-4" style={{ fontSize: '48px', color: '#D4AF37' }}>"</div>

        <p className="text-xl font-medium text-foreground leading-relaxed italic">
          {verse.verse_text}
        </p>

        <p className="text-sm font-semibold text-muted-foreground mt-5">
          — {verse.verse_reference}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs flex-shrink-0 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl text-xs border-border/60"
          onClick={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
          )}
          Compartilhar no Stories
        </Button>

        <Button
          onClick={handleContinue}
          className="w-full rounded-xl gradient-primary text-white font-semibold shadow-premium"
          size="lg"
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>

        <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wider mt-2">
          DAMA · Solução completa para médicos
        </p>
      </div>
    </div>
  );
}
