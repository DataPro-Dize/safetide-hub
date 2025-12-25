import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'supervisor' | 'technician';

interface UserPermissions {
  role: UserRole;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTechnician: boolean;
  isLoading: boolean;
  
  // Permission checks
  canManageUsers: boolean;
  canManagePlants: boolean;
  canManageProjects: boolean;
  canManageClients: boolean;
  canCreateTemplates: boolean;
  canEditTemplates: boolean;
  canDeleteRecords: boolean;
  canEditRecords: boolean;
  canInsertData: boolean;
  canViewSettings: boolean;
  canManageKPIs: boolean;
}

export function useUserPermissions(): UserPermissions {
  const [role, setRole] = useState<UserRole>('technician');
  const [isLoading, setIsLoading] = useState(true);
  const [hasAppRole, setHasAppRole] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // First check user_roles table for app_role (admin, moderator)
        const { data: appRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (appRoles && appRoles.length > 0) {
          // Map app_role to our UserRole type
          const appRole = appRoles[0].role;
          if (appRole === 'admin') {
            setRole('admin');
            setHasAppRole(true);
          } else if (appRole === 'moderator') {
            setRole('supervisor');
            setHasAppRole(true);
          }
        } else {
          // Fallback to profiles table role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_admin')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (profile.is_admin) {
              setRole('admin');
            } else {
              setRole(profile.role as UserRole);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const permissions = useMemo(() => {
    const isAdmin = role === 'admin';
    const isSupervisor = role === 'supervisor';
    const isTechnician = role === 'technician';

    return {
      role,
      isAdmin,
      isSupervisor,
      isTechnician,
      isLoading,

      // Admin only
      canManageUsers: isAdmin,
      canManagePlants: isAdmin,
      canManageProjects: isAdmin,
      canManageClients: isAdmin,
      
      // Admin and Supervisor
      canCreateTemplates: isAdmin || isSupervisor,
      canEditTemplates: isAdmin || isSupervisor,
      canDeleteRecords: isAdmin || isSupervisor,
      canEditRecords: isAdmin || isSupervisor,
      canViewSettings: isAdmin || isSupervisor,
      canManageKPIs: isAdmin || isSupervisor,
      
      // All roles
      canInsertData: true,
    };
  }, [role, isLoading]);

  return permissions;
}
