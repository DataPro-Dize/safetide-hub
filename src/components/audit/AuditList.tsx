import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditListProps {
  onNewAudit: () => void;
  onEditAudit: (auditId: string) => void;
}

interface Audit {
  id: string;
  scheduled_date: string;
  status: string;
  score_percentage: number | null;
  template_name: string;
  plant_name: string;
  auditor_name: string;
}

export function AuditList({ onEditAudit }: AuditListProps) {
  const { t, i18n } = useTranslation();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchDate, setSearchDate] = useState('');
  const [searchAuditor, setSearchAuditor] = useState('');
  const [searchPlant, setSearchPlant] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          id,
          scheduled_date,
          status,
          score_percentage,
          auditor_id,
          audit_templates(name),
          plants(name)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      // Fetch auditor names separately
      const auditorIds = [...new Set((data || []).map(a => a.auditor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', auditorIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const formattedAudits = (data || []).map(audit => ({
        id: audit.id,
        scheduled_date: audit.scheduled_date,
        status: audit.status,
        score_percentage: audit.score_percentage,
        template_name: (audit.audit_templates as any)?.name || '',
        plant_name: (audit.plants as any)?.name || '',
        auditor_name: profilesMap.get(audit.auditor_id) || '',
      }));

      setAudits(formattedAudits);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter audits
  const filteredAudits = useMemo(() => {
    return audits.filter(audit => {
      // Status filter
      if (statusFilter !== 'all' && audit.status !== statusFilter) return false;
      
      // Date filter
      if (searchDate) {
        const formattedDate = format(new Date(audit.scheduled_date), 'dd/MM/yyyy');
        if (!formattedDate.includes(searchDate)) return false;
      }
      
      // Auditor filter
      if (searchAuditor && !audit.auditor_name.toLowerCase().includes(searchAuditor.toLowerCase())) return false;
      
      // Plant filter
      if (searchPlant && !audit.plant_name.toLowerCase().includes(searchPlant.toLowerCase())) return false;
      
      // Template filter
      if (searchTemplate && !audit.template_name.toLowerCase().includes(searchTemplate.toLowerCase())) return false;
      
      return true;
    });
  }, [audits, statusFilter, searchDate, searchAuditor, searchPlant, searchTemplate]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
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

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-chart-2';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              {/* Header row */}
              <TableRow className="bg-muted/50">
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('audit.auditor')}</TableHead>
                <TableHead>{t('audit.location')}</TableHead>
                <TableHead>{t('audit.type')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('audit.score')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
              {/* Filter row */}
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="py-2">
                  <Input
                    placeholder="dd/mm/aaaa"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2">
                  <Input
                    placeholder={t('common.search')}
                    value={searchAuditor}
                    onChange={(e) => setSearchAuditor(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2">
                  <Input
                    placeholder={t('common.search')}
                    value={searchPlant}
                    onChange={(e) => setSearchPlant(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2">
                  <Input
                    placeholder={t('common.search')}
                    value={searchTemplate}
                    onChange={(e) => setSearchTemplate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      <SelectItem value="planned">{t('audit.status.planned')}</SelectItem>
                      <SelectItem value="in_progress">{t('audit.status.in_progress')}</SelectItem>
                      <SelectItem value="completed">{t('audit.status.completed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('audit.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAudits.map((audit) => (
                  <TableRow key={audit.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      {format(new Date(audit.scheduled_date), 'dd/MM/yyyy', {
                        locale: i18n.language === 'pt-BR' ? ptBR : undefined,
                      })}
                    </TableCell>
                    <TableCell>{audit.auditor_name}</TableCell>
                    <TableCell>{audit.plant_name}</TableCell>
                    <TableCell>{audit.template_name}</TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell>
                      <span className={getScoreColor(audit.score_percentage)}>
                        {audit.score_percentage !== null ? `${audit.score_percentage}%` : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAudit(audit.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
