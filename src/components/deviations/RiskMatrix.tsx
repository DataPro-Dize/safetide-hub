import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface RiskMatrixProps {
  probability: number;
  severity: number;
}

export function RiskMatrix({ probability, severity }: RiskMatrixProps) {
  const { t } = useTranslation();
  const riskRating = probability * severity;

  const getRiskColor = () => {
    if (riskRating <= 2) return 'bg-success text-success-foreground';
    if (riskRating <= 4) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const getRiskLabel = () => {
    if (riskRating <= 2) return t('deviations.riskLevels.low');
    if (riskRating <= 4) return t('deviations.riskLevels.medium');
    return t('deviations.riskLevels.high');
  };

  return (
    <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
      <div>
        <p className="text-sm text-muted-foreground">{t('deviations.riskRating')}</p>
        <p className="text-2xl font-bold">{probability} × {severity} = {riskRating}</p>
      </div>
      <div className={cn('px-4 py-2 rounded-lg font-semibold', getRiskColor())}>
        {getRiskLabel()}
      </div>
    </div>
  );
}
