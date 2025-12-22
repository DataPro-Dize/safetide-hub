import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, MapPin, Users, UserPlus, Camera, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SignaturePad } from '@/components/audit/SignaturePad';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface TrainingClassroomProps {
  sessionId: string;
  onClose: () => void;
}

interface Session {
  id: string;
  scheduled_date: string;
  location_room: string | null;
  training_type: {
    title: string;
  };
  plant: {
    name: string;
  };
}

interface Enrollment {
  id: string;
  user_id: string;
  status: string;
  digital_signature_url: string | null;
  user: {
    name: string;
    email: string;
  };
}

export function TrainingClassroom({ sessionId, onClose }: TrainingClassroomProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [signatureEnrollment, setSignatureEnrollment] = useState<Enrollment | null>(null);
  const [signatureValue, setSignatureValue] = useState<string | null>(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    fetchSessionData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select(`
          id,
          scheduled_date,
          location_room,
          training_types(title),
          plants(name)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      setSession({
        id: sessionData.id,
        scheduled_date: sessionData.scheduled_date,
        location_room: sessionData.location_room,
        training_type: { title: (sessionData.training_types as any)?.title || '' },
        plant: { name: (sessionData.plants as any)?.name || '' },
      });

      // Fetch enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('training_enrollments')
        .select(`
          id,
          user_id,
          status,
          digital_signature_url,
          profiles(name, email)
        `)
        .eq('session_id', sessionId);

      if (enrollmentsError) throw enrollmentsError;

      const enrollmentsList = (enrollmentsData || []).map(e => ({
        id: e.id,
        user_id: e.user_id,
        status: e.status,
        digital_signature_url: e.digital_signature_url,
        user: {
          name: (e.profiles as any)?.name || '',
          email: (e.profiles as any)?.email || '',
        },
      }));

      setEnrollments(enrollmentsList);

      // Fetch existing evidence
      const { data: evidenceData } = await supabase
        .from('training_evidence')
        .select('photo_url')
        .eq('session_id', sessionId);

      if (evidenceData) {
        setEvidencePhotos(evidenceData.map(e => e.photo_url));
      }

    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceToggle = async (enrollment: Enrollment, isPresent: boolean) => {
    if (isPresent && !enrollment.digital_signature_url) {
      setSignatureEnrollment(enrollment);
      setSignatureValue(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('training_enrollments')
        .update({ status: isPresent ? 'present' : 'pending' })
        .eq('id', enrollment.id);

      if (error) throw error;

      setEnrollments(prev =>
        prev.map(e =>
          e.id === enrollment.id ? { ...e, status: isPresent ? 'present' : 'pending' } : e
        )
      );
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleSignatureSave = async () => {
    if (!signatureEnrollment || !signatureValue) return;

    try {
      // Upload signature
      const fileName = `${sessionId}/${signatureEnrollment.user_id}_signature.png`;
      const response = await fetch(signatureValue);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('training-files')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Update enrollment
      const { error } = await supabase
        .from('training_enrollments')
        .update({
          status: 'present',
          digital_signature_url: fileName,
          signed_at: new Date().toISOString(),
        })
        .eq('id', signatureEnrollment.id);

      if (error) throw error;

      setEnrollments(prev =>
        prev.map(e =>
          e.id === signatureEnrollment.id
            ? { ...e, status: 'present', digital_signature_url: fileName }
            : e
        )
      );

      toast({ title: t('trainings.classroom.signatureSaved') });
      setSignatureEnrollment(null);
      setSignatureValue(null);
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleAddParticipant = async () => {
    const enrolledUserIds = enrollments.map(e => e.user_id);
    
    const { data: users } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name');

    const filtered = (users || []).filter(u => !enrolledUserIds.includes(u.id));
    setAvailableUsers(filtered);
    setShowAddParticipant(true);
  };

  const handleAddNewParticipant = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('training_enrollments')
        .insert({
          session_id: sessionId,
          user_id: userId,
          status: 'pending',
        })
        .select(`
          id,
          user_id,
          status,
          digital_signature_url,
          profiles(name, email)
        `)
        .single();

      if (error) throw error;

      const newEnrollment: Enrollment = {
        id: data.id,
        user_id: data.user_id,
        status: data.status,
        digital_signature_url: data.digital_signature_url,
        user: {
          name: (data.profiles as any)?.name || '',
          email: (data.profiles as any)?.email || '',
        },
      };

      setEnrollments(prev => [...prev, newEnrollment]);
      setShowAddParticipant(false);
      toast({ title: t('trainings.classroom.participantAdded') });
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleEvidenceChange = async (urls: string[]) => {
    const newUrls = urls.filter(url => !evidencePhotos.includes(url));
    setEvidencePhotos(urls);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save new photos to training_evidence table
    for (const url of newUrls) {
      await supabase.from('training_evidence').insert({
        session_id: sessionId,
        photo_url: url,
        description: t('trainings.classroom.classPhoto'),
        uploaded_by: user.id,
      });
    }
  };

  const handleFinalizeTraining = async () => {
    setFinalizing(true);

    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({ title: t('trainings.classroom.trainingCompleted') });
      onClose();
    } catch (error) {
      console.error('Error finalizing training:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setFinalizing(false);
    }
  };

  if (loading || !session) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  const presentCount = enrollments.filter(e => e.status === 'present').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{session.training_type.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(currentTime, 'HH:mm:ss')}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {session.location_room || session.plant.name}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {presentCount}/{enrollments.length} {t('trainings.classroom.present')}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="text-white border-white hover:bg-white/20">
              <X className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('trainings.classroom.attendanceList')}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddParticipant}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('trainings.classroom.addParticipant')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{enrollment.user.name}</p>
                  <p className="text-sm text-muted-foreground">{enrollment.user.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  {enrollment.digital_signature_url && (
                    <Badge variant="outline" className="text-chart-2 border-chart-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('trainings.classroom.signed')}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t('trainings.classroom.present')}</span>
                    <Switch
                      checked={enrollment.status === 'present'}
                      onCheckedChange={(checked) => handleAttendanceToggle(enrollment, checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('trainings.classroom.evidence')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            images={evidencePhotos}
            onImagesChange={handleEvidenceChange}
            bucket="training-files"
            maxImages={5}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Finalize Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="w-full md:w-auto px-12 py-6 text-lg bg-button-add hover:bg-button-add/90"
          onClick={() => setShowFinalizeDialog(true)}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {t('trainings.classroom.finalize')}
        </Button>
      </div>

      {/* Signature Modal */}
      <Dialog open={!!signatureEnrollment} onOpenChange={() => setSignatureEnrollment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('trainings.classroom.signatureFor')} {signatureEnrollment?.user.name}
            </DialogTitle>
          </DialogHeader>
          <SignaturePad
            value={signatureValue}
            onChange={setSignatureValue}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSignatureEnrollment(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSignatureSave} disabled={!signatureValue}>
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Participant Modal */}
      <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('trainings.classroom.addParticipant')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {availableUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('trainings.classroom.noUsersAvailable')}
              </p>
            ) : (
              availableUsers.map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddNewParticipant(user.id)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {user.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('trainings.classroom.confirmFinalize')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('trainings.classroom.finalizeDescription', { 
                present: presentCount, 
                total: enrollments.length 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizeTraining} disabled={finalizing}>
              {finalizing ? t('common.loading') : t('trainings.classroom.finalize')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}