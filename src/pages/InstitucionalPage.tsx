import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, DollarSign } from 'lucide-react';
import logoDamaTagline from '@/assets/logo-dama-tagline.png';
import { Button } from '@/components/ui/button';

export default function InstitucionalPage() {
  const navigate = useNavigate();
  const whatsappUrl = 'https://wa.me/5521959214292?text=Ol%C3%A1!%20Quero%20agendar%20meu%20Diagn%C3%B3stico%20Estrat%C3%A9gico%20gratuito.';

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
            Transforme sua clínica em uma operação previsível e lucrativa.
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">
            A DAMA implementa uma gestão comercial e operacional robusta para médicos que buscam excelência e crescimento sustentável.
          </p>
        </div>

        {/* Problem cards */}
        <div className="space-y-3 mb-10">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
                <Calendar className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <p className="text-sm font-bold text-white">Agenda Reativa?</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Vive apagando incêndios e com buracos inesperados na agenda? Uma equipe treinada transforma a agenda reativa em proativa.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
                <Users className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <p className="text-sm font-bold text-white">Secretária sobrecarregada?</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Sua equipe de frente precisa de roteiros, processos de confirmação e protocolos de reagendamento para se tornar um centro de lucro.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
                <DollarSign className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <p className="text-sm font-bold text-white">Receita Imprevisível?</p>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Não sabe quanto vai faturar no próximo mês e perde dinheiro com no-shows? Identificamos os vazamentos e criamos contramedidas.
            </p>
          </div>
        </div>

        {/* Solution CTA */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center mb-6">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Próximo passo</p>
          <h2 className="text-lg font-bold text-white mb-2">Nosso Diagnóstico Estratégico é o Ponto de Partida.</h2>
          <p className="text-[13px] text-white/55 leading-relaxed mb-5">
            Em uma conversa de 30 minutos, sem compromisso, mapeamos os gargalos da sua operação e entregamos um plano de ação claro para transformar seus processos e sua equipe.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-idea-stable text-white font-semibold text-sm h-12 shadow-premium transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            Pedir meu Diagnóstico Gratuito
          </a>
          <p className="text-xs text-white/40 mt-3">Uma conversa de 30 min. Sem compromisso.</p>
        </div>
      </div>
    </div>
  );
}
