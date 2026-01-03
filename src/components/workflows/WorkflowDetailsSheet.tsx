import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { User, Calendar, Clock, MessageSquare, Image, RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Workflow = Tables<'workflows'>;
type Profile = Tables<'profiles'>;

interface WorkflowHistory {
  id: string;
  workflow_id: string;
  action: string;
  notes: string | null;
  photos: string[];
  performed_by: string;
  created_at: string;
}

interface WorkflowDetailsSheetProps {
  workflow: Workflow | null;
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkflowDetailsSheet({ 
  workflow, 
  profiles,
  open, 
  onOpenChange 
}: WorkflowDetailsSheetProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  
  const [history, setHistory] = useState<WorkflowHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && workflow) {
      fetchHistory();
    }
  }, [open, workflow?.id]);

  const fetchHistory = async () => {
    if (!workflow) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_history')
      .select('*')
      .eq('workflow_id', workflow.id)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setHistory(data as WorkflowHistory[]);
    }
    setLoading(false);
  };

  const getProfileName = (profileId: string) => {
    return profiles.find(p => p.id === profileId)?.name || '-';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'submitted_completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'submitted_blocked':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'returned':
        return <RotateCcw className="h-4 w-4 text-red-500" />;
      case 'resubmitted':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return t('workflows.details.history.created');
      case 'submitted_completed':
        return t('workflows.details.history.submittedCompleted');
      case 'submitted_blocked':
        return t('workflows.details.history.submittedBlocked');
      case 'approved':
        return t('workflows.details.history.approved');
      case 'returned':
        return t('workflows.details.history.returned');
      case 'resubmitted':
        return t('workflows.details.history.resubmitted');
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'submitted_completed':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'submitted_blocked':
        return 'bg-orange-500/10 border-orange-500/20';
      case 'approved':
        return 'bg-green-500/10 border-green-500/20';
      case 'returned':
        return 'bg-red-500/10 border-red-500/20';
      case 'resubmitted':
        return 'bg-blue-500/10 border-blue-500/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { className: 'bg-yellow-500 text-white', label: t('workflows.status.pending') };
      case 'submitted_completed':
        return { className: 'bg-blue-500 text-white', label: t('workflows.status.submitted_completed') };
      case 'submitted_blocked':
        return { className: 'bg-orange-500 text-white', label: t('workflows.status.submitted_blocked') };
      case 'approved':
        return { className: 'bg-green-500 text-white', label: t('workflows.status.approved') };
      case 'returned':
        return { className: 'bg-red-500 text-white', label: t('workflows.status.returned') };
      default:
        return { className: '', label: status };
    }
  };

  if (!workflow) return null;

  const responsibleName = getProfileName(workflow.responsible_id);
  const statusConfig = getStatusConfig(workflow.status);

  // Collect all photos from workflow and history
  const allPhotos = [
    ...(workflow.evidence_photos || []),
    ...history.flatMap(h => h.photos || [])
  ].filter((photo, index, self) => self.indexOf(photo) === index); // Remove duplicates

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              #{(workflow as any).sequence_id || '-'}
            </span>
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
          <SheetTitle className="text-left">{workflow.title}</SheetTitle>
          {workflow.description && (
            <SheetDescription className="text-left">{workflow.description}</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Workflow Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('workflows.responsible')}</p>
                  <p className="text-sm font-medium">{responsibleName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('workflows.deadline')}</p>
                  <p className="text-sm font-medium">
                    {workflow.deadline ? format(new Date(workflow.deadline), 'dd/MM/yyyy', { locale: dateLocale }) : '-'}
                  </p>
                </div>
              </div>
              {workflow.nature && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('workflows.list.nature')}</p>
                    <p className="text-sm font-medium">{t(`workflows.nature.${workflow.nature}`)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                  <p className="text-sm font-medium">
                    {format(new Date(workflow.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
                  </p>
                </div>
              </div>
            </div>

            {/* All Photos */}
            {allPhotos.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  {t('workflows.details.allPhotos')} ({allPhotos.length})
                </Label>
                <ImageCarousel images={allPhotos} />
              </div>
            )}

            <Separator />

            {/* Current Notes */}
            {workflow.response_notes && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('workflows.validation.responseNotes')}
                </Label>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{workflow.response_notes}</p>
              </div>
            )}

            {workflow.validator_notes && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('workflows.details.validatorNotes')}
                </Label>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{workflow.validator_notes}</p>
              </div>
            )}

            <Separator />

            {/* History Timeline */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('workflows.details.history.title')}
              </Label>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('workflows.details.history.noHistory')}
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        getActionColor(entry.action)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getActionIcon(entry.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">
                              {getActionLabel(entry.action)}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.created_at), 'dd/MM/yy HH:mm', { locale: dateLocale })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('workflows.details.history.by')} {getProfileName(entry.performed_by)}
                          </p>
                          {entry.notes && (
                            <p className="text-sm mt-2 bg-background/50 p-2 rounded">
                              {entry.notes}
                            </p>
                          )}
                          {entry.photos && entry.photos.length > 0 && (
                            <div className="mt-2">
                              <ImageCarousel images={entry.photos} className="max-w-xs" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
