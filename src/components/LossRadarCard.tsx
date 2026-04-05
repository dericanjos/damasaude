import { useEffect, useRef } from 'react';
import { useLossRadar } from '@/hooks/useLossRadar';
import { formatBRL } from '@/lib/revenue';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { scheduleTrendAlert, getNotificationsEnabled } from '@/hooks/useNotificationReminders';

const whatsappUrl = 'https://wa.me/5521959214292?text=Ol%C3%A1!%20Vim%20pelo%20app%20DAMA%20Sa%C3%BAde%20e%20quero%20saber%20como%20reduzir%20os%20vazamentos%20da%20minha%20agenda.';

export default function LossRadarCard() {
  const { data: radar } = useLossRadar();
  const trendNotified = useRef(false);

  // Schedule native push notification when trend is detected
  useEffect(() => {
    if (!radar?.worstTrend || trendNotified.current) return;
    if (!getNotificationsEnabled()) return;
    const trend = radar.worstTrend;
    const pct = Math.round(trend.percentChange);
    scheduleTrendAlert(
      `Seus ${trend.label.toLowerCase()} aumentaram ${pct}% nas últimas 2 semanas. Confira seus insights no DAMA Clínica.`
    );
    trendNotified.current = true;
  }, [radar?.worstTrend]);

  if (!radar) return null;

  const ctaBlock = radar.revenueLost7d > 1000 && (
    <div className="mt-3 pt-3 border-t border-border/40">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#D4AF37] font-semibold hover:text-[#e0c04a] transition-colors"
      >
        Agendar diagnóstico gratuito →
      </a>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        30 min sem compromisso com a equipe DAMA
      </p>
    </div>
  );

  // Negative trend alert card
  if (radar.worstTrend) {
    const trend = radar.worstTrend;
    const pct = Math.round(trend.percentChange);
    return (
      <div className="rounded-2xl border-2 border-idea-attention bg-idea-attention/10 p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-idea-attention/20">
            <TrendingDown className="h-5 w-5 text-idea-attention" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-idea-attention uppercase tracking-widest">📉 Alerta de Tendência</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {trend.label} em alta
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Seus {trend.label.toLowerCase()} aumentaram <span className="font-bold text-idea-attention">{pct}%</span> nas últimas 2 semanas.
              {trend.type === 'no_show' && ' Isso pode indicar uma falha no seu processo de confirmação.'}
              {trend.type === 'cancellations' && ' Revise as causas dos cancelamentos recentes.'}
              {trend.type === 'empty_slots' && ' Sua agenda tem mais buracos que o habitual.'}
            </p>
          </div>
        </div>
        {ctaBlock}
      </div>
    );
  }

  // Normal Radar card
  if (radar.revenueLost7d === 0) return null;

  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-revenue-loss/15">
          <AlertTriangle className="h-5 w-5 text-revenue-loss" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">⚠️ Radar de Perda Invisível</p>
          <p className="text-2xl font-bold text-revenue-loss mt-0.5">{formatBRL(radar.revenueLost7d)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            É o valor que você deixou de faturar nos últimos 7 dias com ineficiências na agenda.
          </p>
        </div>
      </div>
      {ctaBlock}
    </div>
  );
}
