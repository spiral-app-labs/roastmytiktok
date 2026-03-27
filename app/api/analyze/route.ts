import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

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
    const tmpPath = `/tmp/rmt-${id}.${ext}`;

    const buffer = Buffer.from(await video.arrayBuffer());
    await writeFile(tmpPath, buffer);

    return Response.json({ id, tmpPath, sessionId });
  } catch (err) {
    console.error('[analyze] Upload error:', err);
    return Response.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
