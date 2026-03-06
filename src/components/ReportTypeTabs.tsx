import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/revenue';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReportTypeTabsProps {
  selectedMonth: string;
  monthCheckins: any[];
  calcWeek: (checkins: any[]) => any;
  handleGeneratePDF: () => void;
  clinicId?: string;
}

export default function ReportTypeTabs({ selectedMonth, monthCheckins, calcWeek, handleGeneratePDF, clinicId }: ReportTypeTabsProps) {
  const [monthlyReport, setMonthlyReport] = useState<string | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [monthlyFetched, setMonthlyFetched] = useState(false);

  // Reset when month changes
  useEffect(() => {
    setMonthlyReport(null);
    setMonthlyFetched(false);
    setMonthlyError(null);
  }, [selectedMonth]);

  const fetchMonthlyReport = async () => {
    if (!clinicId || monthCheckins.length === 0) return;
    setMonthlyLoading(true);
    setMonthlyError(null);
    try {
      const monthDate = selectedMonth + '-01';
      const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
        body: { month_date: monthDate, clinic_id: clinicId },
      });
      if (error) throw error;
      if (data?.error === 'no_data') {
        setMonthlyReport(null);
      } else if (data?.report?.report_text) {
        setMonthlyReport(data.report.report_text);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      setMonthlyError(e?.message || 'Erro ao gerar relatório mensal');
    } finally {
      setMonthlyLoading(false);
      setMonthlyFetched(true);
    }
  };

  // Auto-fetch when switching to monthly tab with data
  const handleMonthlyTabActive = () => {
    if (!monthlyFetched && !monthlyLoading && monthCheckins.length > 0) {
      fetchMonthlyReport();
    }
  };

  const mStats = monthCheckins.length > 0 ? calcWeek(monthCheckins) : null;

  return (
    <Tabs defaultValue="semanal" className="w-full" onValueChange={(v) => { if (v === 'mensal') handleMonthlyTabActive(); }}>
      <TabsList className="w-full grid grid-cols-2 h-9 rounded-xl bg-secondary">
        <TabsTrigger value="semanal" className="text-[11px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Relatório Semanal
        </TabsTrigger>
        <TabsTrigger value="mensal" className="text-[11px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Relatório Mensal
        </TabsTrigger>
      </TabsList>

      {/* Weekly Report Tab */}
      <TabsContent value="semanal" className="space-y-4 mt-4">
        <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gerador de Relatório PDF</p>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-4">
            {mStats && (
              <div className="rounded-xl bg-secondary/50 border border-border/40 p-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prévia do mês</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Faturamento', value: formatBRL(mStats.revenue) },
                    { label: 'Perda Total', value: formatBRL(mStats.lost) },
                    { label: 'IDEA Médio', value: `${mStats.avgScore ?? '-'}` },
                    { label: 'Check-ins', value: `${monthCheckins.length} dias` },
                  ].map(k => (
                    <div key={k.label}>
                      <p className="text-[10px] text-muted-foreground">{k.label}</p>
                      <p className="text-sm font-bold text-foreground">{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={monthCheckins.length === 0}
              onClick={handleGeneratePDF}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório em PDF
            </Button>
            {monthCheckins.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center">
                Nenhum check-in encontrado neste mês.
              </p>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Monthly AI Report Tab */}
      <TabsContent value="mensal" className="space-y-4 mt-4">
        <div className="rounded-2xl bg-card border border-primary/30 shadow-card overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Diagnóstico Mensal</p>
          </div>
          <div className="px-4 pb-4">
            {monthCheckins.length === 0 ? (
              <div className="py-6 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Seu primeiro relatório mensal será gerado após dados suficientes neste mês.
                </p>
              </div>
            ) : monthlyLoading ? (
              <div className="flex items-center gap-2 py-6">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando seu diagnóstico mensal... Isso pode levar até 60 segundos.</p>
              </div>
            ) : monthlyError ? (
              <div className="py-3">
                <p className="text-xs text-muted-foreground">{monthlyError}</p>
                <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs" onClick={fetchMonthlyReport}>
                  Tentar novamente
                </Button>
              </div>
            ) : monthlyReport ? (
              <div className="prose prose-sm prose-invert max-w-none text-foreground">
                <ReactMarkdown>{monthlyReport}</ReactMarkdown>
              </div>
            ) : (
              <div className="py-6 text-center">
                <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={fetchMonthlyReport}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Gerar Diagnóstico Mensal
                </Button>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
