'use client';

// Legal Page component - renders markdown content for Privacy Policy and Terms of Service
// Reads from markdown files in the /content directory for easy editing
// Uses react-markdown for rendering

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Compass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

interface LegalPageProps {
  /** The markdown content to render */
  content: string;
  /** Page title for the header */
  title: string;
}

export default function LegalPage({ content, title }: LegalPageProps) {
  const { setCurrentView } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Compass className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">مَسَار</span>
          </div>
          {mounted && (
            <Button
              variant="ghost"
              onClick={() => setCurrentView('landing')}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowRight className="size-4 ml-1" />
              العودة للرئيسية
            </Button>
          )}
        </div>
      </header>

      {/* Title Banner */}
      <div
        className="py-12 sm:py-16 px-4 sm:px-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #047857 0%, #0d9488 50%, #115e59 100%)',
        }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{title}</h1>
        <p className="text-emerald-200/80 text-sm sm:text-base">منصة مَسَار — طريقك من الفكرة إلى القبول</p>
      </div>

      {/* Markdown Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <article className="legal-content prose prose-lg prose-emerald max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-8 px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-4 text-sm">
            <a href="/privacy" className="hover:text-emerald-400 transition-colors">سياسة الخصوصية</a>
            <a href="/terms" className="hover:text-emerald-400 transition-colors">شروط وأحكام الاستخدام</a>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} مَسَار — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>

      {/* Custom styles for markdown content */}
      <style jsx global>{`
        .legal-content h1 {
          display: none;
        }
        .legal-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #d1fae5;
        }
        .legal-content h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .legal-content p {
          color: #4b5563;
          line-height: 1.9;
          margin-bottom: 1rem;
          text-align: right;
        }
        .legal-content strong {
          color: #1f2937;
          font-weight: 600;
        }
        .legal-content ul, .legal-content ol {
          margin-bottom: 1rem;
          padding-right: 1.5rem;
        }
        .legal-content li {
          color: #4b5563;
          line-height: 1.9;
          margin-bottom: 0.5rem;
        }
        .legal-content hr {
          border-color: #e5e7eb;
          margin: 2rem 0;
        }
        .legal-content a {
          color: #047857;
          text-decoration: underline;
        }
        .legal-content a:hover {
          color: #065f46;
        }
        .legal-content blockquote {
          border-right: 4px solid #10b981;
          padding-right: 1rem;
          margin: 1.5rem 0;
          background: #ecfdf5;
          padding: 1rem 1rem 1rem 0;
          border-radius: 0.5rem;
        }
        .legal-content blockquote p {
          color: #065f46;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
