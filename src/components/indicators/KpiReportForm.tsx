import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Lock, Pencil, Save } from 'lucide-react';
import { EditJustificationModal } from './EditJustificationModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Tables } from '@/integrations/supabase/types';

type KpiReport = Tables<'kpi_reports'>;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

interface FormData {
  horas_trabalhadas_empresa: number;
  horas_trabalhadas_contratados: number;
  horas_treinadas_empresa: number;
  horas_treinadas_contratados: number;
  efetivo_empresa: number;
  efetivo_contratados: number;
  acidente_fatal: number;
  acidente_afastamento: number;
  acidente_restricao_trabalho: number;
  acidente_tratamento_medico: number;
  acidente_prim_socorros: number;
  acidente_veiculos: number;
  quase_acidente: number;
  dias_perdidos: number;
  inspecoes_seg_empresa: number;
  inspecoes_seg_contratados: number;
  safety_walks_empresa: number;
  safety_walks_contratados: number;
  perigos_desvios: number;
  acoes_abertas: number;
  acoes_fechadas: number;
}

const defaultFormData: FormData = {
  horas_trabalhadas_empresa: 0,
  horas_trabalhadas_contratados: 0,
  horas_treinadas_empresa: 0,
  horas_treinadas_contratados: 0,
  efetivo_empresa: 0,
  efetivo_contratados: 0,
  acidente_fatal: 0,
  acidente_afastamento: 0,
  acidente_restricao_trabalho: 0,
  acidente_tratamento_medico: 0,
  acidente_prim_socorros: 0,
  acidente_veiculos: 0,
  quase_acidente: 0,
  dias_perdidos: 0,
  inspecoes_seg_empresa: 0,
  inspecoes_seg_contratados: 0,
  safety_walks_empresa: 0,
  safety_walks_contratados: 0,
  perigos_desvios: 0,
  acoes_abertas: 0,
  acoes_fechadas: 0,
};

export function KpiReportForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [existingReport, setExistingReport] = useState<KpiReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);

  // Buscar grupos empresariais que o usuário tem acesso (Empresa)
  const { data: groups } = useQuery({
    queryKey: ['groups-for-kpi-form'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get companies the user has access to
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id, company:companies(group_id)')
        .eq('user_id', user.id);
      
      if (ucError) throw ucError;
      if (!userCompanies || userCompanies.length === 0) return [];

      const groupIds = [...new Set(userCompanies.map(uc => (uc.company as any)?.group_id).filter(Boolean))];
      
      const { data, error } = await supabase
        .from('corporate_groups')
        .select('id, name')
        .in('id', groupIds)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar empresas/projetos filtradas por grupo (Projeto)
  const { data: companies } = useQuery({
    queryKey: ['companies-for-kpi-form', selectedGroup],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedGroup) return [];

      // Get companies the user has access to in this group
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id);
      
      if (!userCompanies) return [];
      const companyIds = userCompanies.map(uc => uc.company_id);

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, group_id')
        .eq('group_id', selectedGroup)
        .in('id', companyIds)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedGroup,
  });

  // Buscar unidades filtradas por empresa (Unidade)
  const { data: plants } = useQuery({
    queryKey: ['plants-for-kpi-form', selectedCompany],
    queryFn: async () => {
      if (!selectedCompany) return [];

      const { data, error } = await supabase
        .from('plants')
        .select('id, name, company_id')
        .eq('company_id', selectedCompany)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany,
  });

  // Reset em cascata
  useEffect(() => {
    setSelectedCompany('');
    setSelectedPlant('');
  }, [selectedGroup]);

  useEffect(() => {
    setSelectedPlant('');
  }, [selectedCompany]);

  // Fetch existing report
  const { data: report, refetch: refetchReport } = useQuery({
    queryKey: ['kpi-report', selectedPlant, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!selectedPlant) return null;
      
      const { data, error } = await supabase
        .from('kpi_reports')
        .select('*, last_edited_by_profile:profiles!kpi_reports_last_edited_by_fkey(name)')
        .eq('plant_id', selectedPlant)
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPlant,
  });

  // Update form when report changes
  useEffect(() => {
    if (report) {
      setExistingReport(report);
      setFormData({
        horas_trabalhadas_empresa: report.horas_trabalhadas_empresa,
        horas_trabalhadas_contratados: report.horas_trabalhadas_contratados,
        horas_treinadas_empresa: report.horas_treinadas_empresa,
        horas_treinadas_contratados: report.horas_treinadas_contratados,
        efetivo_empresa: report.efetivo_empresa,
        efetivo_contratados: report.efetivo_contratados,
        acidente_fatal: report.acidente_fatal,
        acidente_afastamento: report.acidente_afastamento,
        acidente_restricao_trabalho: report.acidente_restricao_trabalho,
        acidente_tratamento_medico: report.acidente_tratamento_medico,
        acidente_prim_socorros: report.acidente_prim_socorros,
        acidente_veiculos: report.acidente_veiculos,
        quase_acidente: report.quase_acidente,
        dias_perdidos: report.dias_perdidos,
        inspecoes_seg_empresa: report.inspecoes_seg_empresa,
        inspecoes_seg_contratados: report.inspecoes_seg_contratados,
        safety_walks_empresa: report.safety_walks_empresa,
        safety_walks_contratados: report.safety_walks_contratados,
        perigos_desvios: report.perigos_desvios,
        acoes_abertas: report.acoes_abertas,
        acoes_fechadas: report.acoes_fechadas,
      });
      setIsEditing(false);
    } else {
      setExistingReport(null);
      setFormData(defaultFormData);
      setIsEditing(true);
    }
  }, [report]);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Create report mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !selectedPlant) throw new Error('Missing data');

      const { error } = await supabase
        .from('kpi_reports')
        .insert({
          plant_id: selectedPlant,
          year: selectedYear,
          month: selectedMonth,
          created_by: currentUser.id,
          ...formData,
        });

      if (error) {
        // Check for RLS violation
        if (error.code === '42501') {
          throw new Error(t('indicators.errors.noPermission'));
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: t('indicators.createSuccess') });
      queryClient.invalidateQueries({ queryKey: ['kpi-report'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-reports'] });
      refetchReport();
    },
    onError: (error: Error) => {
      toast({ 
        title: t('common.error'), 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update report mutation
  const updateMutation = useMutation({
    mutationFn: async (justification: string) => {
      if (!currentUser || !existingReport) throw new Error('Missing data');

      // First, create audit log
      const oldValues = {
        horas_trabalhadas_empresa: existingReport.horas_trabalhadas_empresa,
        horas_trabalhadas_contratados: existingReport.horas_trabalhadas_contratados,
        horas_treinadas_empresa: existingReport.horas_treinadas_empresa,
        horas_treinadas_contratados: existingReport.horas_treinadas_contratados,
        efetivo_empresa: existingReport.efetivo_empresa,
        efetivo_contratados: existingReport.efetivo_contratados,
        acidente_fatal: existingReport.acidente_fatal,
        acidente_afastamento: existingReport.acidente_afastamento,
        acidente_restricao_trabalho: existingReport.acidente_restricao_trabalho,
        acidente_tratamento_medico: existingReport.acidente_tratamento_medico,
        acidente_prim_socorros: existingReport.acidente_prim_socorros,
        acidente_veiculos: existingReport.acidente_veiculos,
        quase_acidente: existingReport.quase_acidente,
        dias_perdidos: existingReport.dias_perdidos,
        inspecoes_seg_empresa: existingReport.inspecoes_seg_empresa,
        inspecoes_seg_contratados: existingReport.inspecoes_seg_contratados,
        safety_walks_empresa: existingReport.safety_walks_empresa,
        safety_walks_contratados: existingReport.safety_walks_contratados,
        perigos_desvios: existingReport.perigos_desvios,
        acoes_abertas: existingReport.acoes_abertas,
        acoes_fechadas: existingReport.acoes_fechadas,
      };

      const { error: auditError } = await supabase
        .from('kpi_audit_logs')
        .insert([{
          report_id: existingReport.id,
          old_values: oldValues as any,
          new_values: formData as any,
          change_reason: justification,
          changed_by: currentUser.id,
        }]);

      if (auditError) throw auditError;

      // Then update the report
      const { error } = await supabase
        .from('kpi_reports')
        .update({
          ...formData,
          edit_count: existingReport.edit_count + 1,
          last_edit_reason: justification,
          last_edited_by: currentUser.id,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('indicators.updateSuccess') });
      queryClient.invalidateQueries({ queryKey: ['kpi-report'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-reports'] });
      setIsEditing(false);
      setShowJustificationModal(false);
      refetchReport();
    },
    onError: (error: Error) => {
      toast({ 
        title: t('common.error'), 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseInt(value) || 0,
    }));
  };

  const handleSave = () => {
    if (existingReport) {
      setShowJustificationModal(true);
    } else {
      createMutation.mutate();
    }
  };

  const handleJustificationConfirm = (justification: string) => {
    updateMutation.mutate(justification);
  };

  const canEdit = existingReport ? existingReport.edit_count < 1 : true;
  const isReadOnly = existingReport && !isEditing;

  // Calculate totals
  const totalHHT = formData.horas_trabalhadas_empresa + formData.horas_trabalhadas_contratados;
  const totalAccidents = formData.acidente_fatal + formData.acidente_afastamento + 
    formData.acidente_restricao_trabalho + formData.acidente_tratamento_medico;
  const frequencyRate = totalHHT > 0 ? ((totalAccidents * 1000000) / totalHHT).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Selectors - Empresa > Projeto > Unidade */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>{t('indicators.selectPeriod')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>{t('indicators.dashboard.company')}</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder={t('indicators.dashboard.selectCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('indicators.dashboard.project')}</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={!selectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder={t('indicators.dashboard.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('indicators.dashboard.unit')}</Label>
              <Select value={selectedPlant} onValueChange={setSelectedPlant} disabled={!selectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder={t('indicators.dashboard.selectUnit')} />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('indicators.year')}</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
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
              <Label>{t('indicators.month')}</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {t(`indicators.months.${month}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alert */}
      {existingReport && (
        <Alert variant={existingReport.edit_count > 0 ? 'default' : 'default'} 
          className={existingReport.edit_count > 0 ? 'border-amber-500 bg-amber-500/10' : ''}>
          {existingReport.edit_count > 0 ? (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-500">{t('indicators.edited')}</AlertTitle>
              <AlertDescription>
                {t('indicators.editedBy', { 
                  name: (existingReport as any).last_edited_by_profile?.name || t('trainings.unknown'),
                  date: existingReport.last_edited_at 
                    ? new Date(existingReport.last_edited_at).toLocaleDateString() 
                    : '',
                })}
                <br />
                <strong>{t('indicators.reason')}:</strong> {existingReport.last_edit_reason}
              </AlertDescription>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <AlertTitle>{t('indicators.originalRecord')}</AlertTitle>
              <AlertDescription>
                {t('indicators.canEditOnce')}
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {!selectedPlant && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('indicators.selectPlantFirst')}</AlertDescription>
        </Alert>
      )}

      {selectedPlant && (
        <>
          {/* Calculated KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('indicators.calc.totalHHT')}</div>
                <div className="text-2xl font-bold">{totalHHT.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('indicators.calc.totalAccidents')}</div>
                <div className="text-2xl font-bold">{totalAccidents}</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('indicators.calc.frequencyRate')}</div>
                <div className="text-2xl font-bold">{frequencyRate}</div>
              </CardContent>
            </Card>
          </div>

          {/* Form Sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hours Worked */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-base">{t('indicators.sections.hoursWorked')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.horasEmpresa')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.horas_trabalhadas_empresa}
                      onChange={(e) => handleInputChange('horas_trabalhadas_empresa', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.horasContratados')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.horas_trabalhadas_contratados}
                      onChange={(e) => handleInputChange('horas_trabalhadas_contratados', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.horasTreinadasEmpresa')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.horas_treinadas_empresa}
                      onChange={(e) => handleInputChange('horas_treinadas_empresa', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.horasTreinadasContratados')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.horas_treinadas_contratados}
                      onChange={(e) => handleInputChange('horas_treinadas_contratados', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workforce */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-base">{t('indicators.sections.workforce')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.efetivoEmpresa')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.efetivo_empresa}
                      onChange={(e) => handleInputChange('efetivo_empresa', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.efetivoContratados')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.efetivo_contratados}
                      onChange={(e) => handleInputChange('efetivo_contratados', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accidents */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-base">{t('indicators.sections.accidents')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acidenteFatal')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acidente_fatal}
                      onChange={(e) => handleInputChange('acidente_fatal', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acidenteAfastamento')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acidente_afastamento}
                      onChange={(e) => handleInputChange('acidente_afastamento', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acidenteRestricao')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acidente_restricao_trabalho}
                      onChange={(e) => handleInputChange('acidente_restricao_trabalho', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acidenteTratamento')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acidente_tratamento_medico}
                      onChange={(e) => handleInputChange('acidente_tratamento_medico', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acidentePrimSocorros')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acidente_prim_socorros}
                      onChange={(e) => handleInputChange('acidente_prim_socorros', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acidenteVeiculos')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acidente_veiculos}
                      onChange={(e) => handleInputChange('acidente_veiculos', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.quaseAcidente')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.quase_acidente}
                      onChange={(e) => handleInputChange('quase_acidente', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.diasPerdidos')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.dias_perdidos}
                      onChange={(e) => handleInputChange('dias_perdidos', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safety Activities */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-base">{t('indicators.sections.safetyActivities')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.inspecoesEmpresa')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.inspecoes_seg_empresa}
                      onChange={(e) => handleInputChange('inspecoes_seg_empresa', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.inspecoesContratados')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.inspecoes_seg_contratados}
                      onChange={(e) => handleInputChange('inspecoes_seg_contratados', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.safetyWalksEmpresa')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.safety_walks_empresa}
                      onChange={(e) => handleInputChange('safety_walks_empresa', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.safetyWalksContratados')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.safety_walks_contratados}
                      onChange={(e) => handleInputChange('safety_walks_contratados', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.perigosDesvios')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.perigos_desvios}
                      onChange={(e) => handleInputChange('perigos_desvios', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acoesAbertas')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acoes_abertas}
                      onChange={(e) => handleInputChange('acoes_abertas', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('indicators.fields.acoesFechadas')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.acoes_fechadas}
                      onChange={(e) => handleInputChange('acoes_fechadas', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {existingReport && !isEditing && canEdit && (
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                {t('indicators.editReport')}
              </Button>
            )}
            {existingReport && !canEdit && (
              <Badge variant="secondary" className="py-2 px-4">
                <Lock className="h-4 w-4 mr-2" />
                {t('indicators.editLocked')}
              </Badge>
            )}
            {isEditing && (
              <Button 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {existingReport ? t('indicators.saveChanges') : t('indicators.createReport')}
              </Button>
            )}
          </div>
        </>
      )}

      <EditJustificationModal
        open={showJustificationModal}
        onOpenChange={setShowJustificationModal}
        onConfirm={handleJustificationConfirm}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
