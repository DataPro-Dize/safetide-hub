import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Workflow = Tables<'workflows'>;
type Profile = Tables<'profiles'>;

interface WorkflowCardProps {
  workflow: Workflow;
  profiles: Profile[];
  currentUserId?: string;
  onRespond?: () => void;
  onValidate?: () => void;
}

export function WorkflowCard({ 
  workflow, 
  profiles, 
  currentUserId,
  onRespond,
  onValidate 
}: WorkflowCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;

  const responsibleName = profiles.find(p => p.id === workflow.responsible_id)?.name || '-';
  const isResponsible = currentUserId === workflow.responsible_id;
  const canRespond = isResponsible && (workflow.status === 'pending' || workflow.status === 'returned');
  const canValidate = !isResponsible && (workflow.status === 'submitted_completed' || workflow.status === 'submitted_blocked');

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: 'default' as const, className: 'bg-yellow-500 hover:bg-yellow-600', label: t('workflows.status.pending') };
      case 'submitted_completed':
        return { variant: 'default' as const, className: 'bg-blue-500 hover:bg-blue-600', label: t('workflows.status.submitted_completed') };
      case 'submitted_blocked':
        return { variant: 'default' as const, className: 'bg-orange-500 hover:bg-orange-600', label: t('workflows.status.submitted_blocked') };
      case 'approved':
        return { variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600', label: t('workflows.status.approved') };
      case 'returned':
        return { variant: 'default' as const, className: 'bg-red-500 hover:bg-red-600', label: t('workflows.status.returned') };
      default:
        return { variant: 'secondary' as const, className: '', label: status };
    }
  };

  const statusConfig = getStatusConfig(workflow.status);

  return (
    <div className={cn(
      "p-4 bg-muted/50 rounded-lg space-y-3 border-l-4",
      workflow.status === 'pending' && "border-l-yellow-500",
      workflow.status === 'submitted_completed' && "border-l-blue-500",
      workflow.status === 'submitted_blocked' && "border-l-orange-500",
      workflow.status === 'approved' && "border-l-green-500",
      workflow.status === 'returned' && "border-l-red-500"
    )}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium flex-1">{workflow.title}</h4>
        <Badge variant={statusConfig.variant} className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </div>
      
      {workflow.description && (
        <p className="text-sm text-muted-foreground">{workflow.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {responsibleName}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(workflow.created_at), 'PP', { locale: dateLocale })}
        </div>
        {workflow.response_notes && (
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {t('workflows.hasNotes')}
          </div>
        )}
        {workflow.evidence_photos && workflow.evidence_photos.length > 0 && (
          <div className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {workflow.evidence_photos.length} {t('workflows.photos')}
          </div>
        )}
      </div>

      {/* Returned feedback */}
      {workflow.status === 'returned' && workflow.validator_notes && (
        <div className="p-2 bg-red-500/10 rounded text-sm">
          <span className="font-medium text-red-500">{t('workflows.returnedFeedback')}:</span>{' '}
          {workflow.validator_notes}
        </div>
      )}

      {/* Action buttons */}
      {(canRespond || canValidate) && (
        <div className="pt-2 flex gap-2">
          {canRespond && (
            <Button size="sm" variant="brand" onClick={onRespond}>
              {workflow.status === 'returned' ? t('workflows.resubmit') : t('workflows.respond')}
            </Button>
          )}
          {canValidate && (
            <Button size="sm" variant="outline" onClick={onValidate}>
              {t('workflows.validate')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
