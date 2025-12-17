import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Building2, 
  Factory, 
  GitBranch,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  deviations: number;
  workflows: number;
  companies: number;
  plants: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    deviations: 0,
    workflows: 0,
    companies: 0,
    plants: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [deviationsRes, workflowsRes, companiesRes, plantsRes] = await Promise.all([
          supabase.from('deviations').select('id', { count: 'exact', head: true }),
          supabase.from('workflows').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('plants').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          deviations: deviationsRes.count ?? 0,
          workflows: workflowsRes.count ?? 0,
          companies: companiesRes.count ?? 0,
          plants: plantsRes.count ?? 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    { 
      title: t('dashboard.deviations'), 
      value: stats.deviations, 
      icon: AlertTriangle, 
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    { 
      title: t('dashboard.workflows'), 
      value: stats.workflows, 
      icon: GitBranch, 
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    { 
      title: t('dashboard.companies'), 
      value: stats.companies, 
      icon: Building2, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      title: t('dashboard.plants'), 
      value: stats.plants, 
      icon: Factory, 
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('dashboard.title')}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
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
              <div className="text-3xl font-bold text-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stat.value}
              </div>
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
          <Button variant="brand" onClick={() => navigate('/risk-management')}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t('deviations.new')}
          </Button>
          <Button variant="outline">
            <GitBranch className="mr-2 h-4 w-4" />
            {t('workflows.new')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
