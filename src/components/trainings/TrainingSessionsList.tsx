import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { supabase } from '@/integrations/supabase/client';
import { Plus, Play, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduleTrainingModal } from './ScheduleTrainingModal';
import { RegisterTrainingModal } from './RegisterTrainingModal';
import { useToast } from '@/hooks/use-toast';

interface TrainingSessionsListProps {
  onStartClass: (sessionId: string) => void;
}

interface Session {
  id: string;
  scheduled_date: string;
  status: string;
  location_room: string | null;
  max_participants: number | null;
  training_type: {
    title: string;
  };
  instructor: {
    name: string;
  };
  plant: {
    name: string;
  };
  enrollments_count: number;
}

export function TrainingSessionsList({ onStartClass }: TrainingSessionsListProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          scheduled_date,
          status,
          location_room,
          max_participants,
          training_types(title),
          profiles!training_sessions_instructor_id_fkey(name),
          plants(name)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      // Fetch enrollment counts
      const sessionIds = data?.map(s => s.id) || [];
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('training_enrollments')
        .select('session_id')
        .in('session_id', sessionIds);

      if (enrollmentsError) throw enrollmentsError;

      const enrollmentCounts: Record<string, number> = {};
      enrollments?.forEach(e => {
        enrollmentCounts[e.session_id] = (enrollmentCounts[e.session_id] || 0) + 1;
      });

      const sessionsData = (data || []).map(s => ({
        id: s.id,
        scheduled_date: s.scheduled_date,
        status: s.status,
        location_room: s.location_room,
        max_participants: s.max_participants,
        training_type: { title: (s.training_types as any)?.title || '' },
        instructor: { name: (s.profiles as any)?.name || '' },
        plant: { name: (s.plants as any)?.name || '' },
        enrollments_count: enrollmentCounts[s.id] || 0,
      }));

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({ title: t('trainings.sessionStarted') });
      onStartClass(sessionId);
    } catch (error) {
      console.error('Error starting session:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      scheduled: 'secondary',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {t(`trainings.status.${status}`)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold">{t('trainings.sessions.title')}</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 w-full sm:w-auto"
            onClick={() => setIsRegisterModalOpen(true)}
          >
            <Award className="h-4 w-4" />
            {t('trainings.register.registerButton')}
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-button-add hover:bg-button-add/90 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {t('trainings.sessions.schedule')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('trainings.sessions.schedule')}</DialogTitle>
              </DialogHeader>
              <ScheduleTrainingModal 
                onClose={() => {
                  setIsModalOpen(false);
                  fetchSessions();
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <RegisterTrainingModal
        open={isRegisterModalOpen}
        onOpenChange={setIsRegisterModalOpen}
        onSuccess={fetchSessions}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('trainings.sessions.trainingName')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('trainings.sessions.instructor')}</TableHead>
                <TableHead>{t('trainings.sessions.location')}</TableHead>
                <TableHead>{t('trainings.sessions.enrolled')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('trainings.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.training_type.title}
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.scheduled_date), 'dd MMM yyyy HH:mm', {
                        locale: i18n.language === 'pt-BR' ? ptBR : undefined,
                      })}
                    </TableCell>
                    <TableCell>{session.instructor.name}</TableCell>
                    <TableCell>{session.location_room || session.plant.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {session.enrollments_count}
                        {session.max_participants && `/${session.max_participants}`}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartSession(session.id)}
                          className="gap-1"
                        >
                          <Play className="h-3 w-3" />
                          {t('trainings.sessions.startClass')}
                        </Button>
                      )}
                      {session.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onStartClass(session.id)}
                          className="gap-1"
                        >
                          <Play className="h-3 w-3" />
                          {t('trainings.sessions.continueClass')}
                        </Button>
                      )}
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
