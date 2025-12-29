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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface CorporateGroup {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  group_id: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'technician' | 'supervisor' | 'admin';
  is_active: boolean;
  is_admin: boolean;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  corporateGroups: CorporateGroup[];
  onSuccess: () => void;
}

const allModules = [
  { id: 'risk_management', label: 'admin.users.modules.riskManagement' },
  { id: 'safety_indicators', label: 'admin.users.modules.safetyIndicators' },
  { id: 'trainings', label: 'admin.users.modules.trainings' },
  { id: 'audit', label: 'admin.users.modules.audit' },
];

export function EditUserModal({ open, onOpenChange, user, corporateGroups, onSuccess }: EditUserModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [userModules, setUserModules] = useState<string[]>([]);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [userCompany, setUserCompany] = useState<Company | null>(null);
  const [userGroup, setUserGroup] = useState<CorporateGroup | null>(null);
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    is_active: user.is_active,
    selectedModules: [] as string[],
  });

  // Fetch user's company, group and modules on mount
  useEffect(() => {
    const fetchUserData = async () => {
      // Get user's company
      const { data: userCompanyData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (userCompanyData) {
        // Get company details
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, group_id')
          .eq('id', userCompanyData.company_id)
          .single();

        if (companyData) {
          setUserCompany(companyData);
          setUserGroupId(companyData.group_id);
          
          // Get group details
          const { data: groupData } = await supabase
            .from('corporate_groups')
            .select('id, name')
            .eq('id', companyData.group_id)
            .single();
          
          if (groupData) {
            setUserGroup(groupData);
          }
          
          // Fetch available modules for this group
          const { data: clientModules } = await supabase
            .from('client_modules')
            .select('module_id')
            .eq('group_id', companyData.group_id);

          if (clientModules) {
            const moduleIds = clientModules.map(m => m.module_id);
            setAvailableModules(moduleIds);
          }
        }
      }

      // Fetch user's specific modules
      const { data: userModulesData } = await supabase
        .from('user_modules')
        .select('module_id')
        .eq('user_id', user.id);

      if (userModulesData) {
        const userModuleIds = userModulesData.map(m => m.module_id);
        setUserModules(userModuleIds);
        setFormData(prev => ({
          ...prev,
          selectedModules: userModuleIds,
        }));
      } else {
        setUserModules([]);
        setFormData(prev => ({
          ...prev,
          selectedModules: [],
        }));
      }
    };

    if (open) {
      fetchUserData();
    }
  }, [user.id, open]);

  useEffect(() => {
    setFormData({
      name: user.name,
      phone: user.phone || '',
      is_active: user.is_active,
      selectedModules: userModules,
    });
  }, [user, userModules]);

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
    if (!formData.name.trim()) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Update profile (without changing role)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          phone: formData.phone || null,
          is_active: formData.is_active,
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Delete existing user modules
      await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', user.id);

      // Insert new user modules
      if (formData.selectedModules.length > 0) {
        const modulesToInsert = formData.selectedModules.map(moduleId => ({
          user_id: user.id,
          module_id: moduleId,
        }));

        const { error: modulesError } = await supabase
          .from('user_modules')
          .insert(modulesToInsert);

        if (modulesError) {
          throw modulesError;
        }
      }

      toast({ title: t('admin.users.updateSuccess') });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = allModules.filter(m => availableModules.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('admin.users.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">{t('common.name')} *</Label>
              <Input
                id="edit-user-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">{t('admin.users.phone')}</Label>
              <Input
                id="edit-user-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('admin.users.role')}</Label>
              <Input
                value={t(`admin.users.roles.${user.role}`)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Company and Group Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.users.company')}</Label>
              <Input
                value={userCompany?.name || '-'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('admin.users.corporateGroup')}</Label>
              <Input
                value={userGroup?.name || '-'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Module Access Section */}
          <div className="space-y-3">
            <Label>{t('admin.users.moduleAccess')}</Label>
            {filteredModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.users.noModulesAvailable')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border">
                {filteredModules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${module.id}`}
                      checked={formData.selectedModules.includes(module.id)}
                      onCheckedChange={() => handleModuleToggle(module.id)}
                    />
                    <label
                      htmlFor={`edit-${module.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t(module.label)}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <Label htmlFor="is-active" className="text-base">{t('admin.users.activeStatus')}</Label>
              <p className="text-sm text-muted-foreground">{t('admin.users.activeDescription')}</p>
            </div>
            <Switch
              id="is-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
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