export const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
export const MAX_VIDEO_SIZE_MB = Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024));

export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const;
export const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

type SupportedVideoExtension = (typeof SUPPORTED_VIDEO_EXTENSIONS)[number];
type SupportedVideoMimeType = (typeof SUPPORTED_VIDEO_MIME_TYPES)[number];

const MIME_TYPE_BY_EXTENSION: Record<SupportedVideoExtension, SupportedVideoMimeType> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

const EXTENSION_BY_MIME_TYPE: Record<SupportedVideoMimeType, SupportedVideoExtension> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export type UploadValidationIssue =
  | 'missing_filename'
  | 'missing_content_type'
  | 'missing_size'
  | 'file_too_large'
  | 'unsupported_extension'
  | 'unsupported_content_type'
  | 'mismatched_media_type';

export interface UploadValidationInput {
  filename?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
}

export interface UploadValidationSuccess {
  ok: true;
  normalizedFilename: string;
  normalizedExtension: SupportedVideoExtension;
  normalizedContentType: SupportedVideoMimeType;
  sizeBytes: number;
}

export interface UploadValidationFailure {
  ok: false;
  issue: UploadValidationIssue;
}

export type UploadValidationResult = UploadValidationSuccess | UploadValidationFailure;

function normalizeContentType(contentType?: string | null): string {
  return contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function getVideoExtension(filename: string): string {
  return filename.split('.').pop()?.trim().toLowerCase() ?? '';
}

function isSupportedExtension(extension: string): extension is SupportedVideoExtension {
  return SUPPORTED_VIDEO_EXTENSIONS.includes(extension as SupportedVideoExtension);
}

function isSupportedMimeType(contentType: string): contentType is SupportedVideoMimeType {
  return SUPPORTED_VIDEO_MIME_TYPES.includes(contentType as SupportedVideoMimeType);
}

export function getUploadValidationError(issue: UploadValidationIssue): string {
  switch (issue) {
    case 'missing_filename':
      return 'filename is required';
    case 'missing_content_type':
      return 'contentType is required';
    case 'missing_size':
      return 'sizeBytes is required';
    case 'file_too_large':
      return `Video is over ${MAX_VIDEO_SIZE_MB}MB. Try compressing it or trimming to under 3 minutes.`;
    case 'unsupported_extension':
    case 'unsupported_content_type':
    case 'mismatched_media_type':
      return 'We support MP4, MOV, and WebM. Convert your file and try again.';
    default:
      return 'Unsupported upload.';
  }
}

export function validateUploadDescriptor(input: UploadValidationInput): UploadValidationResult {
  const filename = input.filename?.trim() ?? '';
  if (!filename) {
    return { ok: false, issue: 'missing_filename' };
  }

  const normalizedContentType = normalizeContentType(input.contentType);
  if (!normalizedContentType) {
    return { ok: false, issue: 'missing_content_type' };
  }

  if (typeof input.sizeBytes !== 'number' || !Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, issue: 'missing_size' };
  }

  if (input.sizeBytes > MAX_VIDEO_SIZE_BYTES) {
    return { ok: false, issue: 'file_too_large' };
  }

  const normalizedExtension = getVideoExtension(filename);
  if (!isSupportedExtension(normalizedExtension)) {
    return { ok: false, issue: 'unsupported_extension' };
  }

  if (!isSupportedMimeType(normalizedContentType)) {
    return { ok: false, issue: 'unsupported_content_type' };
  }

  if (MIME_TYPE_BY_EXTENSION[normalizedExtension] !== normalizedContentType) {
    return { ok: false, issue: 'mismatched_media_type' };
  }

  return {
    ok: true,
    normalizedFilename: filename,
    normalizedExtension,
    normalizedContentType,
    sizeBytes: input.sizeBytes,
  };
}

export function getExtensionForMimeType(contentType: SupportedVideoMimeType): SupportedVideoExtension {
  return EXTENSION_BY_MIME_TYPE[contentType];
}
