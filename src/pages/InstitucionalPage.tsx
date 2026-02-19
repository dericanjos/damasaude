export default function InstitucionalPage() {
  const whatsappUrl = 'https://wa.me/5511999999999?text=Quero+fazer+o+diagn%C3%B3stico+da+secret%C3%A1ria';

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
      {/* Headline */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">DAMA</p>
        <h1 className="text-2xl font-bold text-foreground leading-snug">
          Quer ajuda para organizar o atendimento e reduzir perdas?
        </h1>
        <p className="text-sm text-muted-foreground">
          A DAMA é um sistema inteligente de recuperação e previsão de receita para clínicas médicas. Em menos de 1 minuto por dia, o médico tem clareza total sobre performance, perdas e saúde operacional.
        </p>
      </div>

      {/* 3 blocks */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">O que muda com estrutura comercial</p>
          <p className="text-sm text-foreground leading-relaxed">
            Clínicas com processos definidos perdem até 60% menos receita por no-show e cancelamentos. Uma estrutura comercial básica — confirmações, lista de espera e follow-up — pode recuperar R$ 1.000 a R$ 3.000 por mês sem aumentar pacientes.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">O que a secretária precisa ter</p>
          <ul className="text-sm text-foreground space-y-1.5">
            <li>→ Protocolo de confirmação 24h antes</li>
            <li>→ Lista de espera ativa</li>
            <li>→ Script de reagendamento pós-cancelamento</li>
            <li>→ Rotina de follow-up com pacientes inativos</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Como funciona o diagnóstico da secretária</p>
          <p className="text-sm text-foreground leading-relaxed">
            Em uma conversa de 30 minutos, mapeamos os pontos de perda da sua clínica e entregamos um plano simples de ação. Sem burocracia. Sem consultoria cara. Resultado em dias.
          </p>
        </div>
      </div>

      {/* CTA */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-idea-stable text-white font-semibold text-sm h-12 shadow-premium transition-opacity hover:opacity-90 active:scale-[0.99]"
      >
        Pedir diagnóstico da secretária
      </a>

      <p className="text-center text-xs text-muted-foreground">
        Uma conversa de 30 min. Sem compromisso.
      </p>
    </div>
  );
}
