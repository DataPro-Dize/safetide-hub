import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  cover_photo_url: string | null;
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

      // Fetch companies user has access to
      const { data: userCompanies, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, cover_photo_url');

      if (error) {
        console.error('Error fetching companies:', error);
        setCompanies([]);
      } else {
        setCompanies(userCompanies || []);
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
