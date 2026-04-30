'use client';

// Authentication pages for the Masar Platform
// LoginPage and RegisterPage with Arabic RTL layout, emerald/teal theme
// All roles (Entrepreneur, Consultant, Admin) use the same login page
// The system automatically routes each role to their dedicated dashboard

import { useState, type FormEvent } from 'react';
import { Compass, Mail, Lock, User, Briefcase, Eye, EyeOff, Loader2, Shield, Users, CheckCircle, KeyRound, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { useAppStore, getDefaultView } from '@/lib/store';
import { authApi } from '@/lib/api';
import type { User as UserType } from '@/lib/store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';

// ========== Shared Constants ==========

const PLATFORM_NAME = 'مَسَار';
const TAGLINE = 'طريقك من الفكرة إلى القبول';

// ========== Shared Styles ==========

/** Gradient background wrapper for both auth pages */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          'linear-gradient(135deg, #047857 0%, #0d9488 40%, #115e59 100%)',
      }}
    >
      {/* Decorative background circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #5eead4, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a7f3d0, transparent)' }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #99f6e4, transparent)' }}
        />
      </div>

      {/* Card container */}
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  );
}

/** Logo and branding header shown above the card */
function AuthLogo() {
  return (
    <div className="text-center mb-8">
      {/* Icon badge */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 shadow-lg">
        <Compass className="w-8 h-8 text-white" />
      </div>
      {/* Platform name */}
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
        {PLATFORM_NAME}
      </h1>
      {/* Tagline */}
      <p className="text-emerald-100 text-sm sm:text-base font-light">
        {TAGLINE}
      </p>
    </div>
  );
}

// ========== Role Info Box ==========
// Shows how each role accesses the platform

function RoleInfoBox() {
  return (
    <div className="mt-4 p-3 bg-emerald-50/80 rounded-lg border border-emerald-100">
      <p className="text-xs font-semibold text-emerald-800 mb-2">كيف تدخل المنصة؟</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span><strong>رائد الأعمال:</strong> سجّل حسابك مباشرة من هنا</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span><strong>المستشار:</strong> يتم إنشاء حسابك من قبل الإدارة</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span><strong>الإدارة:</strong> يتم إنشاء حسابك أثناء التثبيت</span>
        </div>
      </div>
    </div>
  );
}

// ========== LoginPage ==========

export function LoginPage() {
  const { setToken, setUser, setCurrentView } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Basic validation
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!password) {
      toast.error('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.login(email.trim(), password);

      if (!result.success || !result.data) {
        toast.error(result.error || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        return;
      }

      const { token, user } = result.data;

      // Persist auth state
      setToken(token);
      setUser(user as UserType);

      // Navigate to the appropriate dashboard based on role
      const defaultView = getDefaultView(user.role);
      setCurrentView(defaultView);

      toast.success('تم تسجيل الدخول بنجاح');
    } catch {
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <AuthLogo />

      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
        <CardHeader className="text-center pb-0">
          <h2 className="text-xl font-bold text-gray-900">تسجيل الدخول</h2>
          <p className="text-sm text-muted-foreground mt-1">
            جميع المستخدمين يدخلون من هنا — النظام يوجّهك تلقائياً
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-gray-700">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-gray-700">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10"
                  dir="ltr"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          {/* Forgot password link */}
          <div className="text-left">
            <button
              type="button"
              onClick={() => setCurrentView('forgot-password')}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          {/* Role info box */}
          <RoleInfoBox />
        </CardContent>

        <CardFooter className="justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            رائد أعمال وليس لديك حساب؟{' '}
            <button
              type="button"
              onClick={() => setCurrentView('register')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
            >
              سجل الآن
            </button>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

// ========== RegisterPage ==========

export function RegisterPage() {
  const { setToken, setUser, setCurrentView } = useAppStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (password.length < 6) {
      toast.error('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        projectName: projectName.trim() || undefined,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.');
        return;
      }

      const { token, user } = result.data;

      // Persist auth state
      setToken(token);
      setUser(user as UserType);

      // Navigate to the appropriate dashboard based on role
      const defaultView = getDefaultView(user.role);
      setCurrentView(defaultView);

      toast.success('تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني لتأكيد حسابك.');
    } catch {
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <AuthLogo />

      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
        <CardHeader className="text-center pb-0">
          <h2 className="text-xl font-bold text-gray-900">إنشاء حساب رائد أعمال</h2>
          <p className="text-sm text-muted-foreground mt-1">
            سجّل كرائد أعمال وابدأ رحلتك المجانية
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="register-name" className="text-gray-700">
                الاسم الكامل
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="register-name"
                  type="text"
                  placeholder="أدخل اسمك الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pr-10"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-gray-700">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-gray-700">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10"
                  dir="ltr"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Label htmlFor="register-confirm-password" className="text-gray-700">
                تأكيد كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 pl-10"
                  dir="ltr"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Project name (optional) */}
            <div className="space-y-2">
              <Label htmlFor="register-project" className="text-gray-700">
                اسم المشروع{' '}
                <span className="text-muted-foreground font-normal">(اختياري)</span>
              </Label>
              <div className="relative">
                <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="register-project"
                  type="text"
                  placeholder="أدخل اسم مشروعك"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all mt-2"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                'إنشاء حساب'
              )}
            </Button>
          </form>

          {/* Info about consultant/admin accounts */}
          <div className="mt-4 p-3 bg-blue-50/80 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800">
              💡 <strong>ملاحظة:</strong> حسابات المستشارين والإدارة يتم إنشاؤها من قبل مدير النظام. إذا كنت مستشاراً، تواصل مع الإدارة للحصول على بيانات الدخول.
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            لديك حساب بالفعل؟{' '}
            <button
              type="button"
              onClick={() => setCurrentView('login')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
            >
              سجل دخولك
            </button>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

// ========== ForgotPasswordPage ==========

export function ForgotPasswordPage() {
  const { setCurrentView } = useAppStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(email.trim());
      if (result.success) {
        setIsSent(true);
        toast.success('تم إرسال رابط إعادة التعيين!');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <AuthLogo />
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
        <CardHeader className="text-center pb-0">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">نسيت كلمة المرور؟</h2>
          <p className="text-sm text-muted-foreground mt-1">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </p>
        </CardHeader>

        <CardContent>
          {isSent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-gray-700 mb-2 font-semibold">تحقق من بريدك الإلكتروني</p>
              <p className="text-sm text-muted-foreground">
                إذا كان هناك حساب مرتبط بهذا البريد، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
              </p>
              <Button
                onClick={() => setCurrentView('login')}
                className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة لتسجيل الدخول
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-gray-700">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>جاري الإرسال...</span></>
                ) : (
                  'إرسال رابط إعادة التعيين'
                )}
              </Button>
            </form>
          )}
        </CardContent>

        {!isSent && (
          <CardFooter className="justify-center pb-6">
            <button
              type="button"
              onClick={() => setCurrentView('login')}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          </CardFooter>
        )}
      </Card>
    </AuthShell>
  );
}

// ========== ResetPasswordPage ==========

export function ResetPasswordPage({ token }: { token: string }) {
  const { setCurrentView } = useAppStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.resetPassword(token, password);
      if (result.success) {
        setIsDone(true);
        toast.success('تم إعادة تعيين كلمة المرور بنجاح!');
      } else {
        toast.error(result.error || 'الرابط غير صالح أو منتهي الصلاحية');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <AuthLogo />
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
        <CardHeader className="text-center pb-0">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Lock className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">إعادة تعيين كلمة المرور</h2>
          <p className="text-sm text-muted-foreground mt-1">أدخل كلمة المرور الجديدة</p>
        </CardHeader>

        <CardContent>
          {isDone ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-gray-700 mb-2 font-semibold">تم تغيير كلمة المرور بنجاح!</p>
              <p className="text-sm text-muted-foreground">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              <Button
                onClick={() => setCurrentView('login')}
                className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                تسجيل الدخول
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password" className="text-gray-700">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm" className="text-gray-700">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reset-confirm"
                    type="password"
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>جاري إعادة التعيين...</span></>
                ) : (
                  'إعادة تعيين كلمة المرور'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}

// ========== VerifyEmailPage ==========

export function VerifyEmailPage({ token }: { token: string }) {
  const { setCurrentView } = useAppStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    authApi.verifyEmail(token).then((result) => {
      setIsVerifying(false);
      if (result.success) {
        setIsVerified(true);
      } else {
        setError(result.error || 'فشل التحقق من البريد الإلكتروني');
      }
    }).catch(() => {
      setIsVerifying(false);
      setError('حدث خطأ غير متوقع');
    });
  });

  return (
    <AuthShell>
      <AuthLogo />
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
        <CardContent className="py-10 text-center">
          {isVerifying ? (
            <>
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-semibold">جاري التحقق من بريدك الإلكتروني...</p>
            </>
          ) : isVerified ? (
            <>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-gray-700 font-semibold mb-2">تم تأكيد بريدك الإلكتروني بنجاح!</p>
              <p className="text-sm text-muted-foreground mb-6">يمكنك الآن تسجيل الدخول والبدء في رحلتك.</p>
              <Button
                onClick={() => setCurrentView('login')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                تسجيل الدخول
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <Mail className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-700 font-semibold mb-2">فشل التحقق</p>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <Button
                onClick={() => setCurrentView('login')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                العودة لتسجيل الدخول
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
