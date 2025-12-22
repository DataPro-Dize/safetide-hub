import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  AlertTriangle, 
  Users, 
  TrendingUp 
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export function KpiDashboard() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const { data: reports } = useQuery({
    queryKey: ['kpi-reports-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_reports')
        .select('*')
        .eq('year', currentYear);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate KPIs
  const totalHHT = reports?.reduce((sum, r) => 
    sum + (r.horas_trabalhadas_empresa || 0) + (r.horas_trabalhadas_contratados || 0), 0) || 0;
  
  const totalAccidents = reports?.reduce((sum, r) => 
    sum + (r.acidente_fatal || 0) + (r.acidente_afastamento || 0) + 
    (r.acidente_restricao_trabalho || 0) + (r.acidente_tratamento_medico || 0), 0) || 0;
  
  const totalWorkforce = reports?.reduce((sum, r) => 
    sum + (r.efetivo_empresa || 0) + (r.efetivo_contratados || 0), 0) || 0;
  
  const frequencyRate = totalHHT > 0 
    ? ((totalAccidents * 1000000) / totalHHT).toFixed(2) 
    : '0.00';

  // Monthly data for chart
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthReports = reports?.filter(r => r.month === i + 1) || [];
    const monthHHT = monthReports.reduce((sum, r) => 
      sum + (r.horas_trabalhadas_empresa || 0) + (r.horas_trabalhadas_contratados || 0), 0);
    const monthAccidents = monthReports.reduce((sum, r) => 
      sum + (r.acidente_fatal || 0) + (r.acidente_afastamento || 0) + 
      (r.acidente_restricao_trabalho || 0) + (r.acidente_tratamento_medico || 0), 0);
    
    return {
      month: t(`indicators.months.${i + 1}`),
      hht: monthHHT,
      accidents: monthAccidents,
      frequencyRate: monthHHT > 0 ? ((monthAccidents * 1000000) / monthHHT) : 0,
    };
  });

  const kpiCards = [
    {
      title: t('indicators.kpi.totalHHT'),
      value: totalHHT.toLocaleString(),
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      title: t('indicators.kpi.totalAccidents'),
      value: totalAccidents.toString(),
      icon: AlertTriangle,
      color: 'text-red-500',
    },
    {
      title: t('indicators.kpi.workforce'),
      value: totalWorkforce.toLocaleString(),
      icon: Users,
      color: 'text-green-500',
    },
    {
      title: t('indicators.kpi.frequencyRate'),
      value: frequencyRate,
      icon: TrendingUp,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>{t('indicators.charts.monthlyHHT')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="hht" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>{t('indicators.charts.frequencyRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="frequencyRate" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
