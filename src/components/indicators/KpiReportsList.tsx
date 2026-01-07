import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Search, FileWarning, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function KpiReportsList() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPlant, setSelectedPlant] = useState<string>('all');

  // Buscar grupos empresariais (Empresa)
  const { data: groups } = useQuery({
    queryKey: ['groups-for-kpi-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('corporate_groups').select('id, name').order('name');
      return data || [];
    },
  });

  // Buscar empresas/projetos filtradas por grupo (Projeto)
  const { data: companies } = useQuery({
    queryKey: ['companies-for-kpi-reports', selectedGroup],
    queryFn: async () => {
      let query = supabase.from('companies').select('id, name, group_id').order('name');
      if (selectedGroup !== 'all') {
        query = query.eq('group_id', selectedGroup);
      }
      const { data } = await query;
      return data || [];
    },
  });

  // Buscar unidades filtradas por empresa (Unidade)
  const { data: plants } = useQuery({
    queryKey: ['plants-for-kpi-reports', selectedCompany],
    queryFn: async () => {
      let query = supabase.from('plants').select('id, name, company_id').order('name');
      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ['kpi-reports-list', selectedYear],
    queryFn: async () => {
      let query = supabase
        .from('kpi_reports')
        .select(`
          *,
          plant:plants(name, company_id, company:companies(name, group_id)),
          created_by_profile:profiles!kpi_reports_created_by_fkey(name),
          last_edited_by_profile:profiles!kpi_reports_last_edited_by_fkey(name)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (selectedYear !== 'all') {
        query = query.eq('year', parseInt(selectedYear));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredReports = reports?.filter((report) => {
    const plantName = report.plant?.name?.toLowerCase() || '';
    const companyName = report.plant?.company?.name?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = plantName.includes(search) || companyName.includes(search);
    
    // Filtro por grupo (Empresa)
    const companyGroupId = (report.plant?.company as any)?.group_id;
    const matchesGroup = selectedGroup === 'all' || companyGroupId === selectedGroup;
    
    // Filtro por empresa (Projeto)
    const matchesCompany = selectedCompany === 'all' || report.plant?.company_id === selectedCompany;
    
    // Filtro por unidade
    const matchesPlant = selectedPlant === 'all' || report.plant_id === selectedPlant;
    
    return matchesSearch && matchesGroup && matchesCompany && matchesPlant;
  });

  const handleExport = () => {
    if (!filteredReports?.length) return;

    const exportData = filteredReports.map((report) => ({
      [t('indicators.export.project')]: report.plant?.company?.name || '',
      [t('indicators.export.plant')]: report.plant?.name || '',
      [t('indicators.export.year')]: report.year,
      [t('indicators.export.month')]: t(`indicators.months.${report.month}`),
      [t('indicators.export.status')]: report.edit_count > 0 
        ? t('indicators.status.edited') 
        : t('indicators.status.original'),
      [t('indicators.fields.horasEmpresa')]: report.horas_trabalhadas_empresa,
      [t('indicators.fields.horasContratados')]: report.horas_trabalhadas_contratados,
      [t('indicators.fields.horasTreinadasEmpresa')]: report.horas_treinadas_empresa,
      [t('indicators.fields.horasTreinadasContratados')]: report.horas_treinadas_contratados,
      [t('indicators.fields.efetivoEmpresa')]: report.efetivo_empresa,
      [t('indicators.fields.efetivoContratados')]: report.efetivo_contratados,
      [t('indicators.fields.acidenteFatal')]: report.acidente_fatal,
      [t('indicators.fields.acidenteAfastamento')]: report.acidente_afastamento,
      [t('indicators.fields.acidenteRestricao')]: report.acidente_restricao_trabalho,
      [t('indicators.fields.acidenteTratamento')]: report.acidente_tratamento_medico,
      [t('indicators.fields.acidentePrimSocorros')]: report.acidente_prim_socorros,
      [t('indicators.fields.acidenteVeiculos')]: report.acidente_veiculos,
      [t('indicators.fields.quaseAcidente')]: report.quase_acidente,
      [t('indicators.fields.diasPerdidos')]: report.dias_perdidos,
      [t('indicators.fields.inspecoesEmpresa')]: report.inspecoes_seg_empresa,
      [t('indicators.fields.inspecoesContratados')]: report.inspecoes_seg_contratados,
      [t('indicators.fields.safetyWalksEmpresa')]: report.safety_walks_empresa,
      [t('indicators.fields.safetyWalksContratados')]: report.safety_walks_contratados,
      [t('indicators.fields.perigosDesvios')]: report.perigos_desvios,
      [t('indicators.fields.acoesAbertas')]: report.acoes_abertas,
      [t('indicators.fields.acoesFechadas')]: report.acoes_fechadas,
      [t('indicators.export.createdBy')]: report.created_by_profile?.name || '',
      [t('indicators.export.createdAt')]: new Date(report.created_at).toLocaleDateString(),
      [t('indicators.export.editReason')]: report.last_edit_reason || '',
      [t('indicators.export.editedBy')]: report.last_edited_by_profile?.name || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Reports');
    
    const fileName = `kpi_reports_${selectedYear === 'all' ? 'all' : selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Reset em cascata
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    setSelectedCompany('all');
    setSelectedPlant('all');
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value);
    setSelectedPlant('all');
  };

  return (
    <Card className="bg-card overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t('indicators.list.title')}</CardTitle>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {t('indicators.list.export')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros Padronizados: Empresa > Projeto > Unidade */}
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('indicators.dashboard.period')}</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('indicators.dashboard.company')}</Label>
            <Select value={selectedGroup} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('indicators.dashboard.selectCompany')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {groups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('indicators.dashboard.project')}</Label>
            <Select value={selectedCompany} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('indicators.dashboard.selectProject')} />
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
            <Label className="text-sm font-medium">{t('indicators.dashboard.unit')}</Label>
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger>
                <SelectValue placeholder={t('indicators.dashboard.selectUnit')} />
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('indicators.list.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('indicators.list.project')}</TableHead>
                <TableHead>{t('indicators.list.plant')}</TableHead>
                <TableHead>{t('indicators.list.period')}</TableHead>
                <TableHead className="text-right">{t('indicators.list.hht')}</TableHead>
                <TableHead className="text-right">{t('indicators.list.accidents')}</TableHead>
                <TableHead>{t('indicators.list.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredReports?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('indicators.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports?.map((report) => {
                  const totalHHT = report.horas_trabalhadas_empresa + report.horas_trabalhadas_contratados;
                  const totalAccidents = report.acidente_fatal + report.acidente_afastamento + 
                    report.acidente_restricao_trabalho + report.acidente_tratamento_medico;
                  
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.plant?.company?.name || '-'}
                      </TableCell>
                      <TableCell>{report.plant?.name || '-'}</TableCell>
                      <TableCell>
                        {t(`indicators.months.${report.month}`)} / {report.year}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {totalHHT.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {totalAccidents}
                      </TableCell>
                      <TableCell>
                        {report.edit_count > 0 ? (
                          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500">
                            <FileWarning className="h-3 w-3" />
                            {t('indicators.status.edited')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
                            <Check className="h-3 w-3" />
                            {t('indicators.status.original')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}