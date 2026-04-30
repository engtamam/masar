'use client';

// Main Application Entry Point
// Routes between landing page, auth pages, and role-based dashboards
// Arabic RTL interface with English codebase

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from '@/components/auth/AuthPages';
import { MasarLanding } from '@/components/landing/MasarLanding';
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
import { DashboardLayout } from '@/components/shared/DashboardLayout';

// Track hydration state outside of React render cycle
let _hydrated = false;
function hydrateOnce() {
  if (!_hydrated && typeof window !== 'undefined') {
    _hydrated = true;
    useAppStore.getState().hydrate();
  }
}

// Wrapper component to use useSearchParams (requires Suspense boundary)
function TokenRouteHandler() {
  const searchParams = useSearchParams();
  const { setCurrentView } = useAppStore();

  useEffect(() => {
    // Handle email verification token from URL
    const verifyToken = searchParams.get('token');
    const path = window.location.pathname;

    if (verifyToken && path === '/verify-email') {
      // Token will be handled by VerifyEmailPage component
    }
    if (verifyToken && path === '/reset-password') {
      // Token will be handled by ResetPasswordPage component
    }
  }, [searchParams, setCurrentView]);

  return null;
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

  // Handle URL-based token routes (reset-password, verify-email)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const tokenParam = url.searchParams.get('token');

      if (tokenParam && url.pathname === '/reset-password') {
        setCurrentView('reset-password');
      } else if (tokenParam && url.pathname === '/verify-email') {
        setCurrentView('verify-email');
      }
    }
  }, [setCurrentView]);

  // Auth pages (standalone, no sidebar)
  if (currentView === 'login') {
    return <LoginPage />;
  }

  if (currentView === 'register') {
    return <RegisterPage />;
  }

  if (currentView === 'forgot-password') {
    return <ForgotPasswordPage />;
  }

  if (currentView === 'reset-password') {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const resetToken = urlParams?.get('token') || '';
    return <ResetPasswordPage token={resetToken} />;
  }

  if (currentView === 'verify-email') {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const verifyToken = urlParams?.get('token') || '';
    return <VerifyEmailPage token={verifyToken} />;
  }

  // Authenticated dashboards
  if (user?.role === 'ENTREPRENEUR') {
    return (
      <DashboardLayout sidebar={<EntrepreneurSidebar />} title="لوحة رائد الأعمال">
        <EntrepreneurMainView />
      </DashboardLayout>
    );
  }

  if (user?.role === 'CONSULTANT') {
    return (
      <DashboardLayout sidebar={<ConsultantSidebar />} title="لوحة المستشار">
        <ConsultantMainView />
      </DashboardLayout>
    );
  }

  if (user?.role === 'ADMIN') {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="لوحة الإدارة">
        <AdminMainView />
      </DashboardLayout>
    );
  }

  // Default: Landing page for unauthenticated visitors
  return (
    <MasarLanding
      onSignUp={() => setCurrentView('register')}
      onLogin={() => setCurrentView('login')}
    />
  );
}
