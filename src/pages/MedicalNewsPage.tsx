import { useNavigate } from 'react-router-dom';
import { useAllMedicalNews } from '@/hooks/useMedicalNews';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoryColors: Record<string, string> = {
  'Telemedicina': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Legislação': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Mercado': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Tecnologia': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Pesquisa': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function MedicalNewsPage() {
  const navigate = useNavigate();
  const { data: news, isLoading } = useAllMedicalNews();

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notícias do Mundo Médico</h1>
          <p className="text-xs text-muted-foreground">Atualizações relevantes para sua prática</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!news || news.length === 0) && (
        <div className="rounded-2xl bg-card border border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma notícia disponível no momento.</p>
        </div>
      )}

      {/* News list */}
      {news?.map((item) => {
        const colorClass = categoryColors[item.category] || 'bg-muted text-muted-foreground border-border';
        return (
          <button
            key={item.id}
            onClick={() => navigate(`/noticia/${item.id}`)}
            className="block w-full text-left rounded-2xl bg-card border border-border/60 shadow-card p-4 transition-all hover:shadow-elevated hover:border-primary/30 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className={`text-[10px] px-2 py-0.5 border ${colorClass}`}>
                    {item.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(item.published_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                <p className="text-[10px] text-primary/70 font-medium mt-1.5">{item.source}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-1" />
            </div>
          </button>
        );
      })}

      {/* Bottom spacing for nav */}
      <div className="h-16" />
    </div>
  );
}
