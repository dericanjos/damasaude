import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logoDama from '@/assets/logo-dama.png';

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <img
            src={logoDama}
            alt="DAMA - Time Estratégico Comercial para Médicos"
            className="mx-auto mb-4 h-28 w-28 object-contain rounded-2xl"
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">DAMA</h1>
          <p className="text-sm text-muted-foreground">Copiloto da Agenda</p>
        </div>

        <Card className="shadow-elevated border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{isSignUp ? 'Criar conta' : 'Entrar'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Cadastre-se para começar' : 'Acesse sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="doctorName">Nome do médico</Label>
                    <Input
                      id="doctorName"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. João Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicName">Nome da clínica</Label>
                    <Input
                      id="clinicName"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Clínica Saúde"
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
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
