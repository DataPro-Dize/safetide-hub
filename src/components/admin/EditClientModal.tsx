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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface CorporateGroup {
  id: string;
  name: string;
  size_type: string | null;
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CorporateGroup;
  onSuccess: () => void;
}

export function EditClientModal({ open, onOpenChange, group, onSuccess }: EditClientModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(group.name);
  const [sizeType, setSizeType] = useState<string>(group.size_type || 'medium');

  useEffect(() => {
    setName(group.name);
    setSizeType(group.size_type || 'medium');
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('corporate_groups')
      .update({
        name: name.trim(),
        size_type: sizeType as 'small' | 'medium' | 'large' | 'enterprise',
      })
      .eq('id', group.id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.clients.updateSuccess') });
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('admin.clients.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('common.name')} *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.clients.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-size">{t('admin.clients.size')}</Label>
            <Select value={sizeType} onValueChange={setSizeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('admin.clients.sizes.small')}</SelectItem>
                <SelectItem value="medium">{t('admin.clients.sizes.medium')}</SelectItem>
                <SelectItem value="large">{t('admin.clients.sizes.large')}</SelectItem>
                <SelectItem value="enterprise">{t('admin.clients.sizes.enterprise')}</SelectItem>
              </SelectContent>
            </Select>
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
