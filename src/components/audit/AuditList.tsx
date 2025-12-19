import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { Plus, Eye } from 'lucide-react';
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

export function AuditList({ onNewAudit, onEditAudit }: AuditListProps) {
  const { t, i18n } = useTranslation();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAudits();
  }, [statusFilter]);

  const fetchAudits = async () => {
    try {
      let query = supabase
        .from('audits')
        .select(`
          id,
          scheduled_date,
          status,
          score_percentage,
          audit_templates(name),
          plants(name),
          profiles:auditor_id(name)
        `)
        .order('scheduled_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'planned' | 'in_progress' | 'completed');
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedAudits = (data || []).map(audit => ({
        id: audit.id,
        scheduled_date: audit.scheduled_date,
        status: audit.status,
        score_percentage: audit.score_percentage,
        template_name: (audit.audit_templates as any)?.name || '',
        plant_name: (audit.plants as any)?.name || '',
        auditor_name: (audit.profiles as any)?.name || '',
      }));

      setAudits(formattedAudits);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('common.filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="planned">{t('audit.status.planned')}</SelectItem>
              <SelectItem value="in_progress">{t('audit.status.in_progress')}</SelectItem>
              <SelectItem value="completed">{t('audit.status.completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onNewAudit} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('audit.newAudit')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('audit.auditor')}</TableHead>
              <TableHead>{t('audit.location')}</TableHead>
              <TableHead>{t('audit.type')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('audit.score')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : audits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('audit.noData')}
                </TableCell>
              </TableRow>
            ) : (
              audits.map((audit) => (
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
  );
}
