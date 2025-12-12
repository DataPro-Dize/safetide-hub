import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Building2, 
  Factory, 
  GitBranch, 
  LogOut, 
  Users 
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      setUser(session.user);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: t('auth.logoutSuccess'),
    });
    navigate('/');
  };

  const stats = [
    { 
      title: t('dashboard.deviations'), 
      value: '0', 
      icon: AlertTriangle, 
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    { 
      title: t('dashboard.workflows'), 
      value: '0', 
      icon: GitBranch, 
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    { 
      title: t('dashboard.companies'), 
      value: '0', 
      icon: Building2, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      title: t('dashboard.plants'), 
      value: '0', 
      icon: Factory, 
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="gradient-brand sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo variant="light" size="sm" />
          
          <div className="flex items-center gap-4">
            <LanguageToggle variant="compact" className="border-primary-foreground/30" />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {user?.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="border-0 shadow-md hover:shadow-lg transition-shadow animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t('common.actions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="brand">
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t('deviations.new')}
            </Button>
            <Button variant="outline">
              <GitBranch className="mr-2 h-4 w-4" />
              {t('workflows.new')}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
