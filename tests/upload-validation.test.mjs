import test from 'node:test';
import assert from 'node:assert/strict';

const {
  MAX_VIDEO_SIZE_BYTES,
  getExtensionForMimeType,
  validateUploadDescriptor,
} = await import('../lib/upload-validation.ts');

test('accepts supported uploads when filename, mime, and size agree', () => {
  const validation = validateUploadDescriptor({
    filename: 'clip.MP4',
    contentType: 'video/mp4',
    sizeBytes: 1024,
  });

  assert.equal(validation.ok, true);
  if (!validation.ok) {
    throw new Error('expected upload to validate');
  }

  assert.equal(validation.normalizedExtension, 'mp4');
  assert.equal(validation.normalizedContentType, 'video/mp4');
  assert.equal(getExtensionForMimeType(validation.normalizedContentType), 'mp4');
});

test('rejects uploads with mismatched extension and mime type', () => {
  const validation = validateUploadDescriptor({
    filename: 'clip.mov',
    contentType: 'video/mp4',
    sizeBytes: 1024,
  });

  assert.deepEqual(validation, { ok: false, issue: 'mismatched_media_type' });
});

test('rejects uploads over the hard size cap', () => {
  const validation = validateUploadDescriptor({
    filename: 'clip.webm',
    contentType: 'video/webm',
    sizeBytes: MAX_VIDEO_SIZE_BYTES + 1,
  });

  assert.deepEqual(validation, { ok: false, issue: 'file_too_large' });
});

test('rejects uploads missing a supported mime type', () => {
  const validation = validateUploadDescriptor({
    filename: 'clip.mp4',
    contentType: '',
    sizeBytes: 1024,
  });

  assert.deepEqual(validation, { ok: false, issue: 'missing_content_type' });
});
