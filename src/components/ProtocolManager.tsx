import { useState } from 'react';
import { useProtocols, useCreateProtocol, useUpdateProtocol, type Protocol } from '@/hooks/useProtocols';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Syringe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/revenue';

export default function ProtocolManager() {
  const { data: protocols = [] } = useProtocols();
  const createProtocol = useCreateProtocol();
  const updateProtocol = useUpdateProtocol();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Protocol | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultValue, setDefaultValue] = useState<number | ''>('');

  const openNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDefaultValue('');
    setDialogOpen(true);
  };

  const openEdit = (p: Protocol) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || '');
    setDefaultValue(p.default_value);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!defaultValue || defaultValue <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    try {
      if (editing) {
        await updateProtocol.mutateAsync({
          id: editing.id,
          name: name.trim(),
          description: description.trim(),
          default_value: defaultValue as number,
        });
        toast.success('Protocolo atualizado!');
      } else {
        await createProtocol.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          default_value: defaultValue as number,
        });
        toast.success('Protocolo cadastrado!');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleToggle = async (p: Protocol) => {
    try {
      await updateProtocol.mutateAsync({ id: p.id, is_active: !p.is_active });
      toast.success(p.is_active ? 'Protocolo desativado' : 'Protocolo ativado');
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Protocolos / Procedimentos</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {protocols.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            Nenhum protocolo cadastrado. Adicione procedimentos com valor adicional.
          </p>
        ) : (
          protocols.map(p => (
            <div
              key={p.id}
              className={cn(
                'rounded-xl border p-3 flex items-start justify-between',
                p.is_active ? 'border-border/60' : 'border-border/30 opacity-60'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                <p className="text-xs text-primary font-medium mt-1">{formatBRL(p.default_value)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Switch checked={p.is_active} onCheckedChange={() => handleToggle(p)} />
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Protocolo' : 'Novo Protocolo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Botox, Peeling..." className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor padrão (R$) *</Label>
              <Input
                type="number"
                min={1}
                value={defaultValue}
                onChange={e => setDefaultValue(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                placeholder="250"
                className="rounded-xl"
              />
            </div>
            <Button onClick={handleSave} className="w-full rounded-xl" disabled={createProtocol.isPending || updateProtocol.isPending}>
              {createProtocol.isPending || updateProtocol.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
