import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SignaturePad } from '@/components/audit/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Minus, ArrowLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditFormProps {
  auditId: string | null;
  isNew: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  category: string;
}

interface Plant {
  id: string;
  name: string;
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

interface Answer {
  questionId: string;
  answer: 'pass' | 'fail' | 'na' | null;
  comment: string;
  photos: string[];
}

const formSchema = z.object({
  template_id: z.string().min(1, 'Template is required'),
  plant_id: z.string().min(1, 'Plant is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

export function AuditForm({ auditId, isNew, onClose }: AuditFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template_id: '',
      plant_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const selectedTemplateId = form.watch('template_id');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      fetchTemplateSections(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (auditId && !isNew) {
      fetchAuditData(auditId);
    }
  }, [auditId, isNew]);

  const fetchInitialData = async () => {
    try {
      const [templatesRes, plantsRes] = await Promise.all([
        supabase.from('audit_templates').select('id, name, category').eq('is_active', true),
        supabase.from('plants').select('id, name'),
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (plantsRes.data) setPlants(plantsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTemplateSections = async (templateId: string) => {
    try {
      const { data: sectionsData, error } = await supabase
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

      const formattedSections = (sectionsData || []).map(section => ({
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
      setExpandedSections(formattedSections.map(s => s.id));

      // Initialize answers for new audit
      if (isNew) {
        const initialAnswers: Record<string, Answer> = {};
        formattedSections.forEach(section => {
          section.questions.forEach(question => {
            initialAnswers[question.id] = {
              questionId: question.id,
              answer: null,
              comment: '',
              photos: [],
            };
          });
        });
        setAnswers(initialAnswers);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchAuditData = async (id: string) => {
    try {
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single();

      if (auditError) throw auditError;

      form.setValue('template_id', audit.template_id);
      form.setValue('plant_id', audit.plant_id);
      form.setValue('scheduled_date', audit.scheduled_date);
      form.setValue('notes', audit.notes || '');
      setSignature(audit.signature_url);

      // Fetch existing answers
      const { data: items, error: itemsError } = await supabase
        .from('audit_items')
        .select('*')
        .eq('audit_id', id);

      if (itemsError) throw itemsError;

      const loadedAnswers: Record<string, Answer> = {};
      items?.forEach(item => {
        loadedAnswers[item.question_id] = {
          questionId: item.question_id,
          answer: item.answer as 'pass' | 'fail' | 'na' | null,
          comment: item.comment || '',
          photos: item.photos || [],
        };
      });
      setAnswers(loadedAnswers);
    } catch (error) {
      console.error('Error fetching audit:', error);
    }
  };

  const updateAnswer = (questionId: string, field: keyof Answer, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
  };

  const calculateScore = () => {
    const answered = Object.values(answers).filter(a => a.answer !== null && a.answer !== 'na');
    if (answered.length === 0) return null;
    
    const passed = answered.filter(a => a.answer === 'pass').length;
    return Math.round((passed / answered.length) * 100);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>, finalize: boolean = false) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const score = finalize ? calculateScore() : null;
      const status = finalize ? 'completed' : 'in_progress';

      let auditRecordId = auditId;

      if (isNew) {
        const { data: newAudit, error: insertError } = await supabase
          .from('audits')
          .insert({
            template_id: data.template_id,
            plant_id: data.plant_id,
            auditor_id: userData.user.id,
            scheduled_date: data.scheduled_date,
            notes: data.notes,
            status,
            score_percentage: score,
            signature_url: finalize ? signature : null,
            completed_at: finalize ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        auditRecordId = newAudit.id;
      } else {
        const { error: updateError } = await supabase
          .from('audits')
          .update({
            notes: data.notes,
            status,
            score_percentage: score,
            signature_url: finalize ? signature : null,
            completed_at: finalize ? new Date().toISOString() : null,
          })
          .eq('id', auditId);

        if (updateError) throw updateError;
      }

      // Ensure we have a valid audit ID before saving items
      if (!auditRecordId) {
        throw new Error('Failed to create or retrieve audit ID');
      }

      // Save audit items
      const itemsToSave = Object.values(answers)
        .filter(a => a.answer !== null)
        .map(answer => ({
          audit_id: auditRecordId,
          question_id: answer.questionId,
          answer: answer.answer,
          comment: answer.comment || null,
          photos: answer.photos,
        }));

      if (itemsToSave.length > 0) {
        // Delete existing items first
        if (!isNew) {
          const { error: deleteError } = await supabase.from('audit_items').delete().eq('audit_id', auditRecordId);
          if (deleteError) {
            console.error('Error deleting existing audit items:', deleteError);
          }
        }

        const { error: itemsError } = await supabase.from('audit_items').insert(itemsToSave);
        if (itemsError) throw itemsError;
      }

      toast({
        title: finalize ? t('audit.finalizeSuccess') : t('audit.saveSuccess'),
      });

      onClose();
    } catch (error: any) {
      console.error('Error saving audit:', error);
      toast({
        title: t('common.error'),
        description: error?.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAnswerIcon = (answer: 'pass' | 'fail' | 'na' | null) => {
    switch (answer) {
      case 'pass':
        return <Check className="h-4 w-4 text-chart-2" />;
      case 'fail':
        return <X className="h-4 w-4 text-destructive" />;
      case 'na':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <h2 className="text-xl font-semibold">
          {isNew ? t('audit.newAudit') : t('audit.editAudit')}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
          {/* Audit Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('audit.info')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isNew}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('audit.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
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
                    <FormLabel>{t('audit.location')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isNew}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('audit.selectLocation')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plants.map(plant => (
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

              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!isNew} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Checklist Sections */}
          {sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('audit.checklist')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion
                  type="multiple"
                  value={expandedSections}
                  onValueChange={setExpandedSections}
                  className="w-full"
                >
                  {sections.map(section => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="text-base font-medium">
                        {section.name}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({section.questions.filter(q => answers[q.id]?.answer !== null).length}/{section.questions.length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        {section.questions.map(question => {
                          const answer = answers[question.id];
                          return (
                            <div key={question.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <p className="font-medium flex-1">{question.question_text}</p>
                                {getAnswerIcon(answer?.answer)}
                              </div>

                              <RadioGroup
                                value={answer?.answer || ''}
                                onValueChange={(value) => updateAnswer(question.id, 'answer', value)}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="pass" id={`${question.id}-pass`} />
                                  <Label htmlFor={`${question.id}-pass`} className="text-chart-2 cursor-pointer">
                                    {t('audit.answers.pass')}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="fail" id={`${question.id}-fail`} />
                                  <Label htmlFor={`${question.id}-fail`} className="text-destructive cursor-pointer">
                                    {t('audit.answers.fail')}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="na" id={`${question.id}-na`} />
                                  <Label htmlFor={`${question.id}-na`} className="text-muted-foreground cursor-pointer">
                                    N/A
                                  </Label>
                                </div>
                              </RadioGroup>

                              {/* Show evidence fields when fail is selected */}
                              {answer?.answer === 'fail' && (
                                <div className="space-y-3 pt-2 border-t">
                                  <div>
                                    <Label>{t('audit.comment')}</Label>
                                    <Textarea
                                      value={answer.comment}
                                      onChange={(e) => updateAnswer(question.id, 'comment', e.target.value)}
                                      placeholder={t('audit.commentPlaceholder')}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label>{t('audit.evidence')}</Label>
                                    <ImageUpload
                                      bucket="audit-evidence"
                                      maxImages={3}
                                      images={answer.photos}
                                      onImagesChange={(photos) => updateAnswer(question.id, 'photos', photos)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('audit.generalNotes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('audit.notesPlaceholder')}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle>{t('audit.signature')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SignaturePad
                value={signature}
                onChange={setSignature}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="secondary" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {t('audit.saveDraft')}
            </Button>
            <Button
              type="button"
              onClick={() => form.handleSubmit((data) => onSubmit(data, true))()}
              disabled={loading || !signature}
            >
              {t('audit.finalize')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
