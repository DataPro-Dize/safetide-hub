import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RiskMatrix } from './RiskMatrix';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { Tables } from '@/integrations/supabase/types';

type CorporateGroup = Tables<'corporate_groups'>;
type Company = Tables<'companies'>;
type Plant = Tables<'plants'>;

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  group_id: z.string().min(1, 'Select a group'),
  company_id: z.string().min(1, 'Select a company'),
  plant_id: z.string().min(1, 'Select a plant'),
  category: z.string().min(1, 'Select a category'),
  classification: z.string().min(1, 'Select a classification'),
  probability: z.number().min(1).max(3),
  severity: z.number().min(1).max(3),
  location_details: z.string().optional(),
  phase: z.string().min(1, 'Select a phase'),
});

type FormValues = z.infer<typeof formSchema>;

interface NewDeviationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewDeviationSheet({ open, onOpenChange, onSuccess }: NewDeviationSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [groups, setGroups] = useState<CorporateGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<Plant[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      group_id: '',
      company_id: '',
      plant_id: '',
      category: '',
      classification: 'health_safety',
      probability: 1,
      severity: 1,
      location_details: '',
      phase: '',
    },
  });

  const selectedGroupId = form.watch('group_id');
  const selectedCompanyId = form.watch('company_id');
  const probability = form.watch('probability');
  const severity = form.watch('severity');
  const riskRating = probability * severity;

  useEffect(() => {
    const fetchData = async () => {
      const [groupsRes, companiesRes, plantsRes] = await Promise.all([
        supabase.from('corporate_groups').select('*'),
        supabase.from('companies').select('*'),
        supabase.from('plants').select('*'),
      ]);
      
      if (groupsRes.data) setGroups(groupsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (plantsRes.data) setPlants(plantsRes.data);
    };
    
    if (open) fetchData();
  }, [open]);

  useEffect(() => {
    if (selectedGroupId) {
      setFilteredCompanies(companies.filter(c => c.group_id === selectedGroupId));
      form.setValue('company_id', '');
      form.setValue('plant_id', '');
    }
  }, [selectedGroupId, companies]);

  useEffect(() => {
    if (selectedCompanyId) {
      setFilteredPlants(plants.filter(p => p.company_id === selectedCompanyId));
      form.setValue('plant_id', '');
    }
  }, [selectedCompanyId, plants]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t('common.error'), variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('deviations').insert({
      title: values.title,
      description: values.description || null,
      plant_id: values.plant_id,
      category: values.category as any,
      classification: values.classification as any,
      probability: values.probability,
      severity: values.severity,
      location_details: values.location_details || null,
      creator_id: user.id,
      status: 'open',
      photos: photos,
      phase: values.phase as any,
    });

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('deviations.createSuccess') });
      form.reset();
      setPhotos([]);
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  const categories = [
    'not_applicable', 'access_exit', 'chemical_handling', 'confined_space',
    'contractor_management', 'driving_safety', 'electrical_safety', 'ergonomics',
    'excavations', 'fire', 'housekeeping', 'load_handling', 'lighting', 'loto',
    'manual_load_handling', 'noise', 'machinery', 'ppe', 'procedures', 'scaffolding',
    'signage', 'slip_trip_fall', 'storage', 'wellbeing', 'work_at_height'
  ];

  const classifications = [
    'audit', 'environment', 'health_safety', 'property_security', 'social_responsibility'
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('deviations.new')}</SheetTitle>
          <SheetDescription>{t('deviations.newDescription')}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('deviations.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('deviations.descriptionPlaceholder')} 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hierarchy Selection */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm">{t('deviations.selectLocation')}</h4>
              
              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deviations.companyLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('deviations.selectCompanyLabel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deviations.projectLabel')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedGroupId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('deviations.selectProjectLabel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plant_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deviations.plant')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedCompanyId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('deviations.selectPlant')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredPlants.map((plant) => (
                          <SelectItem key={plant.id} value={plant.id}>
                            {plant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deviations.category')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('deviations.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {t(`deviations.categories.${cat}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deviations.classification')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('deviations.selectClassification')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classifications.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {t(`deviations.classifications.${cls}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phase dropdown */}
            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deviations.phase')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('deviations.selectPhase')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="operations">{t('deviations.phases.operations')}</SelectItem>
                      <SelectItem value="construction">{t('deviations.phases.construction')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Risk Matrix */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm">{t('deviations.riskAssessment')}</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('deviations.probability')}</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(parseInt(v))} 
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">{t('deviations.probabilityLevels.low')}</SelectItem>
                          <SelectItem value="2">{t('deviations.probabilityLevels.medium')}</SelectItem>
                          <SelectItem value="3">{t('deviations.probabilityLevels.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('deviations.severity')}</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(parseInt(v))} 
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">{t('deviations.severityLevels.low')}</SelectItem>
                          <SelectItem value="2">{t('deviations.severityLevels.medium')}</SelectItem>
                          <SelectItem value="3">{t('deviations.severityLevels.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <RiskMatrix probability={probability} severity={severity} />
            </div>

            <FormField
              control={form.control}
              name="location_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deviations.locationDetails')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('deviations.locationPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>{t('deviations.photos')}</Label>
              <ImageUpload
                bucket="deviation-photos"
                maxImages={10}
                images={photos}
                onImagesChange={setPhotos}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="brand" className="flex-1" disabled={loading}>
                {loading ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
