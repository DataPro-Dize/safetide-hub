import logoSrc from '@/assets/logo.svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { logo: 40, text: 'text-xl' },
  md: { logo: 56, text: 'text-2xl' },
  lg: { logo: 80, text: 'text-4xl' },
  xl: { logo: 100, text: 'text-5xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <img 
        src={logoSrc} 
        alt="DataPró Logo" 
        width={config.logo} 
        height={config.logo}
        className="object-contain"
      />
      {showText && (
        <h1 className={`${config.text} font-bold tracking-tight text-foreground`}>
          DataPró
        </h1>
      )}
    </div>
  );
}
