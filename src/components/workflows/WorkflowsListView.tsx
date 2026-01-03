import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, ExternalLink, Eye, Pencil, Clock, AlertTriangle, Image, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { WorkflowResponseSheet } from '@/components/workflows/WorkflowResponseSheet';
import { WorkflowValidationSheet } from '@/components/workflows/WorkflowValidationSheet';
import { WorkflowDetailsSheet } from '@/components/workflows/WorkflowDetailsSheet';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import * as XLSX from 'xlsx';

// Helper component to display signed images
function SignedImage({ path, className }: { path: string; className?: string }) {
  const { signedUrl } = useSignedUrl(path);
  if (!signedUrl) return <div className={cn("bg-muted animate-pulse", className)} />;
  return <img src={signedUrl} alt="" className={className} />;
}

type Workflow = Tables<'workflows'>;
type Profile = Tables<'profiles'>;
type Deviation = Tables<'deviations'>;

interface WorkflowsListViewProps {
  onViewDeviation?: (deviationId: string) => void;
}

export function WorkflowsListView({ onViewDeviation }: WorkflowsListViewProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'pt-BR' ? ptBR : enUS;
  
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Filters
  const [myActionsOnly, setMyActionsOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Search filters
  const [searchId, setSearchId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchResponsible, setSearchResponsible] = useState('');
  
  // Response/Validation/Details sheets
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isResponseSheetOpen, setIsResponseSheetOpen] = useState(false);
  const [isValidationSheetOpen, setIsValidationSheetOpen] = useState(false);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
    
    // Fetch workflows
    const { data: workflowsData, error: workflowsError } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!workflowsError && workflowsData) {
      setWorkflows(workflowsData);
      
      // Fetch profiles for responsibles
      const responsibleIds = [...new Set(workflowsData.map(w => w.responsible_id))];
      if (responsibleIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', responsibleIds);
        if (profilesData) setProfiles(profilesData);
      }
      
      // Fetch deviations for reference
      const deviationIds = [...new Set(workflowsData.map(w => w.deviation_id))];
      if (deviationIds.length > 0) {
        const { data: deviationsData } = await supabase
          .from('deviations')
          .select('*')
          .in('id', deviationIds);
        if (deviationsData) setDeviations(deviationsData);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusConfig = (status: string, deadline?: string | null) => {
    const isOverdue = deadline && new Date(deadline) < new Date() && status !== 'approved';
    
    if (isOverdue && status === 'pending') {
      return { className: 'bg-red-600 hover:bg-red-700 text-white', label: t('workflows.status.overdue'), isOverdue: true };
    }
    
    switch (status) {
      case 'pending':
        return { className: 'bg-yellow-500 hover:bg-yellow-600 text-white', label: t('workflows.status.pending'), isOverdue: false };
      case 'submitted_completed':
        return { className: 'bg-blue-500 hover:bg-blue-600 text-white', label: t('workflows.status.submitted_completed'), isOverdue: false };
      case 'submitted_blocked':
        return { className: 'bg-orange-500 hover:bg-orange-600 text-white', label: t('workflows.status.submitted_blocked'), isOverdue: false };
      case 'approved':
        return { className: 'bg-green-500 hover:bg-green-600 text-white', label: t('workflows.status.approved'), isOverdue: false };
      case 'returned':
        return { className: 'bg-red-500 hover:bg-red-600 text-white', label: t('workflows.status.returned'), isOverdue: false };
      default:
        return { className: '', label: status, isOverdue: false };
    }
  };

  // Apply filters
  const filteredWorkflows = workflows.filter(workflow => {
    const responsibleProfile = profiles.find(p => p.id === workflow.responsible_id);
    const responsibleName = responsibleProfile?.name || '';
    
    // My actions filter
    if (myActionsOnly && workflow.responsible_id !== currentUserId) return false;
    
    // Status filter
    if (statusFilter !== 'all' && workflow.status !== statusFilter) return false;
    
    // Search filters
    if (searchId && !(workflow as any).sequence_id?.toString().includes(searchId)) return false;
    if (searchTitle && !workflow.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
    if (searchResponsible && !responsibleName.toLowerCase().includes(searchResponsible.toLowerCase())) return false;
    
    return true;
  });

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredWorkflows.map(workflow => {
      const responsibleProfile = profiles.find(p => p.id === workflow.responsible_id);
      const deviation = deviations.find(d => d.id === workflow.deviation_id);
      const statusConfig = getStatusConfig(workflow.status, workflow.deadline);
      
      return {
        'ID': (workflow as any).sequence_id || '-',
        [t('workflows.list.deviationId')]: (deviation as any)?.sequence_id || '-',
        [t('common.title')]: workflow.title,
        [t('workflows.list.nature')]: workflow.nature ? t(`workflows.nature.${workflow.nature}`) : '-',
        [t('common.status')]: statusConfig.label,
        [t('workflows.responsible')]: responsibleProfile?.name || '-',
        [t('workflows.deadline')]: workflow.deadline ? format(new Date(workflow.deadline), 'dd/MM/yyyy HH:mm') : '-',
        [t('common.date')]: format(new Date(workflow.created_at), 'dd/MM/yyyy HH:mm'),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ações');
    XLSX.writeFile(wb, `acoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleWorkflowClick = (workflow: Workflow) => {
    const isResponsible = currentUserId === workflow.responsible_id;
    const canRespond = isResponsible && (workflow.status === 'pending' || workflow.status === 'returned');
    const canValidate = !isResponsible && (workflow.status === 'submitted_completed' || workflow.status === 'submitted_blocked');
    
    if (canRespond) {
      setSelectedWorkflow(workflow);
      setIsResponseSheetOpen(true);
    } else if (canValidate) {
      setSelectedWorkflow(workflow);
      setIsValidationSheetOpen(true);
    } else {
      // If can't respond or validate, open details
      setSelectedWorkflow(workflow);
      setIsDetailsSheetOpen(true);
    }
  };

  const handleSuccess = () => {
    setIsResponseSheetOpen(false);
    setIsValidationSheetOpen(false);
    setIsDetailsSheetOpen(false);
    setSelectedWorkflow(null);
    fetchData();
  };

  const handleViewDetails = (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorkflow(workflow);
    setIsDetailsSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="my-actions" 
              checked={myActionsOnly}
              onCheckedChange={setMyActionsOnly}
            />
            <Label htmlFor="my-actions" className="font-medium">
              {t('workflows.list.myActionsOnly')}
            </Label>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportExcel} disabled={filteredWorkflows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Excel
        </Button>
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[70px]">ID</TableHead>
                <TableHead className="w-[90px]">{t('workflows.list.deviationId')}</TableHead>
                <TableHead>{t('common.title')}</TableHead>
                <TableHead>{t('workflows.list.nature')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('workflows.responsible')}</TableHead>
                <TableHead className="w-[100px]">{t('workflows.list.evidence', 'Evidências')}</TableHead>
                <TableHead>{t('workflows.deadline')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
              {/* Search Row */}
              <TableRow className="bg-muted/30">
                <TableHead className="py-2">
                  <Input 
                    placeholder="..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2">
                  <Input 
                    placeholder="..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      <SelectItem value="pending">{t('workflows.status.pending')}</SelectItem>
                      <SelectItem value="submitted_completed">{t('workflows.status.submitted_completed')}</SelectItem>
                      <SelectItem value="submitted_blocked">{t('workflows.status.submitted_blocked')}</SelectItem>
                      <SelectItem value="approved">{t('workflows.status.approved')}</SelectItem>
                      <SelectItem value="returned">{t('workflows.status.returned')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="py-2">
                  <Input 
                    placeholder="..."
                    value={searchResponsible}
                    onChange={(e) => setSearchResponsible(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      {t('common.loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredWorkflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {t('workflows.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkflows.map((workflow) => {
                  const responsibleProfile = profiles.find(p => p.id === workflow.responsible_id);
                  const deviation = deviations.find(d => d.id === workflow.deviation_id);
                  const statusConfig = getStatusConfig(workflow.status, workflow.deadline);
                  const isResponsible = currentUserId === workflow.responsible_id;
                  const canRespond = isResponsible && (workflow.status === 'pending' || workflow.status === 'returned');
                  const canValidate = !isResponsible && (workflow.status === 'submitted_completed' || workflow.status === 'submitted_blocked');
                  
                  return (
                    <TableRow 
                      key={workflow.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleWorkflowClick(workflow)}
                    >
                      <TableCell className="font-mono text-xs font-semibold">
                        #{(workflow as any).sequence_id || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        #{(deviation as any)?.sequence_id || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{workflow.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {workflow.nature ? t(`workflows.nature.${workflow.nature}`) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {responsibleProfile?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {workflow.evidence_photos && workflow.evidence_photos.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {workflow.evidence_photos.slice(0, 2).map((photo, idx) => (
                              <SignedImage 
                                key={idx} 
                                path={photo} 
                                className="h-8 w-8 rounded object-cover border border-border" 
                              />
                            ))}
                            {workflow.evidence_photos.length > 2 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{workflow.evidence_photos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {workflow.deadline ? format(new Date(workflow.deadline), 'dd/MM/yyyy', { locale: dateLocale }) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(workflow.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                onClick={(e) => handleViewDetails(workflow, e)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('workflows.details.viewDetails')}
                            </TooltipContent>
                          </Tooltip>
                          {onViewDeviation && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDeviation(workflow.deviation_id);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Response Sheet */}
      <WorkflowResponseSheet
        workflow={selectedWorkflow}
        open={isResponseSheetOpen}
        onOpenChange={setIsResponseSheetOpen}
        onSuccess={handleSuccess}
      />

      {/* Validation Sheet */}
      <WorkflowValidationSheet
        workflow={selectedWorkflow}
        profiles={profiles}
        open={isValidationSheetOpen}
        onOpenChange={setIsValidationSheetOpen}
        onSuccess={handleSuccess}
      />

      {/* Details Sheet */}
      <WorkflowDetailsSheet
        workflow={selectedWorkflow}
        profiles={profiles}
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
      />
    </div>
  );
}
