// Terms of Service page - reads from content/terms-of-service.md
// Markdown file can be edited directly without touching any code

import fs from 'fs';
import path from 'path';
import LegalPage from '@/components/legal/LegalPage';

export const metadata = {
  title: 'شروط وأحكام الاستخدام | مَسَار',
  description: 'شروط وأحكام استخدام منصة مَسَار — حقوقك والتزاماتك',
};

export default function TermsOfServicePage() {
  // Read markdown content from file at build time (SSG/SSR)
  const filePath = path.join(process.cwd(), 'content', 'terms-of-service.md');
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    content = '# شروط وأحكام الاستخدام\n\nعذراً، لم يتم العثور على محتوى الشروط والأحكام. يرجى التواصل مع الإدارة.';
  }

  return <LegalPage content={content} title="شروط وأحكام الاستخدام" />;
}
