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
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Workflow = Tables<'workflows'>;

interface WorkflowResponseSheetProps {
  workflow: Workflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WorkflowResponseSheet({ 
  workflow, 
  open, 
  onOpenChange, 
  onSuccess 
}: WorkflowResponseSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [responseType, setResponseType] = useState<'completed' | 'blocked' | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!workflow || !responseType) return;

    if (responseType === 'blocked' && !notes.trim()) {
      toast({ 
        title: t('workflows.response.notesRequired'), 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    
    const status = responseType === 'completed' ? 'submitted_completed' : 'submitted_blocked';
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('workflows')
      .update({
        status: status as any,
        response_notes: notes || null,
        evidence_photos: photos,
        completed_at: new Date().toISOString(),
      })
      .eq('id', workflow.id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      // Record history entry
      const isResubmit = workflow.status === 'returned';
      await supabase.from('workflow_history').insert({
        workflow_id: workflow.id,
        action: isResubmit ? 'resubmitted' : status,
        notes: notes || null,
        photos: photos,
        performed_by: user?.id || '',
      });
      
      toast({ title: t('workflows.response.success') });
      resetForm();
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setResponseType(null);
    setNotes('');
    setPhotos([]);
  };

  if (!workflow) return null;

  return (
    <Sheet open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('workflows.response.title')}</SheetTitle>
          <SheetDescription>{workflow.title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {!responseType ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('workflows.response.chooseAction')}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-6 hover:bg-green-500/10 hover:border-green-500"
                  onClick={() => setResponseType('completed')}
                >
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <span className="text-sm font-medium">{t('workflows.response.markCompleted')}</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-6 hover:bg-orange-500/10 hover:border-orange-500"
                  onClick={() => setResponseType('blocked')}
                >
                  <XCircle className="h-8 w-8 text-orange-500" />
                  <span className="text-sm font-medium">{t('workflows.response.markBlocked')}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
                {responseType === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-orange-500" />
                )}
                <span className="text-sm font-medium">
                  {responseType === 'completed' 
                    ? t('workflows.response.markingCompleted')
                    : t('workflows.response.markingBlocked')
                  }
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => setResponseType(null)}
                >
                  {t('common.cancel')}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>
                  {t('workflows.response.notes')} 
                  {responseType === 'blocked' && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  placeholder={t('workflows.response.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('workflows.response.evidence')}</Label>
                <ImageUpload
                  bucket="workflow-evidence"
                  maxImages={5}
                  images={photos}
                  onImagesChange={setPhotos}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="brand"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? t('common.loading') : t('workflows.response.submit')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
