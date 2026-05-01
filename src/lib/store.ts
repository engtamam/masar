// Global application state using Zustand
// Manages auth state, navigation, project selection, and UI state
// Initializes from localStorage on the client side

import { create } from 'zustand';

// ========== View Types ==========

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'entrepreneur-onboarding'
  | 'entrepreneur-dashboard'
  | 'entrepreneur-milestones'
  | 'entrepreneur-bookings'
  | 'entrepreneur-chat'
  | 'entrepreneur-files'
  | 'entrepreneur-templates'
  | 'consultant-dashboard'
  | 'consultant-appointments'
  | 'consultant-entrepreneurs'
  | 'consultant-templates'
  | 'consultant-chat'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-specialties'
  | 'admin-milestones'
  | 'admin-configs'
  | 'admin-quotas'
  | 'admin-reports'
  | 'admin-chat'
  | 'admin-templates';

// ========== User Interface ==========

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONSULTANT' | 'ENTREPRENEUR';
  avatarUrl?: string;
  phone?: string;
  consultantProfile?: unknown;
  entrepreneurProfile?: unknown;
  unreadNotifications?: number;
}

// ========== Project Interface ==========

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  stage: string;
  status: string;
  onboardingCompleted: boolean;
  milestonesTotal?: number;
  milestonesCompleted?: number;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

// ========== Store Interface ==========

interface AppState {
  // Auth state
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  hydrate: () => void;

  // Navigation state
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Project state
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;

  // Chat state
  activeChatRoomId: string | null;
  setActiveChatRoomId: (id: string | null) => void;

  // Sidebar state (mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Loading state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

// ========== Storage Keys ==========

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const VIEW_KEY = 'app_view';
const PROJECT_KEY = 'current_project_id';

// ========== Helper: Safe localStorage reads ==========

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function getStoredView(): AppView | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(VIEW_KEY) as AppView | null;
  } catch {
    return null;
  }
}

function getStoredProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
}

/**
 * Derive the default view for a given role after login
 */
export function getDefaultView(role: string): AppView {
  switch (role) {
    case 'ADMIN':
      return 'admin-dashboard';
    case 'CONSULTANT':
      return 'consultant-dashboard';
    case 'ENTREPRENEUR':
      return 'entrepreneur-dashboard';
    default:
      return 'landing';
  }
}

// ========== Store ==========

export const useAppStore = create<AppState>((set, get) => ({
  // Auth state - starts null, hydrated on client
  user: null,
  token: null,

  setUser: (user) => {
    set({ user });
    if (typeof window !== 'undefined') {
      if (user) {
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch {
          // Storage full or unavailable
        }
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }
  },

  setToken: (token) => {
    set({ token });
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  },

  logout: () => {
    set({ user: null, token: null, currentView: 'landing', activeChatRoomId: null, currentProjectId: null, projects: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(VIEW_KEY);
      localStorage.removeItem(PROJECT_KEY);
    }
  },

  /**
   * Hydrate store from localStorage on client-side mount.
   * Should be called once in a top-level useEffect.
   */
  hydrate: () => {
    const token = getStoredToken();
    const user = getStoredUser();
    const storedView = getStoredView();
    const storedProjectId = getStoredProjectId();

    // Determine view: if user is stored and view is valid, use it; otherwise derive default
    let currentView: AppView = 'landing';
    if (user && token) {
      if (storedView && storedView !== 'landing' && storedView !== 'login' && storedView !== 'register') {
        currentView = storedView;
      } else {
        currentView = getDefaultView(user.role);
      }
    }

    set({ token, user, currentView, currentProjectId: storedProjectId });
  },

  // Navigation state
  currentView: 'landing',

  setCurrentView: (currentView) => {
    set({ currentView });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(VIEW_KEY, currentView);
      } catch {
        // Storage full or unavailable
      }
    }
  },

  // Project state
  currentProjectId: null,

  setCurrentProjectId: (currentProjectId) => {
    set({ currentProjectId });
    if (typeof window !== 'undefined') {
      if (currentProjectId) {
        localStorage.setItem(PROJECT_KEY, currentProjectId);
      } else {
        localStorage.removeItem(PROJECT_KEY);
      }
    }
  },

  projects: [],
  setProjects: (projects) => set({ projects }),

  // Chat state
  activeChatRoomId: null,
  setActiveChatRoomId: (activeChatRoomId) => set({ activeChatRoomId }),

  // Sidebar state (mobile)
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Loading state
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));
