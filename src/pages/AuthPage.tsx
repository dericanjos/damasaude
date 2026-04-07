import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';
import logoTagline from '@/assets/logo-dama-tagline.png';
import authBg from '@/assets/auth-bg.png';

const buildSocialRedirectUri = () => {
  const redirectUrl = new URL(`${window.location.origin}/auth`);
  const previewToken = new URLSearchParams(window.location.search).get('__lovable_token');

  if (previewToken) {
    redirectUrl.searchParams.set('__lovable_token', previewToken);
  }

  return redirectUrl.toString();
};

const handleSocialSignIn = async (provider: 'google' | 'apple') => {
  const { error } = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: buildSocialRedirectUri(),
  });
  if (error) throw error;
};

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
        const { error } = await signIn(email, password);
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  minLength={6}
                  required
                />
              </div>

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

            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/20" />
              <span className="text-xs text-white/50">ou continue com</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={async () => {
                  try {
                    await handleSocialSignIn('google');
                  } catch (e: any) {
                    toast.error(e.message || 'Erro ao entrar com Google');
                  }
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={async () => {
                  try {
                    await handleSocialSignIn('apple');
                  } catch (e: any) {
                    toast.error(e.message || 'Erro ao entrar com Apple');
                  }
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple
              </Button>
            </div>

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
