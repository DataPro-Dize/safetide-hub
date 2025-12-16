import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { CheckCircle, RotateCcw, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Tables } from '@/integrations/supabase/types';

type Workflow = Tables<'workflows'>;
type Profile = Tables<'profiles'>;

interface WorkflowValidationSheetProps {
  workflow: Workflow | null;
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WorkflowValidationSheet({ 
  workflow, 
  profiles,
  open, 
  onOpenChange, 
  onSuccess 
}: WorkflowValidationSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [validatorNotes, setValidatorNotes] = useState('');

  const dateLocale = language === 'pt-BR' ? ptBR : enUS;

  const handleValidation = async (approve: boolean) => {
    if (!workflow) return;

    if (!approve && !validatorNotes.trim()) {
      toast({ 
        title: t('workflows.validation.notesRequired'), 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('workflows')
      .update({
        status: (approve ? 'approved' : 'returned') as any,
        validator_id: user?.id || null,
        validated_at: new Date().toISOString(),
        validator_notes: validatorNotes || null,
      })
      .eq('id', workflow.id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: approve ? t('workflows.validation.approved') : t('workflows.validation.returned') });
      setValidatorNotes('');
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  if (!workflow) return null;

  const responsibleName = profiles.find(p => p.id === workflow.responsible_id)?.name || '-';
  const isCompleted = workflow.status === 'submitted_completed';
  const isBlocked = workflow.status === 'submitted_blocked';

  return (
    <Sheet open={open} onOpenChange={(open) => {
      if (!open) setValidatorNotes('');
      onOpenChange(open);
    }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('workflows.validation.title')}</SheetTitle>
          <SheetDescription>{workflow.title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? 'default' : 'secondary'} className={
              isCompleted ? 'bg-blue-500' : 'bg-orange-500'
            }>
              {isCompleted 
                ? t('workflows.status.submitted_completed') 
                : t('workflows.status.submitted_blocked')
              }
            </Badge>
          </div>

          {/* Responsible Info */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('workflows.responsible')}:</span>
              <span className="font-medium">{responsibleName}</span>
            </div>
            {workflow.completed_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('workflows.validation.submittedAt')}:</span>
                <span>{format(new Date(workflow.completed_at), 'PPp', { locale: dateLocale })}</span>
              </div>
            )}
          </div>

          {/* Response Notes */}
          {workflow.response_notes && (
            <div className="space-y-2">
              <Label>{t('workflows.validation.responseNotes')}</Label>
              <p className="text-sm p-3 bg-muted/50 rounded-lg">{workflow.response_notes}</p>
            </div>
          )}

          {/* Evidence Photos */}
          {workflow.evidence_photos && workflow.evidence_photos.length > 0 && (
            <div className="space-y-2">
              <Label>{t('workflows.validation.evidencePhotos')}</Label>
              <ImageCarousel images={workflow.evidence_photos} />
            </div>
          )}

          {/* Validator Notes */}
          <div className="space-y-2">
            <Label>
              {t('workflows.validation.validatorNotes')}
              <span className="text-muted-foreground text-xs ml-2">
                ({t('workflows.validation.requiredForReturn')})
              </span>
            </Label>
            <Textarea
              placeholder={t('workflows.validation.validatorNotesPlaceholder')}
              value={validatorNotes}
              onChange={(e) => setValidatorNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleValidation(false)}
              disabled={loading}
              className="flex-1 hover:bg-orange-500/10 hover:border-orange-500"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('workflows.validation.return')}
            </Button>
            <Button
              variant="brand"
              onClick={() => handleValidation(true)}
              disabled={loading}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('workflows.validation.approve')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
