import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logoTagline from '@/assets/logo-dama-tagline.png';
import authBg from '@/assets/auth-bg.png';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneConfirm, setPhoneConfirm] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setIsSignUp(true);
    }
  }, [searchParams]);

  const phoneMismatch = isSignUp && phone !== '' && phoneConfirm !== '' && phone !== phoneConfirm;

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Digite seu e-mail primeiro para receber o link de recuperação');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('E-mail com formato inválido');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      toast.success('Enviamos um link de recuperação para o seu e-mail. Confira a caixa de entrada (e spam).');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível enviar o e-mail de recuperação');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!doctorName.trim()) {
          toast.error('Seu nome é obrigatório para começar');
          setLoading(false);
          return;
        }
        if (!clinicName.trim()) {
          toast.error('O nome da clínica é obrigatório');
          setLoading(false);
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          toast.error('Verifique o formato do seu e-mail (ex: seu@email.com)');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Sua senha precisa ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }
        if (password !== passwordConfirm) {
          toast.error('As senhas não coincidem');
          setLoading(false);
          return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          toast.error('Informe um telefone válido com DDD');
          setLoading(false);
          return;
        }
        if (phone !== phoneConfirm) {
          toast.error('Os números de telefone não coincidem');
          setLoading(false);
          return;
        }
        if (referralCode.trim()) {
          localStorage.setItem('dama_referral_code', referralCode.trim());
        }
        const { error } = await signUp(email, password, doctorName, clinicName, 0.85, 0.05, phone);
        if (error) {
          toast.error(error.message || 'Erro ao criar conta');
        } else {
          toast.success('Conta criada com sucesso!');
        }
      } else {
        const { error } = await signIn(email, password, rememberMe);
        if (error) {
          toast.error('E-mail ou senha incorretos');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 pt-8 md:pt-4"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <img
            src={logoTagline}
            alt="DAMA Doc - Gestão inteligente para médicos"
            className="h-40 w-auto object-contain drop-shadow-lg"
          />
        </div>

        <Card className="border-white/10 bg-white/10 backdrop-blur-md shadow-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">{isSignUp ? 'Criar conta' : 'Entrar'}</CardTitle>
            <CardDescription className="text-white/70">
              {isSignUp ? 'Cadastre-se para começar' : 'Acesse sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="doctorName" className="text-white/90">Nome do médico</Label>
                    <Input
                      id="doctorName"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. João Silva"
                      className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="text-white/90">Nome da clínica</Label>
                    <Input
                      id="clinicName"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Clínica Saúde"
                      className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  required
                />
              </div>
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/90">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(21) 99999-9999"
                      className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneConfirm" className="text-white/90">Confirmar telefone</Label>
                    <Input
                      id="phoneConfirm"
                      type="tel"
                      value={phoneConfirm}
                      onChange={(e) => setPhoneConfirm(formatPhone(e.target.value))}
                      placeholder="(21) 99999-9999"
                      className={`border-white/20 bg-white/10 text-white placeholder:text-white/40 ${phoneMismatch ? 'border-red-500' : ''}`}
                      required
                    />
                    {phoneMismatch && (
                      <p className="text-xs text-red-400">Os números não coincidem</p>
                    )}
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
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
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-white/70 hover:text-white underline self-end mt-1"
                >
                  Esqueci minha senha
                </button>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="text-white/90">Confirme sua senha</Label>
                  <div className="relative">
                    <Input
                      id="passwordConfirm"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={`border-white/20 bg-white/10 text-white placeholder:text-white/40 pr-10 ${isSignUp && passwordConfirm && password !== passwordConfirm ? 'border-red-500' : ''}`}
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
                  {isSignUp && passwordConfirm && password !== passwordConfirm && (
                    <p className="text-xs text-red-400">As senhas não coincidem</p>
                  )}
                </div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="referralCode" className="text-white/90">Código de convite (opcional)</Label>
                  <Input
                    id="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Ex: DAMA-DRSILVA-A1B2"
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              )}

              {!isSignUp && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="rememberMe" className="text-sm text-white/80 cursor-pointer">Manter conectado</Label>
                  <Switch id="rememberMe" checked={rememberMe} onCheckedChange={setRememberMe} />
                </div>
              )}

              <Button type="submit" className="w-full bg-white text-blue-900 font-semibold hover:bg-white/90" disabled={loading || (isSignUp && phoneMismatch)}>
                {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-white/80 hover:text-white hover:underline"
              >
                {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
