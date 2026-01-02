import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
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
import { Check, X, Minus, ArrowLeft, Save, ClipboardCheck, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type QuestionType = 'pass_fail' | 'text' | 'rating' | 'single_choice' | 'multiple_choice';

interface AuditFormProps {
  auditId: string | null;
  isNew: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
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
  question_type: QuestionType;
  options: string[] | null;
  rating_scale: number | null;
}

interface Answer {
  questionId: string;
  answer: 'pass' | 'fail' | 'na' | null;
  textAnswer: string;
  ratingAnswer: number | null;
  selectedOptions: string[];
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
  const [auditStatus, setAuditStatus] = useState<string>('planned');
  
  const isCompleted = auditStatus === 'completed';
  const isReadOnly = isCompleted && !isNew;

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
    const initializeForm = async () => {
      await fetchInitialData();
      if (auditId && !isNew) {
        await fetchAuditData(auditId);
      }
    };
    initializeForm();
  }, [auditId, isNew]);

  useEffect(() => {
    if (selectedTemplateId) {
      fetchTemplateSections(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const fetchInitialData = async () => {
    try {
      const [templatesRes, plantsRes] = await Promise.all([
        supabase.from('audit_templates').select('id, name, description, category').eq('is_active', true),
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
          audit_template_questions(id, question_text, order_index, question_type, options, rating_scale)
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
            question_type: q.question_type || 'pass_fail',
            options: q.options || null,
            rating_scale: q.rating_scale || null,
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
              textAnswer: '',
              ratingAnswer: null,
              selectedOptions: [],
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
      setAuditStatus(audit.status);

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
          textAnswer: '',
          ratingAnswer: null,
          selectedOptions: [],
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
        .filter(a => a.answer !== null && a.questionId)
        .map(answer => ({
          audit_id: auditRecordId,
          question_id: answer.questionId,
          answer: answer.answer,
          comment: answer.comment || null,
          photos: answer.photos || [],
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
      let errorMessage = t('common.unexpectedError');
      
      if (error?.code === '23502') {
        errorMessage = t('audit.errors.missingRequiredField');
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
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

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <h2 className="text-xl font-semibold">
          {isNew ? t('audit.newAudit') : (isReadOnly ? t('audit.viewAudit') : t('audit.editAudit'))}
        </h2>
        {isReadOnly && (
          <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2">
            {t('audit.completedLocked')}
          </Badge>
        )}
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isNew || isReadOnly}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isNew || isReadOnly}>
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
                      <Input type="date" {...field} disabled={!isNew || isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Template Info Card - Show when template is selected */}
          {selectedTemplate && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  {selectedTemplate.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {selectedTemplate.description || t('audit.noDescription')}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {t(`audit.categories.${selectedTemplate.category}`)}
                </Badge>
              </CardContent>
            </Card>
          )}

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
                          ({(section.questions || []).filter(q => answers[q.id]?.answer !== null).length}/{(section.questions || []).length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        {section.questions.map(question => {
                          const answer = answers[question.id];
                          const questionType = question.question_type || 'pass_fail';
                          
                          const renderQuestionInput = () => {
                            switch (questionType) {
                              case 'text':
                                return (
                                  <Textarea
                                    value={answer?.textAnswer || ''}
                                    onChange={(e) => updateAnswer(question.id, 'textAnswer', e.target.value)}
                                    placeholder={t('audit.templates.questionTypes.textPlaceholder')}
                                    disabled={isReadOnly}
                                    rows={3}
                                  />
                                );
                              
                              case 'rating':
                                const maxRating = question.rating_scale || 5;
                                return (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      {Array.from({ length: maxRating }, (_, i) => i + 1).map(rating => (
                                        <button
                                          key={rating}
                                          type="button"
                                          disabled={isReadOnly}
                                          onClick={() => updateAnswer(question.id, 'ratingAnswer', rating)}
                                          className={cn(
                                            "p-1 transition-colors",
                                            answer?.ratingAnswer && answer.ratingAnswer >= rating
                                              ? "text-yellow-500"
                                              : "text-muted-foreground/30 hover:text-yellow-300"
                                          )}
                                        >
                                          <Star className="h-6 w-6 fill-current" />
                                        </button>
                                      ))}
                                      {answer?.ratingAnswer && (
                                        <span className="ml-2 text-sm font-medium">
                                          {answer.ratingAnswer}/{maxRating}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              
                              case 'single_choice':
                                const singleOptions = (question.options as string[]) || [];
                                return (
                                  <RadioGroup
                                    value={answer?.selectedOptions?.[0] || ''}
                                    onValueChange={(value) => updateAnswer(question.id, 'selectedOptions', [value])}
                                    className="space-y-2"
                                    disabled={isReadOnly}
                                  >
                                    {singleOptions.map((option, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option} id={`${question.id}-option-${idx}`} disabled={isReadOnly} />
                                        <Label htmlFor={`${question.id}-option-${idx}`} className="cursor-pointer">
                                          {option}
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                );
                              
                              case 'multiple_choice':
                                const multiOptions = (question.options as string[]) || [];
                                return (
                                  <div className="space-y-2">
                                    {multiOptions.map((option, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${question.id}-multi-${idx}`}
                                          checked={answer?.selectedOptions?.includes(option) || false}
                                          disabled={isReadOnly}
                                          onCheckedChange={(checked) => {
                                            const currentOptions = answer?.selectedOptions || [];
                                            const newOptions = checked
                                              ? [...currentOptions, option]
                                              : currentOptions.filter(o => o !== option);
                                            updateAnswer(question.id, 'selectedOptions', newOptions);
                                          }}
                                        />
                                        <Label htmlFor={`${question.id}-multi-${idx}`} className="cursor-pointer">
                                          {option}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                );
                              
                              case 'pass_fail':
                              default:
                                return (
                                  <RadioGroup
                                    value={answer?.answer || ''}
                                    onValueChange={(value) => updateAnswer(question.id, 'answer', value)}
                                    className="flex gap-4"
                                    disabled={isReadOnly}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="pass" id={`${question.id}-pass`} disabled={isReadOnly} />
                                      <Label htmlFor={`${question.id}-pass`} className={cn("cursor-pointer", isReadOnly ? "text-muted-foreground" : "text-chart-2")}>
                                        {t('audit.answers.pass')}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="fail" id={`${question.id}-fail`} disabled={isReadOnly} />
                                      <Label htmlFor={`${question.id}-fail`} className={cn("cursor-pointer", isReadOnly ? "text-muted-foreground" : "text-destructive")}>
                                        {t('audit.answers.fail')}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="na" id={`${question.id}-na`} disabled={isReadOnly} />
                                      <Label htmlFor={`${question.id}-na`} className="text-muted-foreground cursor-pointer">
                                        N/A
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                );
                            }
                          };
                          
                          return (
                            <div key={question.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="font-medium">{question.question_text}</p>
                                  {questionType !== 'pass_fail' && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {t(`audit.templates.questionTypes.${questionType}`)}
                                    </Badge>
                                  )}
                                </div>
                                {questionType === 'pass_fail' && getAnswerIcon(answer?.answer)}
                              </div>

                              {renderQuestionInput()}

                              {/* Show evidence fields when fail is selected (only for pass_fail type) */}
                              {questionType === 'pass_fail' && answer?.answer === 'fail' && (
                                <div className="space-y-3 pt-2 border-t">
                                  <div>
                                    <Label>{t('audit.comment')}</Label>
                                    <Textarea
                                      value={answer.comment}
                                      onChange={(e) => updateAnswer(question.id, 'comment', e.target.value)}
                                      placeholder={t('audit.commentPlaceholder')}
                                      className="mt-1"
                                      disabled={isReadOnly}
                                    />
                                  </div>
                                  {!isReadOnly && (
                                    <div>
                                      <Label>{t('audit.evidence')}</Label>
                                      <ImageUpload
                                        bucket="audit-evidence"
                                        maxImages={3}
                                        images={answer.photos}
                                        onImagesChange={(photos) => updateAnswer(question.id, 'photos', photos)}
                                      />
                                    </div>
                                  )}
                                  {isReadOnly && answer?.photos?.length > 0 && (
                                    <div>
                                      <Label>{t('audit.evidence')}</Label>
                                      <div className="flex gap-2 mt-1">
                                        {answer.photos.map((photo, idx) => (
                                          <img key={idx} src={photo} alt="" className="h-20 w-20 object-cover rounded" />
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Signature */}
          {!isReadOnly && (
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
          )}

          {isReadOnly && signature && (
            <Card>
              <CardHeader>
                <CardTitle>{t('audit.signature')}</CardTitle>
              </CardHeader>
              <CardContent>
                <img src={signature} alt="Signature" className="max-h-32" />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {!isReadOnly && (
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
          )}

          {isReadOnly && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.close')}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
