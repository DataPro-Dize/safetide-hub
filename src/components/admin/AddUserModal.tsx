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

const modules = [
  { id: 'risk_management', label: 'admin.users.modules.riskManagement' },
  { id: 'safety_indicators', label: 'admin.users.modules.safetyIndicators' },
  { id: 'trainings', label: 'admin.users.modules.trainings' },
  { id: 'audit', label: 'admin.users.modules.audit' },
];

export function AddUserModal({ open, onOpenChange, corporateGroups, onSuccess }: AddUserModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'technician' as 'technician' | 'supervisor' | 'admin',
    groupId: '',
    selectedModules: ['risk_management'] as string[],
  });

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
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: Math.random().toString(36).slice(-12), // Temporary password
      options: {
        data: {
          name: formData.name.trim(),
        },
      },
    });

    if (authError) {
      toast({ title: t('common.error'), description: authError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Update profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          phone: formData.phone || null,
          role: formData.role,
          is_admin: formData.role === 'admin',
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Link user to company if group selected
      if (formData.groupId) {
        // Get first company of the group
        const { data: companies } = await supabase
          .from('companies')
          .select('id')
          .eq('group_id', formData.groupId)
          .limit(1);

        if (companies && companies.length > 0) {
          await supabase
            .from('user_companies')
            .insert({
              user_id: authData.user.id,
              company_id: companies[0].id,
            });
        }
      }

      toast({ title: t('admin.users.createSuccess') });
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'technician',
        groupId: '',
        selectedModules: ['risk_management'],
      });
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('admin.users.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="user-group">{t('admin.users.corporateGroup')}</Label>
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
            <div className="grid grid-cols-2 gap-3">
              {modules.map((module) => (
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
