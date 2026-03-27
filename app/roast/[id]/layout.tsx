import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase-server';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let title = 'Roast My TikTok — Results';
  let description = 'See how AI agents roasted this TikTok video.';
  const ogImage = `/api/og/roast/${id}`;

  try {
    const { data } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('overall_score, verdict')
      .eq('id', id)
      .single();

    if (data) {
      title = `Score: ${data.overall_score}/100 — Roast My TikTok`;
      if (data.verdict) {
        description = data.verdict.slice(0, 160);
      }
    }
  } catch { /* fallback metadata */ }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function RoastLayout({ children }: Props) {
  return <>{children}</>;
}
