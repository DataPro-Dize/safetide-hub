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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleTrainingModalProps {
  onClose: () => void;
}

interface TrainingType {
  id: string;
  title: string;
  description: string | null;
  validity_months: number;
  is_mandatory: boolean;
  training_link: string | null;
  notification_days: number[] | null;
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

export function ScheduleTrainingModal({ onClose }: ScheduleTrainingModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [selectedType, setSelectedType] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [locationRoom, setLocationRoom] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('30');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [trainingLink, setTrainingLink] = useState('');

  const selectedTypeData = trainingTypes.find(t => t.id === selectedType);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch training types
      const { data: types, error: typesError } = await supabase
        .from('training_types')
        .select('*')
        .order('title');

      if (typesError) throw typesError;
      setTrainingTypes(types || []);

      // Fetch plants
      const { data: plantsData, error: plantsError } = await supabase
        .from('plants')
        .select('id, name, company_id')
        .order('name');

      if (plantsError) throw plantsError;
      setPlants(plantsData || []);

      // Fetch users (potential instructors and participants)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !selectedPlant || !selectedInstructor || !scheduledDate || !scheduledTime) {
      toast({ title: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          training_type_id: selectedType,
          plant_id: selectedPlant,
          instructor_id: selectedInstructor,
          scheduled_date: scheduledDateTime,
          location_room: locationRoom || null,
          max_participants: parseInt(maxParticipants) || 30,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create enrollments for selected participants
      if (selectedParticipants.length > 0) {
        const enrollments = selectedParticipants.map(userId => ({
          session_id: session.id,
          user_id: userId,
          status: 'pending' as const,
        }));

        const { error: enrollmentsError } = await supabase
          .from('training_enrollments')
          .insert(enrollments);

        if (enrollmentsError) throw enrollmentsError;
      }

      toast({ title: t('trainings.sessions.createSuccess') });
      onClose();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('trainings.sessions.trainingType')} *</Label>
          <Select value={selectedType} onValueChange={(value) => {
            setSelectedType(value);
            const typeData = trainingTypes.find(t => t.id === value);
            if (typeData?.training_link) {
              setTrainingLink(typeData.training_link);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t('trainings.sessions.selectType')} />
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
        </div>

        <div className="space-y-2">
          <Label>{t('trainings.sessions.plant')} *</Label>
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger>
              <SelectValue placeholder={t('trainings.sessions.selectPlant')} />
            </SelectTrigger>
            <SelectContent>
              {plants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('common.date')} *</Label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('trainings.sessions.time')} *</Label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('trainings.sessions.instructor')} *</Label>
          <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
            <SelectTrigger>
              <SelectValue placeholder={t('trainings.sessions.selectInstructor')} />
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

        <div className="space-y-2">
          <Label>{t('trainings.sessions.location')}</Label>
          <Input
            value={locationRoom}
            onChange={(e) => setLocationRoom(e.target.value)}
            placeholder={t('trainings.sessions.locationPlaceholder')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('trainings.sessions.maxParticipants')}</Label>
          <Input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            min="1"
            max="100"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('trainings.sessions.trainingLink')}</Label>
          <Input
            type="url"
            value={trainingLink}
            onChange={(e) => setTrainingLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('trainings.sessions.participants')}</Label>
        <ScrollArea className="h-[200px] border rounded-md p-3">
          <div className="space-y-2">
            {users
              .filter(u => u.id !== selectedInstructor)
              .map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={user.id}
                    checked={selectedParticipants.includes(user.id)}
                    onCheckedChange={() => handleParticipantToggle(user.id)}
                  />
                  <label
                    htmlFor={user.id}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {user.name}
                    <span className="text-muted-foreground ml-2">({user.email})</span>
                  </label>
                </div>
              ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          {t('trainings.sessions.selectedCount', { count: selectedParticipants.length })}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
