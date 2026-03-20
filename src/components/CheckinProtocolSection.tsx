import { useState } from 'react';
import { useActiveProtocols, type ProtocolEntry, type Protocol } from '@/hooks/useProtocols';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL } from '@/lib/revenue';
import { Plus, Trash2, Syringe, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  entries: ProtocolEntry[];
  onChange: (entries: ProtocolEntry[]) => void;
  hasProtocols: boolean;
}

export default function CheckinProtocolSection({ entries, onChange, hasProtocols }: Props) {
  const activeProtocols = useActiveProtocols();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState<number | ''>('');
  const [customDesc, setCustomDesc] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  if (!hasProtocols && activeProtocols.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Syringe className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Protocolos realizados</p>
        </div>
        <p className="text-sm text-muted-foreground text-center py-2">
          Você ainda não cadastrou protocolos. Acesse <span className="font-semibold text-primary">Configurações</span> para adicionar.
        </p>
      </div>
    );
  }

  const totalProtocolRevenue = entries.reduce((sum, e) => sum + e.value, 0);

  const addProtocol = (p: Protocol) => {
    onChange([...entries, {
      protocol_id: p.id,
      name: p.name,
      description: p.description || '',
      value: p.default_value,
    }]);
    setDialogOpen(false);
    setSearch('');
  };

  const addCustom = () => {
    if (!customName.trim() || !customValue) return;
    onChange([...entries, {
      protocol_id: null,
      name: customName.trim(),
      description: customDesc.trim(),
      value: customValue as number,
    }]);
    setDialogOpen(false);
    setShowCustom(false);
    setCustomName('');
    setCustomValue('');
    setCustomDesc('');
    setSearch('');
  };

  const removeEntry = (idx: number) => {
    onChange(entries.filter((_, i) => i !== idx));
  };

  const updateValue = (idx: number, value: number) => {
    onChange(entries.map((e, i) => i === idx ? { ...e, value } : e));
  };

  const filtered = activeProtocols.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Protocolos realizados</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhum protocolo adicionado hoje.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="rounded-xl border border-border/60 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                {entry.description && <p className="text-[10px] text-muted-foreground">{entry.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={0}
                    value={entry.value}
                    onChange={e => updateValue(idx, Math.max(0, Number(e.target.value) || 0))}
                    className="rounded-lg h-8 text-sm pl-7 text-right"
                  />
                </div>
                <button onClick={() => removeEntry(idx)} className="text-destructive hover:text-destructive/80 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">Total protocolos</p>
            <p className="text-sm font-bold text-primary">{formatBRL(totalProtocolRevenue)}</p>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setShowCustom(false); setSearch(''); } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Protocolo</DialogTitle>
          </DialogHeader>
          {!showCustom ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar protocolo..."
                  className="rounded-xl pl-9"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProtocol(p)}
                    className="w-full rounded-xl border border-border/60 p-3 text-left hover:border-primary/50 transition-all"
                  >
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                    <p className="text-xs text-primary font-medium mt-1">{formatBRL(p.default_value)}</p>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum protocolo encontrado.</p>
                )}
              </div>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowCustom(true)}>
                Outro (avulso)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome *</Label>
                <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Nome do procedimento" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</Label>
                <Input value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Opcional" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor (R$) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCustom(false)}>Voltar</Button>
                <Button className="flex-1 rounded-xl" onClick={addCustom} disabled={!customName.trim() || !customValue}>Adicionar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
