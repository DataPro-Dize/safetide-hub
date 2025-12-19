import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, AlertTriangle, CheckCircle, Percent, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditDashboardProps {
  onNewAudit: () => void;
}

interface AuditStats {
  totalInspections: number;
  openNonConformities: number;
  closedActions: number;
  complianceRate: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface CategoryData {
  name: string;
  value: number;
}

interface RecentAudit {
  id: string;
  scheduled_date: string;
  status: string;
  score_percentage: number | null;
  template_name: string;
  plant_name: string;
}

export function AuditDashboard({ onNewAudit }: AuditDashboardProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<AuditStats>({
    totalInspections: 0,
    openNonConformities: 0,
    closedActions: 0,
    complianceRate: 0,
  });
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentAudits, setRecentAudits] = useState<RecentAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch audits with related data
      const { data: audits, error: auditsError } = await supabase
        .from('audits')
        .select(`
          id,
          scheduled_date,
          status,
          score_percentage,
          template_id,
          plant_id,
          audit_templates(name, category),
          plants(name)
        `)
        .order('scheduled_date', { ascending: false });

      if (auditsError) throw auditsError;

      // Fetch audit items with 'fail' answers
      const { data: failedItems, error: itemsError } = await supabase
        .from('audit_items')
        .select('id, audit_id')
        .eq('answer', 'fail');

      if (itemsError) throw itemsError;

      // Calculate stats
      const totalInspections = audits?.length || 0;
      const completedAudits = audits?.filter(a => a.status === 'completed') || [];
      const openNonConformities = failedItems?.length || 0;
      const closedActions = completedAudits.length;
      
      const avgScore = completedAudits.length > 0 
        ? completedAudits.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / completedAudits.length
        : 0;

      setStats({
        totalInspections,
        openNonConformities,
        closedActions,
        complianceRate: Math.round(avgScore),
      });

      // Status distribution
      const planned = audits?.filter(a => a.status === 'planned').length || 0;
      const inProgress = audits?.filter(a => a.status === 'in_progress').length || 0;
      const completed = audits?.filter(a => a.status === 'completed').length || 0;

      setStatusData([
        { name: t('audit.status.planned'), value: planned, color: 'hsl(var(--muted-foreground))' },
        { name: t('audit.status.in_progress'), value: inProgress, color: 'hsl(var(--primary))' },
        { name: t('audit.status.completed'), value: completed, color: 'hsl(var(--chart-2))' },
      ]);

      // Category distribution
      const categoryCount: Record<string, number> = {};
      audits?.forEach(audit => {
        const category = (audit.audit_templates as any)?.category || 'other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      setCategoryData([
        { name: t('audit.categories.safety'), value: categoryCount['safety'] || 0 },
        { name: t('audit.categories.environment'), value: categoryCount['environment'] || 0 },
        { name: t('audit.categories.health'), value: categoryCount['health'] || 0 },
      ]);

      // Recent audits
      const recent = (audits?.slice(0, 5) || []).map(audit => ({
        id: audit.id,
        scheduled_date: audit.scheduled_date,
        status: audit.status,
        score_percentage: audit.score_percentage,
        template_name: (audit.audit_templates as any)?.name || '',
        plant_name: (audit.plants as any)?.name || '',
      }));

      setRecentAudits(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      planned: 'secondary',
      in_progress: 'default',
      completed: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {t(`audit.status.${status}`)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit.kpi.totalInspections')}</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInspections}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit.kpi.openNonConformities')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.openNonConformities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit.kpi.closedActions')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">{stats.closedActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit.kpi.complianceRate')}</CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.complianceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('audit.charts.byStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('audit.charts.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & New Audit Button */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('audit.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudits.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('audit.noData')}</p>
            ) : (
              <div className="space-y-4">
                {recentAudits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{audit.template_name}</p>
                      <p className="text-sm text-muted-foreground">{audit.plant_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(audit.scheduled_date), 'dd MMM yyyy', { 
                          locale: i18n.language === 'pt-BR' ? ptBR : undefined 
                        })}
                      </span>
                      {getStatusBadge(audit.status)}
                      {audit.score_percentage !== null && (
                        <span className="text-sm font-medium">{audit.score_percentage}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col items-center justify-center p-6">
          <ClipboardCheck className="h-12 w-12 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('audit.startNew')}</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {t('audit.startNewDescription')}
          </p>
          <Button onClick={onNewAudit} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('audit.newAudit')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
