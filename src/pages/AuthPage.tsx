import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logoTagline from '@/assets/logo-dama-tagline.png';
import authBg from '@/assets/auth-bg.png';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, doctorName, clinicName);
        if (error) {
          toast.error(error.message || 'Erro ao criar conta');
        } else {
          toast.success('Conta criada! Verifique seu e-mail para confirmar.');
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
      className="flex min-h-screen items-center justify-center p-4"
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
            alt="DAMA - Time Estratégico Comercial para Médicos"
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
              <Button type="submit" className="w-full bg-white text-blue-900 font-semibold hover:bg-white/90" disabled={loading}>
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
