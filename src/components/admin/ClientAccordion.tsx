import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Copy, MoreVertical, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AddCompanyModal } from './AddCompanyModal';
import { AddPlantModal } from './AddPlantModal';
import { EditClientModal } from './EditClientModal';
import { EditCompanyModal } from './EditCompanyModal';
import { EditPlantModal } from './EditPlantModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface CorporateGroup {
  id: string;
  name: string;
  size_type: string | null;
  companies: Company[];
}

interface Company {
  id: string;
  name: string;
  group_id: string;
  plants: Plant[];
}

interface Plant {
  id: string;
  name: string;
  company_id: string;
}

interface ClientAccordionProps {
  groups: CorporateGroup[];
  onRefresh: () => void;
}

export function ClientAccordion({ groups, onRefresh }: ClientAccordionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [addCompanyGroupId, setAddCompanyGroupId] = useState<string | null>(null);
  const [addPlantCompanyId, setAddPlantCompanyId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [editPlantId, setEditPlantId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [deletePlantId, setDeletePlantId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const copyRegistrationLink = (groupId: string) => {
    const link = `${window.location.origin}/register?group=${groupId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: t('admin.clients.linkCopied'),
      description: link,
    });
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    const { error } = await supabase
      .from('corporate_groups')
      .delete()
      .eq('id', deleteGroupId);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.clients.deleteSuccess') });
      onRefresh();
    }
    setDeleteGroupId(null);
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompanyId) return;
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', deleteCompanyId);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.companies.deleteSuccess') });
      onRefresh();
    }
    setDeleteCompanyId(null);
  };

  const handleDeletePlant = async () => {
    if (!deletePlantId) return;
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', deletePlantId);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('admin.units.deleteSuccess') });
      onRefresh();
    }
    setDeletePlantId(null);
  };

  const editingGroup = groups.find(g => g.id === editGroupId);
  const editingCompany = groups.flatMap(g => g.companies).find(c => c.id === editCompanyId);
  const editingPlant = groups.flatMap(g => g.companies).flatMap(c => c.plants).find(p => p.id === editPlantId);

  return (
    <>
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <Collapsible
            key={group.id}
            open={openGroups.includes(group.id)}
            onOpenChange={() => toggleGroup(group.id)}
          >
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-card hover:bg-muted/30 transition-colors">
              <div className="col-span-4 font-medium text-foreground">
                {group.name}
              </div>
              <div className="col-span-4 text-sm text-muted-foreground">
                {t('admin.clients.riskManagement')}
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => copyRegistrationLink(group.id)}
                >
                  {t('admin.clients.registrationLink')}
                  <Copy className="h-3.5 w-3.5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditGroupId(group.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteGroupId(group.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      openGroups.includes(group.id) && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent>
              <div className="bg-muted/20 p-4 border-t border-border">
                {/* Companies Section */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('admin.companies.title')}
                  </h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={() => setAddCompanyGroupId(group.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('admin.companies.add')}
                  </Button>
                </div>

                {group.companies.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {t('admin.companies.noData')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.companies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-foreground">
                            {company.name}
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {company.plants.map((plant) => (
                              <div
                                key={plant.id}
                                className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 border border-border"
                              >
                                <span className="text-xs text-foreground">{plant.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => setEditPlantId(plant.id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-destructive hover:text-destructive"
                                  onClick={() => setDeletePlantId(plant.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditCompanyId(company.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteCompanyId(company.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1 ml-2"
                            onClick={() => setAddPlantCompanyId(company.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t('admin.units.add')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Modals */}
      <AddCompanyModal
        open={!!addCompanyGroupId}
        onOpenChange={() => setAddCompanyGroupId(null)}
        groupId={addCompanyGroupId}
        onSuccess={onRefresh}
      />

      <AddPlantModal
        open={!!addPlantCompanyId}
        onOpenChange={() => setAddPlantCompanyId(null)}
        companyId={addPlantCompanyId}
        onSuccess={onRefresh}
      />

      {editingGroup && (
        <EditClientModal
          open={!!editGroupId}
          onOpenChange={() => setEditGroupId(null)}
          group={editingGroup}
          onSuccess={onRefresh}
        />
      )}

      {editingCompany && (
        <EditCompanyModal
          open={!!editCompanyId}
          onOpenChange={() => setEditCompanyId(null)}
          company={editingCompany}
          onSuccess={onRefresh}
        />
      )}

      {editingPlant && (
        <EditPlantModal
          open={!!editPlantId}
          onOpenChange={() => setEditPlantId(null)}
          plant={editingPlant}
          onSuccess={onRefresh}
        />
      )}

      {/* Delete Confirmations */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.clients.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.clients.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCompanyId} onOpenChange={() => setDeleteCompanyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.companies.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.companies.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePlantId} onOpenChange={() => setDeletePlantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.units.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.units.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlant} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
