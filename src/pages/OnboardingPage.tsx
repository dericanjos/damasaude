import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Rocket, Crown, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import logoDama from '@/assets/logo-dama.png';

const SPECIALTIES = [
  'Cardiologia', 'Cirurgia Geral', 'Cirurgia Plástica',
  'Clínica Geral / Medicina de Família', 'Dermatologia', 'Endocrinologia',
  'Gastroenterologia', 'Ginecologia e Obstetrícia', 'Medicina da Família e Comunidade',
  'Neurologia', 'Nutrição / Nutrologia', 'Oftalmologia', 'Oncologia',
  'Ortopedia', 'Otorrinolaringologia', 'Pediatria', 'Pneumologia',
  'Psiquiatria', 'Reumatologia', 'Urologia', 'Outra',
];

const DAY_MAP: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // Doctor name from auth metadata (already collected at signup)
  const doctorName = user?.user_metadata?.doctor_name || '';
  const [doctorGender, setDoctorGender] = useState<string>('masculino');
  const [specialty, setSpecialty] = useState('');
  const [paymentType, setPaymentType] = useState('ambos');
  const [hasSecretary, setHasSecretary] = useState(false);
  const [source, setSource] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    const stored = localStorage.getItem('dama_referral_code');
    if (stored) {
      localStorage.removeItem('dama_referral_code');
      return stored;
    }
    return '';
  });

  // Step 2
  const [clinicName, setClinicName] = useState('');
  const [dailyCapacity, setDailyCapacity] = useState<number | ''>(16);
  const [ticketPrivate, setTicketPrivate] = useState<number | ''>(250);
  const [ticketInsurance, setTicketInsurance] = useState<number | ''>(100);
  const [workingDays, setWorkingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);

  // Step 3 — Diagnostic
  const [weeklyNoshows, setWeeklyNoshows] = useState<number | ''>(3);
  const [weeklyCancellations, setWeeklyCancellations] = useState<number | ''>(2);
  const [weeklyEmptySlots, setWeeklyEmptySlots] = useState<number | ''>(3);

  const canAdvance = () => {
    switch (step) {
      case 1:
        return doctorName.trim() && specialty;
      case 2: {
        if (!clinicName.trim()) return false;
        if (typeof dailyCapacity !== 'number' || dailyCapacity < 1) return false;
        if (paymentType === 'particular' || paymentType === 'ambos') {
          if (typeof ticketPrivate !== 'number' || ticketPrivate < 1) return false;
        }
        if (paymentType === 'convenio' || paymentType === 'ambos') {
          if (typeof ticketInsurance !== 'number' || ticketInsurance < 1) return false;
        }
        return true;
      }
      case 3:
        return true; // always valid, has defaults
      default: return true;
    }
  };

  // Step 3 calculations
  const tp = (typeof ticketPrivate === 'number' ? ticketPrivate : 250);
  const ti = (typeof ticketInsurance === 'number' ? ticketInsurance : 100);
  const ticketMedio = paymentType === 'particular'
    ? tp
    : paymentType === 'convenio'
      ? ti
      : Math.round((tp + ti) / 2);

  const faltas = Number(weeklyNoshows) || 0;
  const cancelamentos = Number(weeklyCancellations) || 0;
  const vazios = Number(weeklyEmptySlots) || 0;
  const perdaSemanal = (faltas + cancelamentos + vazios) * ticketMedio;
  const perdaMensal = perdaSemanal * 4;
  const perdaAnual = perdaMensal * 12;
  const consultasPerdidas = (faltas + cancelamentos + vazios) * 4;

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const timezone = detectTimezone();
      const cap = (dailyCapacity || 16) as number;
      const selectedDays = workingDays.length > 0 ? workingDays : ['seg', 'ter', 'qua', 'qui', 'sex'];
      const defaultCaps: Record<string, number> = { dom: 0, seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0 };
      selectedDays.forEach(d => { defaultCaps[d] = cap; });

      const { data: existingClinic } = await supabase
        .from('clinics').select('id').eq('user_id', user.id).maybeSingle();

      const clinicData = {
        name: clinicName.trim(),
        doctor_name: doctorName,
        doctor_gender: doctorGender,
        specialty,
        has_secretary: hasSecretary,
        num_doctors: 1,
        payment_type: paymentType,
        working_days: selectedDays,
        daily_capacities: defaultCaps,
        daily_capacity: cap,
        ticket_private: paymentType === 'convenio' ? 0 : tp,
        ticket_insurance: paymentType === 'particular' ? 0 : ti,
        ticket_medio: paymentType === 'ambos' ? Math.round((tp + ti) / 2) : (paymentType === 'particular' ? tp : ti),
        timezone,
        target_fill_rate: 0.85,
        target_noshow_rate: 0.05,
        monthly_revenue_target: null,
      };

      if (existingClinic) {
        const { error: clinicError } = await supabase.from('clinics').update(clinicData as any).eq('user_id', user.id);
        if (clinicError) throw clinicError;
      } else {
        const { error: clinicError } = await supabase.from('clinics').insert({ ...clinicData, user_id: user.id } as any);
        if (clinicError) throw clinicError;
      }

      const { data: clinicRow } = await supabase.from('clinics').select('id').eq('user_id', user.id).maybeSingle();
      if (clinicRow) {
        await supabase.from('location_schedules').delete().eq('user_id', user.id);
        await supabase.from('location_financials').delete().eq('user_id', user.id);
        await supabase.from('locations').delete().eq('user_id', user.id);

        const { data: newLoc, error: locError } = await supabase.from('locations').insert({
          user_id: user.id, clinic_id: clinicRow.id, name: clinicName.trim(), address: '', timezone,
          num_doctors: 1,
        } as any).select().single();
        if (locError) throw locError;

        const ticketAvg = paymentType === 'ambos' ? Math.round((tp + ti) / 2) : (paymentType === 'particular' ? tp : ti);
        await supabase.from('location_financials').insert({
          user_id: user.id, location_id: newLoc.id, ticket_avg: ticketAvg,
          ticket_private: paymentType === 'convenio' ? 0 : tp,
          ticket_insurance: paymentType === 'particular' ? 0 : ti,
        } as any);

        const scheduleRows = selectedDays.map(d => ({
          user_id: user.id,
          location_id: newLoc.id,
          weekday: DAY_MAP[d],
          daily_capacity: cap,
          start_time: '08:00',
          end_time: '18:00',
        }));
        await supabase.from('location_schedules').insert(scheduleRows as any);
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { doctor_name: doctorName },
      });
      if (authUpdateError) throw authUpdateError;

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: user.id,
          email: user.email ?? null,
          onboarding_completed: true,
          display_name: doctorName,
          source: source || null,
          referral_code_used: referralCode.trim() || null,
        } as any,
        { onConflict: 'user_id' }
      );
      if (profileError) throw profileError;

      if (referralCode.trim()) {
        const { data: referral } = await supabase
          .from('referrals')
          .select('id')
          .eq('code', referralCode.trim().toUpperCase())
          .eq('status', 'pending')
          .single() as any;

        if (referral) {
          await supabase
            .from('referrals')
            .update({ referred_id: user.id, status: 'completed' } as any)
            .eq('id', referral.id);
        }
      }

      queryClient.setQueryData(['onboarding-status', user.id], true);
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
      setShowCompletion(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (showCompletion) {
    const isFounder = true;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center gap-4 text-center">
          {isFounder ? (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <Crown className="h-10 w-10 text-[#D4AF37]" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Bem-vindo, Founder DAMA! 👑</h1>
              <p className="text-muted-foreground max-w-xs">
                Você é um dos 200 primeiros médicos a usar o DAMA Doc. Seu acesso é gratuito — para sempre.
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Sua opinião vai nos ajudar a construir a melhor ferramenta de gestão comercial para médicos.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Tudo pronto!</h1>
              <p className="text-muted-foreground max-w-xs">
                Sua gestão está pronta. Faça seu primeiro check-in!
              </p>
            </>
          )}
          <p className="text-sm text-muted-foreground mt-3">
            Atende em mais de um local?{' '}
            <button onClick={() => navigate('/config')} className="text-primary font-semibold underline underline-offset-2">
              Adicione suas outras clínicas em Configurações
            </button>
          </p>
          <Button onClick={() => navigate('/', { replace: true })} className="mt-4 rounded-xl">
            Comece a monitorar sua clínica →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <img src={logoDama} alt="DAMA" className="h-8 mb-4" />
        <Progress value={(step / 3) * 100} className="h-1.5 mb-2" />
        <p className="text-xs text-muted-foreground">Passo {step} de 3</p>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {/* ── Step 1: Perfil ── */}
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
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Especialidade *</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Isso nos ajuda a personalizar sua experiência.</p>
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
              <p className="text-[11px] text-muted-foreground">Define como calculamos seu faturamento e métricas de perda.</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Tem secretária ou recepcionista?</p>
                <p className="text-[11px] text-muted-foreground">Adaptaremos as orientações para sua realidade.</p>
              </div>
              <Switch checked={hasSecretary} onCheckedChange={setHasSecretary} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Como conheceu o DAMA?</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="indicacao">Indicação de colega</SelectItem>
                  <SelectItem value="influenciador">Influenciador</SelectItem>
                  <SelectItem value="google">Google / App Store</SelectItem>
                  <SelectItem value="evento">Evento / Congresso</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Opcional. Nos ajuda a melhorar o produto.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código de convite (opcional)</Label>
              <Input
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ex: DAMA-DRSILVA-A1B2"
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">Se um colega te indicou, insira o código aqui.</p>
            </div>
          </div>
        )}

        {/* ── Step 2: Clínica ── */}
        {step === 2 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Configure sua primeira clínica</h2>
              <p className="text-sm text-muted-foreground mt-1">Você poderá adicionar mais locais depois em Configurações.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome da clínica / consultório *</Label>
              <Input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Clínica Saúde & Vida" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantos pacientes atende por dia em média? *</Label>
              <Input
                type="number" min={1} max={100}
                value={dailyCapacity}
                onChange={e => setDailyCapacity(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                className="rounded-xl"
                placeholder="16"
              />
              <p className="text-[11px] text-muted-foreground">Usado para calcular sua ocupação e receita estimada.</p>
            </div>
            {(paymentType === 'particular' || paymentType === 'ambos') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket médio particular (R$) *</Label>
                <Input
                  type="number" min={1}
                  value={ticketPrivate}
                  onChange={e => setTicketPrivate(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                  placeholder="250"
                />
                <p className="text-[11px] text-muted-foreground">Valor médio cobrado por consulta particular.</p>
              </div>
            )}
            {(paymentType === 'convenio' || paymentType === 'ambos') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket médio convênio (R$) *</Label>
                <Input
                  type="number" min={1}
                  value={ticketInsurance}
                  onChange={e => setTicketInsurance(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                  placeholder="100"
                />
                <p className="text-[11px] text-muted-foreground">Valor médio recebido por consulta via convênio.</p>
              </div>
            )}
            {/* Day selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias de atendimento *</Label>
              <div className="flex gap-2 justify-between">
                {(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const).map((day) => {
                  const labels: Record<string, string> = { dom: 'D', seg: 'S', ter: 'T', qua: 'Q', qui: 'Q', sex: 'S', sab: 'S' };
                  const fullLabels: Record<string, string> = { dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };
                  const checked = workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setWorkingDays(prev => 
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      )}
                      className={cn(
                        'flex flex-col items-center justify-center w-10 h-12 rounded-lg border text-xs font-medium transition-colors',
                        checked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-[10px] opacity-70">{fullLabels[day]}</span>
                      <span className="text-sm font-bold">{labels[day]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">Selecione os dias em que você atende neste local.</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Diagnóstico ── */}
        {step === 3 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Vamos fazer um diagnóstico rápido</h2>
              <p className="text-sm text-muted-foreground mt-1">Com base nos dados que você informou</p>
            </div>

            <div className="space-y-4 rounded-2xl bg-white/[0.06] border border-white/10 p-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantos pacientes faltam por semana em média?</Label>
                <Input
                  type="number" min={0} max={50}
                  value={weeklyNoshows}
                  onChange={e => setWeeklyNoshows(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                  placeholder="3"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantos cancelam por semana?</Label>
                <Input
                  type="number" min={0} max={50}
                  value={weeklyCancellations}
                  onChange={e => setWeeklyCancellations(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                  placeholder="2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantos horários ficam vazios por semana?</Label>
                <Input
                  type="number" min={0} max={50}
                  value={weeklyEmptySlots}
                  onChange={e => setWeeklyEmptySlots(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                  placeholder="3"
                />
              </div>
            </div>

            {/* Real-time diagnostic result */}
            {perdaMensal > 0 && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Sua perda estimada</p>
                </div>
                <p className="text-3xl font-extrabold text-red-400">{formatCurrency(perdaMensal)}/mês</p>
                <p className="text-sm text-red-300/80">
                  {formatCurrency(perdaAnual)}/ano em receita não realizada
                </p>
                <p className="text-xs text-muted-foreground">
                  {consultasPerdidas} consultas desperdiçadas por mês
                </p>
                <div className="pt-2 border-t border-red-500/10">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A maioria dos médicos não monitora esses números. O primeiro passo para recuperar é medir.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-2">
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} className="w-full rounded-xl" disabled={!canAdvance()}>
            Avançar →
          </Button>
        ) : (
          <Button onClick={handleFinish} className="w-full rounded-xl" disabled={saving || !canAdvance()}>
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
