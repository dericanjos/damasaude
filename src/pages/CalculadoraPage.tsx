import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calculator, TrendingDown, MessageCircle } from 'lucide-react';
import logoDama from '@/assets/logo-dama.png';

const WHATSAPP_URL =
  'https://wa.me/5521959214292?text=Oi!%20Fiz%20um%20diagn%C3%B3stico%20no%20App%20DAMA%20Sa%C3%BAde%20e%20gostaria%20de%20entender%20melhor%20como%20otimizar%20minha%20cl%C3%ADnica.';

export default function CalculadoraPage() {
  const navigate = useNavigate();
  const [patientsPerDay, setPatientsPerDay] = useState<number | ''>(16);
  const [ticketMedio, setTicketMedio] = useState<number | ''>(250);
  const [noShows, setNoShows] = useState<number | ''>(3);
  const [cancellations, setCancellations] = useState<number | ''>(2);
  const [emptySlots, setEmptySlots] = useState<number | ''>(3);
  const [showResult, setShowResult] = useState(false);

  const perdaSemanal = ((Number(noShows) || 0) + (Number(cancellations) || 0) + (Number(emptySlots) || 0)) * (Number(ticketMedio) || 0);
  const perdaMensal = perdaSemanal * 4;
  const perdaAnual = perdaMensal * 12;
  const consultasPerdidas = (Number(ticketMedio) || 1) > 0 ? Math.round(perdaMensal / (Number(ticketMedio) || 1)) : 0;

  const canCalculate = (Number(patientsPerDay) || 0) > 0 && (Number(ticketMedio) || 0) > 0;

  const handleCalc = () => {
    if (canCalculate) setShowResult(true);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[hsl(220,30%,7%)] text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao App
        </button>
      </div>

      <div className="mx-auto max-w-lg px-5 pb-16 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoDama} alt="DAMA" className="h-10 object-contain" />
        </div>

        {!showResult ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#D4AF37]">
                <Calculator className="h-3.5 w-3.5" /> CALCULADORA GRATUITA
              </div>
              <h1 className="text-2xl font-bold leading-tight">Quanto você está perdendo por mês?</h1>
              <p className="text-sm text-white/60">Responda 5 perguntas rápidas e descubra.</p>
            </div>

            {/* Form */}
            <div className="space-y-4 rounded-2xl bg-white/[0.06] border border-white/10 p-6">
              <FormField label="Quantos pacientes você agenda por dia, em média?" value={patientsPerDay} onChange={setPatientsPerDay} placeholder="16" min={1} max={50} />
              <FormField label="Qual o ticket médio da sua consulta? (R$)" value={ticketMedio} onChange={setTicketMedio} placeholder="250" min={50} />
              <FormField label="Quantos pacientes faltam por semana, em média?" value={noShows} onChange={setNoShows} placeholder="3" min={0} max={20} />
              <FormField label="Quantos cancelam por semana?" value={cancellations} onChange={setCancellations} placeholder="2" min={0} max={20} />
              <FormField label="Quantos horários ficam vazios por semana?" value={emptySlots} onChange={setEmptySlots} placeholder="3" min={0} max={20} />
            </div>

            <Button
              onClick={handleCalc}
              disabled={!canCalculate}
              className="w-full h-12 rounded-xl text-base font-semibold"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #b8962e)', color: '#1a1a2e' }}
            >
              <TrendingDown className="h-5 w-5 mr-2" />
              Calcular minha perda
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Result */}
            <div className="text-center space-y-3">
              <p className="text-sm font-semibold text-white/50 tracking-wider uppercase">Sua perda estimada</p>
              <p className="text-4xl font-extrabold text-red-400">{formatCurrency(perdaMensal)}/mês</p>
              <p className="text-lg text-white/70">Isso significa <span className="font-bold text-red-300">{formatCurrency(perdaAnual)}</span> por ano</p>
            </div>

            {/* Bar */}
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-6 space-y-3">
              <div className="flex justify-between text-xs text-white/50">
                <span>Perda mensal</span>
                <span>{formatCurrency(perdaMensal)}</span>
              </div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000" style={{ width: `${Math.min(100, (perdaMensal / ((Number(ticketMedio) || 250) * (Number(patientsPerDay) || 16) * 22)) * 100)}%` }} />
              </div>
              <p className="text-sm text-white/60 text-center mt-2">
                Equivale a <span className="font-bold text-white">{consultasPerdidas} consultas</span> jogadas fora por mês
              </p>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/auth')}
                className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-base"
                size="lg"
              >
                Comece grátis por 21 dias →
              </Button>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full h-11 rounded-xl border-white/20 text-white/80 hover:text-white" size="lg">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Falar com a equipe DAMA pelo WhatsApp
                </Button>
              </a>
            </div>

            <button onClick={() => setShowResult(false)} className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors mt-2">
              ← Refazer cálculo
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[11px] text-white/30 tracking-wider">DAMA Saúde · Copiloto da agenda para médicos</p>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, min, max }: {
  label: string; value: number | ''; onChange: (v: number | '') => void; placeholder: string; min?: number; max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-white/70">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Math.max(min ?? 0, Number(e.target.value)))}
        placeholder={placeholder}
        className="rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
      />
    </div>
  );
}
