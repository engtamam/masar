// API Client for Digital Incubator Platform
// Handles authentication, request routing, and response parsing
// All requests use relative paths and auto-attach Bearer token

const API_BASE = '/api';

// ========== Token Management ==========

const TOKEN_KEY = 'auth_token';

/**
 * Retrieve the stored JWT token from localStorage
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the JWT token from localStorage
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if a token exists (basic auth check)
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

// ========== Generic Request Helper ==========

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic request helper that auto-attaches the Bearer token,
 * parses the response, and handles 401 errors.
 */
async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - clear token and redirect
    if (response.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') {
        // Use a custom event so the store can react without circular deps
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      return { success: false, error: 'Authentication required' };
    }

    // Parse JSON response
    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

/**
 * File upload helper using FormData (does not set Content-Type so browser sets boundary)
 */
async function uploadRequest<T>(
  path: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      return { success: false, error: 'Authentication required' };
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('File upload failed:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

/**
 * Build query string from params object, skipping undefined/null values
 */
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ========== Auth API ==========

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'CONSULTANT' | 'ENTREPRENEUR';
    avatarUrl?: string;
    phone?: string;
    consultantProfile?: unknown;
    entrepreneurProfile?: unknown;
  };
}

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONSULTANT' | 'ENTREPRENEUR';
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  consultantProfile?: unknown;
  entrepreneurProfile?: unknown;
  unreadNotifications: number;
}

export const authApi = {
  /**
   * Login with email and password
   */
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /**
   * Register a new entrepreneur account
   */
  register: (data: { name: string; email: string; password: string; projectName?: string }) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get current authenticated user profile
   */
  me: () => request<MeResponse>('/auth/me'),

  /**
   * Request password reset email
   */
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /**
   * Reset password with token from email
   */
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  /**
   * Verify email with token from email
   */
  verifyEmail: (token: string) =>
    request<{ message: string; email: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  /**
   * Resend email verification
   */
  resendVerification: (email: string) =>
    request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

// ========== Milestones API ==========

export const milestonesApi = {
  /**
   * Get milestones with progress for the current user
   * Response varies by role (entrepreneur, consultant, admin)
   */
  getMyMilestones: () => request<unknown>('/milestones'),

  /**
   * Entrepreneur submits a milestone for review
   */
  submitMilestone: (id: string, notes?: string) =>
    request<unknown>(`/milestones/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  /**
   * Consultant or admin approves/rejects a milestone
   */
  approveMilestone: (
    id: string,
    data: {
      entrepreneurId: string;
      comment?: string;
      status: 'APPROVED' | 'REJECTED';
    }
  ) =>
    request<unknown>(`/milestones/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ========== Bookings API ==========

interface BookingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BookingsResponse {
  bookings: unknown[];
  pagination: BookingPagination;
}

export const bookingsApi = {
  /**
   * Get bookings filtered by role and optional status
   */
  getBookings: (params?: { status?: string; page?: number }) =>
    request<BookingsResponse>(`/bookings${buildQuery(params as Record<string, string | number | undefined>)}`),

  /**
   * Create a new booking (entrepreneur only)
   */
  createBooking: (data: {
    consultantId: string;
    date: string;
    startTime: string;
    endTime: string;
    milestoneProgressId?: string;
    notes?: string;
  }) =>
    request<unknown>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update booking status (cancel, complete, no-show)
   */
  updateBooking: (
    id: string,
    data: { status: string; cancellationReason?: string }
  ) =>
    request<unknown>(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Get consultant availability slots
   */
  getAvailability: (consultantId: string) =>
    request<unknown[]>(`/bookings/availability${buildQuery({ consultantId })}`),

  /**
   * Set availability slots (consultant only)
   */
  setAvailability: (
    slots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDuration?: number;
    }>
  ) =>
    request<{ count: number }>('/bookings/availability', {
      method: 'POST',
      body: JSON.stringify({ slots }),
    }),

  /**
   * Clone recurring availability to a specific month (YYYY-MM format)
   */
  cloneAvailability: (month: string) =>
    request<{ message: string; count: number }>('/bookings/availability/clone', {
      method: 'POST',
      body: JSON.stringify({ month }),
    }),
};

// ========== Chat API ==========

export const chatApi = {
  /**
   * Get current user's chat rooms with last message and unread count
   */
  getRooms: () => request<unknown[]>('/chat/rooms'),

  /**
   * Create a new chat room (or return existing direct room)
   */
  createRoom: (participantIds: string[], name?: string) =>
    request<unknown>('/chat/rooms', {
      method: 'POST',
      body: JSON.stringify({ participantIds, name }),
    }),

  /**
   * Get messages for a chat room (paginated)
   */
  getMessages: (roomId: string, page?: number) =>
    request<{ messages: unknown[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }>(
      `/chat/rooms/${roomId}/messages${buildQuery({ page })}`
    ),

  /**
   * Send a text message in a chat room
   */
  sendMessage: (roomId: string, content: string) =>
    request<unknown>(`/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

// ========== Files API ==========

export const filesApi = {
  /**
   * Upload a file (optionally linked to a milestone and encrypted)
   */
  uploadFile: (file: File, milestoneProgressId?: string, encrypt?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (milestoneProgressId) {
      formData.append('milestoneProgressId', milestoneProgressId);
    }
    if (encrypt) {
      formData.append('encrypt', 'true');
    }
    return uploadRequest<unknown>('/files', formData);
  },

  /**
   * Get files list (optionally filtered by milestone progress)
   */
  getFiles: (params?: { milestoneProgressId?: string }) =>
    request<unknown[]>(`/files${buildQuery(params as Record<string, string | undefined>)}`),

  /**
   * Delete a file by ID
   */
  deleteFile: (id: string) =>
    request<{ message: string }>(`/files/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Get the download URL for a file (requires Bearer token in headers)
   */
  getFileUrl: (id: string): string => `${API_BASE}/files/${id}`,
};

// ========== Admin API ==========

interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const adminApi = {
  // --- Users ---
  /**
   * List all users with optional filtering
   */
  getUsers: (params?: { role?: string; search?: string; page?: number }) =>
    request<{ users: unknown[]; pagination: AdminPagination }>(
      `/admin/users${buildQuery(params as Record<string, string | number | undefined>)}`
    ),

  /**
   * Create a new user (consultant or entrepreneur)
   */
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    specialtyId?: string;
    bio?: string;
  }) =>
    request<unknown>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update a user (activate/deactivate, edit profile)
   */
  updateUser: (data: {
    userId: string;
    isActive?: boolean;
    name?: string;
    phone?: string;
    specialtyId?: string;
    bio?: string;
  }) =>
    request<unknown>('/admin/users', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // --- Specialties ---
  /**
   * List all specialties
   */
  getSpecialties: (includeInactive?: boolean) =>
    request<unknown[]>(
      `/admin/specialties${buildQuery({ includeInactive: includeInactive || undefined })}`
    ),

  /**
   * Create a new specialty
   */
  createSpecialty: (data: {
    nameAr: string;
    nameEn: string;
    description?: string;
    icon?: string;
    color?: string;
  }) =>
    request<unknown>('/admin/specialties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update a specialty
   */
  updateSpecialty: (data: {
    id: string;
    nameAr?: string;
    nameEn?: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
  }) =>
    request<unknown>('/admin/specialties', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Soft-delete a specialty (sets isActive = false)
   */
  deleteSpecialty: (id: string) =>
    request<{ message: string }>(`/admin/specialties?id=${id}`, {
      method: 'DELETE',
    }),

  // --- Milestone Defaults ---
  /**
   * List all milestone defaults
   */
  getMilestoneDefaults: (includeInactive?: boolean) =>
    request<unknown[]>(
      `/admin/milestones${buildQuery({ includeInactive: includeInactive || undefined })}`
    ),

  /**
   * Create a new milestone default
   */
  createMilestoneDefault: (data: {
    titleAr: string;
    titleEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    icon?: string;
    sortOrder: number;
    specialtyId: string;
    consultantId?: string;
  }) =>
    request<unknown>('/admin/milestones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update a milestone default
   */
  updateMilestoneDefault: (data: {
    id: string;
    titleAr?: string;
    titleEn?: string;
    sortOrder?: number;
    specialtyId?: string;
    consultantId?: string;
    isActive?: boolean;
  }) =>
    request<unknown>('/admin/milestones', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Soft-delete a milestone default (sets isActive = false)
   */
  deleteMilestoneDefault: (id: string) =>
    request<{ message: string }>(`/admin/milestones?id=${id}`, {
      method: 'DELETE',
    }),

  // --- Platform Configs ---
  /**
   * List all platform configuration entries
   */
  getConfigs: () => request<unknown[]>('/admin/configs'),

  /**
   * Update a platform config value
   */
  updateConfig: (key: string, value: string) =>
    request<unknown>('/admin/configs', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    }),

  // --- Quotas ---
  /**
   * List all quotas with entrepreneur info
   */
  getQuotas: (params?: { page?: number; search?: string }) =>
    request<{ quotas: unknown[]; pagination: AdminPagination }>(
      `/admin/quotas${buildQuery(params as Record<string, string | number | undefined>)}`
    ),

  /**
   * Update a quota (limit, exempt status, custom limit)
   */
  updateQuota: (data: {
    id: string;
    monthlyBookingLimit?: number;
    isExempted?: boolean;
    customLimit?: number;
  }) =>
    request<unknown>('/admin/quotas', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // --- Reports ---
  /**
   * Get dashboard statistics (users, bookings, milestones, consultant performance)
   */
  getReports: () => request<unknown>('/admin/reports'),

  // --- Chat Monitoring ---
  /**
   * Get all chat rooms for monitoring (with optional roomId for detailed view)
   */
  getChatRooms: (params?: { roomId?: string; page?: number }) =>
    request<unknown>(
      `/admin/chat${buildQuery(params as Record<string, string | number | undefined>)}`
    ),
};

// ========== Notifications API ==========

interface NotificationsResponse {
  notifications: unknown[];
  unreadCount: number;
  pagination: AdminPagination;
}

export const notificationsApi = {
  /**
   * Get current user's notifications
   */
  getNotifications: (params?: { unreadOnly?: boolean; page?: number; type?: string }) =>
    request<NotificationsResponse>(
      `/notifications${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  /**
   * Mark notification(s) as read
   * Pass an array of IDs, or use markAllRead: true
   */
  markAsRead: (ids: string[]) =>
    request<unknown>('/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: ids.length === 0, id: ids.length === 1 ? ids[0] : undefined }),
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () =>
    request<unknown>('/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: true }),
    }),

  /**
   * Clear all notifications for current user
   */
  clearAll: () =>
    request<{ message: string; deletedCount: number }>('/notifications', {
      method: 'DELETE',
    }),
};
