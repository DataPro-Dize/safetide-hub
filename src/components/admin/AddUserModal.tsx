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
}

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corporateGroups: CorporateGroup[];
  onSuccess: () => void;
}

const allModules = [
  { id: 'risk_management', label: 'admin.users.modules.riskManagement' },
  { id: 'safety_indicators', label: 'admin.users.modules.safetyIndicators' },
  { id: 'trainings', label: 'admin.users.modules.trainings' },
  { id: 'audit', label: 'admin.users.modules.audit' },
];

export function AddUserModal({ open, onOpenChange, corporateGroups, onSuccess }: AddUserModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'technician' as 'technician' | 'supervisor' | 'admin',
    groupId: '',
    selectedModules: [] as string[],
  });

  // Fetch available modules when group changes
  useEffect(() => {
    const fetchClientModules = async () => {
      if (!formData.groupId) {
        setAvailableModules([]);
        setFormData(prev => ({ ...prev, selectedModules: [] }));
        return;
      }

      const { data } = await supabase
        .from('client_modules')
        .select('module_id')
        .eq('group_id', formData.groupId);

      if (data) {
        const moduleIds = data.map(m => m.module_id);
        setAvailableModules(moduleIds);
        // Reset selected modules to only include available ones
        setFormData(prev => ({
          ...prev,
          selectedModules: prev.selectedModules.filter(id => moduleIds.includes(id)),
        }));
      }
    };

    fetchClientModules();
  }, [formData.groupId]);

  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter(id => id !== moduleId)
        : [...prev.selectedModules, moduleId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.groupId) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: t('common.error'), description: 'Sessão expirada. Faça login novamente.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email.trim(),
          name: formData.name.trim(),
          phone: formData.phone || null,
          role: formData.role,
          groupId: formData.groupId || null,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (data?.error) {
        console.error('Create user error:', data.error);
        toast({ title: t('common.error'), description: data.error, variant: 'destructive' });
        setLoading(false);
        return;
      }

      toast({ title: t('admin.users.createSuccess') });
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'technician',
        groupId: '',
        selectedModules: [],
      });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({ title: t('common.error'), description: 'Erro inesperado ao criar usuário', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = allModules.filter(m => availableModules.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('admin.users.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">{t('common.name')} *</Label>
              <Input
                id="user-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('admin.users.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">{t('common.email')} *</Label>
              <Input
                id="user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('admin.users.emailPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-phone">{t('admin.users.phone')}</Label>
              <Input
                id="user-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t('admin.users.phonePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-role">{t('admin.users.role')} *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as typeof formData.role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">{t('admin.users.roles.technician')}</SelectItem>
                  <SelectItem value="supervisor">{t('admin.users.roles.supervisor')}</SelectItem>
                  <SelectItem value="admin">{t('admin.users.roles.admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-group">{t('admin.users.corporateGroup')} <span className="text-destructive">*</span></Label>
            <Select
              value={formData.groupId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admin.users.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                {corporateGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>{t('admin.users.moduleAccess')}</Label>
            {!formData.groupId ? (
              <p className="text-sm text-muted-foreground">{t('admin.users.selectGroupFirst')}</p>
            ) : filteredModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.users.noModulesAvailable')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredModules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={module.id}
                      checked={formData.selectedModules.includes(module.id)}
                      onCheckedChange={() => handleModuleToggle(module.id)}
                    />
                    <label
                      htmlFor={module.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t(module.label)}
                    </label>
                  </div>
                ))}
              </div>
            )}
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
