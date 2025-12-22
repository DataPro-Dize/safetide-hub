import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingDashboard } from '@/components/trainings/TrainingDashboard';
import { TrainingSessionsList } from '@/components/trainings/TrainingSessionsList';
import { TrainingClassroom } from '@/components/trainings/TrainingClassroom';
import { BarChart3, List, BookOpen } from 'lucide-react';

export default function Trainings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleStartClass = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('classroom');
  };

  const handleCloseClassroom = () => {
    setSelectedSessionId(null);
    setActiveTab('list');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('trainings.title')}</h1>
        <p className="text-muted-foreground">{t('trainings.description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('trainings.tabs.dashboard')}</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">{t('trainings.tabs.sessions')}</span>
          </TabsTrigger>
          <TabsTrigger value="classroom" className="gap-2" disabled={!selectedSessionId}>
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{t('trainings.tabs.classroom')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <TrainingDashboard />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <TrainingSessionsList onStartClass={handleStartClass} />
        </TabsContent>

        <TabsContent value="classroom" className="mt-6">
          {selectedSessionId && (
            <TrainingClassroom 
              sessionId={selectedSessionId}
              onClose={handleCloseClassroom}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
