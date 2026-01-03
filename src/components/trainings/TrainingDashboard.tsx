import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CheckCircle, AlertTriangle, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

      const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
      const complianceDataArr = Object.entries(companyCount).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
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
            <div className="h-[250px]">
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
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {complianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
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
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
