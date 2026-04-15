'use client';

import {
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_VIDEO_MIME_TYPES,
  getUploadValidationError,
  validateUploadDescriptor,
} from '@/lib/upload-validation';

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
      return getUploadValidationError('file_too_large');
    case 'unsupported_format':
      return getUploadValidationError('unsupported_content_type');
    case 'rate_limited':
      return "You've hit your free limit. Upgrade to analyze more videos.";
    case 'analysis_failed':
    default:
      return 'Analysis hit an error. Try again — if it keeps failing, the video may be too short or corrupted.';
  }
}

export function validateVideoFile(file: File): string | null {
  const validation = validateUploadDescriptor({
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });

  if (!validation.ok) {
    if (validation.issue === 'file_too_large') {
      return getUploadErrorMessage('file_too_large');
    }

    return getUploadErrorMessage('unsupported_format');
  }

  return null;
}
