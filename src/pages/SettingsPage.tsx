import { useState, useEffect } from 'react';
import { useClinic, useUpdateClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, LogOut, CreditCard, ExternalLink } from 'lucide-react';

const statusLabels: Record<string, string> = {
  testando: 'Período de teste',
  ativo: 'Ativa',
  vencido: 'Pagamento pendente',
  cancelado: 'Cancelada',
  inativo: 'Inativa',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  testando: 'secondary',
  ativo: 'default',
  vencido: 'destructive',
  cancelado: 'destructive',
  inativo: 'outline',
};

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { data: clinic } = useClinic();
  const updateClinic = useUpdateClinic();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const [name, setName] = useState('');
  const [fillRate, setFillRate] = useState(85);
  const [noshowRate, setNoshowRate] = useState(5);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [dailyCapacity, setDailyCapacity] = useState(16);
  const [ticketMedio, setTicketMedio] = useState(250);
  const [workingDays, setWorkingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);

  useEffect(() => {
    if (clinic) {
      setName(clinic.name);
      setFillRate(Math.round(Number(clinic.target_fill_rate) * 100));
      setNoshowRate(Math.round(Number(clinic.target_noshow_rate) * 100));
      setTimezone(clinic.timezone);
      setDailyCapacity((clinic as any).daily_capacity ?? 16);
      setTicketMedio((clinic as any).ticket_medio ?? 250);
      setWorkingDays((clinic as any).working_days ?? ['seg', 'ter', 'qua', 'qui', 'sex']);
    }
  }, [clinic?.id]);

  const handleSave = async () => {
    try {
      await updateClinic.mutateAsync({
        name,
        target_fill_rate: fillRate / 100,
        target_noshow_rate: noshowRate / 100,
        timezone,
        daily_capacity: dailyCapacity,
        ticket_medio: ticketMedio,
        working_days: workingDays,
      });
      toast.success('Configurações salvas!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir portal');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
          <Settings className="h-5 w-5 text-secondary-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Configurações</h1>
      </div>

      {/* Subscription */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Plano</p>
            </div>
            <Badge variant={statusVariants[subscriptionStatus] || 'outline'} className="text-[10px]">
              {statusLabels[subscriptionStatus] || subscriptionStatus}
            </Badge>
          </div>
        </div>
        <div className="px-4 py-3 space-y-3">
          {subscriptionEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fim do período</span>
              <span className="text-sm font-semibold text-foreground">
                {new Date(subscriptionEnd).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={handleManageSubscription}
            disabled={portalLoading}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
          </Button>
        </div>
      </div>

      {/* Clinic settings */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Clínica</p>
        </div>
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome da clínica</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Capacidade diária (consultas/dia)
            </Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={dailyCapacity}
              onChange={(e) => setDailyCapacity(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">
              Usado para calcular ocupação e o Índice IDEA. Padrão: 16.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ticket médio por consulta (R$)
            </Label>
            <Input
              type="number"
              min={1}
              value={ticketMedio}
              onChange={(e) => setTicketMedio(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">
              Valor médio cobrado por consulta. Usado no cálculo de receita e perda. Padrão: R$ 250.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta ocupação (%)</Label>
              <Input type="number" min={0} max={100} value={fillRate} onChange={(e) => setFillRate(Number(e.target.value))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta no-show (%)</Label>
              <Input type="number" min={0} max={100} value={noshowRate} onChange={(e) => setNoshowRate(Number(e.target.value))} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fuso horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                <SelectItem value="America/Manaus">Manaus (AMT)</SelectItem>
                <SelectItem value="America/Recife">Recife (BRT)</SelectItem>
                <SelectItem value="America/Belem">Belém (BRT)</SelectItem>
                <SelectItem value="America/Cuiaba">Cuiabá (AMT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Working Days */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias de Atendimento</Label>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'seg', label: 'Seg' },
                { value: 'ter', label: 'Ter' },
                { value: 'qua', label: 'Qua' },
                { value: 'qui', label: 'Qui' },
                { value: 'sex', label: 'Sex' },
                { value: 'sab', label: 'Sáb' },
              ].map((day) => (
                <label key={day.value} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={workingDays.includes(day.value)}
                    onCheckedChange={(checked) => {
                      setWorkingDays(prev =>
                        checked
                          ? [...prev, day.value]
                          : prev.filter(d => d !== day.value)
                      );
                    }}
                  />
                  <span className="text-sm text-foreground">{day.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Marque apenas os dias que você atende. O app se adaptará à sua rotina.
            </p>
          </div>

          <Button onClick={handleSave} className="w-full rounded-xl" disabled={updateClinic.isPending}>
            Salvar configurações
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sair da conta
      </Button>
    </div>
  );
}
