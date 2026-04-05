import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMarkVerseSeen } from '@/hooks/useVerseSeen';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';
import { format } from 'date-fns';

export default function VersePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [verse, setVerse] = useState<{ verse_text: string; verse_reference: string } | null>(null);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const storiesRef = useRef<HTMLDivElement>(null);

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

  const markSeen = useMarkVerseSeen();

  const handleContinue = async () => {
    try {
      await markSeen.mutateAsync();
    } catch {
      // Se falhar, continua mesmo assim para não travar o médico
    }
    queryClient.setQueryData(['verse-seen', user?.id, today], true);
    navigate('/', { replace: true });
  };

  const handleShare = async () => {
    if (!storiesRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(storiesRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        width: 1080,
        height: 1920,
        backgroundColor: '#0f1729',
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'versiculo-dama.png', { type: 'image/png' });

      // Try native share first (best UX on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Versículo do Dia - DAMA Clínica' });
        return;
      }

      // Fallback: copy to clipboard + open Instagram Stories camera
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
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
        background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.04) 35%, hsl(222,47%,12%) 65%, hsl(222,47%,10%) 100%)',
      }}
    >
      {/* Hidden Stories-format image for sharing (9:16 = 1080x1920) */}
      <div
        ref={storiesRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '1080px',
          height: '1920px',
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 35%, #0f1729 65%, #0d1322 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '120px 80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={logoDama} alt="DAMA" style={{ height: '120px', objectFit: 'contain' }} />
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '4px', marginTop: '8px' }}>Gestão inteligente para médicos</p>
        </div>
        <div
          style={{
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '24px',
            padding: '60px 50px',
            textAlign: 'center',
            maxWidth: '920px',
          }}
        >
          <p style={{
            fontSize: '42px',
            fontWeight: 500,
            color: '#e2e8f0',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '80px', color: 'rgba(212,175,55,0.6)', lineHeight: '0.5', verticalAlign: '-0.15em' }}>{"\u201C"}</span>
            {verse.verse_text}
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '80px', color: 'rgba(212,175,55,0.6)', lineHeight: '0.5', verticalAlign: '-0.4em' }}>{"\u201D"}</span>
          </p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: '#94a3b8', marginTop: '40px' }}>
            — {verse.verse_reference}
          </p>
        </div>
        <p style={{ fontSize: '22px', color: 'rgba(148,163,184,0.5)', fontWeight: 500, letterSpacing: '3px' }}>
          DAMA · Gestão inteligente para médicos
        </p>
      </div>

      {/* Logo + subtítulo */}
      <div className="flex-shrink-0 pt-4 flex flex-col items-center">
        <img src={logoDama} alt="DAMA" className="h-[100px] object-contain" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 mt-1">Gestão inteligente para médicos</p>
      </div>

      {/* Verse content */}
      <div
        ref={cardRef}
        className="flex flex-col items-center justify-center text-center max-w-sm rounded-2xl p-8 max-h-[300px] overflow-y-auto"
        style={{ border: '1px solid rgba(212,175,55,0.3)' }}
      >
        <p className={`font-medium text-foreground leading-relaxed italic text-center ${verse.verse_text.length > 150 ? 'text-sm' : verse.verse_text.length > 100 ? 'text-base' : 'text-lg'}`}>
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
          DAMA · Gestão inteligente para médicos
        </p>
      </div>
    </div>
  );
}