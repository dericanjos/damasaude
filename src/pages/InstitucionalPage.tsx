import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Target, GraduationCap, Share2 } from 'lucide-react';
import logoDamaTagline from '@/assets/logo-dama-tagline.png';

const whatsappUrl = 'https://wa.me/5521959214292?text=Ol%C3%A1!%20Vim%20pelo%20app%20DAMA%20Sa%C3%BAde%20e%20quero%20saber%20como%20reduzir%20os%20vazamentos%20da%20minha%20agenda.';

export default function InstitucionalPage() {
  const navigate = useNavigate();

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
          <h1 className="text-2xl font-bold text-white leading-snug mb-3">
            Pare de perder receita com uma agenda reativa.
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">
            A DAMA é o time comercial estratégico que cuida da sua agenda, seus pacientes e seu faturamento. Presente em 16+ estados com 90+ médicos parceiros.
          </p>
        </div>

        {/* Service cards — 4 frentes */}
        <div className="space-y-3 mb-10">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <Users className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Time comercial dedicado</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Equipe treinada em vendas médicas que converte leads em pacientes particulares. Atendimento humanizado e estratégico.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <Target className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Captação de pacientes</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Campanhas estratégicas para atrair pacientes qualificados e gerar agendamentos previsíveis para seu consultório.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <GraduationCap className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Treinamento da sua equipe</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Transformamos secretárias em multiplicadoras de receita com técnicas de conversão e atendimento via WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <Share2 className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Presença estratégica nas redes</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Atrair, nutrir e converter pacientes de forma orgânica, conectando sua autoridade médica com o desejo do público.
            </p>
          </div>
        </div>

        {/* Social proof — 3 columns */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">90+</p>
            <p className="text-[11px] text-white/50">médicos parceiros</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">16+</p>
            <p className="text-[11px] text-white/50">estados atendidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">25k+</p>
            <p className="text-[11px] text-white/50">consultas agendadas</p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center mb-4">
          <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">PRÓXIMO PASSO</p>
          <h2 className="text-lg font-bold text-white mb-2">Nosso Diagnóstico Estratégico é o Ponto de Partida.</h2>
          <p className="text-[13px] text-white/55 leading-relaxed mb-5">
            Em 30 minutos, mapeamos os gargalos da sua operação e mostramos exatamente onde você está perdendo receita — e como resolver.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-idea-stable text-white font-semibold text-sm h-12 shadow-premium transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            Pedir meu Diagnóstico Gratuito
          </a>
          <p className="text-[10px] text-white/40 mt-3">Implantação em até 24 horas</p>
        </div>
      </div>
    </div>
  );
}
