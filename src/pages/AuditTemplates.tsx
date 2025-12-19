import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, GripVertical, Edit2 } from 'lucide-react';

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

  // Form states
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', category: 'safety' });
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [questionForm, setQuestionForm] = useState({ question_text: '' });

  useEffect(() => {
    fetchTemplates();
  }, []);

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
          .update(templateForm)
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('audit_templates')
          .insert(templateForm);
        if (error) throw error;
      }

      toast({ title: t('audit.templates.saveSuccess') });
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '', category: 'safety' });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('audit.templates.title')}</h1>
          <p className="text-muted-foreground">{t('audit.templates.description')}</p>
        </div>
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTemplate(null);
              setTemplateForm({ name: '', description: '', category: 'safety' });
            }}>
              <Plus className="h-4 w-4 mr-2" />
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
                <Label>{t('common.name')}</Label>
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('audit.templates.list')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('audit.templates.noData')}</p>
            ) : (
              templates.map(template => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    selectedTemplate?.id === template.id 
                      ? 'bg-primary/10 border border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{t(`audit.categories.${template.category}`)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditTemplate(template); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ type: 'template', id: template.id }); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sections & Questions */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('audit.templates.sections')}</CardTitle>
            {selectedTemplate && (
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
                      <Label>{t('common.name')}</Label>
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
                      <Button onClick={handleSaveSection}>
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedTemplate ? (
              <p className="text-muted-foreground text-center py-8">{t('audit.templates.selectTemplate')}</p>
            ) : sections.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t('audit.templates.noSections')}</p>
            ) : (
              <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                {sections.map(section => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span>{section.name}</span>
                        <span className="text-sm text-muted-foreground">({section.questions.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pl-6">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditSection(section)}>
                            <Edit2 className="h-3 w-3 mr-1" />
                            {t('common.edit')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ type: 'section', id: section.id })}>
                            <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                            {t('common.delete')}
                          </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openAddQuestion(section.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          {t('audit.templates.addQuestion')}
                        </Button>
                      </div>
                      {section.questions.map(question => (
                        <div key={question.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <p className="text-sm">{question.question_text}</p>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditQuestion(section.id, question)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'question', id: question.id })}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
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
              <Label>{t('audit.templates.questionText')}</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ question_text: e.target.value })}
                placeholder={t('audit.templates.questionPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsQuestionModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveQuestion}>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
