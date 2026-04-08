'use client';

export const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
export const MAX_VIDEO_SIZE_MB = Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024));

export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const;
export const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export type UploadErrorCode =
  | 'file_too_large'
  | 'unsupported_format'
  | 'analysis_failed'
  | 'rate_limited';

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function isSupportedVideoFile(file: File): boolean {
  const extension = getExtension(file.name);
  return (
    SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as (typeof SUPPORTED_VIDEO_MIME_TYPES)[number]) ||
    SUPPORTED_VIDEO_EXTENSIONS.includes(extension as (typeof SUPPORTED_VIDEO_EXTENSIONS)[number])
  );
}

export function getUploadErrorMessage(code: UploadErrorCode): string {
  switch (code) {
    case 'file_too_large':
      return `Video is over ${MAX_VIDEO_SIZE_MB}MB. Try compressing it or trimming to under 3 minutes.`;
    case 'unsupported_format':
      return 'We support MP4, MOV, and WebM. Convert your file and try again.';
    case 'rate_limited':
      return "You've hit your free limit. Upgrade to analyze more videos.";
    case 'analysis_failed':
    default:
      return 'Analysis hit an error. Try again — if it keeps failing, the video may be too short or corrupted.';
  }
}

export function validateVideoFile(file: File): string | null {
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return getUploadErrorMessage('file_too_large');
  }

  if (!isSupportedVideoFile(file)) {
    return getUploadErrorMessage('unsupported_format');
  }

  return null;
}
