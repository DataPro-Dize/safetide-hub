import { useState, useEffect, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Building2, Upload, X, Image } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  group_id: string;
  logo_url?: string | null;
  cover_photo_url?: string | null;
}

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  onSuccess: () => void;
}

export function EditCompanyModal({ open, onOpenChange, company, onSuccess }: EditCompanyModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(company.name);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { signedUrl: existingLogoUrl } = useSignedUrl(company.logo_url);
  const { signedUrl: existingCoverUrl } = useSignedUrl(company.cover_photo_url);

  useEffect(() => {
    setName(company.name);
    setLogoFile(null);
    setCoverFile(null);
    setLogoPreview(null);
    setCoverPreview(null);
  }, [company]);

  const handleFileSelect = (file: File, type: 'logo' | 'cover') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(e.target?.result as string);
      } else {
        setCoverFile(file);
        setCoverPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, companyId: string, type: 'logo' | 'cover'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${type}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('deviation-photos')
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    return `deviation-photos:${fileName}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t('common.error'), description: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    try {
      const updates: { name: string; logo_url?: string; cover_photo_url?: string } = {
        name: name.trim(),
      };

      // Upload logo if new file selected
      if (logoFile) {
        const logoUrl = await uploadFile(logoFile, company.id, 'logo');
        if (logoUrl) updates.logo_url = logoUrl;
      }

      // Upload cover if new file selected
      if (coverFile) {
        const coverUrl = await uploadFile(coverFile, company.id, 'cover');
        if (coverUrl) updates.cover_photo_url = coverUrl;
      }

      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', company.id);

      if (error) {
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      } else {
        toast({ title: t('admin.companies.updateSuccess') });
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('admin.companies.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-company-name">{t('common.name')} *</Label>
            <Input
              id="edit-company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.companies.namePlaceholder')}
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>{t('admin.companies.logo')}</Label>
            <div className="flex items-center gap-4">
              <div 
                className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview || existingLogoUrl ? (
                  <img 
                    src={logoPreview || existingLogoUrl} 
                    alt="Logo" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('admin.companies.uploadLogo')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.companies.logoHelp')}
                </p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'logo')}
              />
            </div>
          </div>

          {/* Cover Photo Upload */}
          <div className="space-y-2">
            <Label>{t('admin.companies.coverPhoto')}</Label>
            <div 
              className="h-24 w-full rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors relative"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverPreview || existingCoverUrl ? (
                <>
                  <img 
                    src={coverPreview || existingCoverUrl} 
                    alt="Cover" 
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Image className="h-6 w-6" />
                  <span className="text-xs">{t('admin.companies.uploadCover')}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.companies.coverHelp')}
            </p>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'cover')}
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
