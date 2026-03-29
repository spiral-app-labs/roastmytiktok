import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard — Roast My TikTok',
  description: 'See the top-ranked TikToks by roast score. Who got destroyed the hardest?',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
