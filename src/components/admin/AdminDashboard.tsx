'use client';

// Admin Dashboard Components for the Digital Incubator Platform
// All UI text in Arabic, code/comments in English
// RTL layout with emerald/teal color scheme

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  Flag,
  Settings,
  Gauge,
  BarChart3,
  MessageSquare,
  LogOut,
  Rocket,
  Loader2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  UserPlus,
  Palette,
  ToggleLeft,
  Save,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/store';
import { adminApi } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ========== Type Definitions ==========

interface Specialty {
  id: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder?: number;
  _count?: {
    consultants: number;
    milestoneDefaults: number;
  };
}

interface ConsultantUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface ConsultantProfile {
  id: string;
  user: ConsultantUser;
  specialty: { id: string; nameAr: string; nameEn: string };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONSULTANT' | 'ENTREPRENEUR';
  isActive: boolean;
  createdAt: string;
  phone?: string;
  avatarUrl?: string;
  consultantProfile?: ConsultantProfile;
  entrepreneurProfile?: {
    id: string;
    quota?: {
      id: string;
      monthlyBookingLimit: number;
      bookingsUsedThisMonth: number;
      isExempted: boolean;
      customLimit?: number;
      currentMonth: string;
    };
  };
}

interface UsersResponse {
  users: UserItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface MilestoneDefaultItem {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  specialty: { id: string; nameAr: string; nameEn: string; icon?: string; color?: string };
  consultant?: {
    id: string;
    user: { id: string; name: string; email: string };
  };
  _count?: { milestoneProgress: number };
}

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuotaItem {
  id: string;
  monthlyBookingLimit: number;
  bookingsUsedThisMonth: number;
  isExempted: boolean;
  customLimit?: number;
  currentMonth: string;
  entrepreneur: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      avatarUrl?: string;
    };
  };
}

interface QuotasResponse {
  quotas: QuotaItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ConsultantPerformance {
  id: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
  specialty: { id: string; nameAr: string; nameEn: string };
  rating?: number;
  totalBookings: number;
  completedSessions: number;
  totalApprovals: number;
  approvedCount: number;
  pendingApprovals: number;
  assignedMilestones: number;
}

interface ReportsData {
  users: {
    total: number;
    admins: number;
    consultants: number;
    entrepreneurs: number;
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
  };
  milestones: {
    approved: number;
    inProgress: number;
    locked: number;
    submitted: number;
  };
  consultantPerformance: ConsultantPerformance[];
  recentBookings: {
    id: string;
    status: string;
    createdAt: string;
    consultant: { user: { name: string } };
    entrepreneur: { user: { name: string } };
  }[];
  chat: {
    totalRooms: number;
    totalMessages: number;
  };
}

interface ChatRoomMember {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
}

interface ChatMessageItem {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

interface ChatRoomItem {
  id: string;
  name?: string;
  type: 'DIRECT' | 'MILESTONE_GROUP';
  isActive?: boolean;
  members: ChatRoomMember[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string; role: string };
  }[];
  totalMessages: number;
  updatedAt: string;
}

// ========== Status/Role Helpers ==========

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'مدير', color: 'text-purple-600' },
  CONSULTANT: { label: 'مستشار', color: 'text-emerald-600' },
  ENTREPRENEUR: { label: 'رائد أعمال', color: 'text-blue-600' },
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

/** Format date short */
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

/** Get initials from name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
}

// ========== 1. AdminSidebar ==========

interface NavItem {
  label: string;
  icon: React.ElementType;
  view: AppView;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'نظرة عامة', icon: LayoutDashboard, view: 'admin-dashboard' },
  { label: 'إدارة المستخدمين', icon: Users, view: 'admin-users' },
  { label: 'التخصصات', icon: Award, view: 'admin-specialties' },
  { label: 'المراحل', icon: Flag, view: 'admin-milestones' },
  { label: 'الإعدادات', icon: Settings, view: 'admin-configs' },
  { label: 'الحصص', icon: Gauge, view: 'admin-quotas' },
  { label: 'التقارير', icon: BarChart3, view: 'admin-reports' },
  { label: 'مراقبة المحادثات', icon: MessageSquare, view: 'admin-chat' },
];

export function AdminSidebar() {
  const { currentView, setCurrentView, user, logout } = useAppStore();

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-emerald-800 to-emerald-900 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-emerald-700/50">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Rocket className="w-5 h-5 text-emerald-200" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">الحاضنة الرقمية</h1>
          <p className="text-emerald-300 text-xs">لوحة الإدارة</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {ADMIN_NAV_ITEMS.map((item) => {
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
            <Badge className="bg-emerald-600/50 text-emerald-100 text-[10px] px-1.5 py-0 border-0">
              مدير النظام
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

// ========== 2. AdminMainView ==========

export function AdminMainView() {
  const { currentView } = useAppStore();

  switch (currentView) {
    case 'admin-dashboard':
      return <AdminOverview />;
    case 'admin-users':
      return <AdminUsers />;
    case 'admin-specialties':
      return <AdminSpecialties />;
    case 'admin-milestones':
      return <AdminMilestones />;
    case 'admin-configs':
      return <AdminConfigs />;
    case 'admin-quotas':
      return <AdminQuotas />;
    case 'admin-reports':
      return <AdminReports />;
    case 'admin-chat':
      return <AdminChatMonitor />;
    default:
      return <AdminOverview />;
  }
}

// ========== 3. AdminOverview ==========

export function AdminOverview() {
  const { user } = useAppStore();
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await adminApi.getReports();
        if (res.success && res.data) {
          setReports(res.data as ReportsData);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute completion rate
  const totalMilestones = reports?.milestones
    ? reports.milestones.approved +
      reports.milestones.inProgress +
      reports.milestones.locked +
      reports.milestones.submitted
    : 0;
  const completionRate =
    totalMilestones > 0
      ? Math.round((reports!.milestones.approved / totalMilestones) * 100)
      : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const stats = [
    {
      label: 'إجمالي رواد الأعمال',
      value: reports?.users.entrepreneurs ?? 0,
      icon: Users,
      gradient: 'from-emerald-50 to-white',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      labelColor: 'text-emerald-700',
    },
    {
      label: 'إجمالي المستشارين',
      value: reports?.users.consultants ?? 0,
      icon: ShieldCheck,
      gradient: 'from-teal-50 to-white',
      border: 'border-teal-100',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      labelColor: 'text-teal-700',
    },
    {
      label: 'الجلسات المؤكدة',
      value: reports?.bookings.completed ?? 0,
      icon: CheckCircle2,
      gradient: 'from-blue-50 to-white',
      border: 'border-blue-100',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      labelColor: 'text-blue-700',
    },
    {
      label: 'المراحل المعتمدة',
      value: reports?.milestones.approved ?? 0,
      icon: Flag,
      gradient: 'from-amber-50 to-white',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      labelColor: 'text-amber-700',
    },
    {
      label: 'المراحل قيد التنفيذ',
      value: reports?.milestones.inProgress ?? 0,
      icon: RefreshCw,
      gradient: 'from-purple-50 to-white',
      border: 'border-purple-100',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      labelColor: 'text-purple-700',
    },
    {
      label: 'معدل الإنجاز',
      value: `${completionRate}%`,
      icon: BarChart3,
      gradient: 'from-rose-50 to-white',
      border: 'border-rose-100',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      labelColor: 'text-rose-700',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          مرحباً، {user?.name || 'المدير'} 👋
        </h2>
        <p className="text-muted-foreground mt-1">إليك نظرة عامة على منصة الحاضنة الرقمية</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`border ${stat.border} bg-gradient-to-br ${stat.gradient}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm ${stat.labelColor} font-medium`}>{stat.label}</span>
                  <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-500" />
            النشاط الأخير
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!reports?.recentBookings || reports.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا يوجد نشاط حتى الآن
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reports.recentBookings.slice(0, 8).map((booking) => {
                const statusInfo = BOOKING_STATUS_MAP[booking.status];
                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {getInitials(booking.entrepreneur.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.entrepreneur.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        جلسة مع {booking.consultant.user.name} · {formatDateShort(booking.createdAt)}
                      </p>
                    </div>
                    {statusInfo && (
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========== 4. AdminUsers ==========

export function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  // Add user form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<string>('ENTREPRENEUR');
  const [formSpecialtyId, setFormSpecialtyId] = useState('');
  const [formBio, setFormBio] = useState('');

  // Edit user form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSpecialtyId, setEditSpecialtyId] = useState('');

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: { role?: string; search?: string; page?: number } = { page };
      if (roleFilter && roleFilter !== 'all') params.role = roleFilter;
      if (search) params.search = search;

      const res = await adminApi.getUsers(params);
      if (res.success && res.data) {
        const data = res.data as UsersResponse;
        setUsers(data.users || []);
        setPagination(data.pagination);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  const loadSpecialties = useCallback(async () => {
    try {
      const res = await adminApi.getSpecialties(true);
      if (res.success && res.data) {
        setSpecialties(res.data as Specialty[]);
      }
    } catch {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  const handleAddUser = async () => {
    if (!formName || !formEmail || !formPassword) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.createUser({
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
        specialtyId: formRole === 'CONSULTANT' ? formSpecialtyId : undefined,
        bio: formBio || undefined,
      });
      if (res.success) {
        toast.success('تم إضافة المستخدم بنجاح');
        setAddDialogOpen(false);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormRole('ENTREPRENEUR');
        setFormSpecialtyId('');
        setFormBio('');
        await loadUsers(pagination.page);
      } else {
        toast.error(res.error || 'فشل في إضافة المستخدم');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userItem: UserItem) => {
    try {
      const res = await adminApi.updateUser({
        userId: userItem.id,
        isActive: !userItem.isActive,
      });
      if (res.success) {
        toast.success(userItem.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
        await loadUsers(pagination.page);
      } else {
        toast.error(res.error || 'فشل في تحديث حالة المستخدم');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await adminApi.updateUser({
        userId: selectedUser.id,
        name: editName,
        bio: editBio || undefined,
        specialtyId: selectedUser.role === 'CONSULTANT' && editSpecialtyId ? editSpecialtyId : undefined,
      });
      if (res.success) {
        toast.success('تم تحديث المستخدم بنجاح');
        setEditDialogOpen(false);
        setSelectedUser(null);
        await loadUsers(pagination.page);
      } else {
        toast.error(res.error || 'فشل في تحديث المستخدم');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (userItem: UserItem) => {
    setSelectedUser(userItem);
    setEditName(userItem.name);
    setEditBio(userItem.consultantProfile?.specialty ? '' : '');
    setEditSpecialtyId(userItem.consultantProfile?.specialty?.id || '');
    setEditDialogOpen(true);
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">إدارة المستخدمين</h2>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم</span>
        </Button>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Tabs value={roleFilter} onValueChange={setRoleFilter} dir="rtl">
          <TabsList>
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="ENTREPRENEUR">رواد أعمال</TabsTrigger>
            <TabsTrigger value="CONSULTANT">مستشارون</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا يوجد مستخدمون
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const roleInfo = ROLE_MAP[u.role];
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground" dir="ltr">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${roleInfo.color} border-current text-xs`}
                          >
                            {roleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs border-0 ${
                              u.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.isActive ? 'نشط' : 'معطل'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateShort(u.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleActive(u)}
                              title={u.isActive ? 'تعطيل' : 'تفعيل'}
                            >
                              <ToggleLeft
                                className={`w-4 h-4 ${
                                  u.isActive ? 'text-emerald-600' : 'text-red-400'
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(u)}
                              title="تعديل"
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            إجمالي {pagination.total} مستخدم
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              السابق
            </Button>
            <span className="text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            <DialogDescription>
              أضف مستخدماً جديداً إلى المنصة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="اسم المستخدم" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                dir="ltr"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور *</Label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>الدور *</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTREPRENEUR">رائد أعمال</SelectItem>
                  <SelectItem value="CONSULTANT">مستشار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRole === 'CONSULTANT' && (
              <div className="space-y-2">
                <Label>التخصص *</Label>
                <Select value={formSpecialtyId} onValueChange={setFormSpecialtyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر التخصص" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nameAr}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>نبذة</Label>
              <Textarea
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                placeholder="نبذة عن المستخدم..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>إضافة</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
            <DialogDescription>
              تعديل بيانات المستخدم {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {selectedUser?.role === 'CONSULTANT' && (
              <>
                <div className="space-y-2">
                  <Label>التخصص</Label>
                  <Select value={editSpecialtyId} onValueChange={setEditSpecialtyId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر التخصص" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nameAr}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نبذة</Label>
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 5. AdminSpecialties ==========

export function AdminSpecialties() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Specialty | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formColor, setFormColor] = useState('#10b981');

  const loadSpecialties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSpecialties(true);
      if (res.success && res.data) {
        setSpecialties(res.data as Specialty[]);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  const openAddDialog = () => {
    setEditItem(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormDescription('');
    setFormIcon('');
    setFormColor('#10b981');
    setDialogOpen(true);
  };

  const openEditDialog = (item: Specialty) => {
    setEditItem(item);
    setFormNameAr(item.nameAr);
    setFormNameEn(item.nameEn);
    setFormDescription(item.description || '');
    setFormIcon(item.icon || '');
    setFormColor(item.color || '#10b981');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNameAr || !formNameEn) {
      toast.error('يرجى ملء حقلي الاسم بالعربية والإنجليزية');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await adminApi.updateSpecialty({
          id: editItem.id,
          nameAr: formNameAr,
          nameEn: formNameEn,
          description: formDescription || undefined,
          icon: formIcon || undefined,
          color: formColor || undefined,
        });
        if (res.success) {
          toast.success('تم تحديث التخصص بنجاح');
          setDialogOpen(false);
          await loadSpecialties();
        } else {
          toast.error(res.error || 'فشل في تحديث التخصص');
        }
      } else {
        const res = await adminApi.createSpecialty({
          nameAr: formNameAr,
          nameEn: formNameEn,
          description: formDescription || undefined,
          icon: formIcon || undefined,
          color: formColor || undefined,
        });
        if (res.success) {
          toast.success('تم إضافة التخصص بنجاح');
          setDialogOpen(false);
          await loadSpecialties();
        } else {
          toast.error(res.error || 'فشل في إضافة التخصص');
        }
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminApi.deleteSpecialty(id);
      if (res.success) {
        toast.success('تم تعطيل التخصص');
        await loadSpecialties();
      } else {
        toast.error(res.error || 'فشل في تعطيل التخصص');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    }
  };

  const handleRestore = async (item: Specialty) => {
    try {
      const res = await adminApi.updateSpecialty({
        id: item.id,
        isActive: true,
      });
      if (res.success) {
        toast.success('تم تفعيل التخصص');
        await loadSpecialties();
      } else {
        toast.error(res.error || 'فشل في تفعيل التخصص');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">إدارة التخصصات</h2>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تخصص</span>
        </Button>
      </div>

      {/* Specialty cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialties.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            لا توجد تخصصات
          </div>
        ) : (
          specialties.map((spec) => (
            <Card
              key={spec.id}
              className={`relative overflow-hidden transition-all ${
                !spec.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Color indicator stripe */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: spec.color || '#10b981' }}
              />
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: spec.color || '#10b981' }}
                    >
                      {spec.icon || spec.nameAr[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{spec.nameAr}</h3>
                      <p className="text-xs text-muted-foreground" dir="ltr">{spec.nameEn}</p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] border-0 ${
                      spec.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {spec.isActive ? 'نشط' : 'معطل'}
                  </Badge>
                </div>
                {spec.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {spec.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>{spec._count?.consultants ?? 0} مستشار</span>
                  <span>·</span>
                  <span>{spec._count?.milestoneDefaults ?? 0} مرحلة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openEditDialog(spec)}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>تعديل</span>
                  </Button>
                  {spec.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(spec.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>تعطيل</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => handleRestore(spec)}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>تفعيل</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Specialty Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'تعديل التخصص' : 'إضافة تخصص جديد'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'تعديل بيانات التخصص' : 'أضف تخصصاً جديداً إلى المنصة'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم بالعربية *</Label>
              <Input value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)} placeholder="مثال: تطوير الأعمال" />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية *</Label>
              <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="e.g. Business Development" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="وصف مختصر للتخصص..."
                className="min-h-[60px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="اسم الأيقونة" />
            </div>
            <div className="space-y-2">
              <Label>اللون</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="flex-1"
                  dir="ltr"
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{editItem ? 'تحديث' : 'إضافة'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 6. AdminMilestones ==========

export function AdminMilestones() {
  const [milestones, setMilestones] = useState<MilestoneDefaultItem[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [consultants, setConsultants] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MilestoneDefaultItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formDescriptionAr, setFormDescriptionAr] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formSpecialtyId, setFormSpecialtyId] = useState('');
  const [formConsultantId, setFormConsultantId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mileRes, specRes, usersRes] = await Promise.all([
        adminApi.getMilestoneDefaults(true),
        adminApi.getSpecialties(true),
        adminApi.getUsers({ role: 'CONSULTANT' }),
      ]);
      if (mileRes.success && mileRes.data) {
        setMilestones(mileRes.data as MilestoneDefaultItem[]);
      }
      if (specRes.success && specRes.data) {
        setSpecialties(specRes.data as Specialty[]);
      }
      if (usersRes.success && usersRes.data) {
        const data = usersRes.data as UsersResponse;
        setConsultants(data.users || []);
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

  // Sort milestones by sortOrder
  const sortedMilestones = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);

  const openAddDialog = () => {
    setEditItem(null);
    setFormTitleAr('');
    setFormTitleEn('');
    setFormDescriptionAr('');
    setFormDescriptionEn('');
    setFormSortOrder(sortedMilestones.length + 1);
    setFormSpecialtyId('');
    setFormConsultantId('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: MilestoneDefaultItem) => {
    setEditItem(item);
    setFormTitleAr(item.titleAr);
    setFormTitleEn(item.titleEn);
    setFormDescriptionAr(item.descriptionAr || '');
    setFormDescriptionEn(item.descriptionEn || '');
    setFormSortOrder(item.sortOrder);
    setFormSpecialtyId(item.specialty.id);
    setFormConsultantId(item.consultant?.id || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitleAr || !formTitleEn || !formSpecialtyId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await adminApi.updateMilestoneDefault({
          id: editItem.id,
          titleAr: formTitleAr,
          titleEn: formTitleEn,
          descriptionAr: formDescriptionAr || undefined,
          descriptionEn: formDescriptionEn || undefined,
          sortOrder: formSortOrder,
          specialtyId: formSpecialtyId,
          consultantId: formConsultantId || undefined,
        });
        if (res.success) {
          toast.success('تم تحديث المرحلة بنجاح');
          setDialogOpen(false);
          await loadData();
        } else {
          toast.error(res.error || 'فشل في تحديث المرحلة');
        }
      } else {
        const res = await adminApi.createMilestoneDefault({
          titleAr: formTitleAr,
          titleEn: formTitleEn,
          descriptionAr: formDescriptionAr || undefined,
          descriptionEn: formDescriptionEn || undefined,
          sortOrder: formSortOrder,
          specialtyId: formSpecialtyId,
          consultantId: formConsultantId || undefined,
        });
        if (res.success) {
          toast.success('تم إضافة المرحلة بنجاح');
          setDialogOpen(false);
          await loadData();
        } else {
          toast.error(res.error || 'فشل في إضافة المرحلة');
        }
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (item: MilestoneDefaultItem, index: number) => {
    if (index === 0) return;
    const prevItem = sortedMilestones[index - 1];
    try {
      await Promise.all([
        adminApi.updateMilestoneDefault({ id: item.id, sortOrder: prevItem.sortOrder }),
        adminApi.updateMilestoneDefault({ id: prevItem.id, sortOrder: item.sortOrder }),
      ]);
      toast.success('تم إعادة الترتيب');
      await loadData();
    } catch {
      toast.error('فشل في إعادة الترتيب');
    }
  };

  const handleMoveDown = async (item: MilestoneDefaultItem, index: number) => {
    if (index === sortedMilestones.length - 1) return;
    const nextItem = sortedMilestones[index + 1];
    try {
      await Promise.all([
        adminApi.updateMilestoneDefault({ id: item.id, sortOrder: nextItem.sortOrder }),
        adminApi.updateMilestoneDefault({ id: nextItem.id, sortOrder: item.sortOrder }),
      ]);
      toast.success('تم إعادة الترتيب');
      await loadData();
    } catch {
      toast.error('فشل في إعادة الترتيب');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminApi.deleteMilestoneDefault(id);
      if (res.success) {
        toast.success('تم تعطيل المرحلة');
        await loadData();
      } else {
        toast.error(res.error || 'فشل في تعطيل المرحلة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">إدارة المراحل الافتراضية</h2>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مرحلة</span>
        </Button>
      </div>

      {/* Milestones list */}
      <div className="space-y-2">
        {sortedMilestones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد مراحل
            </CardContent>
          </Card>
        ) : (
          sortedMilestones.map((milestone, index) => (
            <Card
              key={milestone.id}
              className={`transition-all ${!milestone.isActive ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(milestone, index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(milestone, index)}
                      disabled={index === sortedMilestones.length - 1}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Step number */}
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {milestone.sortOrder}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{milestone.titleAr}</h3>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        ({milestone.titleEn})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {milestone.specialty.nameAr}
                      </Badge>
                      {milestone.consultant && (
                        <span>· {milestone.consultant.user.name}</span>
                      )}
                      <Badge
                        className={`text-[10px] border-0 ${
                          milestone.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {milestone.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(milestone)}
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                    {milestone.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(milestone.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Milestone Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'تعديل المرحلة' : 'إضافة مرحلة جديدة'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'تعديل بيانات المرحلة الافتراضية' : 'أضف مرحلة جديدة إلى رحلة رواد الأعمال'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>العنوان بالعربية *</Label>
              <Input value={formTitleAr} onChange={(e) => setFormTitleAr(e.target.value)} placeholder="مثال: نموذج العمل" />
            </div>
            <div className="space-y-2">
              <Label>العنوان بالإنجليزية *</Label>
              <Input value={formTitleEn} onChange={(e) => setFormTitleEn(e.target.value)} placeholder="e.g. Business Model Canvas" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>الوصف بالعربية</Label>
              <Textarea
                value={formDescriptionAr}
                onChange={(e) => setFormDescriptionAr(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف بالإنجليزية</Label>
              <Textarea
                value={formDescriptionEn}
                onChange={(e) => setFormDescriptionEn(e.target.value)}
                className="min-h-[60px] resize-none"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>ترتيب الفرز</Label>
              <Input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>التخصص *</Label>
              <Select value={formSpecialtyId} onValueChange={setFormSpecialtyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر التخصص" />
                </SelectTrigger>
                <SelectContent>
                  {specialties
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nameAr}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المستشار المُعيَّن</Label>
              <Select value={formConsultantId} onValueChange={setFormConsultantId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر المستشار (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((c) => (
                    <SelectItem key={c.id} value={c.consultantProfile?.id || c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{editItem ? 'تحديث' : 'إضافة'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 7. AdminConfigs ==========

export function AdminConfigs() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getConfigs();
      if (res.success && res.data) {
        setConfigs(res.data as ConfigItem[]);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleStartEdit = (config: ConfigItem) => {
    setEditingKey(config.key);
    setEditValue(config.value);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const res = await adminApi.updateConfig(key, editValue);
      if (res.success) {
        toast.success('تم تحديث الإعداد بنجاح');
        setEditingKey(null);
        await loadConfigs();
      } else {
        toast.error(res.error || 'فشل في تحديث الإعداد');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const renderEditField = (config: ConfigItem) => {
    if (editingKey !== config.key) return null;

    switch (config.type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={editValue === 'true'}
              onCheckedChange={(checked) => setEditValue(checked ? 'true' : 'false')}
            />
            <span className="text-sm">{editValue === 'true' ? 'مفعّل' : 'معطّل'}</span>
          </div>
        );
      case 'NUMBER':
        return (
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="max-w-40"
          />
        );
      case 'JSON':
        return (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px] resize-none font-mono text-sm"
            dir="ltr"
          />
        );
      default: // STRING
        return (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="max-w-xs"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">إعدادات المنصة</h2>
        <p className="text-sm text-muted-foreground mt-1">
          إدارة إعدادات وتكوينات المنصة
        </p>
      </div>

      {/* Config list */}
      <div className="space-y-3">
        {configs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد إعدادات
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => (
            <Card key={config.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Key info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded" dir="ltr">
                        {config.key}
                      </code>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {config.type}
                      </Badge>
                    </div>
                    {config.description && (
                      <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
                    )}

                    {/* Edit field or display value */}
                    {editingKey === config.key ? (
                      <div className="mt-2">
                        {renderEditField(config)}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(config.key)}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7"
                          >
                            {saving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>حفظ</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7" onClick={handleCancelEdit}>
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        {config.type === 'BOOLEAN' ? (
                          <Badge
                            className={`text-xs border-0 ${
                              config.value === 'true'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {config.value === 'true' ? 'مفعّل' : 'معطّل'}
                          </Badge>
                        ) : (
                          <p className="text-sm text-gray-700 font-mono truncate" dir="ltr">
                            {config.value.length > 100
                              ? config.value.substring(0, 100) + '...'
                              : config.value}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit button */}
                  {editingKey !== config.key && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-shrink-0"
                      onClick={() => handleStartEdit(config)}
                    >
                      <Pencil className="w-3 h-3" />
                      <span>تعديل</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ========== 8. AdminQuotas ==========

export function AdminQuotas() {
  const [quotas, setQuotas] = useState<QuotaItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<QuotaItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Edit form state
  const [formMonthlyLimit, setFormMonthlyLimit] = useState(4);
  const [formIsExempted, setFormIsExempted] = useState(false);
  const [formCustomLimit, setFormCustomLimit] = useState<number | null>(null);

  const loadQuotas = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: { page?: number; search?: string } = { page };
      if (search) params.search = search;

      const res = await adminApi.getQuotas(params);
      if (res.success && res.data) {
        const data = res.data as QuotasResponse;
        setQuotas(data.quotas || []);
        setPagination(data.pagination);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadQuotas(1);
  }, [loadQuotas]);

  const openEditDialog = (quota: QuotaItem) => {
    setSelectedQuota(quota);
    setFormMonthlyLimit(quota.monthlyBookingLimit);
    setFormIsExempted(quota.isExempted);
    setFormCustomLimit(quota.customLimit ?? null);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedQuota) return;
    setSaving(true);
    try {
      const res = await adminApi.updateQuota({
        id: selectedQuota.id,
        monthlyBookingLimit: formMonthlyLimit,
        isExempted: formIsExempted,
        customLimit: formCustomLimit ?? undefined,
      });
      if (res.success) {
        toast.success('تم تحديث الحصة بنجاح');
        setEditDialogOpen(false);
        await loadQuotas(pagination.page);
      } else {
        toast.error(res.error || 'فشل في تحديث الحصة');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExempt = async (quota: QuotaItem) => {
    try {
      const res = await adminApi.updateQuota({
        id: quota.id,
        isExempted: !quota.isExempted,
      });
      if (res.success) {
        toast.success(quota.isExempted ? 'تم إلغاء الإعفاء' : 'تم إعفاء المستخدم');
        await loadQuotas(pagination.page);
      } else {
        toast.error(res.error || 'فشل في تحديث حالة الإعفاء');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    }
  };

  if (loading && quotas.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">إدارة الحصص</h2>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو المشروع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Quotas table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رائد الأعمال</TableHead>
                  <TableHead>الحد الشهري</TableHead>
                  <TableHead>المستخدم هذا الشهر</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>إعفاء</TableHead>
                  <TableHead>حد مخصص</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد حصص
                    </TableCell>
                  </TableRow>
                ) : (
                  quotas.map((quota) => {
                    const effectiveLimit = quota.customLimit ?? quota.monthlyBookingLimit;
                    const remaining = quota.isExempted
                      ? '∞'
                      : Math.max(0, effectiveLimit - quota.bookingsUsedThisMonth);
                    return (
                      <TableRow key={quota.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                                {getInitials(quota.entrepreneur.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {quota.entrepreneur.user.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{quota.monthlyBookingLimit}</TableCell>
                        <TableCell className="text-sm">{quota.bookingsUsedThisMonth}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs border-0 ${
                              remaining === '∞' || Number(remaining) > 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {remaining}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 text-xs ${
                              quota.isExempted
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            onClick={() => handleToggleExempt(quota)}
                          >
                            {quota.isExempted ? 'إعفاء ✓' : 'إعفاء'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm">
                          {quota.customLimit ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(quota)}
                          >
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            إجمالي {pagination.total} حصة
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadQuotas(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              السابق
            </Button>
            <span className="text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadQuotas(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      )}

      {/* Edit Quota Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل حصة</DialogTitle>
            <DialogDescription>
              تعديل حصة {selectedQuota?.entrepreneur.user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الحد الشهري للحجوزات</Label>
              <Input
                type="number"
                value={formMonthlyLimit}
                onChange={(e) => setFormMonthlyLimit(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formIsExempted}
                onCheckedChange={setFormIsExempted}
              />
              <Label>إعفاء من الحد الشهري</Label>
            </div>
            <div className="space-y-2">
              <Label>حد مخصص (اختياري)</Label>
              <Input
                type="number"
                value={formCustomLimit ?? ''}
                onChange={(e) =>
                  setFormCustomLimit(e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="اتركه فارغاً لاستخدام الحد الافتراضي"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 9. AdminReports ==========

export function AdminReports() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await adminApi.getReports();
        if (res.success && res.data) {
          setReports(res.data as ReportsData);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Compute no-show count
  const noShowCount = reports?.bookings
    ? reports.bookings.total -
      reports.bookings.completed -
      reports.bookings.cancelled
    : 0;

  // Booking stats for visualization
  const bookingStats = [
    { label: 'مكتملة', value: reports?.bookings.completed ?? 0, color: 'bg-emerald-500' },
    { label: 'ملغاة', value: reports?.bookings.cancelled ?? 0, color: 'bg-red-400' },
    { label: 'لم يحضر', value: noShowCount > 0 ? noShowCount : 0, color: 'bg-amber-400' },
  ];

  // Milestone stage distribution
  const milestoneStats = [
    { label: 'معتمدة', value: reports?.milestones.approved ?? 0, color: 'bg-emerald-500' },
    { label: 'قيد التنفيذ', value: reports?.milestones.inProgress ?? 0, color: 'bg-blue-500' },
    { label: 'مقدمة', value: reports?.milestones.submitted ?? 0, color: 'bg-amber-500' },
    { label: 'مقفلة', value: reports?.milestones.locked ?? 0, color: 'bg-gray-400' },
  ];

  const totalBookings = reports?.bookings.total ?? 0;
  const totalMilestones =
    (reports?.milestones.approved ?? 0) +
    (reports?.milestones.inProgress ?? 0) +
    (reports?.milestones.submitted ?? 0) +
    (reports?.milestones.locked ?? 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">التقارير والتحليلات</h2>
        <p className="text-sm text-muted-foreground mt-1">
          إحصائيات شاملة عن أداء المنصة
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <p className="text-sm text-emerald-700 font-medium">إجمالي المستخدمين</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{reports?.users.total ?? 0}</p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>{reports?.users.entrepreneurs ?? 0} رائد</span>
              <span>{reports?.users.consultants ?? 0} مستشار</span>
              <span>{reports?.users.admins ?? 0} مدير</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-5">
            <p className="text-sm text-blue-700 font-medium">إجمالي الحجوزات</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-5">
            <p className="text-sm text-purple-700 font-medium">إجمالي المحادثات</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{reports?.chat.totalRooms ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {reports?.chat.totalMessages ?? 0} رسالة
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              إحصائيات الحجوزات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalBookings === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد حجوزات</p>
            ) : (
              <div className="space-y-3">
                {bookingStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{stat.label}</span>
                      <span className="font-medium">{stat.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${stat.color} transition-all`}
                        style={{
                          width: `${totalBookings > 0 ? (stat.value / totalBookings) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestone stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Flag className="w-5 h-5 text-emerald-500" />
              إحصائيات المراحل
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalMilestones === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد مراحل</p>
            ) : (
              <div className="space-y-3">
                {milestoneStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{stat.label}</span>
                      <span className="font-medium">{stat.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${stat.color} transition-all`}
                        style={{
                          width: `${totalMilestones > 0 ? (stat.value / totalMilestones) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consultant performance table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            أداء المستشارين
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>التخصص</TableHead>
                  <TableHead>الجلسات</TableHead>
                  <TableHead>المراحل المعتمدة</TableHead>
                  <TableHead>التقييم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!reports?.consultantPerformance || reports.consultantPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا يوجد مستشارون
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.consultantPerformance.map((consultant) => (
                    <TableRow key={consultant.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                              {getInitials(consultant.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{consultant.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{consultant.specialty.nameAr}</TableCell>
                      <TableCell className="text-sm">{consultant.completedSessions}</TableCell>
                      <TableCell className="text-sm">{consultant.approvedCount}</TableCell>
                      <TableCell>
                        {consultant.rating ? (
                          <Badge className="bg-amber-100 text-amber-700 text-xs border-0">
                            ⭐ {consultant.rating.toFixed(1)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== 10. AdminChatMonitor ==========

export function AdminChatMonitor() {
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadRooms = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getChatRooms({ page });
      if (res.success && res.data) {
        const data = res.data as {
          rooms: ChatRoomItem[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        };
        setRooms(data.rooms || []);
        setPagination(data.pagination);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleExpandRoom = async (roomId: string) => {
    if (expandedRoomId === roomId) {
      setExpandedRoomId(null);
      setRoomMessages([]);
      return;
    }

    setExpandedRoomId(roomId);
    setLoadingMessages(true);
    try {
      const res = await adminApi.getChatRooms({ roomId });
      if (res.success && res.data) {
        const roomData = res.data as {
          messages: ChatMessageItem[];
        };
        setRoomMessages(roomData.messages || []);
      }
    } catch {
      toast.error('فشل في تحميل الرسائل');
    } finally {
      setLoadingMessages(false);
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'ADMIN': return 'مدير';
      case 'CONSULTANT': return 'مستشار';
      case 'ENTREPRENEUR': return 'رائد أعمال';
      default: return role;
    }
  };

  if (loading && rooms.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">مراقبة المحادثات</h2>
        <p className="text-sm text-muted-foreground mt-1">
          عرض جميع غرف المحادثة والرسائل (للقراءة فقط)
        </p>
      </div>

      {/* Chat rooms list */}
      <div className="space-y-3">
        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد غرف محادثة
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => {
            const isExpanded = expandedRoomId === room.id;
            return (
              <Card key={room.id} className={isExpanded ? 'ring-1 ring-emerald-200' : ''}>
                <CardContent className="p-4">
                  {/* Room header */}
                  <button
                    className="w-full text-right flex items-center gap-3"
                    onClick={() => handleExpandRoom(room.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {room.name || 'محادثة مباشرة'}
                        </h3>
                        <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
                          {room.type === 'DIRECT' ? 'مباشر' : 'مجموعة'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{room.members.length} أعضاء</span>
                        <span>·</span>
                        <span>{room.totalMessages} رسالة</span>
                        {room.messages?.[0] && (
                          <>
                            <span>·</span>
                            <span>آخر رسالة: {formatDateShort(room.messages[0].createdAt)}</span>
                          </>
                        )}
                      </div>
                      {/* Member names */}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        {room.members.slice(0, 3).map((member, i) => (
                          <span key={member.user.id}>
                            {i > 0 && <span>، </span>}
                            <span className="text-gray-600">{member.user.name}</span>
                          </span>
                        ))}
                        {room.members.length > 3 && (
                          <span>+{room.members.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded messages */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          <span className="mr-2 text-sm text-muted-foreground">جاري تحميل الرسائل...</span>
                        </div>
                      ) : roomMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          لا توجد رسائل في هذه الغرفة
                        </p>
                      ) : (
                        <ScrollArea className="max-h-96">
                          <div className="space-y-3">
                            {roomMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50"
                              >
                                <Avatar className="w-7 h-7 flex-shrink-0">
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                                    {getInitials(msg.sender.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-medium text-gray-900">
                                      {msg.sender.name}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                      {getRoleLabel(msg.sender.role)}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDateShort(msg.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 break-words">
                                    {msg.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            إجمالي {pagination.total} غرفة
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRooms(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              السابق
            </Button>
            <span className="text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRooms(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
