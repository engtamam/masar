'use client';

// Main Application Entry Point
// Routes between landing page, auth pages, and role-based dashboards
// Arabic RTL interface with English codebase

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { LoginPage, RegisterPage } from '@/components/auth/AuthPages';
import { NibrasLanding } from '@/components/landing/NibrasLanding';
import {
  EntrepreneurSidebar,
  EntrepreneurMainView,
} from '@/components/entrepreneur/EntrepreneurDashboard';
import {
  ConsultantSidebar,
  ConsultantMainView,
} from '@/components/consultant/ConsultantDashboard';
import {
  AdminSidebar,
  AdminMainView,
} from '@/components/admin/AdminDashboard';
import { authApi } from '@/lib/api';

// Track hydration state outside of React render cycle
let _hydrated = false;
function hydrateOnce() {
  if (!_hydrated && typeof window !== 'undefined') {
    _hydrated = true;
    useAppStore.getState().hydrate();
  }
}

export default function Home() {
  const { user, token, currentView, setUser, setCurrentView, logout } =
    useAppStore();

  // Hydrate store from localStorage on first render
  hydrateOnce();

  // Listen for unauthorized events (token expired)
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () =>
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  // Verify token validity on mount
  useEffect(() => {
    if (token && !user) {
      authApi.me().then((res) => {
        if (res.success && res.data) {
          setUser(res.data as Parameters<typeof setUser>[0]);
        } else {
          logout();
        }
      });
    }
  }, [token, user, setUser, logout]);

  // Auth pages (standalone, no sidebar)
  if (currentView === 'login') {
    return <LoginPage />;
  }

  if (currentView === 'register') {
    return <RegisterPage />;
  }

  // Authenticated dashboards
  if (user?.role === 'ENTREPRENEUR') {
    return (
      <div className="min-h-screen flex bg-gray-50" dir="rtl">
        <EntrepreneurSidebar />
        <main className="flex-1 overflow-auto">
          <EntrepreneurMainView />
        </main>
      </div>
    );
  }

  if (user?.role === 'CONSULTANT') {
    return (
      <div className="min-h-screen flex bg-gray-50" dir="rtl">
        <ConsultantSidebar />
        <main className="flex-1 overflow-auto">
          <ConsultantMainView />
        </main>
      </div>
    );
  }

  if (user?.role === 'ADMIN') {
    return (
      <div className="min-h-screen flex bg-gray-50" dir="rtl">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <AdminMainView />
        </main>
      </div>
    );
  }

  // Default: Landing page for unauthenticated visitors
  return (
    <NibrasLanding
      onSignUp={() => setCurrentView('register')}
      onLogin={() => setCurrentView('login')}
    />
  );
}
