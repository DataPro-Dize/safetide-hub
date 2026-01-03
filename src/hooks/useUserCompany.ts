import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  cover_photo_url: string | null;
  group_id: string | null;
  group_name: string | null;
}

interface UseUserCompanyResult {
  companies: Company[];
  currentCompany: Company | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasMultipleCompanies: boolean;
}

export function useUserCompany(): UseUserCompanyResult {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserCompanies();
  }, []);

  const fetchUserCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userIsAdmin = roles?.some(r => r.role === 'admin') || false;
      setIsAdmin(userIsAdmin);

      // Fetch companies user has access to with group info
      const { data: userCompanies, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, cover_photo_url, group_id, corporate_groups(name)');

      if (error) {
        console.error('Error fetching companies:', error);
        setCompanies([]);
      } else {
        const companiesWithGroup = (userCompanies || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
          cover_photo_url: c.cover_photo_url,
          group_id: c.group_id,
          group_name: c.corporate_groups?.name || null,
        }));
        setCompanies(companiesWithGroup);
      }
    } catch (error) {
      console.error('Error in useUserCompany:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    companies,
    currentCompany: companies.length === 1 ? companies[0] : null,
    isAdmin,
    isLoading,
    hasMultipleCompanies: companies.length > 1,
  };
}
