import { spawn } from 'child_process';
import { basename, extname } from 'path';
import { getMissingRuntimeDependencies } from '@/lib/runtime-dependencies';

export interface NormalizedTikTokUrl {
  normalizedUrl: string;
  videoId: string;
}

export interface TikTokPlatformMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

export interface TikTokMetadata {
  id: string;
  title: string;
  description: string;
  durationSeconds: number | null;
  uploader: string | null;
  uploaderId: string | null;
  channel: string | null;
  ext: string | null;
  thumbnailUrl: string | null;
  platformMetrics: TikTokPlatformMetrics;
  webpageUrl: string;
  originalUrl: string;
}

interface YtDlpJson {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  duration?: unknown;
  uploader?: unknown;
  uploader_id?: unknown;
  channel?: unknown;
  ext?: unknown;
  thumbnail?: unknown;
  webpage_url?: unknown;
  original_url?: unknown;
  view_count?: unknown;
  like_count?: unknown;
  comment_count?: unknown;
  repost_count?: unknown;
}

function normalizeTikTokHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function asPositiveNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Math.round(numeric);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function mapMetadata(raw: YtDlpJson, fallbackUrl: string): TikTokMetadata {
  const id = asString(raw.id) ?? '';
  if (!id) {
    throw new Error('TikTok metadata did not include a video id.');
  }

  return {
    id,
    title: asString(raw.title) ?? 'TikTok post',
    description: asString(raw.description) ?? '',
    durationSeconds: Number.isFinite(Number(raw.duration)) ? Number(raw.duration) : null,
    uploader: asString(raw.uploader),
    uploaderId: asString(raw.uploader_id),
    channel: asString(raw.channel),
    ext: asString(raw.ext),
    thumbnailUrl: asString(raw.thumbnail),
    platformMetrics: {
      views: asPositiveNumber(raw.view_count),
      likes: asPositiveNumber(raw.like_count),
      comments: asPositiveNumber(raw.comment_count),
      shares: asPositiveNumber(raw.repost_count),
    },
    webpageUrl: asString(raw.webpage_url) ?? fallbackUrl,
    originalUrl: asString(raw.original_url) ?? fallbackUrl,
  };
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      const details = stderr.trim() || stdout.trim() || `Process exited with code ${code}`;
      reject(new Error(details));
    });
  });
}

export function isTikTokDownloaderAvailable(): boolean {
  return getMissingRuntimeDependencies(['yt-dlp']).length === 0;
}

export function normalizeTikTokVideoUrl(rawUrl: string): NormalizedTikTokUrl {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new Error('Paste a valid TikTok URL.');
  }

  const hostname = normalizeTikTokHostname(parsedUrl.hostname);
  const allowedHosts = new Set(['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com']);
  if (!allowedHosts.has(hostname)) {
    throw new Error('Only public TikTok URLs are supported right now.');
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, '');
  const videoMatch = pathname.match(/\/@[^/]+\/video\/(\d+)/i);
  if (!videoMatch?.[1]) {
    throw new Error('That TikTok URL does not look like a direct video link.');
  }

  const videoId = videoMatch[1];
  const creatorPath = pathname.split('/video/')[0];
  return {
    normalizedUrl: `https://www.tiktok.com${creatorPath}/video/${videoId}`,
    videoId,
  };
}

export async function fetchTikTokMetadata(platformUrl: string): Promise<TikTokMetadata> {
  const output = await runCommand('yt-dlp', ['--dump-single-json', '--no-warnings', platformUrl]);
  const parsed = JSON.parse(output) as YtDlpJson;
  return mapMetadata(parsed, platformUrl);
}

export async function downloadTikTokVideo(
  platformUrl: string,
  outputTemplate: string,
): Promise<{ filePath: string }> {
  const output = await runCommand('yt-dlp', [
    '--no-warnings',
    '--no-progress',
    '--format',
    'mp4/best',
    '--print',
    'after_move:filepath',
    '--output',
    outputTemplate,
    platformUrl,
  ]);

  const filePath = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!filePath) {
    throw new Error('Downloaded TikTok video path was not returned.');
  }

  return { filePath };
}

export function getSafeDownloadFilename(id: string, filePath: string): string {
  const ext = extname(filePath).replace(/^\./, '') || 'mp4';
  const stem = basename(filePath, extname(filePath)).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80);
  return `${stem || `tiktok-${id}`}.${ext}`;
}

export function getStoragePathForDownloadedVideo(id: string, filePath: string): string {
  const ext = extname(filePath).replace(/^\./, '') || 'mp4';
  return `videos/${id}.${ext}`;
}
