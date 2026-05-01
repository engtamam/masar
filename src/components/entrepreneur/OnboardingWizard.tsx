'use client';

// OnboardingWizard - 4-step wizard for new entrepreneurs
// Collects project info before creating the first project and starting the journey

import { useState } from 'react';
import { Compass, ArrowLeft, ArrowRight, Rocket, Lightbulb, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

// ========== Industries List ==========

const INDUSTRIES = [
  { value: 'technology', labelAr: 'التقنية' },
  { value: 'healthcare', labelAr: 'الرعاية الصحية' },
  { value: 'education', labelAr: 'التعليم' },
  { value: 'fintech', labelAr: 'التقنية المالية' },
  { value: 'ecommerce', labelAr: 'التجارة الإلكترونية' },
  { value: 'food', labelAr: 'الأغذية والمطاعم' },
  { value: 'real-estate', labelAr: 'العقارات' },
  { value: 'tourism', labelAr: 'السياحة والسفر' },
  { value: 'logistics', labelAr: 'اللوجستيات والنقل' },
  { value: 'energy', labelAr: 'الطاقة' },
  { value: 'media', labelAr: 'الإعلام والترفيه' },
  { value: 'manufacturing', labelAr: 'التصنيع' },
  { value: 'agriculture', labelAr: 'الزراعة' },
  { value: 'social-impact', labelAr: 'التأثير الاجتماعي' },
  { value: 'other', labelAr: 'أخرى' },
];

// ========== Project Stages ==========

const PROJECT_STAGES = [
  { value: 'IDEA', labelAr: 'فكرة', description: 'عندي فكرة بس للحين ما بدأت', icon: '💡' },
  { value: 'PROTOTYPE', labelAr: 'نموذج أولي', description: 'سويت نموذج أولي بسيط', icon: '🔧' },
  { value: 'MVP', labelAr: 'MVP', description: 'عندي منتج أولي يشتغل', icon: '🚀' },
  { value: 'OPERATING', labelAr: 'تشغيل', description: 'المشروع يشتغل وعندي عملاء', icon: '📈' },
  { value: 'SCALING', labelAr: 'توسع', description: 'أبغي أوسع المشروع', icon: '🌍' },
];

// ========== Props ==========

interface OnboardingWizardProps {
  onComplete: (project: unknown) => void;
}

// ========== Component ==========

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    description: '',
    stage: '',
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Update form field
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validate current step
  const canProceed = (): boolean => {
    switch (step) {
      case 1: return formData.name.trim().length >= 2;
      case 2: return formData.industry !== '';
      case 3: return true; // description is optional
      case 4: return formData.stage !== '';
      default: return false;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsLoading(true);
    try {
      const result = await projectsApi.createProject({
        name: formData.name.trim(),
        industry: formData.industry,
        description: formData.description.trim() || undefined,
        stage: formData.stage,
      });

      if (result.success && result.data) {
        toast.success('تم إنشاء مشروعك بنجاح! 🎉');
        onComplete(result.data);
      } else {
        toast.error(result.error || 'حدث خطأ أثناء إنشاء المشروع');
      }
    } catch {
      toast.error('حدث خطأ أثناء إنشاء المشروع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, #047857 0%, #0d9488 40%, #115e59 100%)',
      }}
    >
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #5eead4, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a7f3d0, transparent)' }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 shadow-lg">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            مَسَار
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base font-light">
            يلا نبدأ رحلتك! أخبرنا عن فكرتك
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-emerald-200 mb-2">
            <span>الخطوة {step} من {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            {/* Step 1: Project Name */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">💡</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    شنو اسم فكرتك؟
                  </h2>
                  <p className="text-sm text-gray-500">
                    اختار اسم يعبر عن مشروعك
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-gray-700 font-medium">
                    اسم المشروع *
                  </Label>
                  <Input
                    id="project-name"
                    placeholder="مثال: تطبيق توصيل ذكي"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="text-lg h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    maxLength={100}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 text-left">
                    {formData.name.length}/100
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Industry */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🏭</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    ايش الصناعة؟
                  </h2>
                  <p className="text-sm text-gray-500">
                    اختار المجال الأقرب لمشروعك
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind.value}
                      type="button"
                      onClick={() => updateField('industry', ind.value)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 text-right ${
                        formData.industry === ind.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-gray-100 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      {ind.labelAr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Description */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">📝</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    وصف مختصر
                  </h2>
                  <p className="text-sm text-gray-500">
                    اشرح فكرتك بكلمات بسيطة (اختياري)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-desc" className="text-gray-700 font-medium">
                    وصف المشروع
                  </Label>
                  <Textarea
                    id="project-desc"
                    placeholder="مثال: تطبيق يربط أصحاب المزارع المحلية بالمطاعم مباشرة بدون وسطاء..."
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="min-h-[120px] border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 text-left">
                    {formData.description.length}/500
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Stage */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    ايش مرحلتك الحالية؟
                  </h2>
                  <p className="text-sm text-gray-500">
                    اختار المرحلة اللي أنت فيها الحين
                  </p>
                </div>
                <div className="space-y-2">
                  {PROJECT_STAGES.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => updateField('stage', st.value)}
                      className={`w-full p-4 rounded-xl border-2 text-right transition-all duration-200 flex items-center gap-4 ${
                        formData.stage === st.value
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span className="text-2xl">{st.icon}</span>
                      <div className="flex-1">
                        <div className={`font-bold text-sm ${
                          formData.stage === st.value ? 'text-emerald-700' : 'text-gray-800'
                        }`}>
                          {st.labelAr}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {st.description}
                        </div>
                      </div>
                      {formData.stage === st.value && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 gap-3">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex items-center gap-2 border-gray-200"
                  disabled={isLoading}
                >
                  <ArrowRight className="w-4 h-4" />
                  السابق
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isLoading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      يلا نبدأ!
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer hint */}
        <p className="text-center text-emerald-200/60 text-xs mt-6">
          تقدر تعدل بيانات مشروعك لاحقاً من الإعدادات
        </p>
      </div>
    </div>
  );
}
