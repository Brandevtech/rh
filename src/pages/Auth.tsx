import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, MailCheck, KeyRound } from 'lucide-react';
import { MfaChallengePanel } from '@/components/auth/MfaChallengePanel';
import { useSystemConfig, parseSsoSettings, type SsoSettings } from '@/hooks/useSystemConfig';
import { APPLICANT_DASHBOARD_PATH, APPLICANT_LOGIN_VERIFY_PATH, isApplicantPortalUserMetadata } from '@/lib/publicRoutes';
import talentAppLogo from '@/assets/The-Talent-App-Logo.png';

const emailSchema = z.string().email('Por favor, insira um e-mail válido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');
const nameSchema = z.string().min(2, 'O nome deve ter pelo menos 2 caracteres');

export default function Auth() {
  usePageTitle('Entrar');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [signupPendingEmail, setSignupPendingEmail] = useState<string | null>(null);
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  
  // Formulário de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  
  // Formulário de cadastro
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  
  const { signIn, signUp, signInWithSSO, user, isApplicant, isStaff, identityResolved, mfaPending } = useAuth();
  const { configValue: ssoRaw } = useSystemConfig('sso_settings');
  const ssoSettings = parseSsoSettings(ssoRaw);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; mfa?: boolean } | null;
  const { toast } = useToast();

  const staffRedirectTarget = (() => {
    const from = locationState?.from;
    if (from && from.startsWith('/') && !from.startsWith('//') && from !== '/auth') {
      return from;
    }
    return '/';
  })();

  useEffect(() => {
    if (locationState?.mfa || mfaPending) {
      setShowMfaChallenge(true);
    }
  }, [locationState?.mfa, mfaPending]);

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      toast({ title: 'Informe seu e-mail primeiro', description: 'Digite seu e-mail no campo acima e depois clique em "Esqueceu sua senha?"', variant: 'destructive' });
      return;
    }
    try {
      emailSchema.parse(loginEmail);
    } catch {
      toast({ title: 'Por favor, insira um e-mail válido', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await (await import('@/integrations/supabase/client')).supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Link enviado', description: 'Verifique seu e-mail para acessar o link de redefinição de senha.' });
    }
  };

  useEffect(() => {
    if (user && identityResolved && !mfaPending && !showMfaChallenge) {
      if (isStaff) {
        navigate(staffRedirectTarget, { replace: true });
      } else if (isApplicant) {
        navigate(APPLICANT_DASHBOARD_PATH, { replace: true });
      } else if (isApplicantPortalUserMetadata(user.user_metadata)) {
        navigate(APPLICANT_LOGIN_VERIFY_PATH, { replace: true });
      } else {
        navigate(staffRedirectTarget, { replace: true });
      }
    }
  }, [user, identityResolved, isApplicant, isStaff, navigate, staffRedirectTarget, mfaPending, showMfaChallenge]);

  const handleSsoSignIn = async (settings: SsoSettings) => {
    setSsoLoading(true);
    const { error } = await signInWithSSO({
      domain: settings.domain ?? undefined,
      providerId: settings.provider_id ?? undefined,
    });
    setSsoLoading(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Falha no login via SSO',
        description: error.message,
      });
    }
  };

  const validateLogin = () => {
    const errors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(loginEmail);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.email = e.issues[0].message;
      }
    }
    
    try {
      passwordSchema.parse(loginPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.password = e.issues[0].message;
      }
    }
    
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignup = () => {
    const errors: { email?: string; password?: string; name?: string } = {};
    
    try {
      nameSchema.parse(signupName);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.name = e.issues[0].message;
      }
    }
    
    try {
      emailSchema.parse(signupEmail);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.email = e.issues[0].message;
      }
    }
    
    try {
      passwordSchema.parse(signupPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.password = e.issues[0].message;
      }
    }
    
    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLogin()) return;
    
    setIsLoading(true);
    
    const { error, mfaRequired } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      let message = 'Ocorreu um erro durante o login';
      
      if (error.message.includes('Invalid login credentials')) {
        message = 'E-mail ou senha incorretos. Tente novamente.';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor, confirme seu e-mail antes de entrar.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Falha no Login',
        description: message,
      });
    } else if (mfaRequired) {
      setShowMfaChallenge(true);
    } else {
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Você entrou com sucesso.',
      });
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignup()) return;
    
    setIsLoading(true);
    
    const { error, session } = await signUp(signupEmail, signupPassword, signupName);

    if (error) {
      let message = 'Ocorreu um erro durante o cadastro';

      if (error.message.includes('User already registered')) {
        message = 'Este e-mail já está cadastrado. Faça login na sua conta.';
      } else if (error.message.includes('Password')) {
        message = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
        description: message,
      });
    } else if (!session) {
      setSignupPendingEmail(signupEmail);
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Bem-vindo ao The Talent App.',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br/srgb from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img
            src={talentAppLogo}
            alt="The Talent App"
            className="h-14 w-auto mb-3"
          />
          <p className="text-sm text-muted-foreground">Plataforma de Recrutamento & Seleção</p>
        </div>

        {signupPendingEmail ? (
          <Card className="surface-card border-0 shadow-elev-2">
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Verifique seu e-mail</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enviamos um link de confirmação para<br />
                  <span className="font-medium text-foreground">{signupPendingEmail}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Clique no link enviado ao seu e-mail para confirmar a sua conta. Após a confirmação, o administrador definirá seu perfil de acesso.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSignupPendingEmail(null); setActiveTab('login'); }}
              >
                Voltar ao login
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card className="surface-card border-0 shadow-elev-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-xl">Boas-vindas</CardTitle>
            <CardDescription>
              Acesse para gerenciar vagas, pipeline e contratações em um só lugar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {showMfaChallenge ? (
                  <MfaChallengePanel
                    onSuccess={() => {
                      setShowMfaChallenge(false);
                      toast({ title: 'Bem-vindo de volta!', description: 'Autenticação em duas etapas concluída.' });
                      navigate(staffRedirectTarget, { replace: true });
                    }}
                    onCancel={async () => {
                      setShowMfaChallenge(false);
                      await (await import('@/integrations/supabase/client')).supabase.auth.signOut();
                    }}
                  />
                ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu.email@empresa.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={loginErrors.email ? 'border-destructive' : ''}
                    />
                    {loginErrors.email && (
                      <p className="text-sm text-destructive">{loginErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={loginErrors.password ? 'border-destructive' : ''}
                    />
                    {loginErrors.password && (
                      <p className="text-sm text-destructive">{loginErrors.password}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full btn-gradient text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      disabled={isLoading}
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                </form>
                )}
                {!showMfaChallenge && ssoSettings.enabled && (ssoSettings.domain || ssoSettings.provider_id) && (
                  <div className="mt-4 space-y-2">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Ou</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading || ssoLoading}
                      onClick={() => handleSsoSignIn(ssoSettings)}
                    >
                      {ssoLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="mr-2 h-4 w-4" />
                      )}
                      Entrar com SSO
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu Nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className={signupErrors.name ? 'border-destructive' : ''}
                    />
                    {signupErrors.name && (
                      <p className="text-sm text-destructive">{signupErrors.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu.email@empresa.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className={signupErrors.email ? 'border-destructive' : ''}
                    />
                    {signupErrors.email && (
                      <p className="text-sm text-destructive">{signupErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={signupErrors.password ? 'border-destructive' : ''}
                    />
                    {signupErrors.password && (
                      <p className="text-sm text-destructive">{signupErrors.password}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full btn-gradient text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        )}

        <div className="text-center text-sm text-muted-foreground mt-6 space-y-1">
          <p>Ao continuar, você concorda com os termos de serviço do The Talent App.</p>
          <p>
            Desenvolvido por{' '}
            <a
              href="https://www.sparxitsolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              SparxIT
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
