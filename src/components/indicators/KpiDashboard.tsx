import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  FileCheck,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  HardHat,
  Footprints,
  ClipboardCheck,
  ChevronDown,
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
  Legend,
  ComposedChart,
  Area,
} from 'recharts';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);

export function KpiDashboard() {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPlant, setSelectedPlant] = useState<string>('all');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies-for-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch plants
  const { data: plants } = useQuery({
    queryKey: ['plants-for-dashboard', selectedCompany],
    queryFn: async () => {
      let query = supabase.from('plants').select('id, name, company_id');
      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reports for the selected year
  const { data: reports } = useQuery({
    queryKey: ['kpi-reports-dashboard', selectedYear, selectedCompany, selectedPlant, selectedMonths],
    queryFn: async () => {
      let query = supabase
        .from('kpi_reports')
        .select('*, plant:plants(id, name, company_id, company:companies(id, name))')
        .eq('year', selectedYear);
      
      // Filter by selected months if any are selected
      if (selectedMonths.length > 0 && selectedMonths.length < 12) {
        query = query.in('month', selectedMonths);
      }
      
      if (selectedPlant !== 'all') {
        query = query.eq('plant_id', selectedPlant);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by company if selected
      if (selectedCompany !== 'all') {
        return (data || []).filter((r: any) => r.plant?.company_id === selectedCompany);
      }
      
      return data || [];
    },
  });

  // Calculate consolidated metrics
  const metrics = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        totalHHT: 0,
        totalHHTR: 0,
        totalWorkforce: 0,
        totalAccidents: 0,
        fatalAccidents: 0,
        lostTimeAccidents: 0,
        restrictedAccidents: 0,
        medicalTreatment: 0,
        firstAid: 0,
        nearMisses: 0,
        lostDays: 0,
        inspectionsCompany: 0,
        inspectionsContractors: 0,
        safetyWalksCompany: 0,
        safetyWalksContractors: 0,
        hazardsDeviations: 0,
        actionsOpen: 0,
        actionsClosed: 0,
        tf: 0,
        tg: 0,
        ltir: 0,
        trir: 0,
      };
    }

    const totalHHTEmpresa = reports.reduce((sum, r) => sum + (r.horas_trabalhadas_empresa || 0), 0);
    const totalHHTContratados = reports.reduce((sum, r) => sum + (r.horas_trabalhadas_contratados || 0), 0);
    const totalHHT = totalHHTEmpresa + totalHHTContratados;

    const totalHHTRempresa = reports.reduce((sum, r) => sum + (r.horas_treinadas_empresa || 0), 0);
    const totalHHTRcontratados = reports.reduce((sum, r) => sum + (r.horas_treinadas_contratados || 0), 0);
    const totalHHTR = totalHHTRempresa + totalHHTRcontratados;

    const efetivoEmpresa = reports.reduce((sum, r) => sum + (r.efetivo_empresa || 0), 0);
    const efetivoContratados = reports.reduce((sum, r) => sum + (r.efetivo_contratados || 0), 0);
    const totalWorkforce = Math.round((efetivoEmpresa + efetivoContratados) / (reports.length || 1));

    const fatalAccidents = reports.reduce((sum, r) => sum + (r.acidente_fatal || 0), 0);
    const lostTimeAccidents = reports.reduce((sum, r) => sum + (r.acidente_afastamento || 0), 0);
    const restrictedAccidents = reports.reduce((sum, r) => sum + (r.acidente_restricao_trabalho || 0), 0);
    const medicalTreatment = reports.reduce((sum, r) => sum + (r.acidente_tratamento_medico || 0), 0);
    const firstAid = reports.reduce((sum, r) => sum + (r.acidente_prim_socorros || 0), 0);
    const nearMisses = reports.reduce((sum, r) => sum + (r.quase_acidente || 0), 0);
    const lostDays = reports.reduce((sum, r) => sum + (r.dias_perdidos || 0), 0);

    const totalAccidents = fatalAccidents + lostTimeAccidents + restrictedAccidents + medicalTreatment;

    const inspectionsCompany = reports.reduce((sum, r) => sum + (r.inspecoes_seg_empresa || 0), 0);
    const inspectionsContractors = reports.reduce((sum, r) => sum + (r.inspecoes_seg_contratados || 0), 0);
    const safetyWalksCompany = reports.reduce((sum, r) => sum + (r.safety_walks_empresa || 0), 0);
    const safetyWalksContractors = reports.reduce((sum, r) => sum + (r.safety_walks_contratados || 0), 0);
    const hazardsDeviations = reports.reduce((sum, r) => sum + (r.perigos_desvios || 0), 0);
    const actionsOpen = reports.reduce((sum, r) => sum + (r.acoes_abertas || 0), 0);
    const actionsClosed = reports.reduce((sum, r) => sum + (r.acoes_fechadas || 0), 0);

    // Safety Rates
    // TF (Taxa de Frequência) = (Acidentes com afastamento × 1.000.000) / HHT
    const tf = totalHHT > 0 ? ((lostTimeAccidents * 1000000) / totalHHT) : 0;
    
    // TG (Taxa de Gravidade) = (Dias perdidos × 1.000.000) / HHT
    const tg = totalHHT > 0 ? ((lostDays * 1000000) / totalHHT) : 0;
    
    // LTIR (Lost Time Injury Rate) = (Acidentes com afastamento × 200.000) / HHT
    const ltir = totalHHT > 0 ? ((lostTimeAccidents * 200000) / totalHHT) : 0;
    
    // TRIR (Total Recordable Incident Rate) = (Total acidentes registráveis × 200.000) / HHT
    const trir = totalHHT > 0 ? ((totalAccidents * 200000) / totalHHT) : 0;

    return {
      totalHHT,
      totalHHTR,
      totalWorkforce,
      totalAccidents,
      fatalAccidents,
      lostTimeAccidents,
      restrictedAccidents,
      medicalTreatment,
      firstAid,
      nearMisses,
      lostDays,
      inspectionsCompany,
      inspectionsContractors,
      safetyWalksCompany,
      safetyWalksContractors,
      hazardsDeviations,
      actionsOpen,
      actionsClosed,
      tf,
      tg,
      ltir,
      trir,
    };
  }, [reports]);

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    const monthsToShow = selectedMonths.length > 0 && selectedMonths.length < 12 
      ? selectedMonths 
      : allMonths;

    return monthsToShow.map((monthNum) => {
      const monthReports = reports?.filter(r => r.month === monthNum) || [];
      
      const hhtEmpresa = monthReports.reduce((sum, r) => sum + (r.horas_trabalhadas_empresa || 0), 0);
      const hhtContratados = monthReports.reduce((sum, r) => sum + (r.horas_trabalhadas_contratados || 0), 0);
      const totalHHT = hhtEmpresa + hhtContratados;

      const hhtrEmpresa = monthReports.reduce((sum, r) => sum + (r.horas_treinadas_empresa || 0), 0);
      const hhtrContratados = monthReports.reduce((sum, r) => sum + (r.horas_treinadas_contratados || 0), 0);
      const totalHHTR = hhtrEmpresa + hhtrContratados;

      const lostTimeAccidents = monthReports.reduce((sum, r) => sum + (r.acidente_afastamento || 0), 0);
      const totalAccidents = monthReports.reduce((sum, r) => 
        sum + (r.acidente_fatal || 0) + (r.acidente_afastamento || 0) + 
        (r.acidente_restricao_trabalho || 0) + (r.acidente_tratamento_medico || 0), 0);
      const lostDays = monthReports.reduce((sum, r) => sum + (r.dias_perdidos || 0), 0);

      const tf = totalHHT > 0 ? ((lostTimeAccidents * 1000000) / totalHHT) : 0;
      const tg = totalHHT > 0 ? ((lostDays * 1000000) / totalHHT) : 0;

      const inspections = monthReports.reduce((sum, r) => 
        sum + (r.inspecoes_seg_empresa || 0) + (r.inspecoes_seg_contratados || 0), 0);
      const safetyWalks = monthReports.reduce((sum, r) => 
        sum + (r.safety_walks_empresa || 0) + (r.safety_walks_contratados || 0), 0);
      const deviations = monthReports.reduce((sum, r) => sum + (r.perigos_desvios || 0), 0);
      
      return {
        month: t(`indicators.months.${monthNum}`).substring(0, 3),
        monthFull: t(`indicators.months.${monthNum}`),
        hht: totalHHT,
        hhtr: totalHHTR,
        tf,
        tg,
        accidents: totalAccidents,
        inspections,
        safetyWalks,
        deviations,
      };
    });
  }, [reports, selectedMonths, t]);

  // Progress indicators with targets
  const progressIndicators = [
    {
      label: t('indicators.dashboard.inspectionsTarget', 'Inspeções Realizadas'),
      current: metrics.inspectionsCompany + metrics.inspectionsContractors,
      target: 1000,
      color: 'bg-secondary',
    },
    {
      label: t('indicators.dashboard.safetyWalksTarget', 'Safety Walks Realizados'),
      current: metrics.safetyWalksCompany + metrics.safetyWalksContractors,
      target: 500,
      color: 'bg-primary',
    },
    {
      label: t('indicators.dashboard.deviationsIdentified', 'Desvios Identificados'),
      current: metrics.hazardsDeviations,
      target: 800,
      color: 'bg-secondary',
    },
    {
      label: t('indicators.dashboard.actionsClosureRate', 'Taxa de Fechamento de Ações'),
      current: metrics.actionsClosed,
      target: metrics.actionsOpen + metrics.actionsClosed,
      color: 'bg-green-500',
      isPercentage: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('indicators.dashboard.period', 'Período')}</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('indicators.dashboard.months', 'Meses')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background font-normal">
                    {selectedMonths.length === 0 || selectedMonths.length === 12
                      ? t('common.all')
                      : `${selectedMonths.length} ${t('indicators.dashboard.monthsSelected', 'meses')}`
                    }
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b pb-2 mb-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => setSelectedMonths([])}
                      >
                        {t('common.all')}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedMonths([...allMonths])}
                      >
                        {t('indicators.dashboard.selectAll', 'Selecionar Todos')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {allMonths.map((month) => (
                        <div key={month} className="flex items-center space-x-2">
                          <Checkbox
                            id={`month-${month}`}
                            checked={selectedMonths.includes(month)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMonths([...selectedMonths, month].sort((a, b) => a - b));
                              } else {
                                setSelectedMonths(selectedMonths.filter(m => m !== month));
                              }
                            }}
                          />
                          <label htmlFor={`month-${month}`} className="text-sm cursor-pointer">
                            {t(`indicators.months.${month}`).substring(0, 3)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('indicators.dashboard.company', 'Empresa')}</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('indicators.dashboard.unit', 'Unidade/Contrato')}</Label>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {plants?.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-xs text-muted-foreground">
                {reports?.length || 0} {t('indicators.dashboard.reportsFound', 'apontamentos encontrados')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPI Cards - Row 1 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">HHT</span>
            </div>
            <div className="text-xl font-bold">{metrics.totalHHT.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">HHTR</span>
            </div>
            <div className="text-xl font-bold">{metrics.totalHHTR.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('indicators.dashboard.workforce', 'Efetivo')}</span>
            </div>
            <div className="text-xl font-bold">{metrics.totalWorkforce.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('indicators.dashboard.accidents', 'Acidentes')}</span>
            </div>
            <div className="text-xl font-bold">{metrics.totalAccidents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('indicators.dashboard.inspections', 'Inspeções')}</span>
            </div>
            <div className="text-xl font-bold">{(metrics.inspectionsCompany + metrics.inspectionsContractors).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Footprints className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('indicators.dashboard.safetyWalks', 'Safety Walks')}</span>
            </div>
            <div className="text-xl font-bold">{(metrics.safetyWalksCompany + metrics.safetyWalksContractors).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('indicators.dashboard.deviations', 'Desvios')}</span>
            </div>
            <div className="text-xl font-bold">{metrics.hazardsDeviations.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 opacity-80" />
              <span className="text-xs opacity-80">{t('indicators.dashboard.actionsClosed', 'Ações Fechadas')}</span>
            </div>
            <div className="text-xl font-bold">{metrics.actionsClosed.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Safety Rates Cards - Row 2 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">TF</div>
                <div className="text-sm text-muted-foreground">{t('indicators.dashboard.frequencyRate', 'Taxa de Frequência')}</div>
              </div>
              <TrendingDown className="h-5 w-5 text-secondary" />
            </div>
            <div className="mt-2 text-3xl font-bold text-secondary">{metrics.tf.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">TG</div>
                <div className="text-sm text-muted-foreground">{t('indicators.dashboard.severityRate', 'Taxa de Gravidade')}</div>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">{metrics.tg.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">LTIR</div>
                <div className="text-sm text-muted-foreground">{t('indicators.dashboard.ltir', 'Lost Time Injury Rate')}</div>
              </div>
              <Activity className="h-5 w-5 text-secondary" />
            </div>
            <div className="mt-2 text-3xl font-bold text-secondary">{metrics.ltir.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">TRIR</div>
                <div className="text-sm text-muted-foreground">{t('indicators.dashboard.trir', 'Total Recordable Incident Rate')}</div>
              </div>
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div className="mt-2 text-3xl font-bold text-destructive">{metrics.trir.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly HHT & HHTR Chart */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('indicators.dashboard.monthlyHHTHHTR', 'HHT & HHTR Mensal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label, payload) => {
                      const item = monthlyData.find(d => d.month === label);
                      return item?.monthFull || label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="hht" name="HHT" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hhtr" name="HHTR" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Safety Rates Trend Chart */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('indicators.dashboard.safetyRatesTrend', 'Tendência TF & TG')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label, payload) => {
                      const item = monthlyData.find(d => d.month === label);
                      return item?.monthFull || label;
                    }}
                    formatter={(value: number) => value.toFixed(2)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tf" 
                    name="TF"
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--secondary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tg" 
                    name="TG"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Indicators Section */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('indicators.dashboard.performanceIndicators', 'Indicadores de Performance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {progressIndicators.map((indicator, index) => {
              const percentage = indicator.target > 0 
                ? Math.min((indicator.current / indicator.target) * 100, 100) 
                : 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{indicator.label}</span>
                    <span className="font-medium">
                      {indicator.isPercentage 
                        ? `${percentage.toFixed(1)}%`
                        : `${indicator.current.toLocaleString()} / ${indicator.target.toLocaleString()}`
                      }
                    </span>
                  </div>
                  <Progress value={percentage} className="h-3" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accident Details Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white">
          <CardContent className="p-4 text-center">
            <div className="text-xs opacity-80 mb-1">{t('indicators.dashboard.fatalAccidents', 'Fatais')}</div>
            <div className="text-2xl font-bold">{metrics.fatalAccidents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 text-center">
            <div className="text-xs opacity-80 mb-1">{t('indicators.dashboard.lostTimeAccidents', 'C/ Afastamento')}</div>
            <div className="text-2xl font-bold">{metrics.lostTimeAccidents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-4 text-center">
            <div className="text-xs opacity-80 mb-1">{t('indicators.dashboard.restrictedAccidents', 'C/ Restrição')}</div>
            <div className="text-2xl font-bold">{metrics.restrictedAccidents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground">
          <CardContent className="p-4 text-center">
            <div className="text-xs opacity-80 mb-1">{t('indicators.dashboard.medicalTreatment', 'Trat. Médico')}</div>
            <div className="text-2xl font-bold">{metrics.medicalTreatment}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4 text-center">
            <div className="text-xs opacity-80 mb-1">{t('indicators.dashboard.firstAid', 'Primeiros Socorros')}</div>
            <div className="text-2xl font-bold">{metrics.firstAid}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardContent className="p-4 text-center">
            <div className="text-xs opacity-80 mb-1">{t('indicators.dashboard.nearMisses', 'Quase Acidentes')}</div>
            <div className="text-2xl font-bold">{metrics.nearMisses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Inspections & Activities Chart */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('indicators.dashboard.monthlyActivities', 'Atividades de Segurança Mensais')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label, payload) => {
                    const item = monthlyData.find(d => d.month === label);
                    return item?.monthFull || label;
                  }}
                />
                <Legend />
                <Bar dataKey="inspections" name={t('indicators.dashboard.inspections', 'Inspeções')} fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="safetyWalks" name={t('indicators.dashboard.safetyWalks', 'Safety Walks')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deviations" name={t('indicators.dashboard.deviations', 'Desvios')} fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
