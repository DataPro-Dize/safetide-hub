import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RiskMatrix } from './RiskMatrix';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { WorkflowCard } from '@/components/workflows/WorkflowCard';
import { WorkflowResponseSheet } from '@/components/workflows/WorkflowResponseSheet';
import { WorkflowValidationSheet } from '@/components/workflows/WorkflowValidationSheet';
import { Plus, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Tables } from '@/integrations/supabase/types';

type Deviation = Tables<'deviations'>;
type Workflow = Tables<'workflows'>;
type Profile = Tables<'profiles'>;

interface DeviationDetailsSheetProps {
  deviation: Deviation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function DeviationDetailsSheet({ 
  deviation, 
  open, 
  onOpenChange,
  onUpdate 
}: DeviationDetailsSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [responseSheetOpen, setResponseSheetOpen] = useState(false);
  const [validationSheetOpen, setValidationSheetOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    title: '',
    description: '',
    responsible_id: '',
    deadline: '',
    deadline_time: '',
    nature: '' as 'corrective' | 'preventive' | '',
  });

  const dateLocale = language === 'pt-BR' ? ptBR : enUS;

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (deviation && open) {
      fetchWorkflows();
      fetchProfiles();
    }
  }, [deviation, open]);

  const fetchWorkflows = async () => {
    if (!deviation) return;
    const { data } = await supabase
      .from('workflows')
      .select('*')
      .eq('deviation_id', deviation.id)
      .order('created_at', { ascending: false });
    if (data) setWorkflows(data);
  };

  const fetchProfiles = async () => {
    if (!deviation) return;
    
    // First get the company_id from the plant
    const { data: plant } = await supabase
      .from('plants')
      .select('company_id')
      .eq('id', deviation.plant_id)
      .single();
    
    if (!plant) return;
    
    // Get users who have access to this company
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', plant.company_id);
    
    if (!userCompanies || userCompanies.length === 0) {
      setProfiles([]);
      return;
    }
    
    const userIds = userCompanies.map(uc => uc.user_id);
    
    // Fetch profiles for those users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
      .eq('is_active', true);
    
    if (profiles) setProfiles(profiles);
  };

  const handleAddWorkflow = async () => {
    if (!deviation || !newWorkflow.title || !newWorkflow.responsible_id || !newWorkflow.deadline || !newWorkflow.deadline_time || !newWorkflow.nature) {
      toast({ title: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    // Combine date and time
    const deadlineDateTime = new Date(`${newWorkflow.deadline}T${newWorkflow.deadline_time}`);
    if (deadlineDateTime < new Date()) {
      toast({ title: t('workflows.deadlineInPast'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('workflows').insert({
      deviation_id: deviation.id,
      title: newWorkflow.title,
      description: newWorkflow.description || null,
      responsible_id: newWorkflow.responsible_id,
      deadline: deadlineDateTime.toISOString(),
      nature: newWorkflow.nature as any,
      status: 'pending',
    });

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('workflows.createSuccess') });
      setNewWorkflow({ title: '', description: '', responsible_id: '', deadline: '', deadline_time: '', nature: '' });
      setShowNewWorkflow(false);
      fetchWorkflows();
    }
    setLoading(false);
  };

  const filteredWorkflows = workflows.filter(w => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'mine') return w.responsible_id === currentUserId;
    if (statusFilter === 'to_validate') {
      return w.responsible_id !== currentUserId && 
        (w.status === 'submitted_completed' || w.status === 'submitted_blocked');
    }
    return w.status === statusFilter;
  });

  const handleRespond = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setResponseSheetOpen(true);
  };

  const handleValidate = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setValidationSheetOpen(true);
  };

  if (!deviation) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{deviation.title}</SheetTitle>
            <SheetDescription>
              {t(`deviations.categories.${deviation.category}`)} • {' '}
              {format(new Date(deviation.created_at), 'PPP', { locale: dateLocale })}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">
                {t('deviations.details')}
              </TabsTrigger>
              <TabsTrigger value="workflows" className="flex-1">
                {t('workflows.title')} ({workflows.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('common.status')}
                </label>
                <Badge variant={deviation.status === 'done' ? 'outline' : 'default'}>
                  {t(`deviations.status.${deviation.status}`)}
                </Badge>
              </div>

              {deviation.description && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('common.description')}
                  </label>
                  <p className="text-sm">{deviation.description}</p>
                </div>
              )}

              {deviation.location_details && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('deviations.locationDetails')}
                  </label>
                  <p className="text-sm">{deviation.location_details}</p>
                </div>
              )}

              <RiskMatrix 
                probability={deviation.probability} 
                severity={deviation.severity} 
              />

              {/* Photos Section */}
              <div className="space-y-2">
                <Label>{t('deviations.photos')}</Label>
                <ImageCarousel images={deviation.photos || []} />
              </div>
            </TabsContent>

            <TabsContent value="workflows" className="space-y-4 mt-4">
              {/* Filters */}
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="mine">{t('workflows.filters.mine')}</SelectItem>
                    <SelectItem value="to_validate">{t('workflows.filters.toValidate')}</SelectItem>
                    <SelectItem value="pending">{t('workflows.status.pending')}</SelectItem>
                    <SelectItem value="submitted_completed">{t('workflows.status.submitted_completed')}</SelectItem>
                    <SelectItem value="submitted_blocked">{t('workflows.status.submitted_blocked')}</SelectItem>
                    <SelectItem value="approved">{t('workflows.status.approved')}</SelectItem>
                    <SelectItem value="returned">{t('workflows.status.returned')}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowNewWorkflow(!showNewWorkflow)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {showNewWorkflow && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <Input
                    placeholder={t('common.title')}
                    value={newWorkflow.title}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder={t('common.description')}
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                  <Select
                    value={newWorkflow.responsible_id}
                    onValueChange={(v) => setNewWorkflow(prev => ({ ...prev, responsible_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('workflows.selectResponsible')} />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Deadline date and time */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('workflows.deadline')}</Label>
                      <Input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={newWorkflow.deadline}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, deadline: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('workflows.time')}</Label>
                      <Input
                        type="time"
                        value={newWorkflow.deadline_time}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, deadline_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Nature dropdown */}
                  <Select
                    value={newWorkflow.nature}
                    onValueChange={(v) => setNewWorkflow(prev => ({ ...prev, nature: v as 'corrective' | 'preventive' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('workflows.selectNature')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrective">{t('workflows.nature.corrective')}</SelectItem>
                      <SelectItem value="preventive">{t('workflows.nature.preventive')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewWorkflow(false)}
                      className="flex-1"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={handleAddWorkflow}
                      disabled={loading}
                      className="flex-1"
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              )}

              {filteredWorkflows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('workflows.noData')}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      profiles={profiles}
                      currentUserId={currentUserId}
                      onRespond={() => handleRespond(workflow)}
                      onValidate={() => handleValidate(workflow)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <WorkflowResponseSheet
        workflow={selectedWorkflow}
        open={responseSheetOpen}
        onOpenChange={setResponseSheetOpen}
        onSuccess={fetchWorkflows}
      />

      <WorkflowValidationSheet
        workflow={selectedWorkflow}
        profiles={profiles}
        open={validationSheetOpen}
        onOpenChange={setValidationSheetOpen}
        onSuccess={fetchWorkflows}
      />
    </>
  );
}
