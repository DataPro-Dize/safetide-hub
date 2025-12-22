import logoIcon from '@/assets/logo.svg';
import logoHorizontal from '@/assets/logo-horizontal.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'horizontal';
  className?: string;
}

const sizeConfig = {
  sm: { icon: 48, horizontal: { width: 160, height: 40 } },
  md: { icon: 64, horizontal: { width: 200, height: 50 } },
  lg: { icon: 96, horizontal: { width: 280, height: 70 } },
  xl: { icon: 180, horizontal: { width: 360, height: 90 } },
};

export function Logo({ size = 'md', variant = 'icon', className = '' }: LogoProps) {
  const config = sizeConfig[size];

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img 
          src={logoHorizontal} 
          alt="DataPró Logo" 
          width={config.horizontal.width} 
          height={config.horizontal.height}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoIcon} 
        alt="DataPró Logo" 
        width={config.icon} 
        height={config.icon}
        className="object-contain"
      />
    </div>
  );
}
