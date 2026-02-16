import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  variant?: 'default' | 'danger' | 'warning';
}

export default function MetricCard({ icon: Icon, label, value, variant = 'default' }: MetricCardProps) {
  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          variant === 'danger' && 'bg-destructive/10 text-destructive',
          variant === 'warning' && 'bg-idea-attention/10 text-idea-attention',
          variant === 'default' && 'bg-accent text-accent-foreground',
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
