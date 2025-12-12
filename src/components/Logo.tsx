import { TrendingUp } from 'lucide-react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 24, text: 'text-xl', padding: 'p-2' },
  md: { icon: 32, text: 'text-2xl', padding: 'p-3' },
  lg: { icon: 48, text: 'text-4xl', padding: 'p-4' },
  xl: { icon: 64, text: 'text-5xl', padding: 'p-5' },
};

export function Logo({ variant = 'gradient', size = 'md', showText = true, className = '' }: LogoProps) {
  const config = sizeConfig[size];
  
  const iconColorClass = variant === 'light' 
    ? 'text-primary-foreground' 
    : variant === 'dark' 
    ? 'text-primary' 
    : 'text-primary-foreground';
  
  const textColorClass = variant === 'light' 
    ? 'text-primary-foreground' 
    : variant === 'dark' 
    ? 'text-foreground' 
    : 'text-primary-foreground';

  const bgClass = variant === 'light' 
    ? 'bg-primary-foreground/20' 
    : variant === 'dark' 
    ? 'bg-primary/10' 
    : 'bg-primary-foreground/20';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className={`${config.padding} ${bgClass} rounded-2xl backdrop-blur-sm`}>
        <div className="relative">
          <TrendingUp className={iconColorClass} size={config.icon} strokeWidth={2.5} />
          <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 ${variant === 'light' || variant === 'gradient' ? 'bg-primary-foreground' : 'bg-primary'} rounded-full`}
                style={{ height: `${(i + 1) * 4 + 4}px` }}
              />
            ))}
          </div>
        </div>
      </div>
      {showText && (
        <h1 className={`${config.text} font-bold tracking-tight ${textColorClass}`}>
          DataPró
        </h1>
      )}
    </div>
  );
}
