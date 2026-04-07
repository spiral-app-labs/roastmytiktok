/**
 * TikTok Sound Detection - Phase 1 (zero API cost)
 *
 * Extracts music/sound metadata from a TikTok video URL by parsing the
 * page's embedded JSON-LD / __NEXT_DATA__ / oEmbed payload.
 *
 * No official TikTok API required. Same technique social preview cards use.
 *
 * Returns null if no URL is available, request fails, or no music data is found.
 */

export interface DetectedSound {
  /** Display name shown in TikTok UI, e.g. "original sound - creator_name" */
  name: string;
  /** Artist / author as shown by TikTok, e.g. "creator_name" */
  author: string;
  /** Whether this is original audio created by the video author */
  isOriginal: boolean;
  /** Direct TikTok sound page URL when a sound ID is available */
  soundUrl: string | null;
  /** Raw TikTok music ID if extracted, useful for future API lookups */
  musicId: string | null;
}

/**
 * TikTok embeds video metadata in a <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"> tag
 * (or older __NEXT_DATA__). We look for the "music" object inside that JSON.
 */
function extractFromHtml(html: string): DetectedSound | null {
  // Pattern 1: __UNIVERSAL_DATA_FOR_REHYDRATION__ (current TikTok SPA)
  const universalMatch = html.match(
    /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (universalMatch) {
    try {
      const json = JSON.parse(universalMatch[1]);
      // Navigate: __DEFAULT_SCOPE__ -> webapp.video-detail -> itemInfo -> itemStruct -> music
      const itemStruct =
        json?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.itemInfo?.itemStruct;
      if (itemStruct?.music) {
        return parseMusicObject(itemStruct.music);
      }
    } catch {
      // continue to next pattern
    }
  }

  // Pattern 2: __NEXT_DATA__ (legacy / server-rendered pages)
  const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      const itemStruct =
        json?.props?.pageProps?.itemInfo?.itemStruct ??
        json?.props?.pageProps?.videoData?.itemInfos;
      if (itemStruct?.music) {
        return parseMusicObject(itemStruct.music);
      }
    } catch {
      // continue
    }
  }

  // Pattern 3: inline JSON blobs - look for "music":{"id":"... patterns
  const inlineMatch = html.match(/"music"\s*:\s*\{[^}]{10,500}\}/);
  if (inlineMatch) {
    try {
      const music = JSON.parse('{' + inlineMatch[0].slice(inlineMatch[0].indexOf(':') + 1).trim() + '}');
      // The regex above captures the value object, not wrapped - try to parse it differently
      const valueStr = inlineMatch[0].slice(inlineMatch[0].indexOf(':') + 1).trim();
      return parseMusicObject(JSON.parse(valueStr));
    } catch {
      // ignore
    }
  }

  return null;
}

function parseMusicObject(music: Record<string, unknown>): DetectedSound | null {
  if (!music) return null;

  const title = (music.title ?? music.musicName ?? '') as string;
  const author = (music.authorName ?? music.author ?? '') as string;
  const id = (music.id ?? music.musicId ?? '') as string;

  if (!title) return null;

  const isOriginal =
    title.toLowerCase().startsWith('original sound') ||
    title.toLowerCase().includes('original audio') ||
    (music.original === true) ||
    (music.isOriginal === true);

  const soundUrl = id ? `https://www.tiktok.com/music/${encodeURIComponent(title)}-${id}` : null;

  return {
    name: title,
    author,
    isOriginal,
    soundUrl,
    musicId: id || null,
  };
}

/**
 * Try TikTok's oEmbed endpoint first (fast, no HTML parsing needed),
 * then fall back to HTML scrape.
 */
async function tryOEmbed(tiktokUrl: string): Promise<DetectedSound | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoViral/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    // oEmbed doesn't expose sound metadata directly, but the title/author fields
    // are available as context. Not enough - fall through to HTML parse.
    void data;
    return null;
  } catch {
    return null;
  }
}

async function tryHtmlScrape(tiktokUrl: string): Promise<DetectedSound | null> {
  try {
    const res = await fetch(tiktokUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractFromHtml(html);
  } catch {
    return null;
  }
}

/**
 * Main export: detect the sound used in a TikTok video.
 * Returns null if no TikTok URL is available or detection fails.
 * Never throws - all errors are swallowed and logged.
 */
export async function detectTikTokSound(tiktokUrl: string | null | undefined): Promise<DetectedSound | null> {
  if (!tiktokUrl) return null;

  // Normalize URL
  const url = tiktokUrl.trim();
  if (!url.includes('tiktok.com')) return null;

  try {
    // Try HTML scrape (oEmbed doesn't expose music metadata)
    const result = await tryHtmlScrape(url);
    if (result) return result;

    // oEmbed as last resort (currently never yields music data but future-proofs)
    return await tryOEmbed(url);
  } catch (err) {
    console.warn('[sound-detect] Detection failed:', err);
    return null;
  }
}
