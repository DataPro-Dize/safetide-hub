import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditJustificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (justification: string) => void;
  isLoading?: boolean;
}

export function EditJustificationModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: EditJustificationModalProps) {
  const { t } = useTranslation();
  const [justification, setJustification] = useState('');

  const handleConfirm = () => {
    if (justification.trim().length < 10) return;
    onConfirm(justification);
    setJustification('');
  };

  const handleClose = () => {
    setJustification('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('indicators.editModal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('indicators.editModal.description')}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            {t('indicators.editModal.warning')}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="justification">{t('indicators.editModal.reason')}</Label>
          <Textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={t('indicators.editModal.placeholder')}
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            {t('indicators.editModal.minChars')}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={justification.trim().length < 10 || isLoading}
          >
            {isLoading ? t('common.loading') : t('indicators.editModal.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
