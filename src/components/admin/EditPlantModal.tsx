import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Plant {
  id: string;
  name: string;
  company_id: string;
}

interface EditPlantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
  onSuccess: () => void;
}

export function EditPlantModal({ open, onOpenChange, plant, onSuccess }: EditPlantModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (plant) {
      setName(plant.name);
    }
  }, [plant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !plant) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('plants')
      .update({ name: name.trim() })
      .eq('id', plant.id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.plants.updateSuccess') });
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('admin.plants.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plant-name">{t('common.name')} *</Label>
            <Input
              id="plant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.plants.namePlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
