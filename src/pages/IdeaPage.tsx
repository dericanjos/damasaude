import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, ClipboardCheck, UserPlus, Award, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const bonusCards = [
  {
    icon: Target,
    emoji: '🎯',
    title: 'Follow-up realizado',
    points: '+5 pts',
    description: 'Concedido quando o follow-up diário é executado e o score base está ≥ 50. Não premia em dias caóticos.',
  },
  {
    icon: ClipboardCheck,
    emoji: '📋',
    title: 'Agenda ≥ 90% ocupada',
    points: '+3 pts',
    description: 'Concedido quando a taxa de ocupação (atendidos ÷ capacidade) atinge ou supera 90%.',
  },
  {
    icon: UserPlus,
    emoji: '🆕',
    title: 'Novos agendamentos',
    points: '+2 pts',
    description: 'Concedido quando há pelo menos 1 novo agendamento registrado no dia.',
  },
];

const faixas = [
  {
    color: 'bg-[hsl(155,60%,38%)]',
    borderColor: 'border-[hsl(155,60%,38%)]',
    emoji: '🟢',
    range: '≥ 80',
    label: 'Estável',
    description: 'Sua clínica está operando com eficiência. Continue assim!',
  },
  {
    color: 'bg-[hsl(38,92%,48%)]',
    borderColor: 'border-[hsl(38,92%,48%)]',
    emoji: '🟡',
    range: '60 – 79',
    label: 'Atenção',
    description: 'Há oportunidades de melhoria. Revise no-shows e cancelamentos.',
  },
  {
    color: 'bg-[hsl(0,72%,52%)]',
    borderColor: 'border-[hsl(0,72%,52%)]',
    emoji: '🔴',
    range: '< 60',
    label: 'Crítico',
    description: 'Receita significativa está sendo perdida. Ação urgente necessária.',
  },
];

const dicas = [
  'Confirme consultas 24h antes para reduzir no-shows',
  'Preencha buracos da agenda com pacientes de encaixe',
  'Realize o follow-up diário para ganhar +5 pontos',
  'Mantenha a ocupação acima de 90% para ganhar +3 pontos',
  'Atraia novos pacientes para ganhar +2 pontos',
];

export default function IdeaPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="rounded-xl -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-premium">
          <TrendingUp className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          IDEA
        </h1>
        <p className="text-sm font-semibold text-primary">
          Índice DAMA de Eficiência do Atendimento
        </p>
        <p className="text-xs text-muted-foreground italic">
          O coração da sua gestão clínica
        </p>
      </div>

      {/* O que é */}
      <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">O que é o IDEA?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O IDEA mede a eficiência operacional da sua agenda médica em uma escala de <span className="font-semibold text-foreground">0 a 100</span>. 
          Ele analisa quanto da sua capacidade diária está sendo aproveitada e quanto está sendo perdida com no-shows, cancelamentos e buracos na agenda.
        </p>
      </section>

      {/* Como é calculado */}
      <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Como é calculado?</h2>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">1</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Partimos de 100 pontos</p>
              <p className="text-xs text-muted-foreground">Representando o dia perfeito — sem perdas.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-xs font-bold text-destructive">2</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Subtraímos a penalidade</p>
              <p className="text-xs text-muted-foreground">Proporcional à receita perdida em relação à receita potencial do dia. Quanto mais perdas, maior a penalidade.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(155,60%,38%)]/10 text-xs font-bold text-[hsl(155,60%,38%)]">3</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Somamos bônus por boas práticas</p>
              <p className="text-xs text-muted-foreground">Ações positivas são recompensadas com pontos extras.</p>
            </div>
          </div>
        </div>

        {/* Bonus cards */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bônus disponíveis</p>
          {bonusCards.map((b) => (
            <div key={b.title} className="flex items-center gap-3 rounded-xl bg-secondary/50 border border-border/40 p-3">
              <span className="text-xl">{b.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{b.title}</p>
                  <span className="text-xs font-bold text-primary">{b.points}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Faixas de classificação */}
      <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Faixas de classificação</h2>
        <div className="space-y-2">
          {faixas.map((f) => (
            <div key={f.label} className={cn('rounded-xl border-l-4 p-3.5', f.borderColor, 'bg-secondary/30')}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{f.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{f.range} — {f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como melhorar */}
      <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Como melhorar seu IDEA</h2>
        <div className="space-y-2">
          {dicas.map((d, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Badge */}
      <section className="rounded-2xl gradient-primary p-5 shadow-premium text-center space-y-2">
        <Award className="mx-auto h-10 w-10 text-primary-foreground/80" />
        <h2 className="text-sm font-bold text-primary-foreground uppercase tracking-wider">Badge de Eficiência</h2>
        <p className="text-sm text-primary-foreground/85 leading-relaxed">
          Mantenha seu IDEA médio <span className="font-bold text-primary-foreground">≥ 80</span> nos últimos 30 check-ins e ganhe o <span className="font-bold text-primary-foreground">Badge de Eficiência 🏅</span> automaticamente!
        </p>
        <p className="text-xs text-primary-foreground/60">
          O badge é removido se a média cair abaixo de 75.
        </p>
      </section>

      <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
    </div>
  );
}
