import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Script Generator',
  description: 'Generate TikTok scripts with AI-powered hook formulas and proven content structures.',
  alternates: { canonical: '/scripts' },
};

export default function ScriptsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
