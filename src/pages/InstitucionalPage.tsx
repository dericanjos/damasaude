export default function InstitucionalPage() {
  const whatsappUrl = 'https://wa.me/5511999999999?text=Quero+fazer+o+diagn%C3%B3stico+da+minha+equipe';

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
      {/* Headline */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">DAMA</p>
        <h1 className="text-2xl font-bold text-foreground leading-snug">
          Transforme sua clínica em uma operação previsível e lucrativa.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O sucesso de uma clínica não depende apenas da excelência médica, mas de uma gestão comercial e operacional robusta, executada com consistência pela sua equipe.
        </p>
      </div>

      {/* 3 blocks */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">O que uma gestão comercial estruturada muda?</p>
          <p className="text-sm text-foreground leading-relaxed">
            Uma equipe bem treinada, com processos claros, transforma uma agenda reativa em uma agenda proativa. Ela para de apenas "agendar" e passa a gerenciar ativamente a ocupação, reduzir perdas e garantir que cada oportunidade de receita seja aproveitada.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">O que a secretária precisa para converter e reter?</p>
          <p className="text-sm text-foreground leading-relaxed">
            A secretária é a linha de frente da sua clínica. Para que ela performe no mais alto nível, precisa de mais do que boa vontade: necessita de roteiros, processos de confirmação, protocolos de reagendamento e uma rotina clara para lidar com no-shows, cancelamentos e follow-ups. É isso que transforma um custo em um centro de lucro.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Como funciona um diagnóstico da sua equipe?</p>
          <p className="text-sm text-foreground leading-relaxed">
            A DAMA realiza um diagnóstico completo dos processos e da performance da sua equipe de atendimento. Mapeamos os gargalos, identificamos os pontos de vazamento de receita e entregamos um plano de ação claro para implementar os protocolos que transformam a sua operação.
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
        Pedir Diagnóstico da Minha Equipe
      </a>

      <p className="text-center text-xs text-muted-foreground">
        Uma conversa de 30 min. Sem compromisso.
      </p>
    </div>
  );
}
