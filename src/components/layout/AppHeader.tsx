import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';
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
    <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-end gap-4">
      <ThemeToggle />
      <LanguageToggle variant="compact" />
      
      <NotificationDropdown
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
      />

      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground hidden md:block">
          {user?.email}
        </span>
      </div>
    </header>
  );
}