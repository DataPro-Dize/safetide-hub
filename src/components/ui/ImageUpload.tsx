import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSignedUrls } from '@/hooks/useSignedUrl';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  bucket: string;
  maxImages?: number;
  images: string[];
  onImagesChange: (images: string[]) => void;
  disabled?: boolean;
}

export function ImageUpload({ 
  bucket, 
  maxImages = 10, 
  images = [], 
  onImagesChange,
  disabled = false 
}: ImageUploadProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const safeImages = Array.isArray(images) ? images : [];
  const { signedUrls, loading: loadingUrls } = useSignedUrls(safeImages);

  const uploadFile = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Return the file path instead of URL - we'll generate signed URLs when displaying
    return `${bucket}:${filePath}`;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const remainingSlots = maxImages - safeImages.length;
    if (remainingSlots <= 0) {
      toast({ 
        title: t('imageUpload.limitReached'), 
        description: t('imageUpload.maxImagesReached', { max: maxImages }),
        variant: 'destructive' 
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const validFiles = filesToUpload.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({ title: t('imageUpload.invalidType'), variant: 'destructive' });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t('imageUpload.fileTooLarge'), variant: 'destructive' });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      const url = await uploadFile(file);
      if (url) uploadedUrls.push(url);
    }

    if (uploadedUrls.length > 0) {
      onImagesChange([...safeImages, ...uploadedUrls]);
    }
    setUploading(false);
  }, [bucket, safeImages, maxImages, onImagesChange, disabled, toast, t]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (index: number) => {
    const newImages = safeImages.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && document.getElementById('image-upload-input')?.click()}
      >
        <input
          id="image-upload-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('imageUpload.uploading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('imageUpload.dragOrClick')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('imageUpload.maxSize')} • {safeImages.length}/{maxImages} {t('imageUpload.images')}
            </p>
          </div>
        )}
      </div>

      {safeImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {loadingUrls ? (
            <div className="col-span-4 flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            signedUrls.map((url, index) => (
              url && (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            ))
          )}
        </div>
      )}
    </div>
  );
}
