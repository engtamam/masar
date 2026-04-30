'use client';

import { useEffect, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  title: string;
}

export function DashboardLayout({ sidebar, children, title }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  return (
    <div className="min-h-screen flex bg-gray-50" dir="rtl">
      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:block">
        {sidebar}
      </div>

      {/* Mobile sidebar — Sheet overlay */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="right"
            className="w-72 p-0 bg-gradient-to-b from-emerald-800 to-emerald-900 border-emerald-700/50"
          >
            <SheetTitle className="sr-only">{title}</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        {isMobile && (
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-bold text-sm">م</span>
              </div>
              <h1 className="font-bold text-emerald-800">مَسَار</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
