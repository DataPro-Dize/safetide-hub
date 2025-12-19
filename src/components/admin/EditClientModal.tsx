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
import { Checkbox } from '@/components/ui/checkbox';
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

const availableModules = [
  { id: 'risk_management', label: 'admin.users.modules.riskManagement' },
  { id: 'safety_indicators', label: 'admin.users.modules.safetyIndicators' },
  { id: 'trainings', label: 'admin.users.modules.trainings' },
  { id: 'audit', label: 'admin.users.modules.audit' },
];

export function EditClientModal({ open, onOpenChange, group, onSuccess }: EditClientModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(group.name);
  const [sizeType, setSizeType] = useState<string>(group.size_type || 'medium');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    setName(group.name);
    setSizeType(group.size_type || 'medium');
    
    // Fetch current modules for this client
    const fetchModules = async () => {
      const { data } = await supabase
        .from('client_modules')
        .select('module_id')
        .eq('group_id', group.id);
      
      if (data) {
        setSelectedModules(data.map(m => m.module_id));
      }
    };
    
    if (open) {
      fetchModules();
    }
  }, [group, open]);

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
    
    // Update corporate group
    const { error: groupError } = await supabase
      .from('corporate_groups')
      .update({
        name: name.trim(),
        size_type: sizeType as 'small' | 'medium' | 'large' | 'enterprise',
      })
      .eq('id', group.id);

    if (groupError) {
      toast({ title: t('common.error'), description: groupError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Delete existing modules and insert new ones
    await supabase
      .from('client_modules')
      .delete()
      .eq('group_id', group.id);

    if (selectedModules.length > 0) {
      const modulesToInsert = selectedModules.map(moduleId => ({
        group_id: group.id,
        module_id: moduleId,
      }));

      const { error: modulesError } = await supabase
        .from('client_modules')
        .insert(modulesToInsert);

      if (modulesError) {
        console.error('Error inserting modules:', modulesError);
      }
    }

    toast({ title: t('admin.clients.updateSuccess') });
    onOpenChange(false);
    onSuccess();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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

          <div className="space-y-3">
            <Label>{t('admin.clients.moduleAccess')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {availableModules.map((module) => (
                <div key={module.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-client-${module.id}`}
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => handleModuleToggle(module.id)}
                  />
                  <label
                    htmlFor={`edit-client-${module.id}`}
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
