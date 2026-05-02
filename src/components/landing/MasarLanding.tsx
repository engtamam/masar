'use client';

// Masar Landing Page - Arabic RTL
// Performance-optimized: CSS animations instead of framer-motion
// Lazy-loaded sections for below-fold content

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Users,
  CheckCircle2,
  ArrowLeft,
  Star,
  Target,
  Lightbulb,
  ShieldCheck,
  FileText,
  Wrench,
  FolderOpen,
  Map,
  DollarSign,
  BarChart3,
  DoorOpen,
  Gem,
  ChevronDown,
  Heart,
  Sparkles,
  Compass,
  Handshake,
  Trophy,
  ArrowUp,
} from 'lucide-react';

// ─── Props ───────────────────────────────────────────────────────────
interface MasarLandingProps {
  onSignUp: () => void;
  onLogin: () => void;
}

// ─── CSS-based scroll animation hook ────────────────────────────────
// Uses IntersectionObserver to add a class when element enters viewport
// Much lighter than framer-motion — no extra JS bundle
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el); // Only animate once
        }
      },
      { threshold: 0.1, rootMargin: '-60px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

// ─── Animated Section Wrapper (CSS-only, no framer-motion) ──────────
function AnimatedSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useScrollReveal();

  return (
    <section
      id={id}
      ref={ref}
      className={`scroll-reveal ${className}`}
    >
      {children}
    </section>
  );
}

// ─── Counter Animation Hook (lightweight, CSS-driven) ──────────────
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN LANDING COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Map icon string names from DB to React components + emojis
const ICON_MAP: Record<string, { icon: React.ReactNode; emoji: string }> = {
  'handshake': { icon: <Handshake className="size-6" />, emoji: '🤝' },
  'layout': { icon: <FileText className="size-6" />, emoji: '📋' },
  'rocket': { icon: <Rocket className="size-6" />, emoji: '🚀' },
  'folder-lock': { icon: <FolderOpen className="size-6" />, emoji: '📁' },
  'map': { icon: <Map className="size-6" />, emoji: '🗺️' },
  'calculator': { icon: <DollarSign className="size-6" />, emoji: '💰' },
  'presentation': { icon: <BarChart3 className="size-6" />, emoji: '📊' },
  'log-out': { icon: <DoorOpen className="size-6" />, emoji: '🚪' },
  'dollar-sign': { icon: <Gem className="size-6" />, emoji: '💎' },
};

interface DbMilestone {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  sortOrder: number;
}

function MasarLanding({ onSignUp, onLogin }: MasarLandingProps) {
  const [entrepreneurCount, setEntrepreneurCount] = useState<number>(0);
  const [milestoneCount, setMilestoneCount] = useState<number>(MILESTONES.length);
  const [dbMilestones, setDbMilestones] = useState<DbMilestone[]>([]);
  const MIN_COUNT_TO_SHOW = 10;

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          if (data.data.entrepreneurs !== undefined) {
            setEntrepreneurCount(data.data.entrepreneurs);
          }
          if (data.data.milestones !== undefined) {
            setMilestoneCount(data.data.milestones);
          }
          if (data.data.milestonesList && data.data.milestonesList.length > 0) {
            setDbMilestones(data.data.milestonesList);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Use DB milestones if available, otherwise fall back to hardcoded
  const displayMilestones = dbMilestones.length > 0
    ? dbMilestones.map((m) => {
        const mapped = ICON_MAP[m.icon || ''] || { icon: <Star className="size-6" />, emoji: '⭐' };
        return {
          icon: mapped.icon,
          emoji: mapped.emoji,
          title: m.titleAr,
          desc: m.descriptionAr || '',
        };
      })
    : MILESTONES;

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden" dir="rtl">
      <ScrollToTop />

      {/* ━━━ Section 1: Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Static gradient background — no animation, no GPU cost */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #047857 0%, #0d9488 30%, #115e59 60%, #065f46 80%, #047857 100%)',
          }}
        />
        {/* Mesh overlay — subtle, no animation */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(at 20% 80%, rgba(52,211,153,0.3) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(20,184,166,0.3) 0%, transparent 50%)',
          }}
        />

        {/* Lightweight CSS orbs instead of framer-motion FloatingOrbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-72 h-72 rounded-full opacity-15 orb-float-1"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)',
              top: '10%',
              right: '5%',
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full opacity-10 orb-float-2"
            style={{
              background: 'radial-gradient(circle, rgba(20,184,166,0.5) 0%, transparent 70%)',
              bottom: '20%',
              left: '10%',
            }}
          />
          <div
            className="absolute w-32 h-32 rounded-full opacity-15 orb-float-3"
            style={{
              background: 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)',
              top: '50%',
              left: '30%',
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo icon */}
          <div className="mb-6 hero-fade-in hero-delay-1">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border border-white/15 shadow-lg">
              <Compass className="size-10 text-emerald-200" />
            </div>
          </div>

          {/* Brand name */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-4 tracking-tight hero-fade-in hero-delay-2"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.15)' }}
          >
            مَسَار
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl md:text-3xl text-emerald-100 font-light mb-6 hero-fade-in hero-delay-3">
            طريقك من الفكرة إلى القبول
          </p>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-emerald-200/80 max-w-2xl mx-auto mb-10 leading-relaxed hero-fade-in hero-delay-4">
            مبادرة مجانية تُجهّزك للقبول في الحاضنات والمسرّعات
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 hero-fade-in hero-delay-5">
            <Button
              size="lg"
              onClick={onSignUp}
              className="bg-white text-emerald-800 hover:bg-emerald-50 text-lg px-8 py-6 rounded-xl shadow-xl shadow-emerald-900/20 font-semibold transition-all hover:scale-105"
            >
              <Rocket className="size-5 ml-2" />
              ابدأ رحلتك
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollTo('about')}
              className="border-2 border-emerald-300/60 text-emerald-100 bg-emerald-800/30 hover:bg-emerald-700/40 hover:border-emerald-200/70 text-lg px-8 py-6 rounded-xl transition-all"
            >
              تعرّف علينا
              <ArrowLeft className="size-4 mr-1" />
            </Button>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-12 hero-fade-in hero-delay-6">
            {entrepreneurCount >= MIN_COUNT_TO_SHOW && (
              <StatBadge value={entrepreneurCount} suffix="+" label="رائد أعمال" />
            )}
            <StatBadge value={milestoneCount} suffix="" label="مراحل متكاملة" />
            <StatBadge value={100} suffix="%" label="مجاني بالكامل" />
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

        {/* Scroll indicator — CSS only */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 scroll-bounce">
          <ChevronDown className="size-6 text-white/50" />
        </div>
      </section>

      {/* ━━━ Section 2: The Problem ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection
        id="about"
        className="py-20 sm:py-28 px-4 sm:px-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
            <Lightbulb className="size-4 ml-1" />
            المشكلة
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            فكرة رائعة...{' '}
            <span className="text-emerald-600">لكن ما أحد يقبلك</span>
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            كثير من رواد الأعمال لديهم أفكار مذهلة، لكنهم يواجهون فجوة حقيقية بين الفكرة والقبول في برامج الدعم
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {PROBLEM_CARDS.map((item, i) => (
              <Card key={i} className="h-full border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50 group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 3: The Solution ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-emerald-50/60 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
            <Sparkles className="size-4 ml-1" />
            الحل
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            مَسَار هو الجسر اللي{' '}
            <span className="text-emerald-600">يوصّلك</span>
          </h2>

          <div className="max-w-2xl mx-auto space-y-8 mt-10">
            {SOLUTION_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-5 text-right bg-white rounded-2xl p-6 shadow-sm border border-emerald-100/50 hover:shadow-md hover:border-emerald-200 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <p className="text-lg sm:text-xl text-gray-800 leading-relaxed font-medium pt-2">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 4: The Journey ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection id="journey" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
              <Map className="size-4 ml-1" />
              الرحلة
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              رحلتك مع{' '}
              <span className="text-emerald-600">مَسَار</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              {milestoneCount} مراحل مُهيكلة تأخذك من الفكرة إلى جاهزية التقديم
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="hidden md:block absolute top-0 bottom-0 right-1/2 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-200" />
            <div className="md:hidden absolute top-0 bottom-0 right-6 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-200" />

            <div className="space-y-8 md:space-y-12">
              {displayMilestones.map((milestone, i) => (
                <MilestoneCard key={i} milestone={milestone} index={i} />
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 5: How It Works ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
              <Compass className="size-4 ml-1" />
              كيف نعمل
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              كيف نعمل <span className="text-emerald-600">معك</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -top-3 right-6 z-10">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shadow-md">
                    {item.step}
                  </div>
                </div>
                <Card className="h-full border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <div className={`h-2 bg-gradient-to-l ${item.gradient}`} />
                  <CardContent className="p-6 pt-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 6: What Makes Us Different ━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
              <Star className="size-4 ml-1" />
              ما يميّزنا
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
              ما يميّز <span className="text-emerald-600">مَسَار</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIFFERENTIATORS.map((item, i) => (
              <Card key={i} className="h-full border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${item.accent === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'} transition-colors`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 7: Who Is This For ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-emerald-900 to-emerald-950 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-emerald-800 text-emerald-200 border-emerald-700 px-4 py-1.5 text-sm">
            <Users className="size-4 ml-1" />
            لمن هذه المبادرة؟
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12">
            لمن هذه <span className="text-emerald-300">المبادرة؟</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {TARGET_AUDIENCE.map((text, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-all text-right"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="text-lg text-emerald-50 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 8: Vision & Mission ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission */}
            <Card className="h-full border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white overflow-hidden">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6">
                  <Target className="size-7" />
                </div>
                <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-100">الرسالة</Badge>
                <p className="text-xl text-gray-800 leading-loose font-medium">
                  نُهيّئ رواد الأعمال الناشئين للقبول في برامج الحاضنات والمسرّعات من خلال رحلة إرشادية مجانية ومُهيكلة
                </p>
              </CardContent>
            </Card>

            {/* Vision */}
            <Card className="h-full border-teal-100 bg-gradient-to-br from-teal-50/80 to-white overflow-hidden">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
                  <Sparkles className="size-7" />
                </div>
                <Badge variant="secondary" className="mb-4 text-teal-700 bg-teal-100">الرؤية</Badge>
                <p className="text-xl text-gray-800 leading-loose font-medium">
                  أن يكون كل رائد أعمال لديه الفكرة قادراً على الوصول إلى الدعم والإرشاد الذي يستحقه
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 9: CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #047857 0%, #0d9488 50%, #115e59 100%)',
              }}
            />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(at 30% 70%, rgba(52,211,153,0.4) 0%, transparent 50%), radial-gradient(at 70% 30%, rgba(20,184,166,0.4) 0%, transparent 50%)',
              }}
            />

            <div className="relative z-10 p-10 sm:p-14 text-center">
              <Compass className="size-12 text-emerald-200 mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                رحلتك من فكرة إلى قبول
                <br />
                <span className="text-emerald-200">تبدأ هنا</span>
              </h2>
              <div className="flex flex-col items-center gap-4">
                <Button
                  size="lg"
                  onClick={onSignUp}
                  className="bg-white text-emerald-800 hover:bg-emerald-50 text-lg px-10 py-7 rounded-xl shadow-xl font-semibold transition-all hover:scale-105"
                >
                  <Rocket className="size-5 ml-2" />
                  ابدأ رحلتك الآن
                </Button>
                <button
                  onClick={onLogin}
                  className="text-emerald-200 hover:text-white transition-colors text-base underline underline-offset-4 decoration-emerald-300/40 hover:decoration-white/60"
                >
                  أو سجّل دخولك إذا عندك حساب
                </button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 10: Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="bg-gray-950 text-gray-400 py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Compass className="size-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">مَسَار</span>
            </div>
            <p className="text-emerald-400/70 text-sm mb-1">طريقك من الفكرة إلى القبول</p>
            <p className="text-gray-500 text-sm">مبادرة مجانية لدعم رواد الأعمال الناشئين</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mb-10 text-sm">
            <button
              onClick={() => scrollTo('about')}
              className="hover:text-emerald-400 transition-colors"
            >
              عن المبادرة
            </button>
            <button
              onClick={() => scrollTo('journey')}
              className="hover:text-emerald-400 transition-colors"
            >
              الرحلة
            </button>
            <button className="hover:text-emerald-400 transition-colors">
              تواصل معنا
            </button>
            <a
              href="/privacy"
              className="hover:text-emerald-400 transition-colors"
            >
              سياسة الخصوصية
            </a>
            <a
              href="/terms"
              className="hover:text-emerald-400 transition-colors"
            >
              شروط وأحكام الاستخدام
            </a>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} مَسَار - جميع الحقوق محفوظة
          </div>
        </div>
      </footer>

      {/* ─── CSS Animations (lightweight, no JS runtime) ──────────── */}
      <style jsx global>{`
        /* Hero fade-in on load — CSS only, GPU-accelerated */
        .hero-fade-in {
          opacity: 0;
          transform: translateY(24px);
          animation: heroFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hero-delay-1 { animation-delay: 0s; }
        .hero-delay-2 { animation-delay: 0.12s; }
        .hero-delay-3 { animation-delay: 0.24s; }
        .hero-delay-4 { animation-delay: 0.36s; }
        .hero-delay-5 { animation-delay: 0.48s; }
        .hero-delay-6 { animation-delay: 0.6s; }

        @keyframes heroFadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scroll bounce indicator */
        .scroll-bounce {
          animation: scrollBounce 2s ease-in-out infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }

        /* Lightweight floating orbs — CSS transforms only, GPU-accelerated */
        .orb-float-1 {
          animation: orbFloat1 8s ease-in-out infinite;
          will-change: transform;
        }
        .orb-float-2 {
          animation: orbFloat2 10s ease-in-out infinite;
          will-change: transform;
        }
        .orb-float-3 {
          animation: orbFloat3 6s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -30px) scale(1.05); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.08); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -25px); }
        }

        /* Scroll reveal — CSS-only IntersectionObserver driven */
        .scroll-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUB-COMPONENTS & DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Problem cards data
const PROBLEM_CARDS = [
  {
    icon: <FileText className="size-6" />,
    title: 'الحاضنات تطلب نماذج جاهزة',
    desc: 'وأنت لسّة ما بنّيتها — نماذج العمل، الخطط، والملفات اللي يطلبونها كلها مو جاهزة',
  },
  {
    icon: <Target className="size-6" />,
    title: 'المسرّعات تحتاج خطة عمل',
    desc: 'وأنت ما تعرف تبنّيها — متطلبات التقديم معقدة ومحتاجة خبرة وتحضير',
  },
  {
    icon: <Compass className="size-6" />,
    title: 'محد يوجّهك ولا أحد يسمّعك',
    desc: 'الطريق مو واضح، والمعلومات متفرّقة، والمساعدة النوعية شبه معدومة',
  },
  {
    icon: <DollarSign className="size-6" />,
    title: 'ما عندك مكلّف استشارات',
    desc: 'الاستشارات المتخصصة غالية، وأنت في بدايتك تحتاج دعم مو ميزانية',
  },
];

// Solution items data
const SOLUTION_ITEMS = [
  {
    icon: <ShieldCheck className="size-7" />,
    text: 'نحن مو حاضنة، نحن اللي نجهّزك للحاضنة',
  },
  {
    icon: <Handshake className="size-7" />,
    text: 'نمشي معك خطوة بخطوة لحد ما تكون جاهز تقدّم على أي حاضنة أو مسرّع',
  },
  {
    icon: <Heart className="size-7" />,
    text: 'مجاناً. لأننا نؤمن إن الفكرة تحتاج فرصة مو ميزانية',
  },
];

// Milestone data
const MILESTONES = [
  {
    icon: <Handshake className="size-6" />,
    emoji: '🤝',
    title: 'الاستقبال والتقييم',
    desc: 'جلسة تعريفية مع المستشار لتقييم فكرتك وفهم احتياجاتك',
  },
  {
    icon: <FileText className="size-6" />,
    emoji: '📋',
    title: 'نموذج العمل',
    desc: 'نرتّب فكرتك في نموذج عمل واضح',
  },
  {
    icon: <Wrench className="size-6" />,
    emoji: '🔧',
    title: 'النموذج الأولي',
    desc: 'نبني معك نسخة أولية تثبت إن فكرتك قابلة للتنفيذ',
  },
  {
    icon: <FolderOpen className="size-6" />,
    emoji: '📁',
    title: 'غرفة البيانات',
    desc: 'نجمّع لك كل الوثائق القانونية اللي يطلبونها',
  },
  {
    icon: <Map className="size-6" />,
    emoji: '🗺️',
    title: 'خارطة الطريق',
    desc: 'نخطّط لك خطة تشغيلية واضحة لـ 12 شهر',
  },
  {
    icon: <DollarSign className="size-6" />,
    emoji: '💰',
    title: 'البيانات المالية',
    desc: 'نحسب لك المصاريف والإيرادات ومعدل الحرق',
  },
  {
    icon: <BarChart3 className="size-6" />,
    emoji: '📊',
    title: 'العرض الاستثماري',
    desc: 'نصمّم لك عرض تقديمي احترافي يخطف الأنظار',
  },
  {
    icon: <DoorOpen className="size-6" />,
    emoji: '🚪',
    title: 'استراتيجية الخروج',
    desc: 'نوضّح لك خطة التوسع ورؤية المستثمر',
  },
  {
    icon: <Gem className="size-6" />,
    emoji: '💎',
    title: 'تحديد قيمة التمويل',
    desc: 'نصوغ لك طلبك المالي بدقة واحترافية',
  },
];

// How it works data
const HOW_IT_WORKS = [
  {
    step: '١',
    icon: <Rocket className="size-8" />,
    title: 'سجّل وأبدي رحلتك',
    desc: 'أنشئ حسابك وابدأ رحلتك مباشرة — المرحلة الأولى تنفتح لك فوراً',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    step: '٢',
    icon: <Users className="size-8" />,
    title: 'اشتغل مع مستشارك',
    desc: 'مستشار متخصص يرافقك في كل مرحلة ويوجّهك بخبرته',
    gradient: 'from-teal-500 to-teal-600',
  },
  {
    step: '٣',
    icon: <Trophy className="size-8" />,
    title: 'كن جاهز للحاضنة',
    desc: 'أكمل جميع المراحل وقدّم على أي حاضنة أو مسرّع بثقة كاملة',
    gradient: 'from-emerald-600 to-teal-600',
  },
];

// Differentiators data
const DIFFERENTIATORS = [
  {
    icon: <Heart className="size-7" />,
    title: 'مجاني بالكامل',
    desc: 'بدون رسوم أو تكاليف خفية — لأن الأفكار تستحق فرصة مو ميزانية',
    accent: 'emerald',
  },
  {
    icon: <Users className="size-7" />,
    title: 'مستشارون متخصصون',
    desc: 'مستشارون محترفون في الأعمال والقانون والمالية والتقنية يرافقونك في كل خطوة',
    accent: 'teal',
  },
  {
    icon: <CheckCircle2 className="size-7" />,
    title: 'رحلة مشروطة',
    desc: 'كل مرحلة تنفتح فقط بعد اعتماد اللي قبلها — عشان نضمن جودة ملفّك',
    accent: 'emerald',
  },
  {
    icon: <Target className="size-7" />,
    title: 'من الفكرة للقبول',
    desc: 'نُجهّزك تحديداً لما تطلبه الحاضنات والمسرّعات — مو مجرد معلومات عامة',
    accent: 'teal',
  },
];

// Target audience data
const TARGET_AUDIENCE = [
  'عندك فكرة بس ما تعرف من وين تبدأ',
  'تقدّمت لحاضنة أو مسرّع ورفضوك لأن ملفّك مو جاهز',
  'ما عندك ميزانية لاستشارات مكلفة',
  'تبي أحد يمشي معك خطوة بخطوة',
];

// Stat badge with counter animation
function StatBadge({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(value);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-bold text-white">
        {count}
        {suffix}
      </span>
      <span className="text-emerald-200/70 text-sm mt-1">{label}</span>
    </div>
  );
}

// Milestone card for the timeline
function MilestoneCard({ milestone, index }: { milestone: typeof MILESTONES[0]; index: number }) {
  const isEven = index % 2 === 0;
  const ref = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`scroll-reveal relative flex items-center gap-4 md:gap-0 ${
        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
    >
      {/* Mobile layout */}
      <div className="md:hidden flex items-start gap-4 w-full">
        <div className="relative z-10 shrink-0">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
            {milestone.icon}
          </div>
        </div>
        <Card className="flex-1 border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                المرحلة {index + 1}
              </Badge>
              <span className="text-lg">{milestone.emoji}</span>
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">{milestone.title}</h3>
            <p className="text-gray-500 text-sm">{milestone.desc}</p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex items-center w-full">
        <div className={`w-[calc(50%-24px)] ${isEven ? 'text-left' : 'text-right'}`}>
          {isEven ? (
            <Card className="inline-block border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all max-w-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                    المرحلة {index + 1}
                  </Badge>
                  <span className="text-lg">{milestone.emoji}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">{milestone.title}</h3>
                <p className="text-gray-500 text-sm">{milestone.desc}</p>
              </CardContent>
            </Card>
          ) : (
            <div />
          )}
        </div>

        <div className="relative z-10 shrink-0 mx-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
            {milestone.icon}
          </div>
        </div>

        <div className={`w-[calc(50%-24px)] ${isEven ? 'text-right' : 'text-left'}`}>
          {!isEven ? (
            <Card className="inline-block border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all max-w-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                    المرحلة {index + 1}
                  </Badge>
                  <span className="text-lg">{milestone.emoji}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">{milestone.title}</h3>
                <p className="text-gray-500 text-sm">{milestone.desc}</p>
              </CardContent>
            </Card>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

// Scroll to top button — CSS only, no framer-motion
function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all hover:scale-110 flex items-center justify-center"
      aria-label="العودة للأعلى"
      style={{ animation: 'heroFadeUp 0.3s ease forwards' }}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}

export { MasarLanding };
