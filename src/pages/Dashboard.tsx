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
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DashboardStats {
  deviations: number;
  workflows: number;
  companies: number;
  plants: number;
  completedDeviations: number;
  controlledRisks: number;
  uncontrolledRisks: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    deviations: 0,
    workflows: 0,
    companies: 0,
    plants: 0,
    completedDeviations: 0,
    controlledRisks: 0,
    uncontrolledRisks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [deviationsRes, workflowsRes, companiesRes, plantsRes, deviationsDataRes] = await Promise.all([
          supabase.from('deviations').select('id', { count: 'exact', head: true }),
          supabase.from('workflows').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('plants').select('id', { count: 'exact', head: true }),
          supabase.from('deviations').select('status'),
        ]);

        const deviationsData = deviationsDataRes.data || [];
        const completedDeviations = deviationsData.filter(d => d.status === 'done').length;
        const controlledRisks = deviationsData.filter(d => d.status === 'done').length;
        const uncontrolledRisks = deviationsData.filter(d => d.status === 'open' || d.status === 'in_progress').length;

        setStats({
          deviations: deviationsRes.count ?? 0,
          workflows: workflowsRes.count ?? 0,
          companies: companiesRes.count ?? 0,
          plants: plantsRes.count ?? 0,
          completedDeviations,
          controlledRisks,
          uncontrolledRisks,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const capaClosureRate = stats.deviations > 0 
    ? Math.round((stats.completedDeviations / stats.deviations) * 100) 
    : 0;

  const riskChartData = [
    { name: t('dashboard.controlledRisks'), value: stats.controlledRisks, color: 'hsl(var(--success))' },
    { name: t('dashboard.uncontrolledRisks'), value: stats.uncontrolledRisks, color: 'hsl(var(--destructive))' },
  ];

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
    { 
      title: t('dashboard.capaClosureRate'), 
      value: `${capaClosureRate}%`, 
      icon: CheckCircle2, 
      color: 'text-success',
      bgColor: 'bg-success/10'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

      {/* Risk Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t('dashboard.riskControl')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stats.controlledRisks === 0 && stats.uncontrolledRisks === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {t('dashboard.noRiskData')}
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

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