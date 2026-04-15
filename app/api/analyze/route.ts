import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseServer } from '@/lib/supabase-server';
import {
  MAX_VIDEO_SIZE_BYTES,
  getExtensionForMimeType,
  getUploadValidationError,
  validateUploadDescriptor,
} from '@/lib/upload-validation';
import { applyUsageCookie, enforceUsageCap, resolveUsageContext } from '@/lib/usage';

export async function POST(request: NextRequest) {
  let clientSessionId: string | undefined;
  const contentTypeHeader = request.headers.get('content-type') ?? '';

  try {
    if (contentTypeHeader.includes('application/json')) {
      const body = await request.clone().json().catch(() => null) as { sessionId?: string } | null;
      clientSessionId = body?.sessionId;
    } else if (
      contentTypeHeader.includes('multipart/form-data') ||
      contentTypeHeader.includes('application/x-www-form-urlencoded')
    ) {
      const formData = await request.clone().formData().catch(() => null);
      clientSessionId = typeof formData?.get('session_id') === 'string'
        ? (formData?.get('session_id') as string)
        : undefined;
    }
  } catch (err) {
    console.warn('[analyze] Failed to resolve usage identity from request body:', err);
  }

  try {
    const limited = await enforceUsageCap(request, clientSessionId);
    if (limited) return limited;
  } catch (err) {
    console.warn('[analyze] Usage cap check failed, allowing request:', err);
  }

  try {
    let payload: {
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
      sessionId?: string;
    };

    if (contentTypeHeader.includes('application/json')) {
      payload = await request.json();
    } else if (
      contentTypeHeader.includes('multipart/form-data') ||
      contentTypeHeader.includes('application/x-www-form-urlencoded')
    ) {
      const formData = await request.formData();
      const video = formData.get('video');
      payload = {
        filename: video instanceof File ? video.name : undefined,
        contentType: video instanceof File ? video.type : undefined,
        sizeBytes: video instanceof File ? video.size : undefined,
        sessionId:
          typeof formData.get('session_id') === 'string'
            ? (formData.get('session_id') as string)
            : undefined,
      };
    } else {
      return Response.json(
        { error: 'Unsupported content type' },
        { status: 415 }
      );
    }

    const { filename, contentType, sizeBytes, sessionId } = payload;
    const usageContext = await resolveUsageContext(request, sessionId ?? clientSessionId);
    const validation = validateUploadDescriptor({ filename, contentType, sizeBytes });

    if (!validation.ok) {
      return Response.json(
        { error: getUploadValidationError(validation.issue) },
        { status: validation.issue === 'file_too_large' ? 413 : 400 }
      );
    }

    const id = uuidv4();
    const ext = getExtensionForMimeType(validation.normalizedContentType);
    const storagePath = `videos/${id}.${ext}`;

    // Ensure bucket exists (no-op if already created)
    await supabaseServer.storage
      .createBucket('roast-videos', { public: false })
      .catch(() => {});

    // Create a signed upload URL so the client can upload directly to Supabase
    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from('roast-videos')
      .createSignedUploadUrl(storagePath);

    if (signedError || !signedData) {
      console.error('[analyze] Failed to create signed upload URL:', signedError);
      return Response.json(
        { error: 'Failed to prepare upload' },
        { status: 500 }
      );
    }

    // Create session record so the GET handler can find the video
    const { error: insertError } = await supabaseServer.from('rmt_roast_sessions').insert({
      id,
      anonymous_session_id: usageContext.anonymousSessionId,
      session_id: usageContext.clientSessionId ?? usageContext.anonymousSessionId ?? 'anonymous',
      user_id: usageContext.userId,
      client_ip: usageContext.clientIp,
      source: 'upload',
      filename: validation.normalizedFilename,
      video_url: storagePath,
      analysis_status: 'pending',
      overall_score: 0,
      verdict: '',
      agent_scores: {},
      findings: {},
    });

    if (insertError) {
      console.error('[analyze] Session record insert failed:', insertError.message, insertError.details);
      return Response.json(
        { error: 'Failed to create analysis session' },
        { status: 500 }
      );
    }

    return applyUsageCookie(Response.json({
      id,
      videoPath: storagePath,
      contentType: validation.normalizedContentType,
      maxSizeBytes: MAX_VIDEO_SIZE_BYTES,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
    }), usageContext);
  } catch (err) {
    console.error('[analyze] Error:', err);
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
