import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to Go Viral to access your dashboard, analysis history, and AI-powered content insights.',
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
