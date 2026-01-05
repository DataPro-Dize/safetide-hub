import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';
import { Upload, CalendarIcon, Award, Loader2, RefreshCw } from 'lucide-react';

interface UpdateCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: {
    id: string;
    sessionId: string;
    userName: string;
    trainingType: string;
    validityMonths: number;
    completedAt: string;
  } | null;
  onSuccess?: () => void;
}

export function UpdateCertificateModal({ 
  open, 
  onOpenChange, 
  certificate,
  onSuccess 
}: UpdateCertificateModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newRealizationDate, setNewRealizationDate] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open && certificate) {
      setNewRealizationDate('');
      setNewExpirationDate('');
      setCertificateFile(null);
    }
  }, [open, certificate]);

  // Auto-calculate expiration date when realization date changes
  useEffect(() => {
    if (newRealizationDate && certificate) {
      const realizationDateObj = new Date(newRealizationDate);
      const expiration = addMonths(realizationDateObj, certificate.validityMonths);
      setNewExpirationDate(format(expiration, 'yyyy-MM-dd'));
    }
  }, [newRealizationDate, certificate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('trainings.register.invalidFileType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('trainings.register.fileTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setCertificateFile(file);
  };

  const uploadCertificate = async (): Promise<string | null> => {
    if (!certificateFile) return null;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = certificateFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-files')
        .upload(filePath, certificateFile);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast({
        title: t('trainings.register.uploadError'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!certificate || !newRealizationDate || !certificateFile) {
      toast({
        title: t('common.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload new certificate
      const certUrl = await uploadCertificate();
      if (!certUrl) {
        setLoading(false);
        return;
      }

      const newRealizationDateTime = new Date(`${newRealizationDate}T09:00:00`).toISOString();

      // Update the training session with new completion date and certificate
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .update({
          completed_at: newRealizationDateTime,
          expiration_date: newExpirationDate,
          certificate_url: certUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificate.sessionId);

      if (sessionError) throw sessionError;

      // Update the enrollment with new certificate and signed_at date
      const { error: enrollmentError } = await supabase
        .from('training_enrollments')
        .update({
          certificate_url: certUrl,
          signed_at: newRealizationDateTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificate.id);

      if (enrollmentError) throw enrollmentError;

      toast({ title: t('trainings.certificates.updateSuccess') });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating certificate:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!certificate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t('trainings.certificates.updateTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('trainings.certificates.collaborator')}:</span>
              <span className="text-sm font-medium">{certificate.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('trainings.certificates.training')}:</span>
              <span className="text-sm font-medium">{certificate.trainingType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('trainings.certificates.previousDate')}:</span>
              <span className="text-sm font-medium">
                {format(new Date(certificate.completedAt), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>

          {/* New Realization Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {t('trainings.certificates.newDate')} <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={newRealizationDate}
              onChange={(e) => setNewRealizationDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* New Expiration Date (auto-calculated) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {t('trainings.certificates.expiresAt')}
            </Label>
            <Input
              type="date"
              value={newExpirationDate}
              readOnly
              className="w-full bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t('trainings.register.autoCalculated')}
            </p>
          </div>

          {/* Certificate Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('trainings.certificates.certificate')} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="flex-1"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {certificateFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {certificateFile.name}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  {t('trainings.certificates.update')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
