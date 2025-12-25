import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

// Period options for filtering
const periodOptions = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'month', label: 'Mensal' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'year', label: 'Anual' },
];

export function KpiReportsList() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['kpi-reports-list', selectedYear],
    queryFn: async () => {
      let query = supabase
        .from('kpi_reports')
        .select(`
          *,
          plant:plants(name, company:companies(name)),
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
    
    // Period filter logic
    let matchesPeriod = true;
    if (periodFilter === 'quarter') {
      // Show only first month of each quarter
      matchesPeriod = [1, 4, 7, 10].includes(report.month);
    } else if (periodFilter === 'semester') {
      // Show only first month of each semester
      matchesPeriod = [1, 7].includes(report.month);
    } else if (periodFilter === 'year') {
      // Show only December (year summary)
      matchesPeriod = report.month === 12;
    }
    
    return matchesSearch && matchesPeriod;
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

  return (
    <Card className="bg-card">
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
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('indicators.list.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-32">
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

        {/* Table */}
        <div className="rounded-md border">
          <Table>
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
