import { useLatestNews } from '@/hooks/useNews';
import { Card, CardContent } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NewsBanner() {
  const { data: news, isLoading } = useLatestNews();

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  if (!news || news.length === 0) return null;

  const latest = news[0];

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-card">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Newspaper className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Notícia</p>
          <p className="text-sm font-medium text-foreground mt-0.5 line-clamp-2">{latest.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{latest.summary}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            {formatDistanceToNow(new Date(latest.published_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
