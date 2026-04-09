import { useParams, useNavigate } from 'react-router-dom';
import { useMedicalNewsById } from '@/hooks/useMedicalNews';
import { ArrowLeft, Info, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  'Telemedicina': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Legislação': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Mercado': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Tecnologia': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Pesquisa': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: article, isLoading } = useMedicalNewsById(id);

  const handleShare = async () => {
    if (!article) return;
    const shareText = `${article.title}\n\n${article.summary}\n\nFonte: ${article.source}\n\nVia DAMA Doc`;
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, text: shareText });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Copiado para a área de transferência');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Notícia não encontrada ou removida.</p>
        </div>
      </div>
    );
  }

  const colorClass = categoryColors[article.category] || 'bg-muted text-muted-foreground border-border';

  const paragraphs = (article.content || article.summary || '')
    .split(/\n\n+|\n/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleShare}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Compartilhar"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Category + Date */}
      <div className="flex items-center gap-2">
        <Badge className={`text-[10px] px-2 py-0.5 border ${colorClass}`}>
          {article.category}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(article.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-foreground leading-tight">{article.title}</h1>

      {/* Source */}
      <p className="text-xs text-primary/70 font-medium">Fonte: {article.source}</p>

      {/* Content */}
      <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-3">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-foreground/90 leading-relaxed">{p}</p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Conteúdo não disponível.</p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
        <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <p className="text-[11px] text-amber-300/80 leading-relaxed">
          <strong>Aviso:</strong> Este conteúdo é um resumo informativo gerado com auxílio de inteligência artificial para manter você atualizado sobre tendências do setor médico. Para decisões clínicas, regulatórias ou jurídicas, consulte sempre a fonte oficial ({article.source}) e verifique a informação completa.
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate('/noticias')}
      >
        Ver outras notícias
      </Button>

      <div className="h-16" />
    </div>
  );
}
