import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { User } from '@supabase/supabase-js';

interface AppHeaderProps {
  user: User | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(user?.id);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="h-16 border-b border-border bg-background px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <ThemeToggle />
        <LanguageToggle variant="compact" className="hidden sm:flex" />
        
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground hidden lg:block">
            {user?.email}
          </span>
        </div>
      </div>
    </header>
  );
}
