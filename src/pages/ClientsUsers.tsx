import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Building2, Users } from 'lucide-react';
import { ClientAccordion } from '@/components/admin/ClientAccordion';
import { UsersSection } from '@/components/admin/UsersSection';
import { AddClientModal } from '@/components/admin/AddClientModal';
import { useToast } from '@/hooks/use-toast';

interface CorporateGroup {
  id: string;
  name: string;
  size_type: string | null;
  companies: Company[];
}

interface Company {
  id: string;
  name: string;
  group_id: string;
  plants: Plant[];
}

interface Plant {
  id: string;
  name: string;
  company_id: string;
}

export default function ClientsUsers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [corporateGroups, setCorporateGroups] = useState<CorporateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      toast({
        title: t('admin.accessDenied'),
        description: t('admin.adminOnly'),
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch corporate groups
      const { data: groups, error: groupsError } = await supabase
        .from('corporate_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      // Fetch companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (companiesError) throw companiesError;

      // Fetch plants
      const { data: plants, error: plantsError } = await supabase
        .from('plants')
        .select('*')
        .order('name');

      if (plantsError) throw plantsError;

      // Build hierarchy
      const groupsWithChildren: CorporateGroup[] = (groups || []).map(group => ({
        ...group,
        companies: (companies || [])
          .filter(c => c.group_id === group.id)
          .map(company => ({
            ...company,
            plants: (plants || []).filter(p => p.company_id === company.id)
          }))
      }));

      setCorporateGroups(groupsWithChildren);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = corporateGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.companies.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Clients Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">{t('admin.clients.title')}</h2>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button onClick={() => setShowAddClientModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('admin.clients.add')}
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">{t('admin.clients.client')}</div>
            <div className="col-span-4">{t('admin.clients.modules')}</div>
            <div className="col-span-4 text-right">{t('common.actions')}</div>
          </div>

          {/* Accordion List */}
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('admin.clients.noData')}
            </div>
          ) : (
            <ClientAccordion groups={filteredGroups} onRefresh={fetchData} />
          )}
        </div>
      </section>

      {/* Users Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">{t('admin.users.title')}</h2>
        </div>

        <UsersSection corporateGroups={corporateGroups} onRefresh={fetchData} />
      </section>

      {/* Add Client Modal */}
      <AddClientModal
        open={showAddClientModal}
        onOpenChange={setShowAddClientModal}
        onSuccess={fetchData}
      />
    </div>
  );
}
