import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import logoTagline from '@/assets/logo-dama-tagline.png';

export default function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        toast.error('Link de recuperação inválido ou expirado. Solicite um novo.');
        setTimeout(() => navigate('/auth'), 2000);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Sua nova senha precisa ter pelo menos 6 caracteres');
      return;
    }
    if (password !== passwordConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível redefinir a senha');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950">
        <p className="text-white/70 animate-pulse">Validando link...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Senha redefinida!</h1>
          <p className="text-white/70">
            Você será redirecionado para a tela de login em instantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-blue-900 to-blue-950">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <img
            src={logoTagline}
            alt="DAMA Doc - Gestão inteligente para médicos"
            className="h-32 w-auto object-contain drop-shadow-lg"
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">Redefinir senha</h1>
          <p className="text-sm text-white/70 mt-1">Crie uma nova senha para sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-white/90">Nova senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40 pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 p-1"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPasswordConfirm" className="text-white/90">Confirme a nova senha</Label>
            <div className="relative">
              <Input
                id="newPasswordConfirm"
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className={`border-white/20 bg-white/10 text-white placeholder:text-white/40 pr-10 ${passwordConfirm && password !== passwordConfirm ? 'border-red-500' : ''}`}
                required
              />
            </div>
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-xs text-red-400">As senhas não coincidem</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-blue-900 font-semibold hover:bg-white/90"
            disabled={loading}
          >
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="w-full text-center text-xs text-white/60 hover:text-white/90 mt-4 underline"
        >
          Voltar para o login
        </button>
      </div>
    </div>
  );
}
