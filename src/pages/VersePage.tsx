import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';

export default function VersePage() {
  const navigate = useNavigate();
  const [verse, setVerse] = useState<{ verse_text: string; verse_reference: string } | null>(null);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVerse = async () => {
      const { data, error: err } = await supabase.rpc('get_daily_verse').single();
      if (err || !data) {
        setError(true);
      } else {
        setVerse({ verse_text: data.verse_text, verse_reference: data.verse_reference });
      }
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
      const file = new File([blob], 'versiculo-dama.png', { type: 'image/png' });

      // Try native share first (best UX on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Versículo do Dia - DAMA' });
        return;
      }

      // Fallback: copy to clipboard + open Instagram Stories camera
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        // Try opening Instagram Stories camera via deep link
        window.location.href = 'instagram://story-camera';
        toast.success('Imagem copiada! Cole no Stories do Instagram.', { duration: 5000 });
      } catch {
        // Final fallback: download the image
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

  if (!verse) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-3">
        {error ? (
          <div className="text-center px-6">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o versículo de hoje.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleContinue}>
              Continuar <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        )}
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
        <p className="text-xl font-medium text-foreground leading-relaxed italic">
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '64px', color: 'rgba(212,175,55,0.6)', lineHeight: '0.5', verticalAlign: '-0.15em' }}>{"\u201C"}</span>
          {verse.verse_text}
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '64px', color: 'rgba(212,175,55,0.6)', lineHeight: '0.5', verticalAlign: '-0.4em' }}>{"\u201D"}</span>
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
