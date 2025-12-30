import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';
import { Upload, CalendarIcon, Building2, MapPin, Award, Loader2 } from 'lucide-react';

interface RegisterTrainingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TrainingType {
  id: string;
  title: string;
  description: string | null;
  validity_months: number;
  is_mandatory: boolean;
}

interface CorporateGroup {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  group_id: string;
}

interface Plant {
  id: string;
  name: string;
  company_id: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function RegisterTrainingModal({ open, onOpenChange, onSuccess }: RegisterTrainingModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [corporateGroups, setCorporateGroups] = useState<CorporateGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [realizationDate, setRealizationDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [institution, setInstitution] = useState('');
  const [modality, setModality] = useState<'ead' | 'presencial'>('presencial');
  const [locationRoom, setLocationRoom] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateUrl, setCertificateUrl] = useState('');

  // Filtered lists based on selections
  const filteredCompanies = companies.filter(c => c.group_id === selectedGroup);
  const filteredPlants = plants.filter(p => p.company_id === selectedCompany);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  // Auto-calculate expiration date when realization date and training type change
  useEffect(() => {
    if (realizationDate && selectedType) {
      const trainingType = trainingTypes.find(t => t.id === selectedType);
      if (trainingType) {
        const realizationDateObj = new Date(realizationDate);
        const expiration = addMonths(realizationDateObj, trainingType.validity_months);
        setExpirationDate(format(expiration, 'yyyy-MM-dd'));
      }
    }
  }, [realizationDate, selectedType, trainingTypes]);

  // Reset dependent fields when parent selection changes
  useEffect(() => {
    setSelectedCompany('');
    setSelectedPlant('');
  }, [selectedGroup]);

  useEffect(() => {
    setSelectedPlant('');
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      const [typesRes, groupsRes, companiesRes, plantsRes, usersRes] = await Promise.all([
        supabase.from('training_types').select('*').order('title'),
        supabase.from('corporate_groups').select('id, name').order('name'),
        supabase.from('companies').select('id, name, group_id').order('name'),
        supabase.from('plants').select('id, name, company_id').order('name'),
        supabase.from('profiles').select('id, name, email').eq('is_active', true).order('name'),
      ]);

      if (typesRes.data) setTrainingTypes(typesRes.data);
      if (groupsRes.data) setCorporateGroups(groupsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (plantsRes.data) setPlants(plantsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('trainings.register.invalidFileType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('trainings.register.fileTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setCertificateFile(file);
  };

  const uploadCertificate = async (): Promise<string | null> => {
    if (!certificateFile) return null;

    setUploading(true);
    try {
      const fileExt = certificateFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-files')
        .upload(filePath, certificateFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('training-files')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast({
        title: t('trainings.register.uploadError'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!selectedType || !selectedPlant || !realizationDate || !institution || !certificateFile) {
      toast({
        title: t('common.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload certificate
      const certUrl = await uploadCertificate();
      if (!certUrl && certificateFile) {
        setLoading(false);
        return;
      }

      const realizationDateTime = new Date(`${realizationDate}T09:00:00`).toISOString();

      // Create training session
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          training_type_id: selectedType,
          plant_id: selectedPlant,
          instructor_id: selectedInstructor || user.id,
          scheduled_date: realizationDateTime,
          completed_at: realizationDateTime,
          status: 'completed',
          institution,
          modality,
          location_room: locationRoom || null,
          expiration_date: expirationDate,
          certificate_url: certUrl,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      toast({ title: t('trainings.register.success') });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error registering training:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setSelectedGroup('');
    setSelectedCompany('');
    setSelectedPlant('');
    setSelectedInstructor('');
    setRealizationDate('');
    setExpirationDate('');
    setInstitution('');
    setModality('presencial');
    setLocationRoom('');
    setCertificateFile(null);
    setCertificateUrl('');
  };

  const selectedTypeData = trainingTypes.find(t => t.id === selectedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t('trainings.register.title')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Training Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('trainings.register.trainingType')} <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('trainings.register.selectTrainingType')} />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.title}
                      {type.is_mandatory && ' ⚠️'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeData?.description && (
                <p className="text-xs text-muted-foreground">{selectedTypeData.description}</p>
              )}
              {selectedTypeData && (
                <p className="text-xs text-muted-foreground">
                  {t('trainings.register.validityInfo', { months: selectedTypeData.validity_months })}
                </p>
              )}
            </div>

            {/* Project (Corporate Group) and Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {t('trainings.register.project')} <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('trainings.register.selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {corporateGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('trainings.register.company')} <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={selectedCompany} 
                  onValueChange={setSelectedCompany}
                  disabled={!selectedGroup}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('trainings.register.selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit (Plant) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {t('trainings.register.unit')} <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedPlant} 
                onValueChange={setSelectedPlant}
                disabled={!selectedCompany}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('trainings.register.selectUnit')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPlants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {t('trainings.register.realizationDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={realizationDate}
                  onChange={(e) => setRealizationDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {t('trainings.register.expirationDate')}
                </Label>
                <Input
                  type="date"
                  value={expirationDate}
                  readOnly
                  className="w-full bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t('trainings.register.autoCalculated')}
                </p>
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('trainings.register.institution')} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={t('trainings.register.institutionPlaceholder')}
              />
            </div>

            {/* Modality and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('trainings.register.modality')} <span className="text-destructive">*</span>
                </Label>
                <Select value={modality} onValueChange={(v: 'ead' | 'presencial') => setModality(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">{t('trainings.register.presencial')}</SelectItem>
                    <SelectItem value="ead">{t('trainings.register.ead')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('trainings.register.location')}
                </Label>
                <Input
                  value={locationRoom}
                  onChange={(e) => setLocationRoom(e.target.value)}
                  placeholder={modality === 'ead' ? 'https://...' : t('trainings.register.locationPlaceholder')}
                />
              </div>
            </div>

            {/* Instructor */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('trainings.register.instructor')}
              </Label>
              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger>
                  <SelectValue placeholder={t('trainings.register.selectInstructor')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Certificate Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('trainings.register.certificate')} <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 transition-colors hover:border-primary/50">
                <input
                  type="file"
                  id="certificate-upload"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="certificate-upload"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  {certificateFile ? (
                    <>
                      <div className="flex items-center gap-2 text-primary">
                        <Award className="h-8 w-8" />
                        <span className="font-medium">{certificateFile.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(certificateFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {t('trainings.register.uploadCertificate')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, JPG, PNG (max 10MB)
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {(loading || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
