'use client';

// Entrepreneur Dashboard Components for the Digital Incubator Platform
// All UI text in Arabic, code/comments in English
// RTL layout with emerald/teal color scheme

import { useState, useEffect, useRef, useCallback, type DragEvent } from 'react';
import {
  LayoutDashboard,
  Map,
  Calendar,
  MessageCircle,
  FolderOpen,
  LogOut,
  Rocket,
  Lock,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Download,
  Trash2,
  Send,
  Video,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bell,
  File,
  Plus,
  Paperclip,
  ExternalLink,
  Briefcase,
  Pencil,
  Archive,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store';
import type { AppView, Project } from '@/lib/store';
import {
  milestonesApi,
  bookingsApi,
  chatApi,
  filesApi,
  notificationsApi,
  projectsApi,
  consultantsApi,
} from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

// ========== Type Definitions ==========

interface Specialty {
  id: string;
  nameAr: string;
  nameEn: string;
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
  user: ConsultantUser;
}

interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  meetingLink?: string;
  notes?: string;
  cancellationReason?: string;
  consultant: BookingConsultant;
  entrepreneur: BookingEntrepreneur;
  milestoneProgress?: {
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

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

// ========== Status Helpers ==========

const MILESTONE_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  LOCKED: { label: 'مقفل', color: 'text-gray-400', bgColor: 'bg-gray-100' },
  IN_PROGRESS: { label: 'قيد التنفيذ', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  SUBMITTED: { label: 'مقدم', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  APPROVED: { label: 'معتمد', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

const BOOKING_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CONFIRMED: { label: 'مؤكد', variant: 'default' },
  COMPLETED: { label: 'مكتمل', variant: 'secondary' },
  CANCELLED: { label: 'ملغى', variant: 'destructive' },
  NO_SHOW: { label: 'لم يحضر', variant: 'outline' },
};

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

/** Format time from HH:mm to Arabic 12-hour format */
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
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

// ========== 1. EntrepreneurSidebar ==========

interface NavItem {
  label: string;
  icon: React.ElementType;
  view: AppView;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'لوحة التحكم', icon: LayoutDashboard, view: 'entrepreneur-dashboard' },
  { label: 'مشاريعي', icon: Briefcase, view: 'entrepreneur-projects' },
  { label: 'رحلتي', icon: Map, view: 'entrepreneur-milestones' },
  { label: 'حجوزاتي', icon: Calendar, view: 'entrepreneur-bookings' },
  { label: 'المحادثات', icon: MessageCircle, view: 'entrepreneur-chat' },
  { label: 'الملفات', icon: FolderOpen, view: 'entrepreneur-files' },
];

export function EntrepreneurSidebar() {
  const { currentView, setCurrentView, user, logout, currentProjectId, setCurrentProjectId, projects, setProjects } = useAppStore();

  // Load projects on mount
  useEffect(() => {
    if (projects.length === 0) {
      projectsApi.getProjects().then((res) => {
        if (res.success && res.data) {
          setProjects(res.data as Project[]);
          // Set first project as current if none selected
          const data = res.data as { id: string }[];
          if (data.length > 0 && !currentProjectId) {
            setCurrentProjectId(data[0].id);
          }
        }
      });
    }
  }, []);

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-emerald-800 to-emerald-900 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-emerald-700/50">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Rocket className="w-5 h-5 text-emerald-200" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">الحاضنة الرقمية</h1>
          <p className="text-emerald-300 text-xs">منصة رواد الأعمال</p>
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="px-3 pt-4 pb-2">
          <label className="text-xs text-emerald-300 mb-1.5 block font-medium">المشروع النشط</label>
          <select
            value={currentProjectId || ''}
            onChange={(e) => setCurrentProjectId(e.target.value)}
            className="w-full bg-emerald-700/50 border border-emerald-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-emerald-800">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
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
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10 border-2 border-emerald-500">
            <AvatarFallback className="bg-emerald-600 text-white text-sm">
              {user?.name ? getInitials(user.name) : '؟'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || '—'}</p>
            <p className="text-xs text-emerald-300">رائد أعمال</p>
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

// ========== 2. EntrepreneurMainView ==========

export function EntrepreneurMainView() {
  const { currentView } = useAppStore();

  switch (currentView) {
    case 'entrepreneur-dashboard':
      return <EntrepreneurOverview />;
    case 'entrepreneur-projects':
      return <EntrepreneurProjects />;
    case 'entrepreneur-milestones':
      return <JourneyView />;
    case 'entrepreneur-bookings':
      return <EntrepreneurBookings />;
    case 'entrepreneur-chat':
      return <EntrepreneurChat />;
    case 'entrepreneur-files':
      return <EntrepreneurFiles />;
    default:
      return <EntrepreneurOverview />;
  }
}

// ========== 3. EntrepreneurProjects ==========

const STAGE_LABELS: Record<string, { ar: string; icon: string }> = {
  IDEA: { ar: 'فكرة', icon: '💡' },
  PROTOTYPE: { ar: 'نموذج أولي', icon: '🔧' },
  MVP: { ar: 'MVP', icon: '🚀' },
  OPERATING: { ar: 'تشغيل', icon: '📈' },
  SCALING: { ar: 'توسع', icon: '🌍' },
};

const STATUS_LABELS: Record<string, { ar: string; color: string }> = {
  ACTIVE: { ar: 'نشط', color: 'bg-emerald-100 text-emerald-700' },
  PAUSED: { ar: 'متوقف', color: 'bg-amber-100 text-amber-700' },
  COMPLETED: { ar: 'مكتمل', color: 'bg-blue-100 text-blue-700' },
  ARCHIVED: { ar: 'مؤرشف', color: 'bg-gray-100 text-gray-500' },
};

const INDUSTRY_LABELS: Record<string, string> = {
  technology: 'التقنية',
  healthcare: 'الرعاية الصحية',
  education: 'التعليم',
  fintech: 'التقنية المالية',
  ecommerce: 'التجارة الإلكترونية',
  food: 'الأغذية والمطاعم',
  'real-estate': 'العقارات',
  tourism: 'السياحة والسفر',
  logistics: 'اللوجستيات والنقل',
  energy: 'الطاقة',
  media: 'الإعلام والترفيه',
  manufacturing: 'التصنيع',
  agriculture: 'الزراعة',
  'social-impact': 'التأثير الاجتماعي',
  other: 'أخرى',
};

export function EntrepreneurProjects() {
  const { projects, setProjects, currentProjectId, setCurrentProjectId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', industry: '', description: '', stage: 'IDEA' });
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsApi.getProjects();
      if (res.success && res.data) {
        setProjects(res.data as Project[]);
      }
    } catch {
      toast.error('حدث خطأ في تحميل المشاريع');
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.industry || !formData.stage) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      const res = await projectsApi.createProject({
        name: formData.name.trim(),
        industry: formData.industry,
        description: formData.description.trim() || undefined,
        stage: formData.stage,
      });
      if (res.success) {
        toast.success('تم إنشاء المشروع بنجاح! 🎉');
        setShowCreateDialog(false);
        setFormData({ name: '', industry: '', description: '', stage: 'IDEA' });
        loadProjects();
      } else {
        toast.error(res.error || 'حدث خطأ في إنشاء المشروع');
      }
    } catch {
      toast.error('حدث خطأ في إنشاء المشروع');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editProjectId || !formData.name.trim()) {
      toast.error('الرجاء تعبئة اسم المشروع');
      return;
    }
    setSaving(true);
    try {
      const res = await projectsApi.updateProject(editProjectId, {
        name: formData.name.trim(),
        industry: formData.industry || undefined,
        description: formData.description.trim() || undefined,
        stage: formData.stage || undefined,
      });
      if (res.success) {
        toast.success('تم تحديث المشروع بنجاح');
        setEditProjectId(null);
        setFormData({ name: '', industry: '', description: '', stage: 'IDEA' });
        loadProjects();
      } else {
        toast.error(res.error || 'حدث خطأ في تحديث المشروع');
      }
    } catch {
      toast.error('حدث خطأ في تحديث المشروع');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (projectId: string, status: string) => {
    try {
      const res = await projectsApi.updateProject(projectId, { status });
      if (res.success) {
        toast.success('تم تحديث حالة المشروع');
        loadProjects();
      } else {
        toast.error(res.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const openEdit = (project: Project) => {
    setEditProjectId(project.id);
    setFormData({
      name: project.name,
      industry: project.industry || '',
      description: project.description || '',
      stage: project.stage,
    });
  };

  const openCreate = () => {
    setFormData({ name: '', industry: '', description: '', stage: 'IDEA' });
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">مشاريعي</h2>
          <p className="text-sm text-gray-500">إدارة وتتبع جميع مشاريعك</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="w-4 h-4" />
          مشروع جديد
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد مشاريع بعد</h3>
            <p className="text-sm text-gray-400 mb-6">ابدأ بإنشاء مشروعك الأول لبدء رحلتك الريادية</p>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" />
              إنشاء مشروع
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const stageInfo = STAGE_LABELS[project.stage] || { ar: project.stage, icon: '📋' };
            const statusInfo = STATUS_LABELS[project.status] || { ar: project.status, color: 'bg-gray-100 text-gray-500' };
            const isActive = project.id === currentProjectId;

            return (
              <Card
                key={project.id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  isActive ? 'ring-2 ring-emerald-500 shadow-md' : ''
                }`}
                onClick={() => setCurrentProjectId(project.id)}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="h-1 bg-emerald-500" />
                )}

                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stageInfo.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">{project.name}</h3>
                        {project.industry && (
                          <p className="text-xs text-gray-400">{INDUSTRY_LABELS[project.industry] || project.industry}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={statusInfo.color}>{statusInfo.ar}</Badge>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
                  )}

                  {/* Stage */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">المرحلة:</span>
                    <Badge variant="outline" className="text-xs">{stageInfo.icon} {stageInfo.ar}</Badge>
                  </div>

                  {/* Progress */}
                  {project.milestonesTotal !== undefined && project.milestonesTotal > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>التقدم</span>
                        <span>{project.milestonesCompleted || 0}/{project.milestonesTotal} مراحل</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 h-8"
                      onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                    >
                      <Pencil className="w-3 h-3" />
                      تعديل
                    </Button>

                    {project.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 h-8 text-amber-600 hover:text-amber-700"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'PAUSED'); }}
                      >
                        <PauseCircle className="w-3 h-3" />
                        إيقاف
                      </Button>
                    )}

                    {project.status === 'PAUSED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 h-8 text-emerald-600 hover:text-emerald-700"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'ACTIVE'); }}
                      >
                        <PlayCircle className="w-3 h-3" />
                        استئناف
                      </Button>
                    )}

                    {project.status !== 'ARCHIVED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 h-8 text-gray-400 hover:text-gray-600"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(project.id, 'ARCHIVED'); }}
                      >
                        <Archive className="w-3 h-3" />
                        أرشفة
                      </Button>
                    )}

                    {isActive && (
                      <span className="mr-auto text-xs text-emerald-600 font-medium">● المشروع النشط</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء مشروع جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم المشروع *</label>
              <Input
                placeholder="مثال: تطبيق توصيل ذكي"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الصناعة *</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData((p) => ({ ...p, industry: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">اختر الصناعة</option>
                {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الوصف</label>
              <Textarea
                placeholder="وصف مختصر للمشروع (اختياري)"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">المرحلة *</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(STAGE_LABELS).map(([value, { ar, icon }]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.stage === value
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stage"
                      value={value}
                      checked={formData.stage === value}
                      onChange={(e) => setFormData((p) => ({ ...p, stage: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-medium">{ar}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={saving || !formData.name.trim() || !formData.industry || !formData.stage}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={!!editProjectId} onOpenChange={(open) => { if (!open) setEditProjectId(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المشروع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم المشروع *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الصناعة</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData((p) => ({ ...p, industry: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">اختر الصناعة</option>
                {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">المرحلة</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(STAGE_LABELS).map(([value, { ar, icon }]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.stage === value
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-stage"
                      value={value}
                      checked={formData.stage === value}
                      onChange={(e) => setFormData((p) => ({ ...p, stage: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-medium">{ar}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditProjectId(null)}>إلغاء</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleEdit}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 4. EntrepreneurOverview ==========

export function EntrepreneurOverview() {
  const { user, currentProjectId } = useAppStore();
  const [milestonesData, setMilestonesData] = useState<MilestonesResponse | null>(null);
  const [bookingsData, setBookingsData] = useState<BookingsResponse | null>(null);
  const [notificationsData, setNotificationsData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mileRes, bookRes, notifRes] = await Promise.all([
          milestonesApi.getMyMilestones(currentProjectId || undefined),
          bookingsApi.getBookings({ projectId: currentProjectId || undefined }),
          notificationsApi.getNotifications(),
        ]);

        if (mileRes.success && mileRes.data) {
          setMilestonesData(mileRes.data as MilestonesResponse);
        }
        if (bookRes.success && bookRes.data) {
          setBookingsData(bookRes.data as BookingsResponse);
        }
        if (notifRes.success && notifRes.data) {
          setNotificationsData(notifRes.data as NotificationsResponse);
        }
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute stats
  const progress = milestonesData?.progress || [];
  const currentMilestone = progress.find((p) => p.status === 'IN_PROGRESS');
  const approvedCount = progress.filter((p) => p.status === 'APPROVED').length;
  const totalCount = progress.length;
  const completionPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  // Remaining sessions from quota (we'll show bookings count for now)
  const confirmedBookings = bookingsData?.bookings?.filter((b) => b.status === 'CONFIRMED') || [];
  const unreadNotifs = notificationsData?.unreadCount || 0;

  // Upcoming bookings (next 3)
  const upcomingBookings = bookingsData?.bookings
    ?.filter((b) => b.status === 'CONFIRMED')
    .slice(0, 3) || [];

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
          مرحباً، {user?.name || 'رائد الأعمال'} 👋
        </h2>
        <p className="text-muted-foreground mt-1">إليك نظرة عامة على تقدمك في الحاضنة</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Stage */}
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-emerald-700 font-medium">المرحلة الحالية</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Map className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {currentMilestone?.milestoneDefault?.titleAr || 'لم تبدأ بعد'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentMilestone?.milestoneDefault?.specialty?.nameAr || ''}
            </p>
          </CardContent>
        </Card>

        {/* Completion % */}
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-blue-700 font-medium">نسبة الإنجاز</span>
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{completionPercent}%</p>
            <Progress value={completionPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Remaining Sessions */}
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-amber-700 font-medium">الجلسات المتبقية</span>
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{confirmedBookings.length}</p>
            <p className="text-xs text-muted-foreground mt-1">جلسة مؤكدة</p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-purple-700 font-medium">الإشعارات</span>
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{unreadNotifs}</p>
            <p className="text-xs text-muted-foreground mt-1">إشعار غير مقروء</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity / Upcoming bookings preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming bookings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">الجلسات القادمة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                لا توجد جلسات قادمة
              </p>
            ) : (
              upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                      {getInitials(booking.consultant.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {booking.consultant.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.date} · {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{booking.consultant.specialty.nameAr}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Milestone progress preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">تقدم المراحل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {progress.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                لا توجد مراحل بعد
              </p>
            ) : (
              progress.slice(0, 5).map((mp) => {
                const statusInfo = MILESTONE_STATUS_MAP[mp.status];
                return (
                  <div
                    key={mp.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        mp.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : mp.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-700'
                          : mp.status === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {mp.status === 'APPROVED' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        mp.milestoneDefault.sortOrder
                      )}
                    </div>
                    <span className="flex-1 text-sm truncate">{mp.milestoneDefault.titleAr}</span>
                    <Badge variant="outline" className="text-xs">
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========== 4. JourneyView (MOST IMPORTANT) ==========

export function JourneyView() {
  const { user, currentProjectId } = useAppStore();
  const [data, setData] = useState<MilestonesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const manuallyClosedRef = useRef(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await milestonesApi.getMyMilestones(currentProjectId || undefined);
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

  // Sort progress by sortOrder
  const progress = data?.progress || [];
  const sortedProgress = [...progress].sort(
    (a, b) => a.milestoneDefault.sortOrder - b.milestoneDefault.sortOrder
  );

  // Find the current active milestone (first IN_PROGRESS or first LOCKED after last APPROVED)
  const activeMilestoneId = sortedProgress.find(
    (p) => p.status === 'IN_PROGRESS' || p.status === 'SUBMITTED'
  )?.id;

  // Auto-expand the active milestone on first load only
  useEffect(() => {
    if (activeMilestoneId && !expandedId && !manuallyClosedRef.current) {
      setExpandedId(activeMilestoneId);
    }
  }, [activeMilestoneId, expandedId]);

  const handleSubmitMilestone = async (progressId: string) => {
    setSubmitting(true);
    try {
      const res = await milestonesApi.submitMilestone(progressId, { notes: notes || undefined, projectId: currentProjectId! });
      if (res.success) {
        toast.success('تم تقديم المرحلة للمراجعة بنجاح');
        setNotes('');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في تقديم المرحلة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (progressId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const res = await filesApi.uploadFile(files[i], { milestoneProgressId: progressId, projectId: currentProjectId || undefined });
        if (!res.success) {
          toast.error(`فشل رفع الملف: ${files[i].name}`);
        }
      }
      toast.success('تم رفع الملفات بنجاح');
      await loadData();
    } catch {
      toast.error('حدث خطأ أثناء رفع الملفات');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent, progressId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileUpload(progressId, files);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">رحلتي</h2>
        <p className="text-muted-foreground mt-1">
          تابع تقدمك عبر المراحل الثمانية نحو جاهزية الاستثمار
        </p>
      </div>

      {/* Vertical timeline */}
      <div className="relative space-y-0">
        {sortedProgress.map((mp, index) => {
          const statusInfo = MILESTONE_STATUS_MAP[mp.status];
          const isExpanded = expandedId === mp.id;
          const isActive = mp.status === 'IN_PROGRESS' || mp.status === 'SUBMITTED';
          const isLast = index === sortedProgress.length - 1;

          return (
            <div key={mp.id} className="relative">
              {/* Connection line */}
              {!isLast && (
                <div
                  className={`absolute right-5 top-12 w-0.5 h-[calc(100%-12px)] ${
                    mp.status === 'APPROVED' ? 'bg-emerald-300' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Milestone card */}
              <div
                className={`flex gap-4 pb-6 cursor-pointer transition-all ${
                  mp.status === 'LOCKED' ? 'opacity-60' : ''
                }`}
                onClick={() => {
                  if (mp.status !== 'LOCKED') {
                    if (isExpanded) {
                      manuallyClosedRef.current = true;
                      setExpandedId(null);
                    } else {
                      manuallyClosedRef.current = false;
                      setExpandedId(mp.id);
                    }
                  }
                }}
                role="button"
                tabIndex={mp.status === 'LOCKED' ? -1 : 0}
                aria-expanded={isExpanded}
              >
                {/* Step indicator circle */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 ${
                    mp.status === 'APPROVED'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : mp.status === 'IN_PROGRESS'
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                      : mp.status === 'SUBMITTED'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  {mp.status === 'APPROVED' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : mp.status === 'SUBMITTED' ? (
                    <Clock className="w-5 h-5" />
                  ) : mp.status === 'LOCKED' ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-bold">{mp.milestoneDefault.sortOrder}</span>
                  )}
                </div>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                  <Card
                    className={`transition-all duration-200 ${
                      isActive
                        ? 'border-blue-200 shadow-md ring-1 ring-blue-100'
                        : mp.status === 'APPROVED'
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-gray-200'
                    } ${isExpanded ? 'shadow-lg' : ''}`}
                  >
                    <CardContent className="p-4">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base">
                            {mp.milestoneDefault.titleAr}
                          </h3>
                          {mp.milestoneDefault.descriptionAr && !isExpanded && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {mp.milestoneDefault.descriptionAr}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            className={`${statusInfo.bgColor} ${statusInfo.color} border-0 text-xs`}
                          >
                            {statusInfo.label}
                          </Badge>
                          {mp.status !== 'LOCKED' && (
                            isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Specialty & consultant */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{mp.milestoneDefault.specialty.nameAr}</span>
                        {mp.milestoneDefault.consultant && (
                          <>
                            <span>·</span>
                            <span>{mp.milestoneDefault.consultant.user.name}</span>
                          </>
                        )}
                      </div>

                      {/* IN_PROGRESS: submit button inline */}
                      {mp.status === 'IN_PROGRESS' && !isExpanded && (
                        <Button
                          size="sm"
                          className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            manuallyClosedRef.current = false;
                            setExpandedId(mp.id);
                          }}
                        >
                          تقديم للمراجعة
                        </Button>
                      )}

                      {/* SUBMITTED: awaiting indicator */}
                      {mp.status === 'SUBMITTED' && (
                        <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>بانتظار الاعتماد</span>
                        </div>
                      )}

                      {/* Expanded content */}
                      {isExpanded && mp.status !== 'LOCKED' && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          {/* Description */}
                          {mp.milestoneDefault.descriptionAr && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                الوصف
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {mp.milestoneDefault.descriptionAr}
                              </p>
                            </div>
                          )}

                          {/* Notes textarea */}
                          {(mp.status === 'IN_PROGRESS') && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                ملاحظاتك
                              </h4>
                              <Textarea
                                placeholder="أضف ملاحظاتك هنا..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="min-h-[80px] resize-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}

                          {/* Existing notes for submitted milestones */}
                          {mp.notes && mp.status === 'SUBMITTED' && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                ملاحظاتك المقدمة
                              </h4>
                              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                                {mp.notes}
                              </p>
                            </div>
                          )}

                          {/* File upload area */}
                          {mp.status === 'IN_PROGRESS' && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                الملفات
                              </h4>
                              <div
                                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, mp.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                              >
                                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  اسحب الملفات هنا أو{' '}
                                  <span className="text-emerald-600 font-medium">اضغط للاختيار</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  PDF, DOC, XLS, PNG, JPG
                                </p>
                                {uploadingFiles && (
                                  <div className="mt-2 flex items-center justify-center gap-2 text-emerald-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">جاري الرفع...</span>
                                  </div>
                                )}
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    handleFileUpload(mp.id, e.target.files);
                                    e.target.value = '';
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}

                          {/* Uploaded files list */}
                          {mp.files && mp.files.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                الملفات المرفقة ({mp.files.length})
                              </h4>
                              <div className="space-y-2">
                                {mp.files.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                                  >
                                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="flex-1 truncate">{file.originalName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatFileSize(file.fileSize)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Approval history */}
                          {mp.approvals && mp.approvals.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                سجل الاعتماد
                              </h4>
                              <div className="space-y-2">
                                {mp.approvals.map((approval) => (
                                  <div key={approval.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className={
                                          approval.status === 'APPROVED'
                                            ? 'text-emerald-600 border-emerald-300'
                                            : approval.status === 'REJECTED'
                                            ? 'text-red-600 border-red-300'
                                            : 'text-amber-600 border-amber-300'
                                        }
                                      >
                                        {approval.status === 'APPROVED'
                                          ? 'معتمد'
                                          : approval.status === 'REJECTED'
                                          ? 'مرفوض'
                                          : 'قيد المراجعة'}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {approval.consultant.user.name}
                                      </span>
                                    </div>
                                    {approval.comment && (
                                      <p className="text-muted-foreground mt-1">{approval.comment}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Submit button */}
                          {mp.status === 'IN_PROGRESS' && (
                            <Button
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitMilestone(mp.id);
                              }}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>جاري التقديم...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>تقديم للمراجعة</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== 5. EntrepreneurBookings ==========

interface ConsultantInfo {
  id: string;
  userId: string;
  bio?: string;
  rating: number;
  user: { id: string; name: string; email: string; avatarUrl?: string };
  specialty: { id: string; nameAr: string; nameEn: string; icon?: string; color?: string };
}

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
}

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function EntrepreneurBookings() {
  const { user, currentProjectId, projects } = useAppStore();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingItem | null>(null);

  // Booking creation state
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [consultants, setConsultants] = useState<ConsultantInfo[]>([]);
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantInfo | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [loadingConsultants, setLoadingConsultants] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneProgressItem | null>(null);
  const [loadingMilestone, setLoadingMilestone] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getBookings({ projectId: currentProjectId || undefined });
      if (res.success && res.data) {
        const data = res.data as BookingsResponse;
        setBookings(data.bookings || []);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Load current milestone and filtered consultants when dialog opens
  useEffect(() => {
    if (showBookDialog) {
      let cancelled = false;

      (async () => {
        setLoadingMilestone(true);
        setLoadingConsultants(true);

        let specialtyId: string | undefined;

        try {
          // Load milestones to find the current IN_PROGRESS milestone
          const milestonesRes = await milestonesApi.getMyMilestones(currentProjectId || undefined);
          if (!cancelled && milestonesRes.success && milestonesRes.data) {
            const data = milestonesRes.data as MilestonesResponse;
            const inProgress = (data.progress || []).find(
              (mp) => mp.status === 'IN_PROGRESS'
            );
            setCurrentMilestone(inProgress || null);
            specialtyId = inProgress?.milestoneDefault?.specialty?.id;
          }
        } catch {
          // Silently handle - will load all consultants as fallback
        } finally {
          if (!cancelled) setLoadingMilestone(false);
        }

        try {
          // Load consultants filtered by the milestone's specialty
          const consultantsRes = await consultantsApi.getConsultants(specialtyId);
          if (!cancelled && consultantsRes.success && consultantsRes.data) {
            setConsultants(consultantsRes.data as ConsultantInfo[]);
          }
        } catch {
          if (!cancelled) toast.error('حدث خطأ في تحميل المستشارين');
        } finally {
          if (!cancelled) setLoadingConsultants(false);
        }
      })();

      return () => { cancelled = true; };
    } else {
      // Reset state when dialog closes
      setSelectedConsultant(null);
      setAvailability([]);
      setSelectedDate('');
      setSelectedStartTime('');
      setSelectedEndTime('');
      setBookingNotes('');
      setCurrentMilestone(null);
    }
  }, [showBookDialog, currentProjectId]);

  // Load availability when consultant is selected
  useEffect(() => {
    if (selectedConsultant) {
      setLoadingAvailability(true);
      setAvailability([]);
      setSelectedDate('');
      setSelectedStartTime('');
      setSelectedEndTime('');
      bookingsApi.getAvailability(selectedConsultant.id).then((res) => {
        if (res.success && res.data) {
          setAvailability(res.data as AvailabilitySlot[]);
        }
      }).catch(() => {
        toast.error('حدث خطأ في تحميل المواعيد المتاحة');
      }).finally(() => {
        setLoadingAvailability(false);
      });
    }
  }, [selectedConsultant]);

  const handleCreateBooking = async () => {
    if (!selectedConsultant || !selectedDate || !selectedStartTime || !selectedEndTime) {
      toast.error('الرجاء اختيار المستشار والتاريخ والوقت');
      return;
    }
    if (!currentProjectId) {
      toast.error('الرجاء اختيار مشروع أولاً');
      return;
    }
    setCreating(true);
    try {
      const res = await bookingsApi.createBooking({
        consultantId: selectedConsultant.id,
        projectId: currentProjectId,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        milestoneProgressId: currentMilestone?.id,
        notes: bookingNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('تم حجز الجلسة بنجاح! 🎉');
        setShowBookDialog(false);
        loadBookings();
      } else {
        toast.error(res.error || 'فشل في حجز الجلسة');
      }
    } catch {
      toast.error('حدث خطأ في حجز الجلسة');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async () => {
    if (!bookingToCancel) return;
    setCancellingId(bookingToCancel.id);
    try {
      const res = await bookingsApi.updateBooking(bookingToCancel.id, {
        status: 'CANCELLED',
        cancellationReason: 'إلغاء من قبل رائد الأعمال',
      });
      if (res.success) {
        toast.success('تم إلغاء الحجز بنجاح');
        await loadBookings();
      } else {
        toast.error(res.error || 'فشل في إلغاء الحجز');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setCancellingId(null);
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    }
  };

  const openMeetingLink = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Generate available dates for the next 14 days based on consultant availability
  const getAvailableDates = (): { date: string; dayName: string; dayOfWeek: number }[] => {
    if (availability.length === 0) return [];
    const availableDays = new Set(availability.map((s) => s.dayOfWeek));
    const dates: { date: string; dayName: string; dayOfWeek: number }[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (availableDays.has(dow)) {
        dates.push({
          date: d.toISOString().split('T')[0],
          dayName: DAY_NAMES_AR[dow],
          dayOfWeek: dow,
        });
      }
    }
    return dates;
  };

  // Get time slots for selected date
  const getTimeSlotsForDate = (): { start: string; end: string; label: string }[] => {
    if (!selectedDate) return [];
    const dow = new Date(selectedDate).getDay();
    const daySlots = availability.filter((s) => s.dayOfWeek === dow);
    const slots: { start: string; end: string; label: string }[] = [];
    for (const slot of daySlots) {
      const duration = slot.slotDuration || 30;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      let startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      while (startMin + duration <= endMin) {
        const h = Math.floor(startMin / 60);
        const m = startMin % 60;
        const eh2 = Math.floor((startMin + duration) / 60);
        const em2 = (startMin + duration) % 60;
        const startStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const endStr = `${eh2.toString().padStart(2, '0')}:${em2.toString().padStart(2, '0')}`;
        slots.push({ start: startStr, end: endStr, label: `${formatTime(startStr)} - ${formatTime(endStr)}` });
        startMin += duration;
      }
    }
    return slots;
  };

  const availableDates = getAvailableDates();
  const timeSlots = getTimeSlotsForDate();

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">حجوزاتي</h2>
          <p className="text-sm text-gray-500">إدارة جلساتك الاستشارية</p>
        </div>
        <Button
          onClick={() => setShowBookDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          disabled={!currentProjectId}
        >
          <Plus className="w-4 h-4" />
          حجز جلسة جديدة
        </Button>
      </div>

      {!currentProjectId && (
        <Card className="border-amber-200 bg-amber-50 mb-4">
          <CardContent className="p-4 text-center">
            <p className="text-amber-700 text-sm">الرجاء اختيار مشروع من القائمة الجانبية أولاً</p>
          </CardContent>
        </Card>
      )}

      {/* Bookings list */}
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد حجوزات حالياً</h3>
            <p className="text-sm text-gray-400 mb-6">احجز جلسة استشارية مع أحد المستشارين للبدء</p>
            {currentProjectId && (
              <Button onClick={() => setShowBookDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="w-4 h-4" />
                حجز جلسة
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const statusInfo = BOOKING_STATUS_MAP[booking.status];
            return (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Consultant info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {getInitials(booking.consultant.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {booking.consultant.user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.consultant.specialty.nameAr}
                        </p>
                      </div>
                    </div>

                    {/* Date and time */}
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{formatDate(booking.date)}</p>
                      <p className="text-muted-foreground">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </p>
                    </div>

                    {/* Status and actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>

                      {booking.status === 'CONFIRMED' && booking.meetingLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => openMeetingLink(booking.meetingLink!)}
                        >
                          <Video className="w-4 h-4" />
                          <span className="hidden sm:inline">انضم</span>
                        </Button>
                      )}

                      {booking.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setBookingToCancel(booking);
                            setCancelDialogOpen(true);
                          }}
                          disabled={cancellingId === booking.id}
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">إلغاء</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Milestone association */}
                  {booking.milestoneProgress && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Map className="w-3 h-3" />
                      <span>{booking.milestoneProgress.milestoneDefault.titleAr}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد إلغاء الحجز</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء الحجز مع {bookingToCancel?.consultant.user.name} في{' '}
              {bookingToCancel ? formatDate(bookingToCancel.date) : ''}؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              تراجع
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!!cancellingId}>
              {cancellingId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              إلغاء الحجز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Book a Session Dialog ===== */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              حجز جلسة استشارية
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Current milestone info */}
            {loadingMilestone ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري تحميل المرحلة الحالية...
              </div>
            ) : currentMilestone ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <Map className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-blue-700">
                  حجز جلسة للمرحلة: <strong>{currentMilestone.milestoneDefault.titleAr}</strong>
                  <span className="text-blue-500 mr-1">({currentMilestone.milestoneDefault.specialty.nameAr})</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-amber-700">لا توجد مرحلة نشطة حالياً - سيتم عرض جميع المستشارين</span>
              </div>
            )}

            {/* Step 1: Select Consultant */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {currentMilestone ? `اختر مستشار (${currentMilestone.milestoneDefault.specialty.nameAr})` : 'اختر المستشار'} *
              </label>
              {loadingConsultants ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تحميل المستشارين...
                </div>
              ) : consultants.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {currentMilestone
                    ? `لا يوجد مستشارين متاحين لتخصص "${currentMilestone.milestoneDefault.specialty.nameAr}" حالياً`
                    : 'لا يوجد مستشارين متاحين حالياً'
                  }
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {consultants.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedConsultant?.id === c.id
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="consultant"
                        checked={selectedConsultant?.id === c.id}
                        onChange={() => setSelectedConsultant(c)}
                        className="sr-only"
                      />
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                          {getInitials(c.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.user.name}</p>
                        <p className="text-xs text-gray-400">{c.specialty.nameAr}</p>
                      </div>
                      {c.rating > 0 && (
                        <span className="text-xs text-amber-600 font-medium">⭐ {c.rating.toFixed(1)}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select Date */}
            {selectedConsultant && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">اختر التاريخ *</label>
                {loadingAvailability ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تحميل المواعيد...
                  </div>
                ) : availableDates.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    هذا المستشار لم يحدد مواعيد متاحة بعد. يمكنك التواصل معه عبر المحادثات.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableDates.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => { setSelectedDate(d.date); setSelectedStartTime(''); setSelectedEndTime(''); }}
                        className={`p-2.5 rounded-lg border text-center transition-all text-sm ${
                          selectedDate === d.date
                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 text-emerald-700 font-medium'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <div className="font-medium">{d.dayName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{d.date}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Time */}
            {selectedDate && timeSlots.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">اختر الوقت *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => { setSelectedStartTime(slot.start); setSelectedEndTime(slot.end); }}
                      className={`p-2.5 rounded-lg border text-center transition-all text-sm ${
                        selectedStartTime === slot.start
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 text-emerald-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Notes */}
            {selectedStartTime && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ملاحظات (اختياري)</label>
                <Textarea
                  placeholder="أضف ملاحظاتك للمستشار..."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
            )}

            {/* Summary */}
            {selectedConsultant && selectedDate && selectedStartTime && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold text-emerald-800 mb-2">ملخص الحجز</h4>
                  <div className="space-y-1 text-xs text-emerald-700">
                    <p>المستشار: {selectedConsultant.user.name} ({selectedConsultant.specialty.nameAr})</p>
                    <p>التاريخ: {selectedDate}</p>
                    <p>الوقت: {formatTime(selectedStartTime)} - {formatTime(selectedEndTime)}</p>
                    {currentMilestone && (
                      <p>المرحلة: {currentMilestone.milestoneDefault.titleAr} ({currentMilestone.milestoneDefault.specialty.nameAr})</p>
                    )}
                    <p>المشروع: {projects.find((p) => p.id === currentProjectId)?.name || 'غير محدد'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>إلغاء</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateBooking}
              disabled={creating || !selectedConsultant || !selectedDate || !selectedStartTime}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {creating ? 'جاري الحجز...' : 'تأكيد الحجز'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 6. EntrepreneurChat ==========

export function EntrepreneurChat() {
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

    // Poll for new messages every 10 seconds
    const interval = setInterval(loadRooms, 10000);
    return () => clearInterval(interval);
  }, [activeChatRoomId, setActiveChatRoomId]);

  // Load messages when room changes
  useEffect(() => {
    if (!activeChatRoomId) return;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const res = await chatApi.getMessages(activeChatRoomId);
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
                  {getOtherMember(selectedRoom)?.role === 'CONSULTANT'
                    ? 'مستشار'
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

// ========== 7. EntrepreneurFiles ==========

export function EntrepreneurFiles() {
  const { user, currentProjectId } = useAppStore();
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<string>('');
  const [milestones, setMilestones] = useState<MilestoneProgressItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: { milestoneProgressId?: string; projectId?: string } = {};
      if (selectedMilestone) {
        params.milestoneProgressId = selectedMilestone;
      }
      if (currentProjectId) {
        params.projectId = currentProjectId;
      }
      const res = await filesApi.getFiles(Object.keys(params).length > 0 ? params : undefined);
      if (res.success && res.data) {
        setFiles(res.data as UploadedFileInfo[]);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [selectedMilestone]);

  const loadMilestones = useCallback(async () => {
    try {
      const res = await milestonesApi.getMyMilestones(currentProjectId || undefined);
      if (res.success && res.data) {
        const data = res.data as MilestonesResponse;
        setMilestones(data.progress || []);
      }
    } catch {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < filesList.length; i++) {
        const res = await filesApi.uploadFile(
          filesList[i],
          { milestoneProgressId: selectedMilestone || undefined, projectId: currentProjectId || undefined }
        );
        if (!res.success) {
          toast.error(`فشل رفع الملف: ${filesList[i].name}`);
        }
      }
      toast.success('تم رفع الملفات بنجاح');
      await loadFiles();
    } catch {
      toast.error('حدث خطأ أثناء رفع الملفات');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      const res = await filesApi.deleteFile(fileId);
      if (res.success) {
        toast.success('تم حذف الملف بنجاح');
        await loadFiles();
      } else {
        toast.error(res.error || 'فشل في حذف الملف');
      }
    } catch {
      toast.error('حدث خطأ أثناء حذف الملف');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (fileId: string, fileName: string) => {
    const url = filesApi.getFileUrl(fileId);
    const token = localStorage.getItem('auth_token');
    // Open download in new tab with token as query param for auth
    const downloadUrl = `${url}?token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">الملفات</h2>
        <div className="flex items-center gap-3">
          {/* Milestone filter */}
          <select
            value={selectedMilestone}
            onChange={(e) => setSelectedMilestone(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-white"
          >
            <option value="">جميع المراحل</option>
            {milestones.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.milestoneDefault.titleAr}
              </option>
            ))}
          </select>

          {/* Upload button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الرفع...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>رفع ملف</span>
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Files list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد ملفات بعد</p>
            <p className="text-sm text-muted-foreground mt-1">
              ارفع ملفاتك المتعلقة بالمراحل المختلفة
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* File icon */}
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <File className="w-5 h-5 text-emerald-600" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.originalName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>·</span>
                      <span>{formatDateShort(file.createdAt)}</span>
                      {file.milestoneProgress && (
                        <>
                          <span>·</span>
                          <span>{file.milestoneProgress.milestoneDefault.titleAr}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleDownload(file.id, file.originalName)}
                      title="تنزيل"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      title="حذف"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
