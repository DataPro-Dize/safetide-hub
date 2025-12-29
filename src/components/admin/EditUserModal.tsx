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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface CorporateGroup {
  id: string;
  name: string;
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
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    role: user.role,
    is_active: user.is_active,
    selectedModules: [] as string[],
  });

  // Fetch user's company and group on mount
  useEffect(() => {
    const fetchUserCompanyAndModules = async () => {
      // Get user's company
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (userCompany) {
        // Get company's group
        const { data: company } = await supabase
          .from('companies')
          .select('group_id')
          .eq('id', userCompany.company_id)
          .single();

        if (company?.group_id) {
          setUserGroupId(company.group_id);
          
          // Fetch available modules for this group
          const { data: clientModules } = await supabase
            .from('client_modules')
            .select('module_id')
            .eq('group_id', company.group_id);

          if (clientModules) {
            setAvailableModules(clientModules.map(m => m.module_id));
          }
        }
      }
    };

    fetchUserCompanyAndModules();
  }, [user.id]);

  useEffect(() => {
    setFormData({
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
      selectedModules: [],
    });
  }, [user]);

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
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          phone: formData.phone || null,
          role: formData.role,
          is_active: formData.is_active,
          is_admin: formData.role === 'admin',
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Update user_roles table
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      // Map profile role to app_role
      let appRole: 'admin' | 'moderator' | 'user';
      if (formData.role === 'admin') {
        appRole = 'admin';
      } else if (formData.role === 'supervisor') {
        appRole = 'moderator';
      } else {
        appRole = 'user';
      }

      // Insert new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: appRole,
        });

      if (roleError) {
        console.error('Error updating user role:', roleError);
        // Don't throw here, the profile was already updated successfully
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
              <Label htmlFor="edit-user-role">{t('admin.users.role')} *</Label>
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