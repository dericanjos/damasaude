import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Rocket, CheckCircle2, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';

const SPECIALTIES = [
  'Cardiologia',
  'Cirurgia Geral',
  'Cirurgia Plástica',
  'Clínica Geral / Medicina de Família',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia e Obstetrícia',
  'Medicina da Família e Comunidade',
  'Neurologia',
  'Nutrição / Nutrologia',
  'Oftalmologia',
  'Oncologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Reumatologia',
  'Urologia',
  'Outra',
];

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Manaus', label: 'Manaus (AMT)' },
  { value: 'America/Recife', label: 'Recife (BRT)' },
  { value: 'America/Belem', label: 'Belém (BRT)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (AMT)' },
];

const DAYS = [
  { value: 'dom', label: 'Dom' },
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sáb' },
];

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const known = TIMEZONES.map(t => t.value);
    return known.includes(tz) ? tz : 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }

interface LocationScheduleConfig {
  workingDays: string[];
  dailyCapacities: Record<string, number | ''>;
  startTimes: Record<string, string>;
  endTimes: Record<string, string>;
}

function makeDefaultSchedule(): LocationScheduleConfig {
  return {
    workingDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
    dailyCapacities: { dom: 0, seg: 16, ter: 16, qua: 16, qui: 16, sex: 16, sab: 0 },
    startTimes: { dom: '08:00', seg: '08:00', ter: '08:00', qua: '08:00', qui: '08:00', sex: '08:00', sab: '08:00' },
    endTimes: { dom: '18:00', seg: '18:00', ter: '18:00', qua: '18:00', qui: '18:00', sex: '18:00', sab: '18:00' },
  };
  }
}


export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // Step 1
  const [doctorName, setDoctorName] = useState(user?.user_metadata?.doctor_name || '');
  const [doctorGender, setDoctorGender] = useState<string>('masculino');
  const [displayName, setDisplayName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hasSecretary, setHasSecretary] = useState(false);

  // Step 2
  const [numLocations, setNumLocations] = useState<number | ''>(1);
  const [locationNames, setLocationNames] = useState<string[]>(['']);
  const [numDoctors, setNumDoctors] = useState<number | ''>(1);
  const [paymentType, setPaymentType] = useState('ambos');

  // Step 3
  const [workingDays, setWorkingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [dailyCapacities, setDailyCapacities] = useState<Record<string, number | ''>>({
    dom: 0, seg: 16, ter: 16, qua: 16, qui: 16, sex: 16, sab: 0,
  });
  const [ticketPrivate, setTicketPrivate] = useState<number | ''>(250);
  const [ticketInsurance, setTicketInsurance] = useState<number | ''>(100);
  const [timezone, setTimezone] = useState(detectTimezone());

  // Step 4
  const [fillRate, setFillRate] = useState<number | ''>(85);
  const [noshowRate, setNoshowRate] = useState<number | ''>(5);
  const [monthlyTarget, setMonthlyTarget] = useState<number | ''>('');

  const canAdvance = () => {
    switch (step) {
      case 1: return doctorName.trim() && specialty;
      case 2: return typeof numLocations === 'number' && numLocations >= 1 && locationNames.length === numLocations && locationNames.every(n => n.trim()) && typeof numDoctors === 'number' && numDoctors >= 1;
      case 3: {
        const capsValid = workingDays.length >= 1 && workingDays.some(d => {
          const c = dailyCapacities[d];
          return typeof c === 'number' && c >= 1;
        });
        const ticketValid =
          paymentType === 'particular' ? (typeof ticketPrivate === 'number' && ticketPrivate >= 1) :
          paymentType === 'convenio' ? (typeof ticketInsurance === 'number' && ticketInsurance >= 1) :
          (typeof ticketPrivate === 'number' && ticketPrivate >= 1 && typeof ticketInsurance === 'number' && ticketInsurance >= 1);
        return capsValid && ticketValid;
      }
      case 4: return typeof fillRate === 'number' && fillRate >= 0 && typeof noshowRate === 'number' && noshowRate >= 0;
      default: return true;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update or create clinic
      const { data: existingClinic } = await supabase
        .from('clinics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Safe casts — canAdvance() guarantees these are valid numbers
      const tp = (ticketPrivate || 0) as number;
      const ti = (ticketInsurance || 0) as number;
      const fr = (fillRate || 0) as number;
      const nr = (noshowRate || 0) as number;
      const nd = (numDoctors || 1) as number;
      const safeCaps: Record<string, number> = {};
      for (const [k, v] of Object.entries(dailyCapacities)) safeCaps[k] = (v || 0) as number;

      const clinicData = {
        name: locationNames[0] || 'Principal',
        doctor_name: doctorName,
        doctor_gender: doctorGender,
        specialty,
        has_secretary: hasSecretary,
        num_doctors: nd,
        payment_type: paymentType,
        working_days: workingDays,
        daily_capacities: safeCaps,
        daily_capacity: Math.max(...workingDays.map(d => safeCaps[d] ?? 0), 1),
        ticket_private: paymentType === 'convenio' ? 0 : tp,
        ticket_insurance: paymentType === 'particular' ? 0 : ti,
        ticket_medio: paymentType === 'ambos' ? Math.round((tp + ti) / 2) : (paymentType === 'particular' ? tp : ti),
        timezone,
        target_fill_rate: fr / 100,
        target_noshow_rate: nr / 100,
        monthly_revenue_target: monthlyTarget || null,
      };

      if (existingClinic) {
        const { error: clinicError } = await supabase.from('clinics').update(clinicData as any).eq('user_id', user.id);
        if (clinicError) throw clinicError;
      } else {
        const { error: clinicError } = await supabase.from('clinics').insert({ ...clinicData, user_id: user.id } as any);
        if (clinicError) throw clinicError;
      }

      // Create locations from collected names
      const { data: clinicRow2 } = await supabase.from('clinics').select('id').eq('user_id', user.id).maybeSingle();
      if (clinicRow2) {
        // Delete any existing locations first (re-onboarding scenario)
        await supabase.from('location_schedules').delete().eq('user_id', user.id);
        await supabase.from('location_financials').delete().eq('user_id', user.id);
        await supabase.from('locations').delete().eq('user_id', user.id);

        const dayMap: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
        const ticketAvg = paymentType === 'ambos' ? Math.round((tp + ti) / 2) : (paymentType === 'particular' ? tp : ti);

        for (const locName of locationNames) {
          const { data: newLoc, error: locError } = await supabase.from('locations').insert({
            user_id: user.id, clinic_id: clinicRow2.id, name: locName.trim(), address: '', timezone,
          } as any).select().single();
          if (locError) throw locError;

          await supabase.from('location_financials').insert({
            user_id: user.id, location_id: newLoc.id, ticket_avg: ticketAvg,
            ticket_private: paymentType === 'convenio' ? 0 : tp,
            ticket_insurance: paymentType === 'particular' ? 0 : ti,
          } as any);

          const scheduleRows = workingDays.filter(d => (safeCaps[d] ?? 0) > 0).map(d => ({
            user_id: user.id, location_id: newLoc.id, weekday: dayMap[d],
            daily_capacity: safeCaps[d] ?? 16, start_time: '08:00', end_time: '18:00',
          }));
          if (scheduleRows.length > 0) await supabase.from('location_schedules').insert(scheduleRows as any);
        }
      }
      // Update user metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { doctor_name: doctorName },
      });
      if (authUpdateError) throw authUpdateError;

      // Mark onboarding as completed (create profile if missing)
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: user.id,
          email: user.email ?? null,
          onboarding_completed: true,
          display_name: displayName || doctorName,
        } as any,
        { onConflict: 'user_id' }
      );
      if (profileError) throw profileError;

      queryClient.setQueryData(['onboarding-status', user.id], true);
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
      setShowCompletion(true);
      setTimeout(() => navigate('/', { replace: true }), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (showCompletion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tudo pronto!</h1>
          <p className="text-muted-foreground max-w-xs">
            Seu copiloto está configurado. Faça seu primeiro check-in e comece a transformar sua clínica.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <img src={logoDama} alt="DAMA" className="h-8 mb-4" />
        <Progress value={(step / 4) * 100} className="h-1.5 mb-2" />
        <p className="text-xs text-muted-foreground">Passo {step} de 4</p>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Vamos nos conhecer</h2>
              <p className="text-sm text-muted-foreground mt-1">Conte um pouco sobre você.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome completo *</Label>
              <Input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Maria Silva" className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Seu nome completo para identificação no sistema.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tratamento *</Label>
              <Select value={doctorGender} onValueChange={setDoctorGender}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Médico</SelectItem>
                  <SelectItem value="feminino">Médica</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Usado para definir o tratamento (Dr. / Dra.) nas comunicações.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Como você gostaria de ser chamado(a)?</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ex: Dr. Carlos, Dra. Ana, Carlos" className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Ex: Dr. Carlos, Dra. Ana, Carlos. Esse nome aparecerá nas saudações e relatórios.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Especialidade *</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Isso nos ajuda a personalizar sua experiência.</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Tem secretária ou recepcionista?</p>
                <p className="text-[11px] text-muted-foreground">Adaptaremos as orientações e ações diárias para sua realidade.</p>
              </div>
              <Switch checked={hasSecretary} onCheckedChange={setHasSecretary} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Entendendo sua operação</h2>
              <p className="text-sm text-muted-foreground mt-1">Informações dos locais onde você atende.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Em quantas clínicas/locais você atende? *</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={numLocations}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setNumLocations('');
                    return;
                  }
                  const n = Math.max(1, Math.min(10, Number(raw)));
                  setNumLocations(n);
                  setLocationNames(prev => {
                    const updated = [...prev];
                    while (updated.length < n) updated.push('');
                    return updated.slice(0, n);
                  });
                }}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">Inclua todos os consultórios, clínicas e hospitais onde atende.</p>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {numLocations === 1 ? 'Nome da clínica *' : 'Nomes das clínicas *'}
              </Label>
              {locationNames.map((name, idx) => (
                <div key={idx} className="space-y-1">
                  {typeof numLocations === 'number' && numLocations > 1 && (
                    <p className="text-[11px] text-muted-foreground font-medium">Local {idx + 1}</p>
                  )}
                  <Input
                    value={name}
                    onChange={e => {
                      const updated = [...locationNames];
                      updated[idx] = e.target.value;
                      setLocationNames(updated);
                    }}
                    placeholder={numLocations === 1 ? 'Clínica Saúde & Vida' : `Ex: Consultório ${idx + 1}`}
                    className="rounded-xl"
                  />
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Nome de cada local onde você atende pacientes.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantidade de médicos *</Label>
              <Input type="number" min={1} value={numDoctors} onChange={e => setNumDoctors(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))} className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Quantos médicos atendem na sua clínica, incluindo você.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atende por *</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="convenio">Convênio</SelectItem>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Isso define como calculamos seu faturamento e as métricas de perda (ticket particular vs. convênio).</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Configurando seu copiloto</h2>
              <p className="text-sm text-muted-foreground mt-1">Personalize a experiência.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias de atendimento *</Label>
              <div className="flex flex-wrap gap-3">
                {DAYS.map(day => (
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
              <p className="text-[11px] text-muted-foreground">Selecione os dias da semana em que você atende pacientes.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Horários de atendimento por dia *</Label>
              <p className="text-[11px] text-muted-foreground">Quantos pacientes você consegue atender em cada dia selecionado.</p>
              <div className="space-y-2">
                {DAYS.filter(d => workingDays.includes(d.value)).map(day => (
                  <div key={day.value} className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground w-12">{day.label}</span>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={dailyCapacities[day.value] ?? ''}
                      onChange={e => setDailyCapacities(prev => ({ ...prev, [day.value]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                      className="rounded-xl"
                    />
                  </div>
                ))}
              </div>
            </div>
            {(paymentType === 'particular' || paymentType === 'ambos') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Particular (R$) *</Label>
                <Input type="number" min={1} value={ticketPrivate} onChange={e => setTicketPrivate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Valor médio cobrado por consulta particular.</p>
              </div>
            )}
            {(paymentType === 'convenio' || paymentType === 'ambos') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Convênio (R$) *</Label>
                <Input type="number" min={1} value={ticketInsurance} onChange={e => setTicketInsurance(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Valor médio recebido por consulta via convênio.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fuso horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Usado para calcular horários e relatórios corretamente.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Para onde vamos?</h2>
              <p className="text-sm text-muted-foreground mt-1">Defina suas metas.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta de ocupação (%) *</Label>
              <Input type="number" min={0} max={100} value={fillRate} onChange={e => setFillRate(e.target.value === '' ? '' : Number(e.target.value))} className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Porcentagem ideal de preenchimento da sua agenda.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta de no-show (%) *</Label>
              <Input type="number" min={0} max={100} value={noshowRate} onChange={e => setNoshowRate(e.target.value === '' ? '' : Number(e.target.value))} className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Taxa máxima de faltas que você considera aceitável.</p>
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
              <p className="text-[11px] text-muted-foreground">Quanto você gostaria de faturar por mês. Será usado na previsão de faturamento.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-2">
        {step < 4 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="w-full rounded-xl"
            disabled={!canAdvance()}
          >
            Avançar →
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            className="w-full rounded-xl"
            disabled={saving || !canAdvance()}
          >
            {saving ? 'Salvando...' : 'Concluir e começar →'}
          </Button>
        )}
        {step > 1 && (
          <Button variant="ghost" className="w-full mt-2 text-sm" onClick={() => setStep(s => s - 1)}>
            ← Voltar
          </Button>
        )}
      </div>
    </div>
  );
}
