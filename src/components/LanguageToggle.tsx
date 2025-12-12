import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface LanguageToggleProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function LanguageToggle({ variant = 'default', className = '' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setLanguage(language === 'pt-BR' ? 'en-US' : 'pt-BR')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur-sm text-sm font-medium transition-all hover:bg-accent ${className}`}
      >
        <span className={language === 'pt-BR' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
          PT
        </span>
        <span className="text-muted-foreground">/</span>
        <span className={language === 'en-US' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
          EN
        </span>
      </button>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm text-muted-foreground">{t('common.language')}</p>
      <RadioGroup
        value={language}
        onValueChange={(value) => setLanguage(value as 'pt-BR' | 'en-US')}
        className="flex gap-6"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="pt-BR" id="pt-BR" />
          <Label htmlFor="pt-BR" className="cursor-pointer">
            {t('common.portuguese')}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="en-US" id="en-US" />
          <Label htmlFor="en-US" className="cursor-pointer">
            {t('common.english')}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
