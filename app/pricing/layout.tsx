import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple pricing for TikTok creators. Get AI-powered roasts, hook rewrites, and reshoot plans.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
