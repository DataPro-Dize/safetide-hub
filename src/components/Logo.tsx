import logoSrc from '@/assets/logo.svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  sm: { logo: 48 },
  md: { logo: 64 },
  lg: { logo: 96 },
  xl: { logo: 180 },
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoSrc} 
        alt="DataPró Logo" 
        width={config.logo} 
        height={config.logo}
        className="object-contain"
      />
    </div>
  );
}
