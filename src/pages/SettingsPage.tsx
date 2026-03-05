import { useState, useEffect } from 'react';
import { useClinic, useUpdateClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

const SPECIALTIES = [
  'Clínica Geral', 'Dermatologia', 'Ortopedia', 'Cardiologia',
  'Ginecologia', 'Pediatria', 'Oftalmologia', 'Odontologia',
  'Psiquiatria', 'Outra',
];

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { data: clinic } = useClinic();
  const updateClinic = useUpdateClinic();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const [name, setName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hasSecretary, setHasSecretary] = useState(false);
  const [numDoctors, setNumDoctors] = useState(1);
  const [paymentType, setPaymentType] = useState('ambos');
  const [fillRate, setFillRate] = useState(85);
  const [noshowRate, setNoshowRate] = useState(5);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [dailyCapacity, setDailyCapacity] = useState(16);
  const [ticketMedio, setTicketMedio] = useState(250);
  const [monthlyTarget, setMonthlyTarget] = useState<number | ''>('');
  const [workingDays, setWorkingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);

  useEffect(() => {
    if (clinic) {
      const c = clinic as any;
      setName(c.name);
      setDoctorName(c.doctor_name || '');
      setSpecialty(c.specialty || '');
      setHasSecretary(c.has_secretary ?? false);
      setNumDoctors(c.num_doctors ?? 1);
      setPaymentType(c.payment_type ?? 'ambos');
      setFillRate(Math.round(Number(c.target_fill_rate) * 100));
      setNoshowRate(Math.round(Number(c.target_noshow_rate) * 100));
      setTimezone(c.timezone);
      setDailyCapacity(c.daily_capacity ?? 16);
      setTicketMedio(c.ticket_medio ?? 250);
      setMonthlyTarget(c.monthly_revenue_target ?? '');
      setWorkingDays(c.working_days ?? ['seg', 'ter', 'qua', 'qui', 'sex']);
    }
  }, [clinic?.id]);

  const handleSave = async () => {
    try {
      await updateClinic.mutateAsync({
        name,
        doctor_name: doctorName,
        specialty,
        has_secretary: hasSecretary,
        num_doctors: numDoctors,
        payment_type: paymentType,
        target_fill_rate: fillRate / 100,
        target_noshow_rate: noshowRate / 100,
        timezone,
        daily_capacity: dailyCapacity,
        ticket_medio: ticketMedio,
        monthly_revenue_target: monthlyTarget || null,
        working_days: workingDays,
      } as any);
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
          <Button variant="outline" className="w-full rounded-xl" onClick={handleManageSubscription} disabled={portalLoading}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
          </Button>
        </div>
      </div>

      {/* Doctor info */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Médico</p>
        </div>
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome do médico</Label>
            <Input value={doctorName} onChange={e => setDoctorName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Especialidade</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Tem secretária?</p>
            </div>
            <Switch checked={hasSecretary} onCheckedChange={setHasSecretary} />
          </div>
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
            <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantidade de médicos</Label>
            <Input type="number" min={1} value={numDoctors} onChange={e => setNumDoctors(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atende por</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="convenio">Convênio</SelectItem>
                <SelectItem value="particular">Particular</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capacidade diária (consultas/dia)</Label>
            <Input type="number" min={1} max={100} value={dailyCapacity} onChange={e => setDailyCapacity(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket médio por consulta (R$)</Label>
            <Input type="number" min={1} value={ticketMedio} onChange={e => setTicketMedio(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta ocupação (%)</Label>
              <Input type="number" min={0} max={100} value={fillRate} onChange={e => setFillRate(Number(e.target.value))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta no-show (%)</Label>
              <Input type="number" min={0} max={100} value={noshowRate} onChange={e => setNoshowRate(Number(e.target.value))} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta de faturamento mensal (R$)</Label>
            <Input
              type="number"
              min={0}
              value={monthlyTarget}
              onChange={e => setMonthlyTarget(e.target.value ? Number(e.target.value) : '')}
              placeholder="Opcional"
              className="rounded-xl"
            />
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
              ].map(day => (
                <label key={day.value} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={workingDays.includes(day.value)}
                    onCheckedChange={(checked) => {
                      setWorkingDays(prev =>
                        checked ? [...prev, day.value] : prev.filter(d => d !== day.value)
                      );
                    }}
                  />
                  <span className="text-sm text-foreground">{day.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Marque apenas os dias que você atende.</p>
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
