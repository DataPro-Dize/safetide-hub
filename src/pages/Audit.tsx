import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditDashboard } from '@/components/audit/AuditDashboard';
import { AuditList } from '@/components/audit/AuditList';
import { AuditForm } from '@/components/audit/AuditForm';
import { BarChart3, List, ClipboardCheck } from 'lucide-react';

export default function Audit() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [isNewAudit, setIsNewAudit] = useState(false);

  const handleNewAudit = () => {
    setSelectedAuditId(null);
    setIsNewAudit(true);
    setActiveTab('form');
  };

  const handleEditAudit = (auditId: string) => {
    setSelectedAuditId(auditId);
    setIsNewAudit(false);
    setActiveTab('form');
  };

  const handleFormClose = () => {
    setSelectedAuditId(null);
    setIsNewAudit(false);
    setActiveTab('list');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('audit.title')}</h1>
        <p className="text-muted-foreground">{t('audit.description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('audit.tabs.dashboard')}</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">{t('audit.tabs.list')}</span>
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-2" disabled={!isNewAudit && !selectedAuditId}>
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t('audit.tabs.form')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <AuditDashboard onNewAudit={handleNewAudit} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <AuditList onNewAudit={handleNewAudit} onEditAudit={handleEditAudit} />
        </TabsContent>

        <TabsContent value="form" className="mt-6">
          <AuditForm 
            auditId={selectedAuditId} 
            isNew={isNewAudit}
            onClose={handleFormClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
