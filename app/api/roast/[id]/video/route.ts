import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getOwnedRoastSessionById, requireAuthenticatedUser } from '@/lib/settings-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  const session = await getOwnedRoastSessionById<{ video_url: string | null }>(auth.user.id, id, 'video_url');

  if (!session?.video_url) {
    return Response.json({ error: 'Video not found' }, { status: 404 });
  }

  const serviceSupabase = createServiceClient();
  const { data: signedData, error: signError } = await serviceSupabase.storage
    .from('roast-videos')
    .createSignedUrl(session.video_url, 3600); // 1 hour expiry

  if (signError || !signedData?.signedUrl) {
    return Response.json({ error: 'Failed to generate video URL' }, { status: 500 });
  }

  return Response.json({ url: signedData.signedUrl });
}
