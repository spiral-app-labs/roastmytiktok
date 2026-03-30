import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: session, error } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('video_url')
    .eq('id', id)
    .single();

  if (error || !session?.video_url) {
    return Response.json({ error: 'Video not found' }, { status: 404 });
  }

  const { data: signedData, error: signError } = await supabaseServer.storage
    .from('roast-videos')
    .createSignedUrl(session.video_url, 3600); // 1 hour expiry

  if (signError || !signedData?.signedUrl) {
    return Response.json({ error: 'Failed to generate video URL' }, { status: 500 });
  }

  return Response.json({ url: signedData.signedUrl });
}
