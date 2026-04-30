'use client';

// Masar Landing Page - Arabic RTL
// A stunning, emotionally engaging landing page for the Masar initiative
// All UI text in Arabic, code/comments in English

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lamp,
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

// ─── Animation Variants ──────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const slideFromRight = {
  hidden: { opacity: 0, x: -60 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Animated Section Wrapper ────────────────────────────────────────
function AnimatedSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Counter Animation Hook ─────────────────────────────────────────
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
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
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return { count, ref };
}

// ─── Floating Orbs Component (Hero decoration) ──────────────────────
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large emerald orb */}
      <motion.div
        className="absolute w-72 h-72 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.6) 0%, transparent 70%)',
          top: '10%',
          right: '5%',
        }}
        animate={{
          y: [0, -30, 0],
          x: [0, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Medium teal orb */}
      <motion.div
        className="absolute w-48 h-48 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 70%)',
          bottom: '20%',
          left: '10%',
        }}
        animate={{
          y: [0, 20, 0],
          x: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Small light orb */}
      <motion.div
        className="absolute w-32 h-32 rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,0.5) 0%, transparent 70%)',
          top: '50%',
          left: '30%',
        }}
        animate={{
          y: [0, -25, 0],
          x: [0, 10, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Tiny sparkle particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-emerald-300/40"
          style={{
            top: `${15 + i * 14}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ─── Scroll to top button ───────────────────────────────────────────
function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
      aria-label="العودة للأعلى"
    >
      <ArrowUp className="size-5" />
    </motion.button>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN LANDING COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MasarLanding({ onSignUp, onLogin }: MasarLandingProps) {
  // Smooth scroll helper
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden" dir="rtl">
      <ScrollToTop />

      {/* ━━━ Section 1: Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #047857 0%, #0d9488 25%, #115e59 50%, #065f46 75%, #047857 100%)',
            backgroundSize: '400% 400%',
            animation: 'heroGradient 15s ease infinite',
          }}
        />
        {/* Mesh overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(at 20% 80%, rgba(52,211,153,0.3) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(20,184,166,0.3) 0%, transparent 50%), radial-gradient(at 50% 50%, rgba(6,95,70,0.2) 0%, transparent 50%)',
          }}
        />
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        <FloatingOrbs />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo icon */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
              <Compass className="size-10 text-emerald-200" />
            </div>
          </motion.div>

          {/* Brand name */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="visible"
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-4 tracking-tight"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.15)' }}
          >
            مَسَار
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="visible"
            className="text-xl sm:text-2xl md:text-3xl text-emerald-100 font-light mb-6"
          >
            طريقك من الفكرة إلى القبول
          </motion.p>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="visible"
            className="text-base sm:text-lg md:text-xl text-emerald-200/80 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            مبادرة مجانية تُجهّزك للقبول في الحاضنات والمسرّعات
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
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
              className="border-2 border-emerald-300/60 text-emerald-100 bg-emerald-800/30 hover:bg-emerald-700/40 hover:border-emerald-200/70 text-lg px-8 py-6 rounded-xl backdrop-blur-sm transition-all"
            >
              تعرّف علينا
              <ArrowLeft className="size-4 mr-1" />
            </Button>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            variants={fadeUp}
            custom={5}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-6 sm:gap-12"
          >
            <StatBadge value={500} suffix="+" label="رائد أعمال" />
            <StatBadge value={8} suffix="" label="مراحل متكاملة" />
            <StatBadge value={100} suffix="%" label="مجاني بالكامل" />
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="size-6 text-white/50" />
        </motion.div>
      </section>

      {/* ━━━ Section 2: The Problem ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection
        id="about"
        className="py-20 sm:py-28 px-4 sm:px-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
              <Lightbulb className="size-4 ml-1" />
              المشكلة
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            فكرة رائعة...{' '}
            <span className="text-emerald-600">لكن ما أحد يقبلك</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            كثير من رواد الأعمال لديهم أفكار مذهلة، لكنهم يواجهون فجوة حقيقية بين الفكرة والقبول في برامج الدعم
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
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
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={scaleUp}
                custom={i}
              >
                <Card className="h-full border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 3: The Solution ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-emerald-50/60 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
              <Sparkles className="size-4 ml-1" />
              الحل
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            مَسَار هو الجسر اللي{' '}
            <span className="text-emerald-600">يوصّلك</span>
          </motion.h2>

          <motion.div
            variants={fadeUp}
            custom={2}
            className="max-w-2xl mx-auto space-y-8 mt-10"
          >
            {[
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
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={slideFromRight}
                custom={i}
                className="flex items-start gap-5 text-right bg-white rounded-2xl p-6 shadow-sm border border-emerald-100/50 hover:shadow-md hover:border-emerald-200 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <p className="text-lg sm:text-xl text-gray-800 leading-relaxed font-medium pt-2">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 4: The 8-Step Journey ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection id="journey" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
                <Map className="size-4 ml-1" />
                الرحلة
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              رحلتك مع{' '}
              <span className="text-emerald-600">مَسَار</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-gray-500 max-w-xl mx-auto"
            >
              8 مراحل مُهيكلة تأخذك من الفكرة إلى جاهزية التقديم
            </motion.p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical connecting line - desktop */}
            <div className="hidden md:block absolute top-0 bottom-0 right-1/2 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-200" />

            {/* Mobile vertical line */}
            <div className="md:hidden absolute top-0 bottom-0 right-6 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-200" />

            <div className="space-y-8 md:space-y-12">
              {MILESTONES.map((milestone, i) => (
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
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
                <Compass className="size-4 ml-1" />
                كيف نعمل
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              كيف نعمل <span className="text-emerald-600">معك</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
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
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="relative"
              >
                {/* Step number badge */}
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
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 6: What Makes Us Different ━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="mb-4 text-emerald-700 bg-emerald-50 border-emerald-200 px-4 py-1.5 text-sm">
                <Star className="size-4 ml-1" />
                ما يميّزنا
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900"
            >
              ما يميّز <span className="text-emerald-600">مَسَار</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
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
            ].map((item, i) => (
              <motion.div key={i} variants={scaleUp} custom={i}>
                <Card className="h-full border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${item.accent === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'} transition-colors`}>
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 7: Who Is This For ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-emerald-900 to-emerald-950 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0}>
            <Badge className="mb-4 bg-emerald-800 text-emerald-200 border-emerald-700 px-4 py-1.5 text-sm">
              <Users className="size-4 ml-1" />
              لمن هذه المبادرة؟
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-12"
          >
            لمن هذه <span className="text-emerald-300">المبادرة؟</span>
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              'عندك فكرة بس ما تعرف من وين تبدأ',
              'تقدّمت لحاضنة أو مسرّع ورفضوك لأن ملفّك مو جاهز',
              'ما عندك ميزانية لاستشارات مكلفة',
              'تبي أحد يمشي معك خطوة بخطوة',
            ].map((text, i) => (
              <motion.div
                key={i}
                variants={scaleUp}
                custom={i}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-all text-right"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="text-lg text-emerald-50 leading-relaxed">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 8: Vision & Mission ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission */}
            <motion.div variants={slideFromRight} custom={0}>
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
            </motion.div>

            {/* Vision */}
            <motion.div variants={slideFromRight} custom={1}>
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
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ━━━ Section 9: CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatedSection className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={scaleUp}
            custom={0}
            className="relative rounded-3xl overflow-hidden"
          >
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
              <motion.div variants={fadeUp} custom={1}>
                <Compass className="size-12 text-emerald-200 mx-auto mb-6" />
              </motion.div>
              <motion.h2
                variants={fadeUp}
                custom={2}
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
              >
                رحلتك من فكرة إلى قبول
                <br />
                <span className="text-emerald-200">تبدأ هنا</span>
              </motion.h2>
              <motion.div
                variants={fadeUp}
                custom={3}
                className="flex flex-col items-center gap-4"
              >
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
              </motion.div>
            </div>
          </motion.div>
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

      {/* Hero gradient animation keyframes */}
      <style jsx global>{`
        @keyframes heroGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUB-COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Milestone data
const MILESTONES = [
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

  return (
    <motion.div
      variants={fadeUp}
      custom={index * 0.5}
      className={`relative flex items-center gap-4 md:gap-0 ${
        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
    >
      {/* Mobile layout */}
      <div className="md:hidden flex items-start gap-4 w-full">
        {/* Timeline dot */}
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
            <h3 className="font-bold text-gray-900 text-lg mb-1">{milestone.title}</h3>
            <p className="text-gray-500 text-sm">{milestone.desc}</p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop layout - alternating sides */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] w-full items-center gap-6">
        {/* Content side */}
        <div className={isEven ? '' : 'order-3'}>
          <Card className="border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all h-full group">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                  المرحلة {index + 1}
                </Badge>
                <span className="text-xl">{milestone.emoji}</span>
              </div>
              <h3 className="font-bold text-gray-900 text-xl mb-2">{milestone.title}</h3>
              <p className="text-gray-500 leading-relaxed">{milestone.desc}</p>
            </CardContent>
          </Card>
        </div>

        {/* Center dot */}
        <div className="relative z-10 order-2">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
            {milestone.icon}
          </div>
        </div>

        {/* Empty side */}
        <div className={isEven ? 'order-3' : ''} />
      </div>
    </motion.div>
  );
}

export { MasarLanding };
