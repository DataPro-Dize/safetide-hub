import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Plus, Download } from 'lucide-react';
import { NewDeviationSheet } from '@/components/deviations/NewDeviationSheet';
import { DeviationDetailsSheet } from '@/components/deviations/DeviationDetailsSheet';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import * as XLSX from 'xlsx';

type Deviation = Tables<'deviations'>;
type Profile = Tables<'profiles'>;
type Plant = Tables<'plants'>;
type Company = Tables<'companies'>;

export default function RiskManagement() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Search filters
  const [searchId, setSearchId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchReporter, setSearchReporter] = useState('');

  const fetchDeviations = async () => {
    setLoading(true);
    
    // Fetch plants and companies for display
    const [plantsRes, companiesRes] = await Promise.all([
      supabase.from('plants').select('*'),
      supabase.from('companies').select('*'),
    ]);
    if (plantsRes.data) setPlants(plantsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    
    let query = supabase.from('deviations').select('*, sequence_id').order('created_at', { ascending: false });
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as DeviationStatus);
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter as DeviationCategory);
    }

    const { data, error } = await query;
    if (!error && data) {
      setDeviations(data);
      // Fetch profiles for creators
      const creatorIds = [...new Set(data.map(d => d.creator_id))];
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', creatorIds);
        if (profilesData) setProfiles(profilesData);
      }
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
    'not_applicable', 'access_exit', 'chemical_handling', 'confined_space',
    'contractor_management', 'driving_safety', 'electrical_safety', 'ergonomics',
    'excavations', 'fire', 'housekeeping', 'load_handling', 'lighting', 'loto',
    'manual_load_handling', 'noise', 'machinery', 'ppe', 'procedures', 'scaffolding',
    'signage', 'slip_trip_fall', 'storage', 'wellbeing', 'work_at_height'
  ];

  // Apply search filters
  const filteredDeviations = deviations.filter(deviation => {
    const creatorProfile = profiles.find(p => p.id === deviation.creator_id);
    const creatorName = creatorProfile?.name || '';
    const dateStr = format(new Date(deviation.created_at), 'dd/MM/yyyy');
    
    if (searchId && !(deviation as any).sequence_id?.toString().includes(searchId)) return false;
    if (searchTitle && !deviation.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
    if (searchDate && !dateStr.includes(searchDate)) return false;
    if (searchReporter && !creatorName.toLowerCase().includes(searchReporter.toLowerCase())) return false;
    
    return true;
  });

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredDeviations.map(deviation => {
      const creatorProfile = profiles.find(p => p.id === deviation.creator_id);
      return {
        'ID': (deviation as any).sequence_id || deviation.id.substring(0, 8),
        [t('common.title')]: deviation.title,
        [t('deviations.category')]: t(`deviations.categories.${deviation.category}`),
        [t('deviations.riskRating')]: getRiskLabel(deviation.risk_rating),
        [t('common.status')]: t(`deviations.status.${deviation.status}`),
        [t('deviations.reportedBy')]: creatorProfile?.name || '-',
        [t('common.date')]: format(new Date(deviation.created_at), 'dd/MM/yyyy HH:mm'),
        [t('common.description')]: deviation.description || '',
        [t('deviations.locationDetails')]: deviation.location_details || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riscos');
    XLSX.writeFile(wb, `riscos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={filteredDeviations.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="brand" onClick={() => setIsNewSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('deviations.new')}
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>{t('common.title')}</TableHead>
                <TableHead>{t('deviations.projectLabel')}</TableHead>
                <TableHead>{t('deviations.plant')}</TableHead>
                <TableHead>{t('deviations.category')}</TableHead>
                <TableHead>{t('deviations.riskRating')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('deviations.reportedBy')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
              </TableRow>
              {/* Search Row */}
              <TableRow className="bg-muted/30">
                <TableHead className="py-2">
                  <Input 
                    placeholder="Buscar..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2">
                  <Input 
                    placeholder="Buscar..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('common.all')} />
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
                </TableHead>
                <TableHead className="py-2"></TableHead>
                <TableHead className="py-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      <SelectItem value="open">{t('deviations.status.open')}</SelectItem>
                      <SelectItem value="in_progress">{t('deviations.status.in_progress')}</SelectItem>
                      <SelectItem value="done">{t('deviations.status.done')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="py-2">
                  <Input 
                    placeholder="Buscar..."
                    value={searchReporter}
                    onChange={(e) => setSearchReporter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="py-2">
                  <Input 
                    placeholder="dd/mm/aaaa"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      {t('common.loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDeviations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('deviations.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeviations.map((deviation) => {
                  const creatorProfile = profiles.find(p => p.id === deviation.creator_id);
                  const plant = plants.find(p => p.id === deviation.plant_id);
                  const company = plant ? companies.find(c => c.id === plant.company_id) : null;
                  return (
                    <TableRow 
                      key={deviation.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedDeviation(deviation)}
                    >
                      <TableCell className="font-mono text-xs font-semibold">
                        #{(deviation as any).sequence_id || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{deviation.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {company?.name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {plant?.name || '-'}
                      </TableCell>
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
                        {creatorProfile?.name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(deviation.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  );
                })
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