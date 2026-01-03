import { useTranslation } from 'react-i18next';
import { useUserCompany } from '@/hooks/useUserCompany';
import { Building2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSignedUrl } from '@/hooks/useSignedUrl';

export function CompanyBanner() {
  const { t } = useTranslation();
  const { currentCompany, isAdmin, hasMultipleCompanies, isLoading, companies } = useUserCompany();
  
  const { signedUrl: logoUrl } = useSignedUrl(currentCompany?.logo_url);
  const { signedUrl: coverUrl } = useSignedUrl(currentCompany?.cover_photo_url);

  if (isLoading) {
    return null;
  }

  // Admin viewing multiple companies
  if (isAdmin && hasMultipleCompanies) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-500/20">
            <Users className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {t('layout.adminMultipleCompanies')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('layout.viewingCompanies', { count: companies.length })}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-600">
            {t('layout.adminMode')}
          </Badge>
        </div>
      </div>
    );
  }

  // Non-admin or admin with single company
  if (currentCompany) {
    return (
      <div 
        className="relative rounded-lg overflow-hidden mb-6 border border-border"
        style={{ minHeight: coverUrl ? '120px' : 'auto' }}
      >
        {/* Cover Photo */}
        {coverUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/50" />
          </div>
        )}
        
        {/* Content */}
        <div className="relative p-4 flex items-center gap-4">
          {/* Company Logo */}
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={currentCompany.name}
              className="h-12 w-12 rounded-lg object-cover border border-border bg-background"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-border">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          
          {/* Company Info */}
          <div>
            {currentCompany.group_name && (
              <p className="text-xs text-muted-foreground/70">{currentCompany.group_name}</p>
            )}
            <p className="text-sm text-muted-foreground">{t('layout.currentCompany')}</p>
            <h2 className="text-lg font-semibold text-foreground">{currentCompany.name}</h2>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
