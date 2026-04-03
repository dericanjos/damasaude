import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('feedback' as any).insert({
        user_id: user.id,
        type,
        message: message.trim(),
        page: window.location.pathname,
      } as any);
      if (error) throw error;
      toast.success('Obrigado! Seu feedback foi registrado.');
      setMessage('');
      setType('bug');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar feedback');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug / Problema</SelectItem>
                <SelectItem value="sugestao">Sugestão</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Descreva o que aconteceu..."
              className="rounded-xl min-h-[120px]"
            />
          </div>
          <Button
            onClick={handleSubmit}
            className="w-full rounded-xl"
            disabled={sending || !message.trim()}
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
