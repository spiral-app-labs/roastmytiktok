import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const video = formData.get('video') as File | null;
    const url = formData.get('url') as string | null;

    if (url) {
      return Response.json(
        { error: 'URL analysis coming soon, please upload a file' },
        { status: 400 }
      );
    }

    if (!video || !(video instanceof File)) {
      return Response.json(
        { error: 'Please upload a video file' },
        { status: 400 }
      );
    }

    const sessionId = formData.get('session_id') as string | null;

    const id = uuidv4();
    const ext = video.name.split('.').pop() || 'mp4';
    const storagePath = `videos/${id}.${ext}`;

    // Ensure bucket exists (no-op if already created)
    await supabaseServer.storage.createBucket('roast-videos', { public: false }).catch(() => {});

    // Upload to Supabase Storage
    const buffer = Buffer.from(await video.arrayBuffer());
    const { error: uploadError } = await supabaseServer.storage
      .from('roast-videos')
      .upload(storagePath, buffer, {
        contentType: video.type || 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('[analyze] Supabase Storage upload error:', uploadError);
      return Response.json(
        { error: 'Failed to upload video' },
        { status: 500 }
      );
    }

    // Create session record so the GET handler can find the video
    try {
      await supabaseServer.from('rmt_roast_sessions').insert({
        id,
        session_id: sessionId ?? 'anonymous',
        source: 'upload',
        filename: video.name,
        video_url: storagePath,
        overall_score: 0,
        verdict: '',
        agent_scores: {},
        findings: {},
      });
    } catch (err) {
      console.warn('[analyze] Session record insert failed:', err);
    }

    return Response.json({ id, videoPath: storagePath, sessionId });
  } catch (err) {
    console.error('[analyze] Upload error:', err);
    return Response.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
