import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

export type UploadSignature = components['schemas']['UploadSignature'];
export type UploadConfirmation = components['schemas']['UploadConfirmation'];

export type UploadPurpose = 'place' | 'avatar';

/** Matches the server allowlist. Anything else is refused before a round trip. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AcceptedType = (typeof ACCEPTED)[number];

export const ACCEPT_ATTRIBUTE = ACCEPTED.join(',');

/** Server ceiling is 8 MB; the re-encode below almost always lands well under. */
const MAX_BYTES = 8 * 1024 * 1024;

/** Longest side after re-encoding. A place photo is never displayed larger. */
const MAX_DIMENSION = 1600;

export class UploadError extends Error {}

/**
 * Re-encodes a photo in the browser before it is uploaded.
 *
 * Two things at once, and the second is the important one.
 *
 * It shrinks the file — a 12 MP phone photo is 4-6 MB and gets displayed at
 * 400px, so uploading the original spends someone's mobile data on pixels
 * nobody will ever see.
 *
 * And it strips EXIF. Drawing to a canvas and re-encoding drops every metadata
 * block, including the GPS coordinates a phone writes into the file. The
 * bucket has no transform pipeline (see docs/04-storage.md §4), so this is
 * where that happens or it does not happen at all — and a photo of someone's
 * own front door with its coordinates attached would be publicly readable.
 *
 * The server reports `hasExif` on confirm, so this is checkable rather than
 * merely claimed.
 */
async function reencode(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new UploadError('Could not process that image.');

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    // JPEG at 0.85: past that the file grows faster than anyone can see the
    // difference on a phone screen.
    canvas.toBlob(resolve, 'image/jpeg', 0.85);
  });

  if (!blob) throw new UploadError('Could not process that image.');
  return blob;
}

/**
 * The whole upload, start to finish.
 *
 * Signature → direct PUT to the bucket → confirm. The bytes never pass through
 * our API; what it keeps is the decision about what may be written and where.
 */
export async function uploadImage(file: File, purpose: UploadPurpose): Promise<UploadConfirmation> {
  if (!ACCEPTED.includes(file.type as AcceptedType)) {
    throw new UploadError('Photos must be JPEG, PNG or WebP.');
  }

  if (file.size > MAX_BYTES) {
    throw new UploadError('That photo is too large — 8 MB is the limit.');
  }

  const blob = await reencode(file);

  const signature = await api.post<UploadSignature>('/uploads/signature', {
    purpose,
    contentType: 'image/jpeg',
    sizeBytes: blob.size,
  });

  const response = await fetch(signature.uploadUrl, {
    method: 'PUT',
    // Exactly the headers the signature covers. Sending anything else fails
    // the upload, which is the point — the size and type are not the client's
    // to change after signing.
    headers: { ...signature.requiredHeaders, 'Content-Length': String(blob.size) },
    body: blob,
  });

  if (!response.ok) {
    throw new UploadError('The upload did not go through. Please try again.');
  }

  return api.post<UploadConfirmation>('/uploads/confirm', { key: signature.key });
}
