import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Headphones, BarChart3 } from 'lucide-react';
import logoDamaTagline from '@/assets/logo-dama-tagline.png';

export default function InstitucionalPage() {
  const navigate = useNavigate();
  const aplicacaoUrl = 'https://parceria.damasecretariadomedico.com.br/processo-seletivo';

  return (
    <div className="min-h-screen bg-[hsl(220,30%,7%)]">
      {/* Back button */}
      <div className="sticky top-0 z-50 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao App
        </button>
      </div>

      <div className="mx-auto max-w-lg px-5 pb-12">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-4 pb-10">
          <img src={logoDamaTagline} alt="DAMA" className="h-14 w-auto mb-8 opacity-90" />
          <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-3">Parceria sob aplicação</p>
          <h1 className="text-2xl font-bold text-white leading-snug mb-3">
            A operação completa da sua clínica — do primeiro contato ao paciente fidelizado.
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">
            A DAMA é a única parceira que une atendimento comercial humanizado, growth estratégico e marketing 360 em uma operação integrada. Você cuida do paciente. A gente cuida do seu crescimento.
          </p>
        </div>

        {/* Service cards — 3 frentes */}
        <div className="space-y-3 mb-10">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <Headphones className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Secretariado Estratégico</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Atendimento humanizado feito por pessoas — técnico e acolhedor desde o primeiro contato. Agendamento, confirmação, triagem, reagendamento e pós-consulta. Sua agenda cheia, sem faltas, sem caos.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <Users className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Atendimento Comercial Humanizado</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Time de atendimento comercial que aborda, qualifica, argumenta e agenda. Você para de perder leads por falta de acompanhamento — e começa a medir resultado de verdade.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <BarChart3 className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Growth Estratégico & Marketing 360</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Gestão de tráfego, presença digital e estratégias que colocam sua clínica na frente de quem já está procurando o que você oferece. Marketing que gera agenda cheia.
            </p>
          </div>
        </div>

        {/* Social proof */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">90+</p>
            <p className="text-[11px] text-white/50">profissionais da saúde</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">25k+</p>
            <p className="text-[11px] text-white/50">consultas agendadas</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">16+</p>
            <p className="text-[11px] text-white/50">estados atendidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">2.000+</p>
            <p className="text-[11px] text-white/50">avaliações de pacientes</p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center mb-4">
          <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">Parceria sob aplicação</p>
          <h2 className="text-lg font-bold text-white mb-2">Quer a DAMA operando sua clínica?</h2>
          <p className="text-[13px] text-white/55 leading-relaxed mb-5">
            Atendemos um número restrito de parceiros para garantir resultado. Preencha a aplicação e nosso time avaliará se há fit.
          </p>
          <a
            href={aplicacaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] text-[hsl(220,30%,7%)] font-semibold text-sm h-12 shadow-premium transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            Quero aplicar para uma parceria
          </a>
          <p className="text-[10px] text-white/40 mt-3">⚠️ O preenchimento da aplicação não garante a parceria.</p>
        </div>
      </div>
    </div>
  );
}
