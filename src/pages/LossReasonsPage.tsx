import { useState } from 'react';
import { useWeekLossReasons, useAddLossReason } from '@/hooks/useLossReasons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const typeLabels: Record<string, string> = {
  no_show: 'No-show',
  cancellation: 'Cancelamento',
  lost_lead: 'Lead perdido',
};

export default function LossReasonsPage() {
  const { data: reasons = [] } = useWeekLossReasons();
  const addReason = useAddLossReason();
  const [type, setType] = useState('no_show');
  const [reason, setReason] = useState('');
  const [count, setCount] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      await addReason.mutateAsync({ type, reason: reason.trim(), count });
      toast.success('Motivo registrado!');
      setReason('');
      setCount(1);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  // Aggregate reasons by text
  const aggregated = reasons.reduce<Record<string, { type: string; reason: string; total: number }>>((acc, r) => {
    const key = `${r.type}:${r.reason}`;
    if (!acc[key]) acc[key] = { type: r.type, reason: r.reason, total: 0 };
    acc[key].total += r.count;
    return acc;
  }, {});

  const sorted = Object.values(aggregated).sort((a, b) => b.total - a.total);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Motivos de Perda</h1>
          <p className="text-xs text-muted-foreground">Registro rápido</p>
        </div>
      </div>

      <Card className="shadow-card border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_show">No-show</SelectItem>
                  <SelectItem value="cancellation">Cancelamento</SelectItem>
                  <SelectItem value="lost_lead">Lead perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Esqueceu da consulta"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={addReason.isPending}>
              Registrar motivo
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Weekly summary */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Motivos desta semana</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum motivo registrado.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground mr-2">
                      {typeLabels[item.type] || item.type}
                    </span>
                    <span className="text-sm text-foreground">{item.reason}</span>
                  </div>
                  <span className="ml-3 text-sm font-bold text-foreground">{item.total}x</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
