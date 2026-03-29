import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roast Feed — Roast My TikTok',
  description: 'Live feed of the latest TikTok roasts. Brutal, real-time, unfiltered.',
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
