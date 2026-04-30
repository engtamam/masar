// Privacy Policy page - reads from content/privacy-policy.md
// Markdown file can be edited directly without touching any code

import fs from 'fs';
import path from 'path';
import LegalPage from '@/components/legal/LegalPage';

export const metadata = {
  title: 'سياسة الخصوصية | مَسَار',
  description: 'سياسة الخصوصية لمنصة مَسَار — كيف نحمي بياناتك الشخصية',
};

export default function PrivacyPolicyPage() {
  // Read markdown content from file at build time (SSG/SSR)
  const filePath = path.join(process.cwd(), 'content', 'privacy-policy.md');
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    content = '# سياسة الخصوصية\n\nعذراً، لم يتم العثور على محتوى سياسة الخصوصية. يرجى التواصل مع الإدارة.';
  }

  return <LegalPage content={content} title="سياسة الخصوصية" />;
}
