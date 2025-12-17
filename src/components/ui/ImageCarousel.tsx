import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useSignedUrls } from '@/hooks/useSignedUrl';

interface ImageCarouselProps {
  images: string[];
  className?: string;
}

export function ImageCarousel({ images, className }: ImageCarouselProps) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { signedUrls, loading } = useSignedUrls(images);

  if (images.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-muted-foreground", className)}>
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">{t('imageCarousel.noImages')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-muted-foreground", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <Carousel className="w-full">
          <CarouselContent>
            {signedUrls.map((url, index) => (
              url && (
                <CarouselItem key={index}>
                  <div 
                    className="aspect-video relative cursor-pointer overflow-hidden rounded-lg bg-muted"
                    onClick={() => {
                      setSelectedImage(url);
                      setCurrentIndex(index);
                    }}
                  >
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                </CarouselItem>
              )
            ))}
          </CarouselContent>
          {signedUrls.length > 1 && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
        
        {images.length > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {images.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
        
        <p className="text-center text-xs text-muted-foreground mt-1">
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">{t('imageCarousel.fullView')}</DialogTitle>
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-2 right-2 z-10 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full view"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
