import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CheckCircle, AlertTriangle, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrainingStats {
  scheduled: number;
  completed: number;
  expiredCertificates: number;
  attendanceRate: number;
}

interface ComplianceData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  month: string;
  count: number;
}

const CHART_COLORS = [
  'hsl(213, 37%, 26%)',   // Azul escuro
  'hsl(142, 76%, 36%)',   // Verde
  'hsl(43, 96%, 56%)',    // Amarelo
  'hsl(0, 72%, 51%)',     // Vermelho
  'hsl(280, 68%, 50%)',   // Roxo
  'hsl(190, 90%, 40%)',   // Ciano
];

export function TrainingDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<TrainingStats>({
    scheduled: 0,
    completed: 0,
    expiredCertificates: 0,
    attendanceRate: 0,
  });
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select(`
          id,
          status,
          scheduled_date,
          plant_id,
          plants(name, company_id, companies(name))
        `);

      if (sessionsError) throw sessionsError;

      // Fetch enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('training_enrollments')
        .select('id, status, session_id');

      if (enrollmentsError) throw enrollmentsError;

      // Calculate stats
      const scheduled = sessions?.filter(s => s.status === 'scheduled').length || 0;
      const completed = sessions?.filter(s => s.status === 'completed').length || 0;
      
      const totalEnrollments = enrollments?.length || 0;
      const presentEnrollments = enrollments?.filter(e => e.status === 'present').length || 0;
      const attendanceRate = totalEnrollments > 0 
        ? Math.round((presentEnrollments / totalEnrollments) * 100) 
        : 0;

      // For expired certificates, we'd need to check validity_months from training_types
      // For now, we'll set it to 0 as placeholder
      const expiredCertificates = 0;

      setStats({
        scheduled,
        completed,
        expiredCertificates,
        attendanceRate,
      });

      // Compliance by department (using company names as departments)
      const companyCount: Record<string, number> = {};
      sessions?.forEach(session => {
        const companyName = (session.plants as any)?.companies?.name || t('trainings.unknown');
        companyCount[companyName] = (companyCount[companyName] || 0) + 1;
      });

      const complianceDataArr = Object.entries(companyCount).map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
      setComplianceData(complianceDataArr);

      // Monthly trainings
      const monthlyCount: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toISOString().slice(0, 7);
        monthlyCount[key] = 0;
      }

      sessions?.forEach(session => {
        if (session.status === 'completed') {
          const monthKey = session.scheduled_date.slice(0, 7);
          if (monthlyCount[monthKey] !== undefined) {
            monthlyCount[monthKey]++;
          }
        }
      });

      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyDataArr = Object.entries(monthlyCount).map(([key, count]) => {
        const [year, month] = key.split('-');
        return {
          month: months[parseInt(month) - 1],
          count,
        };
      });
      setMonthlyData(monthlyDataArr);

    } catch (error) {
      console.error('Error fetching training dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('trainings.kpi.scheduled')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('trainings.kpi.completed')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('trainings.kpi.expiredCertificates')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.expiredCertificates}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('trainings.kpi.attendanceRate')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Compliance Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('trainings.charts.complianceByDepartment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {complianceData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t('trainings.noData')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complianceData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {complianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [`${value} ${t('trainings.charts.trainings')}`, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={50}
                      formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('trainings.charts.monthlyExecuted')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t('trainings.charts.trainings')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}