import { useState, useEffect, useMemo, useCallback } from 'react';
import { useClinic, useUpdateClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocations, useCreateLocation, useUpdateLocation, useLocationSchedules, useLocationFinancial, type Location } from '@/hooks/useLocations';
import { useQASeed } from '@/hooks/useQASeed';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, LogOut, CreditCard, ExternalLink, Percent, MapPin, Plus, Pencil, Bell, FlaskConical, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_KEYS, DAY_LABELS, DAY_SHORT_LABELS, parseDailyCapacities, type DailyCapacities } from '@/lib/days';

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

const WEEKDAYS = [
  { value: 0, label: 'Dom', short: 'D' },
  { value: 1, label: 'Seg', short: 'S' },
  { value: 2, label: 'Ter', short: 'T' },
  { value: 3, label: 'Qua', short: 'Q' },
  { value: 4, label: 'Qui', short: 'Q' },
  { value: 5, label: 'Sex', short: 'S' },
  { value: 6, label: 'Sáb', short: 'S' },
];

type ScheduleEntry = { weekday: number; start_time: string; end_time: string; daily_capacity: number };

function LocationEditDialog({
  open,
  onOpenChange,
  location,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const { data: existingSchedules = [] } = useLocationSchedules(location?.id);
  const { data: existingFinancial } = useLocationFinancial(location?.id);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [ticketAvg, setTicketAvg] = useState<number | ''>(250);
  const [ticketPrivLoc, setTicketPrivLoc] = useState<number | ''>(250);
  const [ticketInsLoc, setTicketInsLoc] = useState<number | ''>(100);
  const [hasSecretaryLoc, setHasSecretaryLoc] = useState(false);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [schedules, setSchedules] = useState<Record<number, ScheduleEntry>>({});

  useEffect(() => {
    if (location) {
      setName(location.name);
      setAddress(location.address);
      setTicketAvg(existingFinancial?.ticket_avg ?? 250);
      setTicketPrivLoc((existingFinancial as any)?.ticket_private ?? 250);
      setTicketInsLoc((existingFinancial as any)?.ticket_insurance ?? 100);
      setHasSecretaryLoc(location.has_secretary ?? false);
      const days = existingSchedules.map(s => s.weekday);
      setActiveDays(days.length > 0 ? days : [1, 2, 3, 4, 5]);
      const sMap: Record<number, ScheduleEntry> = {};
      existingSchedules.forEach(s => {
        sMap[s.weekday] = {
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time,
          daily_capacity: s.daily_capacity,
        };
      });
      setSchedules(sMap);
    } else {
      setName('');
      setAddress('');
      setTicketAvg(250);
      setTicketPrivLoc(250);
      setTicketInsLoc(100);
      setHasSecretaryLoc(false);
      setActiveDays([1, 2, 3, 4, 5]);
      setSchedules({});
    }
  }, [location?.id, existingSchedules.length, existingFinancial?.ticket_avg]);

  const toggleDay = (day: number) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const getSchedule = (day: number): ScheduleEntry => {
    return schedules[day] || { weekday: day, start_time: '08:00', end_time: '18:00', daily_capacity: 16 };
  };

  const setDayCapacity = (day: number, cap: string) => {
    const s = getSchedule(day);
    setSchedules(prev => ({ ...prev, [day]: { ...s, daily_capacity: cap === '' ? 0 : Math.max(0, parseInt(cap) || 0) } }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do local é obrigatório');
      return;
    }

    const emptyDays = activeDays.filter(d => (getSchedule(d).daily_capacity ?? 0) === 0);
    if (emptyDays.length > 0) {
      const dayNames = emptyDays.map(d => WEEKDAYS.find(w => w.value === d)?.label).join(', ');
      toast.warning(`${dayNames} está marcado mas com 0 horários.`);
      return;
    }

    const scheduleList = activeDays.map(d => getSchedule(d));

    try {
      if (location) {
        await updateLocation.mutateAsync({
          id: location.id,
          name: name.trim(),
          address: address.trim(),
          ticket_avg: (ticketAvg || 0) as number,
          ticket_private: (ticketPrivLoc || 0) as number,
          ticket_insurance: (ticketInsLoc || 0) as number,
          has_secretary: hasSecretaryLoc,
          schedules: scheduleList,
        });
        toast.success('Local atualizado!');
      } else {
        await createLocation.mutateAsync({
          name: name.trim(),
          address: address.trim(),
          ticket_avg: (ticketAvg || 0) as number,
          ticket_private: (ticketPrivLoc || 0) as number,
          ticket_insurance: (ticketInsLoc || 0) as number,
          has_secretary: hasSecretaryLoc,
          schedules: scheduleList,
        });
        toast.success('Local criado!');
      }
      onSave();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? 'Editar Local' : 'Novo Local'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome do local *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Consultório Centro" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Endereço</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua..." className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Particular (R$)</Label>
            <Input type="number" min={1} value={ticketPrivLoc} onChange={e => setTicketPrivLoc(e.target.value === '' ? '' : Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Convênio (R$)</Label>
            <Input type="number" min={1} value={ticketInsLoc} onChange={e => setTicketInsLoc(e.target.value === '' ? '' : Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket médio (R$) — fallback</Label>
            <Input type="number" min={1} value={ticketAvg} onChange={e => setTicketAvg(e.target.value === '' ? '' : Number(e.target.value))} className="rounded-xl" />
            <p className="text-[10px] text-muted-foreground">Usado para cancelamentos e buracos quando não há split por tipo.</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label className="text-sm font-semibold text-foreground">Tem secretária neste local?</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Adapta a linguagem das sugestões e ações</p>
            </div>
            <Switch checked={hasSecretaryLoc} onCheckedChange={setHasSecretaryLoc} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias de atendimento</Label>
            <div className="flex justify-between gap-1.5">
              {WEEKDAYS.map(day => {
                const active = activeDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl text-[13px] font-bold transition-all duration-200',
                      active
                        ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 scale-105'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-border/40'
                    )}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capacidade por dia</Label>
            <div className="grid grid-cols-2 gap-2">
              {WEEKDAYS.filter(d => activeDays.includes(d.value)).map(day => {
                const sched = getSchedule(day.value);
                return (
                  <div key={day.value} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                    <span className="text-xs font-semibold text-foreground w-10 shrink-0">{day.label}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={sched.daily_capacity === 0 ? '' : sched.daily_capacity}
                      onChange={e => setDayCapacity(day.value, e.target.value)}
                      className="rounded-lg h-8 text-center text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full rounded-xl" disabled={createLocation.isPending || updateLocation.isPending}>
            {createLocation.isPending || updateLocation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function SettingsPage() {
  const { signOut } = useAuth();
  const { data: clinic } = useClinic();
  const updateClinic = useUpdateClinic();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const { data: locations = [], refetch: refetchLocations } = useLocations();
  const updateLocation = useUpdateLocation();
  const [portalLoading, setPortalLoading] = useState(false);

  // Profile fields
  const [name, setName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorGender, setDoctorGender] = useState('masculino');
  const [specialty, setSpecialty] = useState('');
  const [hasSecretary, setHasSecretary] = useState(false);

  // Performance goals
  const [fillRate, setFillRate] = useState<number | ''>(85);
  const [noshowRate, setNoshowRate] = useState<number | ''>(5);

  // Location editing
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);

  const [initial, setInitial] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (clinic) {
      const c = clinic as any;
      const vals = {
        name: c.name || '',
        doctorName: c.doctor_name || '',
        doctorGender: c.doctor_gender || 'masculino',
        specialty: c.specialty || '',
        hasSecretary: c.has_secretary ?? false,
        fillRate: Math.round(Number(c.target_fill_rate) * 100),
        noshowRate: Math.round(Number(c.target_noshow_rate) * 100),
      };
      setName(vals.name);
      setDoctorName(vals.doctorName);
      setDoctorGender(vals.doctorGender);
      setSpecialty(vals.specialty);
      setHasSecretary(vals.hasSecretary);
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
      doctorGender !== initial.doctorGender ||
      specialty !== initial.specialty ||
      hasSecretary !== initial.hasSecretary ||
      fillRate !== initial.fillRate ||
      noshowRate !== initial.noshowRate
    );
  }, [initial, name, doctorName, specialty, hasSecretary, fillRate, noshowRate]);

  const handleSave = async () => {
    try {
      await updateClinic.mutateAsync({
        name,
        doctor_name: doctorName,
        doctor_gender: doctorGender,
        specialty,
        has_secretary: hasSecretary,
        target_fill_rate: ((fillRate || 0) as number) / 100,
        target_noshow_rate: ((noshowRate || 0) as number) / 100,
      } as any);
      setInitial({
        name, doctorName, doctorGender, specialty, hasSecretary, fillRate, noshowRate,
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

  const handleToggleLocation = async (loc: Location) => {
    try {
      await updateLocation.mutateAsync({ id: loc.id, is_active: !loc.is_active });
      refetchLocations();
      toast.success(loc.is_active ? 'Local desativado' : 'Local ativado');
    } catch (err: any) {
      toast.error(err.message || 'Erro');
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

      {/* Locais de Atendimento */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Locais de Atendimento</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            onClick={() => { setEditingLocation(null); setAddingNew(true); setLocationDialogOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">Nenhum local cadastrado.</p>
          ) : (
            locations.map(loc => (
              <div key={loc.id} className={cn(
                'rounded-xl border p-3 flex items-start justify-between',
                loc.is_active ? 'border-border/60' : 'border-border/30 opacity-60'
              )}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{loc.name}</p>
                  {loc.address && <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>}
                  <Badge variant={loc.is_active ? 'default' : 'outline'} className="text-[10px] mt-1">
                    {loc.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => { setEditingLocation(loc); setAddingNew(false); setLocationDialogOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Switch
                    checked={loc.is_active}
                    onCheckedChange={() => handleToggleLocation(loc)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <LocationEditDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        location={addingNew ? null : editingLocation}
        onSave={() => refetchLocations()}
      />

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
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sexo</Label>
            <Select value={doctorGender} onValueChange={setDoctorGender}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
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
        </div>
      </div>


      {/* Card 3: Metas de Performance */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Metas de Performance</p>
        </div>
        <div className="px-4 pb-4 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta de Ocupação da Agenda</Label>
            <div className="relative">
              <Input type="number" min={0} max={100} value={fillRate} onChange={e => setFillRate(e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value))))} className="rounded-xl pr-10" />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Recomendado: 85%.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta de Taxa de No-show</Label>
            <div className="relative">
              <Input type="number" min={0} max={100} value={noshowRate} onChange={e => setNoshowRate(e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value))))} className="rounded-xl pr-10" />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Recomendado: abaixo de 5%.</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full rounded-xl" disabled={!isDirty || updateClinic.isPending}>
        {updateClinic.isPending ? 'Salvando...' : 'Salvar Alterações'}
      </Button>

      {/* Notificações */}
      <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Lembretes de check-in</p>
              <p className="text-xs text-muted-foreground">Notificações no início e fim do expediente</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={async () => {
              if (!('Notification' in window)) {
                toast.error('Seu navegador não suporta notificações.');
                return;
              }
              const result = await Notification.requestPermission();
              if (result === 'granted') {
                toast.success('Notificações ativadas! Você receberá lembretes no início e fim do expediente.');
              } else {
                toast.error('Permissão de notificação negada. Ative nas configurações do navegador.');
              }
            }}
          >
            {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? '✓ Ativado' : 'Ativar'}
          </Button>
        </div>
      </div>

      {/* Ferramentas (uso interno) — only for allowlisted emails */}

      {/* Ferramentas (uso interno) */}
      <InternalToolsSection />

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

function InternalToolsSection() {
  const { user } = useAuth();
  const { seed, cleanup } = useQASeed();
  const [resetReportsOpen, setResetReportsOpen] = useState(false);
  const [resetAccountOpen, setResetAccountOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [qaAction, setQaAction] = useState<'seed' | 'cleanup'>('seed');
  const [inputReports, setInputReports] = useState('');
  const [inputAccount, setInputAccount] = useState('');
  const [inputQa, setInputQa] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingQa, setLoadingQa] = useState(false);

  const handleResetReports = async () => {
    if (inputReports !== 'RESET') return;
    setLoadingReports(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-weekly-reports');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Relatórios apagados: ${data?.deleted ?? 0}. Recarregando…`);
      setResetReportsOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar relatórios');
    } finally {
      setLoadingReports(false);
    }
  };

  const handleResetAccount = async () => {
    if (inputAccount !== 'RESET') return;
    setLoadingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-account');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const d = data?.deleted ?? {};
      const summary = Object.entries(d).map(([t, n]) => `${t}: ${n}`).join(', ');
      toast.success(`Reset concluído. (${summary}). Recarregando…`);
      setResetAccountOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar conta');
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleQaConfirm = async () => {
    if (inputQa !== 'QA') return;
    setLoadingQa(true);
    try {
      if (qaAction === 'seed') {
        await seed.mutateAsync();
        toast.success('Cenário gerado: 2 locais + 6 dias. Recarregando…');
      } else {
        await cleanup.mutateAsync();
        toast.success('Cenário removido. Recarregando…');
      }
      setQaOpen(false);
      setInputQa('');
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err.message || 'Erro na operação QA');
    } finally {
      setLoadingQa(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-card border border-destructive/30 shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-bold text-destructive uppercase tracking-wider">Ferramentas (uso interno)</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Ações destrutivas. Use apenas para testes.</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          <Button
            onClick={() => { setQaAction('seed'); setQaOpen(true); }}
            className="w-full rounded-xl"
            variant="default"
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            Gerar cenário de teste (hoje)
          </Button>
          <Button
            onClick={() => { setQaAction('cleanup'); setQaOpen(true); }}
            className="w-full rounded-xl border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover cenário de teste
          </Button>
          <Button
            onClick={() => setResetReportsOpen(true)}
            className="w-full rounded-xl border-orange-500/30 text-orange-600 hover:bg-orange-500/5"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Resetar relatórios (cache)
          </Button>
          <Button
            onClick={() => setResetAccountOpen(true)}
            className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5"
            variant="outline"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reset total da conta (apagar tudo)
          </Button>
        </div>
      </div>

      {/* Modal: QA seed/cleanup */}
      <Dialog open={qaOpen} onOpenChange={(o) => { setQaOpen(o); if (!o) setInputQa(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{qaAction === 'seed' ? 'Gerar cenário de teste' : 'Remover cenário de teste'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {qaAction === 'seed'
              ? 'Isso criará 2 locais (Anjos Clinic + Hospital São Lucas) com check-ins de 6 dias para testar Dashboard, Ações e Relatórios.'
              : 'Isso removerá os dados do cenário de teste.'}
          </p>
          <p className="text-sm font-medium mt-2">Digite <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">QA</code> para confirmar:</p>
          <Input
            value={inputQa}
            onChange={(e) => setInputQa(e.target.value)}
            placeholder="QA"
            className="font-mono"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setQaOpen(false); setInputQa(''); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={inputQa !== 'QA' || loadingQa}
              onClick={handleQaConfirm}
            >
              {loadingQa ? 'Processando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Resetar relatórios */}
      <Dialog open={resetReportsOpen} onOpenChange={(o) => { setResetReportsOpen(o); if (!o) setInputReports(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar relatórios semanais</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso apagará <strong>todos</strong> os seus relatórios semanais em cache. Ao acessar a página de relatório, um novo será gerado.
          </p>
          <p className="text-sm font-medium mt-2">Digite <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">RESET</code> para confirmar:</p>
          <Input
            value={inputReports}
            onChange={(e) => setInputReports(e.target.value)}
            placeholder="RESET"
            className="font-mono"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setResetReportsOpen(false); setInputReports(''); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={inputReports !== 'RESET' || loadingReports}
              onClick={handleResetReports}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loadingReports ? 'Removendo...' : 'Confirmar reset'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Reset total */}
      <Dialog open={resetAccountOpen} onOpenChange={(o) => { setResetAccountOpen(o); if (!o) setInputAccount(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset total da conta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso apagará <strong>todos</strong> os seus dados: check-ins, locais, relatórios, perfil e clínica. A conta voltará ao estado de nova.
          </p>
          <p className="text-sm font-medium mt-2">Digite <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">RESET</code> para confirmar:</p>
          <Input
            value={inputAccount}
            onChange={(e) => setInputAccount(e.target.value)}
            placeholder="RESET"
            className="font-mono"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setResetAccountOpen(false); setInputAccount(''); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={inputAccount !== 'RESET' || loadingAccount}
              onClick={handleResetAccount}
            >
              {loadingAccount ? 'Apagando tudo...' : 'Confirmar reset total'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
