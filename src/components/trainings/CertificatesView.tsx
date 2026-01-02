import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, XCircle, Search, ExternalLink } from 'lucide-react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface Certificate {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  trainingType: string;
  trainingLink: string | null;
  completedAt: string;
  validityMonths: number;
  expiresAt: Date;
  daysUntilExpiration: number;
  status: 'valid' | 'expiring' | 'expired';
}

export function CertificatesView() {
  const { t, i18n } = useTranslation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const dateLocale = i18n.language === 'pt-BR' ? ptBR : enUS;

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      // Fetch completed enrollments with user and training info
      const { data, error } = await supabase
        .from('training_enrollments')
        .select(`
          id,
          user_id,
          signed_at,
          session:training_sessions!inner(
            completed_at,
            training_type:training_types(
              id,
              title,
              validity_months,
              training_link
            )
          ),
          user:profiles!inner(
            id,
            name,
            email
          )
        `)
        .eq('status', 'present')
        .not('signed_at', 'is', null);

      if (error) throw error;

      const now = new Date();
      const processedCerts: Certificate[] = [];

      (data || []).forEach((enrollment: any) => {
        const completedAt = enrollment.session?.completed_at || enrollment.signed_at;
        if (!completedAt || !enrollment.session?.training_type) return;

        const validityMonths = enrollment.session.training_type.validity_months || 12;
        const expiresAt = addMonths(new Date(completedAt), validityMonths);
        const daysUntilExpiration = differenceInDays(expiresAt, now);

        let status: 'valid' | 'expiring' | 'expired' = 'valid';
        if (daysUntilExpiration < 0) {
          status = 'expired';
        } else if (daysUntilExpiration <= 30) {
          status = 'expiring';
        }

        processedCerts.push({
          id: enrollment.id,
          userId: enrollment.user_id,
          userName: enrollment.user?.name || 'Unknown',
          userEmail: enrollment.user?.email || '',
          trainingType: enrollment.session.training_type.title,
          trainingLink: enrollment.session.training_type.training_link,
          completedAt: completedAt,
          validityMonths,
          expiresAt,
          daysUntilExpiration,
          status,
        });
      });

      // Sort by expiration date (most urgent first)
      processedCerts.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

      setCertificates(processedCerts);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, daysUntilExpiration: number) => {
    switch (status) {
      case 'valid':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('trainings.certificates.valid')}
          </Badge>
        );
      case 'expiring':
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t('trainings.certificates.expiring', { days: daysUntilExpiration })}
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            {t('trainings.certificates.expired')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.trainingType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: certificates.length,
    valid: certificates.filter((c) => c.status === 'valid').length,
    expiring: certificates.filter((c) => c.status === 'expiring').length,
    expired: certificates.filter((c) => c.status === 'expired').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trainings.certificates.total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-500">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              {t('trainings.certificates.validCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{stats.valid}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-500">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              {t('trainings.certificates.expiringCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.expiring}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4 inline mr-1" />
              {t('trainings.certificates.expiredCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('trainings.certificates.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('trainings.certificates.filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('trainings.certificates.allStatuses')}</SelectItem>
            <SelectItem value="valid">{t('trainings.certificates.valid')}</SelectItem>
            <SelectItem value="expiring">{t('trainings.certificates.expiringLabel')}</SelectItem>
            <SelectItem value="expired">{t('trainings.certificates.expired')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('trainings.certificates.collaborator')}</TableHead>
                <TableHead>{t('trainings.certificates.training')}</TableHead>
                <TableHead>{t('trainings.certificates.completedAt')}</TableHead>
                <TableHead>{t('trainings.certificates.expiresAt')}</TableHead>
                <TableHead>{t('trainings.certificates.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('trainings.certificates.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCertificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cert.userName}</div>
                        <div className="text-sm text-muted-foreground">{cert.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{cert.trainingType}</TableCell>
                    <TableCell>
                      {format(new Date(cert.completedAt), 'dd/MM/yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      {format(cert.expiresAt, 'dd/MM/yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>{getStatusBadge(cert.status, cert.daysUntilExpiration)}</TableCell>
                    <TableCell className="text-right">
                      {cert.trainingLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(cert.trainingLink!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {t('trainings.certificates.renew')}
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
