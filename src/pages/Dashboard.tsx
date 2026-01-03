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
  Calendar,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface DashboardStats {
  deviations: number;
  workflows: number;
  companies: number;
  units: number;
  completedDeviations: number;
  controlledRisks: number;
  uncontrolledRisks: number;
}

interface MonthlyData {
  month: string;
  deviations: number;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    deviations: 0,
    workflows: 0,
    companies: 0,
    units: 0,
    completedDeviations: 0,
    controlledRisks: 0,
    uncontrolledRisks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedMonths, setSelectedMonths] = useState('6');

  const dateLocale = i18n.language === 'pt-BR' ? ptBR : enUS;

  useEffect(() => {
    async function fetchStats() {
      try {
        const [deviationsRes, workflowsRes, companiesRes, unitsRes, deviationsDataRes] = await Promise.all([
          supabase.from('deviations').select('id', { count: 'exact', head: true }),
          supabase.from('workflows').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('plants').select('id', { count: 'exact', head: true }),
          supabase.from('deviations').select('status, created_at'),
        ]);

        const deviationsData = deviationsDataRes.data || [];
        const completedDeviations = deviationsData.filter(d => d.status === 'done').length;
        const controlledRisks = deviationsData.filter(d => d.status === 'done').length;
        const uncontrolledRisks = deviationsData.filter(d => d.status === 'open' || d.status === 'in_progress').length;

        setStats({
          deviations: deviationsRes.count ?? 0,
          workflows: workflowsRes.count ?? 0,
          companies: companiesRes.count ?? 0,
          units: unitsRes.count ?? 0,
          completedDeviations,
          controlledRisks,
          uncontrolledRisks,
        });

        // Process monthly data
        const monthsCount = parseInt(selectedMonths);
        const monthlyStats: MonthlyData[] = [];
        
        for (let i = monthsCount - 1; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const deviationsInMonth = deviationsData.filter(d => {
            const createdAt = new Date(d.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          }).length;
          
          monthlyStats.push({
            month: format(monthDate, 'MMM', { locale: dateLocale }),
            deviations: deviationsInMonth,
          });
        }
        
        setMonthlyData(monthlyStats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [selectedMonths, dateLocale]);

  const capaClosureRate = stats.deviations > 0 
    ? Math.round((stats.completedDeviations / stats.deviations) * 100) 
    : 0;

  const riskChartData = [
    { name: t('dashboard.controlledRisks'), value: stats.controlledRisks, color: 'hsl(142, 76%, 36%)' },
    { name: t('dashboard.uncontrolledRisks'), value: stats.uncontrolledRisks, color: 'hsl(0, 72%, 51%)' },
  ];

  const statCards = [
    { 
      title: t('dashboard.deviations'), 
      value: stats.deviations, 
      icon: AlertTriangle, 
      gradient: 'bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground'
    },
    { 
      title: t('dashboard.workflows'), 
      value: stats.workflows, 
      icon: GitBranch, 
      gradient: 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
    },
    { 
      title: t('dashboard.companies'), 
      value: stats.companies, 
      icon: Building2, 
      gradient: 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
    },
    { 
      title: t('dashboard.units'), 
      value: stats.units, 
      icon: Factory, 
      gradient: 'bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground'
    },
    { 
      title: t('dashboard.capaClosureRate'), 
      value: `${capaClosureRate}%`, 
      icon: CheckCircle2, 
      gradient: 'bg-gradient-to-br from-green-500 to-green-600 text-white'
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className={`border-0 shadow-md hover:shadow-lg transition-shadow animate-fade-in-up ${stat.gradient}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 opacity-80" />
                <span className="text-xs opacity-80">{stat.title}</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Risk Pie Chart */}
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

        {/* Monthly Deviations Bar Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('dashboard.monthlyDeviations')}
            </CardTitle>
            <Select value={selectedMonths} onValueChange={setSelectedMonths}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">{t('dashboard.lastMonths', { count: 3 })}</SelectItem>
                <SelectItem value="6">{t('dashboard.lastMonths', { count: 6 })}</SelectItem>
                <SelectItem value="9">{t('dashboard.lastMonths', { count: 9 })}</SelectItem>
                <SelectItem value="12">{t('dashboard.lastMonths', { count: 12 })}</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : monthlyData.length === 0 || monthlyData.every(d => d.deviations === 0) ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                {t('dashboard.noMonthlyData')}
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="deviations" 
                      fill="hsl(213, 37%, 26%)" 
                      radius={[4, 4, 0, 0]}
                      name={t('dashboard.deviations')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}