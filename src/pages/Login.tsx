import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: t('auth.registerSuccess'),
          variant: 'default',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: t('auth.loginSuccess'),
          variant: 'default',
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: t('auth.invalidCredentials'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="absolute top-4 right-4 lg:hidden">
          <LanguageToggle variant="compact" />
        </div>
        
        <Card className="w-full max-w-md shadow-card border-0 animate-fade-in-up">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gradient-brand mb-3">
                {t('common.welcome')}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('auth.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {!isRegister && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      {t('common.rememberMe')}
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    {t('common.forgotPassword')}
                  </button>
                </div>
              )}

              <LanguageToggle className="pt-2" />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                variant="brand"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isRegister ? t('auth.createAccount') : t('common.login')}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isRegister ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}{' '}
                  <span className="text-primary font-medium">
                    {isRegister ? t('common.login') : t('auth.createAccount')}
                  </span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex w-1/2 gradient-brand items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        
        {/* Language toggle for desktop */}
        <div className="absolute top-6 right-6">
          <LanguageToggle variant="compact" className="border-primary-foreground/30 text-primary-foreground" />
        </div>

        {/* Logo and branding */}
        <div className="relative z-10 animate-float">
          <Logo variant="light" size="xl" />
        </div>
      </div>
    </div>
  );
}
