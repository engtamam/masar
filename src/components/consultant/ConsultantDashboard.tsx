'use client';

// Consultant Dashboard Components for the Digital Incubator Platform
// All UI text in Arabic, code/comments in English
// RTL layout with emerald/teal color scheme

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  LogOut,
  Rocket,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Send,
  Video,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  Trash2,
  ClipboardCheck,
  Hourglass,
  UserCheck,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/store';
import {
  milestonesApi,
  bookingsApi,
  chatApi,
  filesApi,
} from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// ========== Type Definitions ==========

interface Specialty {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface EntrepreneurUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface EntrepreneurProfile {
  id: string;
  projectName?: string;
  user: EntrepreneurUser;
}

interface ConsultantUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ConsultantProfile {
  id: string;
  user: ConsultantUser;
  specialty: Specialty;
}

interface MilestoneDefault {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sortOrder: number;
  specialty: Specialty;
  consultant?: ConsultantProfile;
}

interface MilestoneApproval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  consultant: ConsultantProfile;
  createdAt: string;
}

interface UploadedFileInfo {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  isEncrypted: boolean;
  milestoneProgress?: {
    milestoneDefault: {
      id: string;
      titleAr: string;
      titleEn: string;
    };
  };
  uploader: {
    id: string;
    name: string;
  };
}

interface MilestoneProgressItem {
  id: string;
  milestoneDefaultId: string;
  status: 'LOCKED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED';
  notes?: string;
  startedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  milestoneDefault: MilestoneDefault;
  approvals: MilestoneApproval[];
  files: UploadedFileInfo[];
  entrepreneur?: EntrepreneurProfile;
  entrepreneurId?: string;
}

interface MilestonesResponse {
  milestones: MilestoneDefault[];
  progress: MilestoneProgressItem[];
}

interface BookingConsultant {
  id: string;
  user: ConsultantUser;
  specialty: Specialty;
}

interface BookingEntrepreneur {
  id?: string;
  user: EntrepreneurUser;
  projectName?: string;
}

interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  meetingRoomId?: string;
  meetingUrl?: string;
  notes?: string;
  cancellationReason?: string;
  consultant: BookingConsultant;
  entrepreneur: BookingEntrepreneur;
  milestoneProgress?: {
    id: string;
    milestoneDefault: {
      titleAr: string;
      titleEn: string;
    };
  };
  createdAt: string;
}

interface BookingsResponse {
  bookings: BookingItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  consultantId: string;
}

interface ChatRoomMember {
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
}

interface ChatMessageItem {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
}

interface ChatRoomItem {
  id: string;
  name?: string;
  type: 'DIRECT' | 'MILESTONE_GROUP';
  unreadCount: number;
  members: ChatRoomMember[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string };
  }[];
}

// ========== Constants ==========

const MILESTONE_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  LOCKED: { label: 'مقفل', color: 'text-gray-400', bgColor: 'bg-gray-100' },
  IN_PROGRESS: { label: 'قيد التنفيذ', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  SUBMITTED: { label: 'مقدم', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  APPROVED: { label: 'معتمد', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

const BOOKING_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CONFIRMED: { label: 'مؤكد', variant: 'default' },
  IN_PROGRESS: { label: 'جاري', variant: 'default' },
  COMPLETED: { label: 'مكتمل', variant: 'secondary' },
  CANCELLED: { label: 'ملغى', variant: 'destructive' },
  NO_SHOW: { label: 'لم يحضر', variant: 'outline' },
};

// Arabic day names mapped to dayOfWeek (0=Sunday, 6=Saturday)
const ARABIC_DAYS: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

// Day order for display (Sunday to Saturday)
const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

// ========== Helper Functions ==========

/** Format a date string to Arabic-friendly display */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format a date string for short display */
function formatDateShort(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format time from HH:mm */
function formatTime(time: string): string {
  return time;
}

/** Format file size */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

/** Get initials from name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
}

// ========== 1. ConsultantSidebar ==========

interface NavItem {
  label: string;
  icon: React.ElementType;
  view: AppView;
}

const CONSULTANT_NAV_ITEMS: NavItem[] = [
  { label: 'لوحة التحكم', icon: LayoutDashboard, view: 'consultant-dashboard' },
  { label: 'المواعيد والجدولة', icon: Calendar, view: 'consultant-appointments' },
  { label: 'رواد الأعمال', icon: Users, view: 'consultant-entrepreneurs' },
  { label: 'المحادثات', icon: MessageCircle, view: 'consultant-chat' },
];

export function ConsultantSidebar() {
  const { currentView, setCurrentView, user, logout } = useAppStore();

  // Extract specialty name from consultantProfile
  const consultantProfile = user?.consultantProfile as ConsultantProfile | undefined;
  const specialtyName = consultantProfile?.specialty?.nameAr || '';

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-emerald-800 to-emerald-900 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-emerald-700/50">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Rocket className="w-5 h-5 text-emerald-200" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">الحاضنة الرقمية</h1>
          <p className="text-emerald-300 text-xs">منصة المستشارين</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {CONSULTANT_NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/15 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-emerald-200 hover:bg-white/10 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="p-4 border-t border-emerald-700/50">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="w-10 h-10 border-2 border-emerald-500">
            <AvatarFallback className="bg-emerald-600 text-white text-sm">
              {user?.name ? getInitials(user.name) : '؟'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || '—'}</p>
            {specialtyName && (
              <p className="text-xs text-emerald-300 truncate">{specialtyName}</p>
            )}
            <Badge className="bg-emerald-600/50 text-emerald-100 text-[10px] px-1.5 py-0 mt-0.5 border-0">
              مستشار
            </Badge>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

// ========== 2. ConsultantMainView ==========

export function ConsultantMainView() {
  const { currentView } = useAppStore();

  switch (currentView) {
    case 'consultant-dashboard':
      return <ConsultantOverview />;
    case 'consultant-appointments':
      return <ConsultantSchedule />;
    case 'consultant-entrepreneurs':
      return <ConsultantEntrepreneurs />;
    case 'consultant-chat':
      return <ConsultantChat />;
    default:
      return <ConsultantOverview />;
  }
}

// ========== 3. ConsultantOverview ==========

export function ConsultantOverview() {
  const { user } = useAppStore();
  const [milestonesData, setMilestonesData] = useState<MilestonesResponse | null>(null);
  const [bookingsData, setBookingsData] = useState<BookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mileRes, bookRes] = await Promise.all([
        milestonesApi.getMyMilestones(),
        bookingsApi.getBookings(),
      ]);

      if (mileRes.success && mileRes.data) {
        setMilestonesData(mileRes.data as MilestonesResponse);
      }
      if (bookRes.success && bookRes.data) {
        setBookingsData(bookRes.data as BookingsResponse);
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute stats
  const progress = milestonesData?.progress || [];
  const submittedCount = progress.filter((p) => p.status === 'SUBMITTED').length;

  // Count unique entrepreneurs
  const uniqueEntrepreneurs = new Set(progress.map((p) => p.entrepreneurId).filter(Boolean));
  const totalEntrepreneurs = uniqueEntrepreneurs.size;

  // Sessions this month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const sessionsThisMonth = (bookingsData?.bookings || []).filter((b) => {
    const bookingDate = new Date(b.date);
    return (
      bookingDate.getMonth() === currentMonth &&
      bookingDate.getFullYear() === currentYear &&
      (b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    );
  }).length;

  // Approval rate
  const reviewedMilestones = progress.filter(
    (p) => p.status === 'APPROVED' || p.approvals.some((a) => a.status === 'REJECTED')
  );
  const approvedMilestones = progress.filter((p) => p.status === 'APPROVED');
  const approvalRate =
    reviewedMilestones.length > 0
      ? Math.round((approvedMilestones.length / reviewedMilestones.length) * 100)
      : 0;

  // Pending approvals for quick actions
  const pendingApprovals = progress
    .filter((p) => p.status === 'SUBMITTED')
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });

  const handleQuickApprove = async (mp: MilestoneProgressItem) => {
    if (!mp.entrepreneurId) return;
    setActionLoading(mp.id);
    try {
      const res = await milestonesApi.approveMilestone(mp.id, {
        entrepreneurId: mp.entrepreneurId,
        status: 'APPROVED',
      });
      if (res.success) {
        toast.success('تم اعتماد المرحلة بنجاح');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في اعتماد المرحلة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickReject = async (mp: MilestoneProgressItem) => {
    if (!mp.entrepreneurId) return;
    setActionLoading(mp.id);
    try {
      const res = await milestonesApi.approveMilestone(mp.id, {
        entrepreneurId: mp.entrepreneurId,
        status: 'REJECTED',
        comment: 'مرفوض من المستشار',
      });
      if (res.success) {
        toast.success('تم رفض المرحلة');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في رفض المرحلة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          مرحباً، {user?.name || 'المستشار'} 👋
        </h2>
        <p className="text-muted-foreground mt-1">إليك نظرة عامة على عملك في الحاضنة</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Reviews */}
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-amber-700 font-medium">طلبات بانتظار المراجعة</span>
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Hourglass className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{submittedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">مرحلة تنتظر المراجعة</p>
          </CardContent>
        </Card>

        {/* Total Entrepreneurs */}
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-emerald-700 font-medium">إجمالي الرواد</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{totalEntrepreneurs}</p>
            <p className="text-xs text-muted-foreground mt-1">رائد أعمال</p>
          </CardContent>
        </Card>

        {/* Sessions This Month */}
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-teal-700 font-medium">الجلسات هذا الشهر</span>
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{sessionsThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">جلسة</p>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-purple-700 font-medium">معدل الاعتماد</span>
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{approvalRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">من إجمالي المراجعات</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-500" />
            طلبات بانتظار الاعتماد
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا توجد طلبات بانتظار المراجعة حالياً
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingApprovals.map((mp) => (
                <div
                  key={mp.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100"
                >
                  {/* Entrepreneur info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {mp.entrepreneur?.user
                          ? getInitials(mp.entrepreneur.user.name)
                          : '؟'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {mp.entrepreneur?.user?.name || 'رائد أعمال'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mp.milestoneDefault.titleAr}
                        {mp.submittedAt && ` · ${formatDateShort(mp.submittedAt)}`}
                      </p>
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                      onClick={() => handleQuickApprove(mp)}
                      disabled={actionLoading === mp.id}
                    >
                      {actionLoading === mp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>اعتماد</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                      onClick={() => handleQuickReject(mp)}
                      disabled={actionLoading === mp.id}
                    >
                      {actionLoading === mp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>رفض</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========== 4. ConsultantSchedule ==========

export function ConsultantSchedule() {
  const { user } = useAppStore();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New slot form state
  const [newDay, setNewDay] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newDuration, setNewDuration] = useState('30');
  const [addingSlot, setAddingSlot] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [availRes, bookRes] = await Promise.all([
        user?.id ? bookingsApi.getAvailability(user.id) : Promise.resolve({ success: false, data: undefined } as { success: boolean; data?: unknown }),
        bookingsApi.getBookings(),
      ]);

      if (availRes.success && availRes.data) {
        setAvailability(availRes.data as AvailabilitySlot[]);
      }
      if (bookRes.success && bookRes.data) {
        const data = bookRes.data as BookingsResponse;
        setBookings(data.bookings || []);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSlot = async () => {
    if (!newDay) {
      toast.error('يرجى اختيار اليوم');
      return;
    }
    setAddingSlot(true);
    try {
      const res = await bookingsApi.setAvailability([
        {
          dayOfWeek: parseInt(newDay),
          startTime: newStartTime,
          endTime: newEndTime,
          slotDuration: parseInt(newDuration),
        },
      ]);
      if (res.success) {
        toast.success('تم إضافة الفترة بنجاح');
        setAddDialogOpen(false);
        setNewDay('');
        setNewStartTime('09:00');
        setNewEndTime('17:00');
        setNewDuration('30');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في إضافة الفترة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    setActionLoading(slotId);
    try {
      // Delete by sending remaining slots (excluding the deleted one)
      const remainingSlots = availability
        .filter((s) => s.id !== slotId)
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration,
        }));

      // We need to re-set availability without this slot
      // Using setAvailability to overwrite
      const res = await bookingsApi.setAvailability(remainingSlots);
      if (res.success) {
        toast.success('تم حذف الفترة');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في حذف الفترة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClonePreviousMonth = async () => {
    setCloneLoading(true);
    try {
      // Get current month in YYYY-MM format
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await bookingsApi.cloneAvailability(monthStr);
      if (res.success) {
        toast.success('تم تكرار جدول الشهر السابق بنجاح');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في تكرار الجدول');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setCloneLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: string) => {
    setActionLoading(bookingId);
    try {
      const res = await bookingsApi.updateBooking(bookingId, { status });
      if (res.success) {
        toast.success(
          status === 'COMPLETED' ? 'تم تأكيد إتمام الجلسة' : 'تم تسجيل عدم الحضور'
        );
        await loadData();
      } else {
        toast.error(res.error || 'فشل في تحديث الحجز');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setActionLoading(null);
    }
  };

  // Group availability by day
  const slotsByDay: Record<number, AvailabilitySlot[]> = {};
  for (const slot of availability) {
    if (!slotsByDay[slot.dayOfWeek]) {
      slotsByDay[slot.dayOfWeek] = [];
    }
    slotsByDay[slot.dayOfWeek].push(slot);
  }

  // Upcoming confirmed bookings
  const upcomingBookings = bookings
    .filter((b) => b.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <Tabs defaultValue="availability" dir="rtl">
        <TabsList className="mb-6">
          <TabsTrigger value="availability">إدارة التوفر</TabsTrigger>
          <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
        </TabsList>

        {/* Availability Management Tab */}
        <TabsContent value="availability">
          <div className="space-y-4">
            {/* Actions bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">جدول التوفر الأسبوعي</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClonePreviousMonth}
                  disabled={cloneLoading}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  {cloneLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <span>تكرار جدول الشهر السابق</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة فترة</span>
                </Button>
              </div>
            </div>

            {/* Weekly schedule grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {DAY_ORDER.map((dayNum) => {
                const daySlots = slotsByDay[dayNum] || [];
                return (
                  <Card key={dayNum} className="overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
                      <h3 className="font-semibold text-emerald-800 text-sm">
                        {ARABIC_DAYS[dayNum]}
                      </h3>
                    </div>
                    <CardContent className="p-3">
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          لا توجد فترات متاحة
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                            >
                              <div>
                                <p className="font-medium text-gray-700">
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {slot.slotDuration} دقيقة
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteSlot(slot.id)}
                                disabled={actionLoading === slot.id}
                              >
                                {actionLoading === slot.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Add Slot Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة فترة توفر</DialogTitle>
                <DialogDescription>
                  أضف فترة زمنية متاحة لحجز الجلسات
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Day of week select */}
                <div className="space-y-2">
                  <Label>اليوم</Label>
                  <Select value={newDay} onValueChange={setNewDay}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر اليوم" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_ORDER.map((dayNum) => (
                        <SelectItem key={dayNum} value={String(dayNum)}>
                          {ARABIC_DAYS[dayNum]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start time */}
                <div className="space-y-2">
                  <Label>وقت البداية</Label>
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                </div>

                {/* End time */}
                <div className="space-y-2">
                  <Label>وقت النهاية</Label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                </div>

                {/* Slot duration */}
                <div className="space-y-2">
                  <Label>مدة الفترة (بالدقائق)</Label>
                  <Select value={newDuration} onValueChange={setNewDuration}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 دقيقة</SelectItem>
                      <SelectItem value="30">30 دقيقة</SelectItem>
                      <SelectItem value="45">45 دقيقة</SelectItem>
                      <SelectItem value="60">60 دقيقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleAddSlot}
                  disabled={addingSlot}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {addingSlot ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>إضافة</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">الحجوزات القادمة</h2>

            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">لا توجد حجوزات قادمة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const statusInfo = BOOKING_STATUS_MAP[booking.status];
                  return (
                    <Card key={booking.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Entrepreneur info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="w-11 h-11">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                {booking.entrepreneur?.user
                                  ? getInitials(booking.entrepreneur.user.name)
                                  : '؟'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {booking.entrepreneur?.user?.name || 'رائد أعمال'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(booking.date)} · {formatTime(booking.startTime)} -{' '}
                                {formatTime(booking.endTime)}
                              </p>
                              {booking.milestoneProgress && (
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  {booking.milestoneProgress.milestoneDefault.titleAr}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status badge and actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>

                            {booking.meetingRoomId && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() =>
                                  window.open(`/meeting/${booking.meetingRoomId}`, '_self')
                                }
                              >
                                <Video className="w-4 h-4" />
                                <span className="hidden sm:inline">انضم</span>
                              </Button>
                            )}

                            {booking.status === 'CONFIRMED' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                  onClick={() => handleBookingAction(booking.id, 'COMPLETED')}
                                  disabled={actionLoading === booking.id}
                                >
                                  {actionLoading === booking.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span className="hidden sm:inline">إتمام</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-600 border-amber-200 hover:bg-amber-50 h-8"
                                  onClick={() => handleBookingAction(booking.id, 'NO_SHOW')}
                                  disabled={actionLoading === booking.id}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">لم يحضر</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== 5. ConsultantEntrepreneurs ==========

export function ConsultantEntrepreneurs() {
  const { user } = useAppStore();
  const [data, setData] = useState<MilestonesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<MilestoneProgressItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await milestonesApi.getMyMilestones();
      if (res.success && res.data) {
        setData(res.data as MilestonesResponse);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group progress by entrepreneur
  const progress = data?.progress || [];
  const entrepreneurMap = new Map<string, EntrepreneurProfile & { milestones: MilestoneProgressItem[] }>();

  for (const mp of progress) {
    const entId = mp.entrepreneurId || mp.entrepreneur?.id || 'unknown';
    if (!entrepreneurMap.has(entId)) {
      entrepreneurMap.set(entId, {
        ...(mp.entrepreneur || { id: entId, user: { id: entId, name: 'رائد أعمال', email: '' } }),
        milestones: [],
      });
    }
    entrepreneurMap.get(entId)!.milestones.push(mp);
  }

  const entrepreneurs = Array.from(entrepreneurMap.values());

  const handleApprove = async (mp: MilestoneProgressItem) => {
    if (!mp.entrepreneurId) return;
    setActionLoading(mp.id);
    try {
      const res = await milestonesApi.approveMilestone(mp.id, {
        entrepreneurId: mp.entrepreneurId,
        status: 'APPROVED',
      });
      if (res.success) {
        toast.success('تم اعتماد المرحلة بنجاح');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في اعتماد المرحلة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectTarget.entrepreneurId) return;
    setActionLoading(rejectTarget.id);
    try {
      const res = await milestonesApi.approveMilestone(rejectTarget.id, {
        entrepreneurId: rejectTarget.entrepreneurId,
        status: 'REJECTED',
        comment: rejectComment || undefined,
      });
      if (res.success) {
        toast.success('تم رفض المرحلة');
        setRejectComment('');
        setRejectDialogOpen(false);
        setRejectTarget(null);
        await loadData();
      } else {
        toast.error(res.error || 'فشل في رفض المرحلة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = (fileId: string) => {
    const url = filesApi.getFileUrl(fileId);
    const token = localStorage.getItem('auth_token');
    const downloadUrl = `${url}?token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">رواد الأعمال</h2>

      {entrepreneurs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">لا يوجد رواد أعمال معينين لك حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entrepreneurs.map((ent) => {
            // Find current milestone (first non-APPROVED or last SUBMITTED)
            const currentMilestone = ent.milestones.find(
              (m) => m.status === 'SUBMITTED' || m.status === 'IN_PROGRESS'
            ) || ent.milestones[ent.milestones.length - 1];

            return (
              <Card key={ent.id} className="overflow-hidden">
                <CardContent className="p-5">
                  {/* Entrepreneur header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-base">
                          {ent.user ? getInitials(ent.user.name) : '؟'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">
                          {ent.user?.name || 'رائد أعمال'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {ent.user?.email || ''}
                        </p>
                        {ent.projectName && (
                          <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                            <Rocket className="w-3 h-3" />
                            {ent.projectName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Current milestone status */}
                    {currentMilestone && (
                      <div className="text-sm flex-shrink-0">
                        <p className="text-muted-foreground text-xs">المرحلة الحالية</p>
                        <p className="font-medium">{currentMilestone.milestoneDefault.titleAr}</p>
                        <Badge
                          className={`${MILESTONE_STATUS_MAP[currentMilestone.status].bgColor} ${MILESTONE_STATUS_MAP[currentMilestone.status].color} border-0 text-xs mt-1`}
                        >
                          {MILESTONE_STATUS_MAP[currentMilestone.status].label}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Milestone details */}
                  {currentMilestone && (
                    <div className="mt-4">
                      {/* SUBMITTED milestone: expandable section */}
                      {currentMilestone.status === 'SUBMITTED' && (
                        <div className="border rounded-xl overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 transition-colors text-sm font-medium text-amber-800"
                            onClick={() =>
                              setExpandedId(
                                expandedId === `${ent.id}-${currentMilestone.id}`
                                  ? null
                                  : `${ent.id}-${currentMilestone.id}`
                              )
                            }
                            aria-expanded={expandedId === `${ent.id}-${currentMilestone.id}`}
                          >
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              مرحلة مقدمة للمراجعة
                            </span>
                            {expandedId === `${ent.id}-${currentMilestone.id}` ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {expandedId === `${ent.id}-${currentMilestone.id}` && (
                            <div className="p-4 space-y-4 bg-white">
                              {/* Entrepreneur notes */}
                              {currentMilestone.notes && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                                    ملاحظات رائد الأعمال
                                  </h4>
                                  <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                                    {currentMilestone.notes}
                                  </p>
                                </div>
                              )}

                              {/* Uploaded files */}
                              {currentMilestone.files && currentMilestone.files.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    الملفات المرفقة ({currentMilestone.files.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {currentMilestone.files.map((file) => (
                                      <div
                                        key={file.id}
                                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                                      >
                                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="flex-1 truncate">{file.originalName}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatFileSize(file.fileSize)}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                          onClick={() => handleDownload(file.id)}
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <Button
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleApprove(currentMilestone)}
                                  disabled={actionLoading === currentMilestone.id}
                                >
                                  {actionLoading === currentMilestone.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                  <span>اعتماد المرحلة</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setRejectTarget(currentMilestone);
                                    setRejectDialogOpen(true);
                                  }}
                                  disabled={actionLoading === currentMilestone.id}
                                >
                                  <X className="w-4 h-4" />
                                  <span>رفض</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* IN_PROGRESS milestone */}
                      {currentMilestone.status === 'IN_PROGRESS' && (
                        <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-2 text-blue-700 text-sm">
                          <Hourglass className="w-4 h-4" />
                          <span>بانتظار التقديم</span>
                        </div>
                      )}

                      {/* APPROVED milestone */}
                      {currentMilestone.status === 'APPROVED' && (
                        <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-700 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم الاعتماد</span>
                          </div>
                          {currentMilestone.approvedAt && (
                            <span className="text-xs text-emerald-600">
                              {formatDate(currentMilestone.approvedAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* LOCKED milestone */}
                      {currentMilestone.status === 'LOCKED' && (
                        <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-2 text-gray-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>لم تبدأ بعد</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* All milestones mini-progress */}
                  {ent.milestones.length > 1 && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">جميع المراحل</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ent.milestones
                          .sort((a, b) => a.milestoneDefault.sortOrder - b.milestoneDefault.sortOrder)
                          .map((mp) => (
                            <Badge
                              key={mp.id}
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0.5 ${
                                mp.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : mp.status === 'SUBMITTED'
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : mp.status === 'IN_PROGRESS'
                                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                                  : 'bg-gray-50 text-gray-400 border-gray-200'
                              }`}
                            >
                              {mp.milestoneDefault.titleAr}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject dialog with comment input */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض المرحلة</DialogTitle>
            <DialogDescription>
              أضف تعليقاً يوضح سبب الرفض (اختياري)
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="أضف تعليقك هنا..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectTarget(null); }}>
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === rejectTarget?.id}
            >
              {actionLoading === rejectTarget?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span>رفض</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 6. ConsultantChat ==========

export function ConsultantChat() {
  const { user, activeChatRoomId, setActiveChatRoomId } = useAppStore();
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat rooms
  useEffect(() => {
    async function loadRooms() {
      setLoadingRooms(true);
      try {
        const res = await chatApi.getRooms();
        if (res.success && res.data) {
          setRooms(res.data as ChatRoomItem[]);
          // Auto-select first room if none selected
          const roomsList = res.data as ChatRoomItem[];
          if (roomsList.length > 0 && !activeChatRoomId) {
            setActiveChatRoomId(roomsList[0].id);
          }
        }
      } catch {
        // Silently handle
      } finally {
        setLoadingRooms(false);
      }
    }
    loadRooms();

    // Poll for new rooms every 10 seconds
    const interval = setInterval(loadRooms, 10000);
    return () => clearInterval(interval);
  }, [activeChatRoomId, setActiveChatRoomId]);

  // Load messages when room changes
  useEffect(() => {
    if (!activeChatRoomId) return;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const res = await chatApi.getMessages(activeChatRoomId!);
        if (res.success && res.data) {
          const data = res.data as { messages: ChatMessageItem[] };
          setMessages(data.messages || []);
        }
      } catch {
        // Silently handle
      } finally {
        setLoadingMessages(false);
      }
    }
    loadMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChatRoomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!activeChatRoomId || !messageInput.trim()) return;
    setSending(true);
    try {
      const res = await chatApi.sendMessage(activeChatRoomId, messageInput.trim());
      if (res.success) {
        setMessageInput('');
        // Reload messages
        const msgRes = await chatApi.getMessages(activeChatRoomId);
        if (msgRes.success && msgRes.data) {
          const data = msgRes.data as { messages: ChatMessageItem[] };
          setMessages(data.messages || []);
        }
      } else {
        toast.error(res.error || 'فشل في إرسال الرسالة');
      }
    } catch {
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  // Get other member in a room
  const getOtherMember = (room: ChatRoomItem) => {
    const other = room.members.find((m) => m.user.id !== user?.id);
    return other?.user;
  };

  const selectedRoom = rooms.find((r) => r.id === activeChatRoomId);

  return (
    <div className="flex h-[calc(100vh-0px)]" dir="rtl">
      {/* Chat rooms list (right side in RTL) */}
      <div className="w-72 border-l bg-gray-50 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-900">المحادثات</h2>
        </div>
        <ScrollArea className="flex-1">
          {loadingRooms ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              لا توجد محادثات
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {rooms.map((room) => {
                const otherMember = getOtherMember(room);
                const isSelected = room.id === activeChatRoomId;
                const lastMessage = room.messages?.[0];
                return (
                  <button
                    key={room.id}
                    onClick={() => setActiveChatRoomId(room.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                          {otherMember ? getInitials(otherMember.name) : '؟'}
                        </AvatarFallback>
                      </Avatar>
                      {room.unreadCount > 0 && (
                        <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {room.name || otherMember?.name || 'محادثة'}
                      </p>
                      {lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages area (left side in RTL) */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b bg-white flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                  {getInitials(getOtherMember(selectedRoom)?.name || '؟')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">
                  {selectedRoom.name || getOtherMember(selectedRoom)?.name || 'محادثة'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getOtherMember(selectedRoom)?.role === 'ENTREPRENEUR'
                    ? 'رائد أعمال'
                    : getOtherMember(selectedRoom)?.role === 'ADMIN'
                    ? 'مدير'
                    : ''}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-48 rounded-lg" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  ابدأ المحادثة
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.sender.id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOwn
                              ? 'bg-emerald-600 text-white rounded-bl-sm'
                              : 'bg-gray-100 text-gray-900 rounded-br-sm'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-semibold mb-1 opacity-70">
                              {msg.sender.name}
                            </p>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-emerald-200' : 'text-muted-foreground'
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="اكتب رسالتك..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="icon"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>اختر محادثة للبدء</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
