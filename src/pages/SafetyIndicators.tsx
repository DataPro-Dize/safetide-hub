import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiDashboard } from '@/components/indicators/KpiDashboard';
import { KpiReportForm } from '@/components/indicators/KpiReportForm';
import { KpiReportsList } from '@/components/indicators/KpiReportsList';

export default function SafetyIndicators() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('indicators.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('indicators.description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard">{t('indicators.tabs.dashboard')}</TabsTrigger>
          <TabsTrigger value="report">{t('indicators.tabs.report')}</TabsTrigger>
          <TabsTrigger value="list">{t('indicators.tabs.list')}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <KpiDashboard />
        </TabsContent>

        <TabsContent value="report" className="space-y-6 mt-6">
          <KpiReportForm />
        </TabsContent>

        <TabsContent value="list" className="space-y-6 mt-6">
          <KpiReportsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
