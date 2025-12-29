import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  role: 'technician' | 'supervisor' | 'admin';
  is_active: boolean;
  is_admin: boolean;
}

interface UserWithCompany extends Profile {
  company?: Company | null;
  corporateGroup?: CorporateGroup | null;
}

interface UsersSectionProps {
  corporateGroups: CorporateGroup[];
  onRefresh: () => void;
}

export function UsersSection({ corporateGroups, onRefresh }: UsersSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [corporateGroupsList, setCorporateGroupsList] = useState<CorporateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
    fetchCorporateGroups();
  }, []);

  const fetchCorporateGroups = async () => {
    const { data } = await supabase
      .from('corporate_groups')
      .select('id, name')
      .order('name');
    if (data) setCorporateGroupsList(data);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, group_id')
      .order('name');
    if (data) setCompanies(data);
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      return;
    }

    // Fetch user_companies to get company associations
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('user_id, company_id');

    // Fetch companies with groups
    const { data: companiesData } = await supabase
      .from('companies')
      .select('id, name, group_id');

    // Fetch corporate groups
    const { data: groupsData } = await supabase
      .from('corporate_groups')
      .select('id, name');

    // Build user list with company and group info
    const usersWithCompany: UserWithCompany[] = (profiles || []).map(profile => {
      const userCompany = userCompanies?.find(uc => uc.user_id === profile.id);
      const company = companiesData?.find(c => c.id === userCompany?.company_id);
      const group = groupsData?.find(g => g.id === company?.group_id);
      
      return {
        ...profile,
        company: company || null,
        corporateGroup: group || null,
      };
    });

    setUsers(usersWithCompany);
    setLoading(false);
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter === 'active' && !user.is_active) return false;
    if (statusFilter === 'inactive' && user.is_active) return false;
    if (companyFilter !== 'all' && user.company?.id !== companyFilter) return false;
    return true;
  });

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', deleteUserId);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.users.deactivateSuccess') });
      fetchUsers();
    }
    setDeleteUserId(null);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'supervisor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const editingUser = users.find(u => u.id === editUserId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] max-w-[250px]">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            {t('admin.users.role')}
          </label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder={t('common.filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="admin">{t('admin.users.roles.admin')}</SelectItem>
              <SelectItem value="supervisor">{t('admin.users.roles.supervisor')}</SelectItem>
              <SelectItem value="technician">{t('admin.users.roles.technician')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-[250px]">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            {t('common.status')}
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder={t('common.filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('admin.users.statusActive')}</SelectItem>
              <SelectItem value="inactive">{t('admin.users.statusInactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-[250px]">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            {t('admin.users.company')}
          </label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder={t('common.filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex justify-end">
          <Button onClick={() => setShowAddUserModal(true)} className="gap-2 bg-button-add hover:bg-button-add/90 text-white">
            <Plus className="h-4 w-4" />
            {t('admin.users.add')}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('common.email')}</TableHead>
              <TableHead>{t('admin.users.company')}</TableHead>
              <TableHead>{t('admin.users.corporateGroup')}</TableHead>
              <TableHead>{t('admin.users.role')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t('admin.users.noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="bg-card">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.name}
                      {!user.is_active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t('admin.users.statusInactive')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.company?.name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.corporateGroup?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {t(`admin.users.roles.${user.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditUserId(user.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteUserId(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <AddUserModal
        open={showAddUserModal}
        onOpenChange={setShowAddUserModal}
        corporateGroups={corporateGroupsList.length > 0 ? corporateGroupsList : corporateGroups}
        onSuccess={() => {
          fetchUsers();
          onRefresh();
        }}
      />

      {editingUser && (
        <EditUserModal
          open={!!editUserId}
          onOpenChange={() => setEditUserId(null)}
          user={editingUser}
          corporateGroups={corporateGroupsList.length > 0 ? corporateGroupsList : corporateGroups}
          onSuccess={() => {
            fetchUsers();
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.confirmDeactivate')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.deactivateWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('admin.users.deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
