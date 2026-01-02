import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrainingType {
  id: string;
  title: string;
  description: string | null;
  validity_months: number;
  is_mandatory: boolean;
  training_link: string | null;
  notification_days: number[] | null;
}

export function TrainingTypesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TrainingType | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validityMonths, setValidityMonths] = useState('12');
  const [isMandatory, setIsMandatory] = useState(false);
  const [trainingLink, setTrainingLink] = useState('');
  const [notificationDays, setNotificationDays] = useState({
    30: true,
    60: false,
    90: false,
    120: false,
  });

  useEffect(() => {
    fetchTrainingTypes();
  }, []);

  const fetchTrainingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('training_types')
        .select('*')
        .order('title');

      if (error) throw error;
      setTrainingTypes(data || []);
    } catch (error) {
      console.error('Error fetching training types:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setValidityMonths('12');
    setIsMandatory(false);
    setTrainingLink('');
    setNotificationDays({ 30: true, 60: false, 90: false, 120: false });
    setEditingType(null);
  };

  const openEditModal = (type: TrainingType) => {
    setEditingType(type);
    setTitle(type.title);
    setDescription(type.description || '');
    setValidityMonths(type.validity_months.toString());
    setIsMandatory(type.is_mandatory);
    setTrainingLink(type.training_link || '');
    
    const days = type.notification_days || [30];
    setNotificationDays({
      30: days.includes(30),
      60: days.includes(60),
      90: days.includes(90),
      120: days.includes(120),
    });
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({ title: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    const selectedDays = Object.entries(notificationDays)
      .filter(([_, selected]) => selected)
      .map(([day]) => parseInt(day));

    const typeData = {
      title: title.trim(),
      description: description.trim() || null,
      validity_months: parseInt(validityMonths) || 12,
      is_mandatory: isMandatory,
      training_link: trainingLink.trim() || null,
      notification_days: selectedDays.length > 0 ? selectedDays : [30],
    };

    try {
      if (editingType) {
        const { error } = await supabase
          .from('training_types')
          .update(typeData)
          .eq('id', editingType.id);

        if (error) throw error;
        toast({ title: t('trainings.types.updateSuccess') });
      } else {
        const { error } = await supabase
          .from('training_types')
          .insert(typeData);

        if (error) throw error;
        toast({ title: t('trainings.types.createSuccess') });
      }

      resetForm();
      setIsModalOpen(false);
      fetchTrainingTypes();
    } catch (error) {
      console.error('Error saving training type:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: t('trainings.types.deleteSuccess') });
      fetchTrainingTypes();
    } catch (error) {
      console.error('Error deleting training type:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('trainings.types.title')}</h2>
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-button-add hover:bg-button-add/90">
              <Plus className="h-4 w-4" />
              {t('trainings.types.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingType ? t('trainings.types.edit') : t('trainings.types.add')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('trainings.types.name')} *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('trainings.types.namePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('trainings.types.description')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('trainings.types.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('trainings.types.validityMonths')}</Label>
                  <Input
                    type="number"
                    value={validityMonths}
                    onChange={(e) => setValidityMonths(e.target.value)}
                    min="1"
                    max="120"
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isMandatory"
                      checked={isMandatory}
                      onCheckedChange={(checked) => setIsMandatory(checked === true)}
                    />
                    <label htmlFor="isMandatory" className="text-sm cursor-pointer">
                      {t('trainings.types.mandatory')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('trainings.types.trainingLink')}</Label>
                <Input
                  type="url"
                  value={trainingLink}
                  onChange={(e) => setTrainingLink(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  {t('trainings.types.trainingLinkHelp')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('trainings.types.notificationDays')}</Label>
                <div className="flex flex-wrap gap-4">
                  {[30, 60, 90, 120].map((days) => (
                    <div key={days} className="flex items-center space-x-2">
                      <Checkbox
                        id={`notify-${days}`}
                        checked={notificationDays[days as keyof typeof notificationDays]}
                        onCheckedChange={(checked) => 
                          setNotificationDays(prev => ({ ...prev, [days]: checked === true }))
                        }
                      />
                      <label htmlFor={`notify-${days}`} className="text-sm cursor-pointer">
                        {days} {t('trainings.types.days')}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('trainings.types.notificationDaysHelp')}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('trainings.types.name')}</TableHead>
                <TableHead>{t('trainings.types.validityMonths')}</TableHead>
                <TableHead>{t('trainings.types.mandatory')}</TableHead>
                <TableHead>{t('trainings.types.trainingLink')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('trainings.types.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                trainingTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{type.title}</span>
                        {type.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {type.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{type.validity_months} {t('trainings.types.months')}</TableCell>
                    <TableCell>
                      {type.is_mandatory ? (
                        <Badge variant="destructive">{t('common.yes')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('common.no')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.training_link ? (
                        <a 
                          href={type.training_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t('trainings.types.openLink')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('trainings.types.deleteConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(type.id)}>
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
