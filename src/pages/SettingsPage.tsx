import { useState, useEffect, useMemo } from 'react';
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
import { Settings, LogOut, CreditCard, ExternalLink, Minus, Plus, Percent } from 'lucide-react';

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

const WEEK_DAYS = [
  { value: 'seg', label: 'S' },
  { value: 'ter', label: 'T' },
  { value: 'qua', label: 'Q' },
  { value: 'qui', label: 'Q' },
  { value: 'sex', label: 'S' },
  { value: 'sab', label: 'S' },
];

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { data: clinic } = useClinic();
  const updateClinic = useUpdateClinic();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  // Profile fields
  const [name, setName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hasSecretary, setHasSecretary] = useState(false);

  // Operation fields
  const [ticketMedio, setTicketMedio] = useState(250);
  const [workingDays, setWorkingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [dailyCapacity, setDailyCapacity] = useState(16);

  // Performance goals
  const [fillRate, setFillRate] = useState(85);
  const [noshowRate, setNoshowRate] = useState(5);

  // Track initial values for dirty detection
  const [initial, setInitial] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (clinic) {
      const c = clinic as any;
      const vals = {
        name: c.name || '',
        doctorName: c.doctor_name || '',
        specialty: c.specialty || '',
        hasSecretary: c.has_secretary ?? false,
        ticketMedio: c.ticket_medio ?? 250,
        workingDays: c.working_days ?? ['seg', 'ter', 'qua', 'qui', 'sex'],
        dailyCapacity: c.daily_capacity ?? 16,
        fillRate: Math.round(Number(c.target_fill_rate) * 100),
        noshowRate: Math.round(Number(c.target_noshow_rate) * 100),
      };
      setName(vals.name);
      setDoctorName(vals.doctorName);
      setSpecialty(vals.specialty);
      setHasSecretary(vals.hasSecretary);
      setTicketMedio(vals.ticketMedio);
      setWorkingDays(vals.workingDays);
      setDailyCapacity(vals.dailyCapacity);
      setFillRate(vals.fillRate);
      setNoshowRate(vals.noshowRate);
      setInitial(vals);
    }
  }, [clinic?.id]);

  const isDirty = useMemo(() => {
    if (!initial) return false;
    return (
      name !== initial.name ||
      doctorName !== initial.doctorName ||
      specialty !== initial.specialty ||
      hasSecretary !== initial.hasSecretary ||
      ticketMedio !== initial.ticketMedio ||
      JSON.stringify(workingDays.sort()) !== JSON.stringify([...initial.workingDays].sort()) ||
      dailyCapacity !== initial.dailyCapacity ||
      fillRate !== initial.fillRate ||
      noshowRate !== initial.noshowRate
    );
  }, [initial, name, doctorName, specialty, hasSecretary, ticketMedio, workingDays, dailyCapacity, fillRate, noshowRate]);

  const handleSave = async () => {
    try {
      await updateClinic.mutateAsync({
        name,
        doctor_name: doctorName,
        specialty,
        has_secretary: hasSecretary,
        ticket_medio: ticketMedio,
        working_days: workingDays,
        daily_capacity: dailyCapacity,
        target_fill_rate: fillRate / 100,
        target_noshow_rate: noshowRate / 100,
      } as any);
      setInitial({
        name, doctorName, specialty, hasSecretary,
        ticketMedio, workingDays: [...workingDays], dailyCapacity, fillRate, noshowRate,
      });
      toast.success('Configurações salvas com sucesso!');
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

  const toggleDay = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
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

      {/* Card 1: Perfil Básico */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Perfil Básico</p>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome da clínica</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <p className="text-sm font-medium text-foreground">Tem secretária?</p>
            <Switch checked={hasSecretary} onCheckedChange={setHasSecretary} />
          </div>
        </div>
      </div>

      {/* Card 2: Operação da Clínica */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operação da Clínica</p>
        </div>
        <div className="px-4 pb-4 space-y-5">
          {/* Ticket Médio */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Qual o seu ticket médio por consulta?
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
              <Input
                type="number"
                min={1}
                value={ticketMedio}
                onChange={e => setTicketMedio(Number(e.target.value))}
                className="rounded-xl pl-10"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Esse valor é a base para calcular sua receita e perdas.</p>
          </div>

          {/* Dias de Atendimento */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Quais dias você atende?
            </Label>
            <div className="flex gap-2">
              {WEEK_DAYS.map((day, i) => {
                const active = workingDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    title={['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][i]}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">Isso define os dias do seu checklist e o cálculo de consistência.</p>
          </div>

          {/* Capacidade Diária */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Qual a sua capacidade máxima de atendimentos por dia?
            </Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDailyCapacity(Math.max(1, dailyCapacity - 1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <Input
                type="number"
                min={1}
                max={100}
                value={dailyCapacity}
                onChange={e => setDailyCapacity(Math.max(1, Number(e.target.value)))}
                className="rounded-xl text-center"
              />
              <button
                type="button"
                onClick={() => setDailyCapacity(Math.min(100, dailyCapacity + 1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Usado para calcular sua taxa de ocupação.</p>
          </div>
        </div>
      </div>

      {/* Card 3: Metas de Performance */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Metas de Performance</p>
        </div>
        <div className="px-4 pb-4 space-y-5">
          {/* Meta de Ocupação */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Meta de Ocupação da Agenda
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={fillRate}
                onChange={e => setFillRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="rounded-xl pr-10"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Recomendado: 85%. O sistema usará essa meta para gerar alertas.</p>
          </div>

          {/* Meta de No-show */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Meta de Taxa de No-show
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={noshowRate}
                onChange={e => setNoshowRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="rounded-xl pr-10"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Recomendado: abaixo de 5%.</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        className="w-full rounded-xl"
        disabled={!isDirty || updateClinic.isPending}
      >
        {updateClinic.isPending ? 'Salvando...' : 'Salvar Alterações'}
      </Button>

      {/* Logout */}
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
