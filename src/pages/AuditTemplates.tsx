import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Plus, Trash2, GripVertical, Edit2, Power, Search, FileText, CheckSquare } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

interface Section {
  id: string;
  name: string;
  order_index: number;
  questions: Question[];
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
}

export default function AuditTemplates() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ sectionId: string; question: Question | null }>({ sectionId: '', question: null });
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'template' | 'section' | 'question'; id: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', category: 'safety', is_active: true });
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [questionForm, setQuestionForm] = useState({ question_text: '' });

  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  useEffect(() => {
    fetchTemplates();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      fetchSections(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_template_sections')
        .select(`
          id,
          name,
          order_index,
          audit_template_questions(id, question_text, order_index)
        `)
        .eq('template_id', templateId)
        .order('order_index');

      if (error) throw error;

      const formattedSections = (data || []).map(section => ({
        id: section.id,
        name: section.name,
        order_index: section.order_index,
        questions: (section.audit_template_questions || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            order_index: q.order_index,
          })),
      }));

      setSections(formattedSections);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('audit_templates')
          .update({
            name: templateForm.name,
            description: templateForm.description,
            category: templateForm.category,
            is_active: templateForm.is_active,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('audit_templates')
          .insert({
            name: templateForm.name,
            description: templateForm.description,
            category: templateForm.category,
            is_active: templateForm.is_active,
          });
        if (error) throw error;
      }

      toast({ title: t('audit.templates.saveSuccess') });
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '', category: 'safety', is_active: true });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleToggleTemplateStatus = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('audit_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast({ title: template.is_active ? t('audit.templates.deactivated') : t('audit.templates.activated') });
      fetchTemplates();
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate({ ...template, is_active: !template.is_active });
      }
    } catch (error) {
      console.error('Error toggling template status:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleSaveSection = async () => {
    if (!selectedTemplate) return;

    try {
      const order_index = sections.length;

      if (editingSection) {
        const { error } = await supabase
          .from('audit_template_sections')
          .update({ name: sectionForm.name })
          .eq('id', editingSection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('audit_template_sections')
          .insert({
            template_id: selectedTemplate.id,
            name: sectionForm.name,
            order_index,
          });
        if (error) throw error;
      }

      toast({ title: t('audit.templates.saveSuccess') });
      setIsSectionModalOpen(false);
      setEditingSection(null);
      setSectionForm({ name: '' });
      fetchSections(selectedTemplate.id);
    } catch (error) {
      console.error('Error saving section:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion.sectionId) return;

    try {
      const section = sections.find(s => s.id === editingQuestion.sectionId);
      const order_index = section?.questions.length || 0;

      if (editingQuestion.question) {
        const { error } = await supabase
          .from('audit_template_questions')
          .update({ question_text: questionForm.question_text })
          .eq('id', editingQuestion.question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('audit_template_questions')
          .insert({
            section_id: editingQuestion.sectionId,
            question_text: questionForm.question_text,
            order_index,
          });
        if (error) throw error;
      }

      toast({ title: t('audit.templates.saveSuccess') });
      setIsQuestionModalOpen(false);
      setEditingQuestion({ sectionId: '', question: null });
      setQuestionForm({ question_text: '' });
      if (selectedTemplate) fetchSections(selectedTemplate.id);
    } catch (error) {
      console.error('Error saving question:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      const table = deleteDialog.type === 'template' 
        ? 'audit_templates' 
        : deleteDialog.type === 'section' 
          ? 'audit_template_sections' 
          : 'audit_template_questions';

      const { error } = await supabase.from(table).delete().eq('id', deleteDialog.id);
      if (error) throw error;

      toast({ title: t('audit.templates.deleteSuccess') });

      if (deleteDialog.type === 'template') {
        setSelectedTemplate(null);
        fetchTemplates();
      } else if (selectedTemplate) {
        fetchSections(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setDeleteDialog(null);
    }
  };

  const openEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      category: template.category,
      is_active: template.is_active,
    });
    setIsTemplateModalOpen(true);
  };

  const openEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionForm({ name: section.name });
    setIsSectionModalOpen(true);
  };

  const openAddQuestion = (sectionId: string) => {
    setEditingQuestion({ sectionId, question: null });
    setQuestionForm({ question_text: '' });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestion = (sectionId: string, question: Question) => {
    setEditingQuestion({ sectionId, question });
    setQuestionForm({ question_text: question.question_text });
    setIsQuestionModalOpen(true);
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (categoryFilter !== 'all' && template.category !== categoryFilter) return false;
    if (statusFilter === 'active' && !template.is_active) return false;
    if (statusFilter === 'inactive' && template.is_active) return false;
    return true;
  });

  const totalQuestions = sections.reduce((acc, section) => acc + section.questions.length, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('audit.templates.title')}</h1>
          <p className="text-muted-foreground">{t('audit.templates.description')}</p>
        </div>
        {isAdmin && (
          <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({ name: '', description: '', category: 'safety', is_active: true });
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('audit.templates.newTemplate')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? t('audit.templates.editTemplate') : t('audit.templates.newTemplate')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('common.name')} *</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder={t('audit.templates.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('common.description')}</Label>
                  <Textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder={t('audit.templates.descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('deviations.category')}</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safety">{t('audit.categories.safety')}</SelectItem>
                      <SelectItem value="environment">{t('audit.categories.environment')}</SelectItem>
                      <SelectItem value="health">{t('audit.categories.health')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <Label htmlFor="template-active" className="text-base">{t('audit.templates.activeStatus')}</Label>
                    <p className="text-sm text-muted-foreground">{t('audit.templates.activeDescription')}</p>
                  </div>
                  <Switch
                    id="template-active"
                    checked={templateForm.is_active}
                    onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={!templateForm.name.trim()}>
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('audit.templates.list')}</CardTitle>
            <div className="space-y-3 pt-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {/* Filters */}
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('deviations.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="safety">{t('audit.categories.safety')}</SelectItem>
                    <SelectItem value="environment">{t('audit.categories.environment')}</SelectItem>
                    <SelectItem value="health">{t('audit.categories.health')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('common.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('audit.templates.noData')}</p>
            ) : (
              filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id 
                      ? 'bg-primary/10 border-2 border-primary shadow-sm' 
                      : 'hover:bg-muted border border-transparent'
                  } ${!template.is_active ? 'opacity-60' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="font-medium truncate">{template.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {t(`audit.categories.${template.category}`)}
                        </Badge>
                        <Badge 
                          variant={template.is_active ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleToggleTemplateStatus(template); }}
                          title={template.is_active ? t('audit.templates.deactivate') : t('audit.templates.activate')}
                        >
                          <Power className={`h-3.5 w-3.5 ${template.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditTemplate(template); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ type: 'template', id: template.id }); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sections & Questions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">{t('audit.templates.sections')}</CardTitle>
              {selectedTemplate && (
                <p className="text-sm text-muted-foreground mt-1">
                  {sections.length} {t('audit.templates.sections').toLowerCase()} • {totalQuestions} {t('audit.templates.questions').toLowerCase()}
                </p>
              )}
            </div>
            {selectedTemplate && isAdmin && (
              <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    setEditingSection(null);
                    setSectionForm({ name: '' });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('audit.templates.addSection')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSection ? t('audit.templates.editSection') : t('audit.templates.addSection')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('common.name')} *</Label>
                      <Input
                        value={sectionForm.name}
                        onChange={(e) => setSectionForm({ name: e.target.value })}
                        placeholder={t('audit.templates.sectionPlaceholder')}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsSectionModalOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSaveSection} disabled={!sectionForm.name.trim()}>
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-350px)] overflow-y-auto">
            {!selectedTemplate ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('audit.templates.selectTemplate')}</p>
              </div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('audit.templates.noSections')}</p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                {sections.map(section => (
                  <AccordionItem key={section.id} value={section.id} className="border rounded-lg mb-3 px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{section.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {section.questions.length} {section.questions.length === 1 ? t('audit.templates.question') : t('audit.templates.questions').toLowerCase()}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {isAdmin && (
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditSection(section)}>
                              <Edit2 className="h-3 w-3 mr-1" />
                              {t('common.edit')}
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteDialog({ type: 'section', id: section.id })}>
                              <Trash2 className="h-3 w-3 mr-1" />
                              {t('common.delete')}
                            </Button>
                          </div>
                          <Button variant="default" size="sm" onClick={() => openAddQuestion(section.id)}>
                            <Plus className="h-3 w-3 mr-1" />
                            {t('audit.templates.addQuestion')}
                          </Button>
                        </div>
                      )}
                      <div className="space-y-2">
                        {section.questions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">{t('audit.templates.noQuestions')}</p>
                        ) : (
                          section.questions.map((question, index) => (
                            <div key={question.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-muted-foreground w-6">{index + 1}.</span>
                                <p className="text-sm">{question.question_text}</p>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditQuestion(section.id, question)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDialog({ type: 'question', id: question.id })}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question Modal */}
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingQuestion.question ? t('audit.templates.editQuestion') : t('audit.templates.addQuestion')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('audit.templates.questionText')} *</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ question_text: e.target.value })}
                placeholder={t('audit.templates.questionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsQuestionModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveQuestion} disabled={!questionForm.question_text.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('audit.templates.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('audit.templates.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}