import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Roast My TikTok collects, uses, and protects your data. We use essential cookies only — no third-party advertising.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
