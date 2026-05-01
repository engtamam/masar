// Tests for Zustand store - Project state, onboarding view, and auth state management
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get _store() {
      return store
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// We'll test the pure logic functions and store behavior
// by importing the actual module (zustand works in jsdom)

describe('Store - getDefaultView', () => {
  let getDefaultView: (role: string) => string

  beforeEach(async () => {
    // Import fresh module for each test
    const mod = await import('@/lib/store')
    getDefaultView = mod.getDefaultView
  })

  it('should return admin-dashboard for ADMIN role', () => {
    expect(getDefaultView('ADMIN')).toBe('admin-dashboard')
  })

  it('should return consultant-dashboard for CONSULTANT role', () => {
    expect(getDefaultView('CONSULTANT')).toBe('consultant-dashboard')
  })

  it('should return entrepreneur-dashboard for ENTREPRENEUR role', () => {
    expect(getDefaultView('ENTREPRENEUR')).toBe('entrepreneur-dashboard')
  })

  it('should return landing for unknown role', () => {
    expect(getDefaultView('UNKNOWN')).toBe('landing')
  })

  it('should return landing for empty string', () => {
    expect(getDefaultView('')).toBe('landing')
  })
})

describe('Store - Project State', () => {
  let useAppStore: ReturnType<typeof import('@/lib/store')['useAppStore']>

  beforeEach(async () => {
    localStorageMock.clear()
    vi.clearAllMocks()
    const mod = await import('@/lib/store')
    useAppStore = mod.useAppStore
    // Reset store state
    useAppStore.setState({
      user: null,
      token: null,
      currentView: 'landing',
      currentProjectId: null,
      projects: [],
      activeChatRoomId: null,
      sidebarOpen: false,
      isLoading: false,
    })
  })

  it('should start with null currentProjectId', () => {
    const state = useAppStore.getState()
    expect(state.currentProjectId).toBeNull()
  })

  it('should start with empty projects array', () => {
    const state = useAppStore.getState()
    expect(state.projects).toEqual([])
  })

  it('should set currentProjectId', () => {
    useAppStore.setState({ currentProjectId: 'project-123' })
    const state = useAppStore.getState()
    expect(state.currentProjectId).toBe('project-123')
  })

  it('should set projects array', () => {
    const mockProjects = [
      {
        id: 'p1',
        name: 'Project 1',
        description: 'Test project',
        industry: 'technology',
        stage: 'IDEA',
        status: 'ACTIVE',
        onboardingCompleted: true,
        milestonesTotal: 8,
        milestonesCompleted: 2,
        progress: 25,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'p2',
        name: 'Project 2',
        description: 'Another project',
        industry: 'healthcare',
        stage: 'MVP',
        status: 'ACTIVE',
        onboardingCompleted: true,
        milestonesTotal: 8,
        milestonesCompleted: 5,
        progress: 63,
        createdAt: '2024-02-01',
        updatedAt: '2024-02-01',
      },
    ]
    useAppStore.setState({ projects: mockProjects })
    const state = useAppStore.getState()
    expect(state.projects).toHaveLength(2)
    expect(state.projects[0].name).toBe('Project 1')
    expect(state.projects[1].stage).toBe('MVP')
  })

  it('should clear project state on logout', () => {
    useAppStore.setState({
      user: { id: '1', name: 'Test', email: 'test@test.com', role: 'ENTREPRENEUR' },
      token: 'test-token',
      currentProjectId: 'project-123',
      projects: [{ id: 'p1', name: 'Project 1' }],
      currentView: 'entrepreneur-dashboard',
    })

    // Call logout
    const state = useAppStore.getState()
    state.logout()

    const afterLogout = useAppStore.getState()
    expect(afterLogout.user).toBeNull()
    expect(afterLogout.token).toBeNull()
    expect(afterLogout.currentView).toBe('landing')
    expect(afterLogout.currentProjectId).toBeNull()
    expect(afterLogout.projects).toEqual([])
  })

  it('should persist currentProjectId to localStorage', () => {
    const state = useAppStore.getState()
    state.setCurrentProjectId('project-456')

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'current_project_id',
      'project-456'
    )
  })

  it('should remove currentProjectId from localStorage when set to null', () => {
    useAppStore.setState({ currentProjectId: 'project-456' })

    const state = useAppStore.getState()
    state.setCurrentProjectId(null)

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_project_id')
  })
})

describe('Store - AppView Types', () => {
  let useAppStore: ReturnType<typeof import('@/lib/store')['useAppStore']>

  beforeEach(async () => {
    localStorageMock.clear()
    vi.clearAllMocks()
    const mod = await import('@/lib/store')
    useAppStore = mod.useAppStore
    useAppStore.setState({
      user: null,
      token: null,
      currentView: 'landing',
      currentProjectId: null,
      projects: [],
      activeChatRoomId: null,
      sidebarOpen: false,
      isLoading: false,
    })
  })

  it('should support entrepreneur-onboarding view', () => {
    useAppStore.setState({ currentView: 'entrepreneur-onboarding' })
    const state = useAppStore.getState()
    expect(state.currentView).toBe('entrepreneur-onboarding')
  })

  it('should support all entrepreneur views', () => {
    const views = [
      'entrepreneur-onboarding',
      'entrepreneur-dashboard',
      'entrepreneur-milestones',
      'entrepreneur-bookings',
      'entrepreneur-chat',
      'entrepreneur-files',
    ]
    for (const view of views) {
      useAppStore.setState({ currentView: view })
      expect(useAppStore.getState().currentView).toBe(view)
    }
  })

  it('should support all consultant views', () => {
    const views = [
      'consultant-dashboard',
      'consultant-appointments',
      'consultant-entrepreneurs',
      'consultant-chat',
    ]
    for (const view of views) {
      useAppStore.setState({ currentView: view })
      expect(useAppStore.getState().currentView).toBe(view)
    }
  })

  it('should support all admin views', () => {
    const views = [
      'admin-dashboard',
      'admin-users',
      'admin-specialties',
      'admin-milestones',
      'admin-configs',
      'admin-quotas',
      'admin-reports',
      'admin-chat',
    ]
    for (const view of views) {
      useAppStore.setState({ currentView: view })
      expect(useAppStore.getState().currentView).toBe(view)
    }
  })
})

describe('Store - Sidebar State', () => {
  let useAppStore: ReturnType<typeof import('@/lib/store')['useAppStore']>

  beforeEach(async () => {
    localStorageMock.clear()
    vi.clearAllMocks()
    const mod = await import('@/lib/store')
    useAppStore = mod.useAppStore
    useAppStore.setState({
      user: null,
      token: null,
      currentView: 'landing',
      currentProjectId: null,
      projects: [],
      activeChatRoomId: null,
      sidebarOpen: false,
      isLoading: false,
    })
  })

  it('should start with sidebar closed', () => {
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it('should toggle sidebar', () => {
    const state = useAppStore.getState()
    state.toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(true)

    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it('should set sidebar open state directly', () => {
    useAppStore.getState().setSidebarOpen(true)
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })
})

describe('Store - Loading State', () => {
  let useAppStore: ReturnType<typeof import('@/lib/store')['useAppStore']>

  beforeEach(async () => {
    localStorageMock.clear()
    vi.clearAllMocks()
    const mod = await import('@/lib/store')
    useAppStore = mod.useAppStore
    useAppStore.setState({
      user: null,
      token: null,
      currentView: 'landing',
      currentProjectId: null,
      projects: [],
      activeChatRoomId: null,
      sidebarOpen: false,
      isLoading: false,
    })
  })

  it('should start with isLoading false', () => {
    expect(useAppStore.getState().isLoading).toBe(false)
  })

  it('should set loading state', () => {
    useAppStore.getState().setLoading(true)
    expect(useAppStore.getState().isLoading).toBe(true)
  })
})
