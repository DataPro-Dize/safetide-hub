import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const availableModules = [
  { id: 'risk_management', label: 'admin.users.modules.riskManagement' },
  { id: 'safety_indicators', label: 'admin.users.modules.safetyIndicators' },
  { id: 'trainings', label: 'admin.users.modules.trainings' },
  { id: 'audit', label: 'admin.users.modules.audit' },
];

export function AddClientModal({ open, onOpenChange, onSuccess }: AddClientModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [sizeType, setSizeType] = useState<string>('medium');
  const [selectedModules, setSelectedModules] = useState<string[]>(['risk_management']);

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    // Create corporate group
    const { data: groupData, error: groupError } = await supabase
      .from('corporate_groups')
      .insert({
        name: name.trim(),
        size_type: sizeType as 'small' | 'medium' | 'large' | 'enterprise',
      })
      .select('id')
      .single();

    if (groupError) {
      toast({ title: t('common.error'), description: groupError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Insert client modules
    if (selectedModules.length > 0) {
      const modulesToInsert = selectedModules.map(moduleId => ({
        group_id: groupData.id,
        module_id: moduleId,
      }));

      const { error: modulesError } = await supabase
        .from('client_modules')
        .insert(modulesToInsert);

      if (modulesError) {
        console.error('Error inserting modules:', modulesError);
      }
    }

    toast({ title: t('admin.clients.createSuccess') });
    setName('');
    setSizeType('medium');
    setSelectedModules(['risk_management']);
    onOpenChange(false);
    onSuccess();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('admin.clients.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.clients.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">{t('admin.clients.size')}</Label>
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

          <div className="space-y-3">
            <Label>{t('admin.clients.moduleAccess')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {availableModules.map((module) => (
                <div key={module.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`client-${module.id}`}
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => handleModuleToggle(module.id)}
                  />
                  <label
                    htmlFor={`client-${module.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t(module.label)}
                  </label>
                </div>
              ))}
            </div>
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
