import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp } from 'lucide-react';
import logoDamaTagline from '@/assets/logo-dama-tagline.png';

const parceiraUrl = 'https://parceria.damasecretariadomedico.com.br';

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
              <p className="text-sm font-bold text-white">Operação comercial completa</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Secretariado estratégico, atendimento humanizado e time comercial que converte — tudo integrado e rodando pelo seu consultório.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/20">
                <TrendingUp className="h-[18px] w-[18px] text-[#D4AF37]" />
              </div>
              <p className="text-sm font-bold text-white">Growth e marketing 360</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Gestão de tráfego, presença digital e reputação online que colocam sua clínica na frente de quem já está procurando o que você oferece.
            </p>
          </div>
        </div>

        {/* Social proof — 3 columns */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">+25.000</p>
            <p className="text-[11px] text-white/50">Consultas Agendadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">+90</p>
            <p className="text-[11px] text-white/50">Médicos Parceiros</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">16+</p>
            <p className="text-[11px] text-white/50">Estados Atendidos</p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center mb-4">
          <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">PARCERIA SOB APLICAÇÃO</p>
          <h2 className="text-lg font-bold text-white mb-2">Sua clínica tem potencial que ainda não está sendo aproveitado.</h2>
          <p className="text-[13px] text-white/55 leading-relaxed mb-5">
            Em menos de 3 minutos você preenche sua aplicação. Nosso time avalia o fit e entra em contato apenas com os candidatos prontos para crescer de verdade.
          </p>
          <a
            href={parceiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-idea-stable text-white font-semibold text-sm h-12 shadow-premium transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            Quero aplicar para uma parceria
          </a>
          <p className="text-[10px] text-white/40 mt-3">📌 Vagas limitadas por mês</p>
        </div>
      </div>
    </div>
  );
}
