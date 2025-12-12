import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type DeviationStatus = Database['public']['Enums']['deviation_status'];
type DeviationCategory = Database['public']['Enums']['deviation_category'];
import { Plus, Filter } from 'lucide-react';
import { NewDeviationSheet } from '@/components/deviations/NewDeviationSheet';
import { DeviationDetailsSheet } from '@/components/deviations/DeviationDetailsSheet';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Deviation = Tables<'deviations'>;

export default function RiskManagement() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchDeviations = async () => {
    setLoading(true);
    let query = supabase.from('deviations').select('*').order('created_at', { ascending: false });
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as DeviationStatus);
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter as DeviationCategory);
    }

    const { data, error } = await query;
    if (!error && data) {
      setDeviations(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeviations();
  }, [statusFilter, categoryFilter]);

  const getRiskColor = (rating: number | null) => {
    if (!rating) return 'text-muted-foreground';
    if (rating <= 2) return 'text-success';
    if (rating <= 4) return 'text-warning';
    return 'text-destructive';
  };

  const getRiskLabel = (rating: number | null) => {
    if (!rating) return '-';
    if (rating <= 2) return t('deviations.riskLevels.low');
    if (rating <= 4) return t('deviations.riskLevels.medium');
    return t('deviations.riskLevels.high');
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'done': return 'outline';
      default: return 'default';
    }
  };

  const dateLocale = language === 'pt-BR' ? ptBR : enUS;

  const categories = [
    'access_exit', 'chemical_products', 'electrical', 'fire', 
    'ergonomics', 'ppe', 'machinery', 'fall_protection', 'confined_space', 'other'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('deviations.pageTitle')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('deviations.pageDescription')}
          </p>
        </div>
        <Button variant="brand" onClick={() => setIsNewSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('deviations.new')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="open">{t('deviations.status.open')}</SelectItem>
                <SelectItem value="in_progress">{t('deviations.status.in_progress')}</SelectItem>
                <SelectItem value="done">{t('deviations.status.done')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('deviations.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`deviations.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>{t('common.title')}</TableHead>
                <TableHead>{t('deviations.category')}</TableHead>
                <TableHead>{t('deviations.riskRating')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      {t('common.loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : deviations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('deviations.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                deviations.map((deviation) => (
                  <TableRow 
                    key={deviation.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedDeviation(deviation)}
                  >
                    <TableCell className="font-mono text-xs">
                      {deviation.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{deviation.title}</TableCell>
                    <TableCell>
                      {t(`deviations.categories.${deviation.category}`)}
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-semibold', getRiskColor(deviation.risk_rating))}>
                        {getRiskLabel(deviation.risk_rating)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(deviation.status)}>
                        {t(`deviations.status.${deviation.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(deviation.created_at), 'PPP', { locale: dateLocale })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewDeviationSheet 
        open={isNewSheetOpen} 
        onOpenChange={setIsNewSheetOpen}
        onSuccess={fetchDeviations}
      />

      <DeviationDetailsSheet
        deviation={selectedDeviation}
        open={!!selectedDeviation}
        onOpenChange={(open) => !open && setSelectedDeviation(null)}
        onUpdate={fetchDeviations}
      />
    </div>
  );
}
