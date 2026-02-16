import { useState } from 'react';
import { useClinic, useUpdateClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, LogOut, CreditCard, ExternalLink } from 'lucide-react';

const statusLabels: Record<string, string> = {
  testando: 'Período de teste',
  ativo: 'Ativa',
  vencido: 'Pagamento pendente',
  cancelado: 'Cancelada',
  inativo: 'Inativa',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  testando: 'secondary',
  ativo: 'default',
  vencido: 'destructive',
  cancelado: 'destructive',
  inativo: 'outline',
};

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { data: clinic } = useClinic();
  const updateClinic = useUpdateClinic();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const [name, setName] = useState(clinic?.name ?? '');
  const [fillRate, setFillRate] = useState((clinic?.target_fill_rate ?? 0.85) * 100);
  const [noshowRate, setNoshowRate] = useState((clinic?.target_noshow_rate ?? 0.05) * 100);
  const [timezone, setTimezone] = useState(clinic?.timezone ?? 'America/Sao_Paulo');

  if (clinic && name === '' && clinic.name) {
    setName(clinic.name);
    setFillRate(Number(clinic.target_fill_rate) * 100);
    setNoshowRate(Number(clinic.target_noshow_rate) * 100);
    setTimezone(clinic.timezone);
  }

  const handleSave = async () => {
    try {
      await updateClinic.mutateAsync({
        name,
        target_fill_rate: fillRate / 100,
        target_noshow_rate: noshowRate / 100,
        timezone,
      });
      toast.success('Configurações salvas!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir portal');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Settings className="h-5 w-5 text-secondary-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Configurações</h1>
      </div>

      {/* Minha Assinatura */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Minha Assinatura</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={statusVariants[subscriptionStatus] || 'outline'}>
              {statusLabels[subscriptionStatus] || subscriptionStatus}
            </Badge>
          </div>
          {subscriptionEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fim do período</span>
              <span className="text-sm font-medium text-foreground">
                {new Date(subscriptionEnd).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleManageSubscription}
            disabled={portalLoading}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
          </Button>
        </CardContent>
      </Card>

      {/* Clínica */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base">Clínica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da clínica</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Meta de ocupação (%)</Label>
            <Input type="number" min={0} max={100} value={fillRate} onChange={(e) => setFillRate(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Meta de no-show (%)</Label>
            <Input type="number" min={0} max={100} value={noshowRate} onChange={(e) => setNoshowRate(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Fuso horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                <SelectItem value="America/Manaus">Manaus (AMT)</SelectItem>
                <SelectItem value="America/Recife">Recife (BRT)</SelectItem>
                <SelectItem value="America/Belem">Belém (BRT)</SelectItem>
                <SelectItem value="America/Cuiaba">Cuiabá (AMT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={updateClinic.isPending}>
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Sair
      </Button>
    </div>
  );
}
