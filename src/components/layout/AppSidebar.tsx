import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const navItems = [
  { 
    title: 'nav.dashboard', 
    url: '/dashboard', 
    icon: LayoutDashboard,
    disabled: false 
  },
  { 
    title: 'nav.riskManagement', 
    url: '/risk-management', 
    icon: AlertTriangle,
    disabled: false 
  },
  { 
    title: 'nav.safetyIndicators', 
    url: '/indicators', 
    icon: BarChart3,
    disabled: true 
  },
  { 
    title: 'nav.trainings', 
    url: '/trainings', 
    icon: BookOpen,
    disabled: true 
  },
  { 
    title: 'nav.audit', 
    url: '/audit', 
    icon: ClipboardCheck,
    disabled: true 
  },
];

const adminItems = [
  { 
    title: 'nav.usersSettings', 
    url: '/settings/users', 
    icon: Users,
    disabled: false 
  },
  { 
    title: 'nav.settings', 
    url: '/settings', 
    icon: Settings,
    disabled: false 
  },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t('auth.logoutSuccess') });
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      className={cn(
        'border-r-0 bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-16' : 'w-64'
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="gradient-brand rounded-lg p-2">
              <Logo size="sm" />
            </div>
          )}
          <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent" />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    disabled={item.disabled}
                    tooltip={collapsed ? t(item.title) : undefined}
                    className={cn(
                      'w-full justify-start gap-3 px-4 py-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
                      isActive(item.url) && 'bg-sidebar-accent text-sidebar-foreground font-medium',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {item.disabled ? (
                      <span className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{t(item.title)}</span>}
                      </span>
                    ) : (
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 w-full"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{t(item.title)}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    disabled={item.disabled}
                    tooltip={collapsed ? t(item.title) : undefined}
                    className={cn(
                      'w-full justify-start gap-3 px-4 py-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
                      isActive(item.url) && 'bg-sidebar-accent text-sidebar-foreground font-medium'
                    )}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 w-full"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{t(item.title)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenuButton
          onClick={handleLogout}
          tooltip={collapsed ? t('common.logout') : undefined}
          className="w-full justify-start gap-3 px-4 py-3 text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t('common.logout')}</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
