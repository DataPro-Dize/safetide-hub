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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RiskMatrix } from './RiskMatrix';
import { Plus, User } from 'lucide-react';
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
  const [newWorkflow, setNewWorkflow] = useState({
    title: '',
    description: '',
    responsible_id: '',
  });

  const dateLocale = language === 'pt-BR' ? ptBR : enUS;

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
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  };

  const handleAddWorkflow = async () => {
    if (!deviation || !newWorkflow.title || !newWorkflow.responsible_id) {
      toast({ title: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('workflows').insert({
      deviation_id: deviation.id,
      title: newWorkflow.title,
      description: newWorkflow.description || null,
      responsible_id: newWorkflow.responsible_id,
      status: 'pending',
    });

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('workflows.createSuccess') });
      setNewWorkflow({ title: '', description: '', responsible_id: '' });
      setShowNewWorkflow(false);
      fetchWorkflows();
    }
    setLoading(false);
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': return 'outline';
      default: return 'default';
    }
  };

  if (!deviation) return null;

  return (
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
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowNewWorkflow(!showNewWorkflow)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('workflows.new')}
            </Button>

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

            {workflows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('workflows.noData')}
              </p>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <div 
                    key={workflow.id} 
                    className="p-4 bg-muted/50 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{workflow.title}</h4>
                      <Badge variant={getStatusVariant(workflow.status)}>
                        {t(`workflows.status.${workflow.status}`)}
                      </Badge>
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground">{workflow.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {profiles.find(p => p.id === workflow.responsible_id)?.name || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
