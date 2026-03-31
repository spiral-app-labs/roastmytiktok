import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to Roast My TikTok to access your dashboard, roast history, and AI-powered content analysis.',
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
