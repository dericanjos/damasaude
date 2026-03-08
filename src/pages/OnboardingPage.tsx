import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Rocket, CheckCircle2 } from 'lucide-react';
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
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [clinicName, setClinicName] = useState('');
  const [numDoctors, setNumDoctors] = useState(1);
  const [paymentType, setPaymentType] = useState('ambos');

  // Step 3
  const [workingDays, setWorkingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [dailyCapacity, setDailyCapacity] = useState(16);
  const [ticketPrivate, setTicketPrivate] = useState(250);
  const [ticketInsurance, setTicketInsurance] = useState(100);
  const [timezone, setTimezone] = useState(detectTimezone());

  // Step 4
  const [fillRate, setFillRate] = useState(85);
  const [noshowRate, setNoshowRate] = useState(5);
  const [monthlyTarget, setMonthlyTarget] = useState<number | ''>('');

  const canAdvance = () => {
    switch (step) {
      case 1: return doctorName.trim() && specialty;
      case 2: return clinicName.trim() && numDoctors >= 1;
      case 3: return workingDays.length >= 1 && dailyCapacity >= 1 && (
        paymentType === 'particular' ? ticketPrivate >= 1 :
        paymentType === 'convenio' ? ticketInsurance >= 1 :
        ticketPrivate >= 1 && ticketInsurance >= 1
      );
      case 4: return fillRate >= 0 && noshowRate >= 0;
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

      const clinicData = {
        name: clinicName,
        doctor_name: doctorName,
        doctor_gender: doctorGender,
        specialty,
        has_secretary: hasSecretary,
        num_doctors: numDoctors,
        payment_type: paymentType,
        working_days: workingDays,
        daily_capacity: dailyCapacity,
        ticket_private: paymentType === 'convenio' ? 0 : ticketPrivate,
        ticket_insurance: paymentType === 'particular' ? 0 : ticketInsurance,
        ticket_medio: paymentType === 'ambos' ? Math.round((ticketPrivate + ticketInsurance) / 2) : (paymentType === 'particular' ? ticketPrivate : ticketInsurance),
        timezone,
        target_fill_rate: fillRate / 100,
        target_noshow_rate: noshowRate / 100,
        monthly_revenue_target: monthlyTarget || null,
      };

      if (existingClinic) {
        await supabase.from('clinics').update(clinicData as any).eq('user_id', user.id);
      } else {
        await supabase.from('clinics').insert({ ...clinicData, user_id: user.id } as any);
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: { doctor_name: doctorName },
      });

      // Mark onboarding as completed
      await supabase.from('profiles').update({ onboarding_completed: true, display_name: displayName || doctorName } as any).eq('user_id', user.id);

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
              <p className="text-sm text-muted-foreground mt-1">Informações da clínica.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome da clínica *</Label>
              <Input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Clínica Saúde & Vida" className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Nome do consultório ou clínica onde você atende.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantidade de médicos *</Label>
              <Input type="number" min={1} value={numDoctors} onChange={e => setNumDoctors(Number(e.target.value))} className="rounded-xl" />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capacidade diária (consultas/dia) *</Label>
              <Input type="number" min={1} max={100} value={dailyCapacity} onChange={e => setDailyCapacity(Number(e.target.value))} className="rounded-xl" />
            </div>
            {(paymentType === 'particular' || paymentType === 'ambos') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Particular (R$) *</Label>
                <Input type="number" min={1} value={ticketPrivate} onChange={e => setTicketPrivate(Number(e.target.value))} className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Valor cobrado por consulta particular.</p>
              </div>
            )}
            {(paymentType === 'convenio' || paymentType === 'ambos') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Convênio (R$) *</Label>
                <Input type="number" min={1} value={ticketInsurance} onChange={e => setTicketInsurance(Number(e.target.value))} className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Valor cobrado por consulta via convênio.</p>
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
              <Input type="number" min={0} max={100} value={fillRate} onChange={e => setFillRate(Number(e.target.value))} className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">Porcentagem ideal de preenchimento da sua agenda.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta de no-show (%) *</Label>
              <Input type="number" min={0} max={100} value={noshowRate} onChange={e => setNoshowRate(Number(e.target.value))} className="rounded-xl" />
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
