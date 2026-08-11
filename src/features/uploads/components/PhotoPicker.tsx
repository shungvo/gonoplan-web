'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import { ACCEPT_ATTRIBUTE, UploadError, uploadImage, type UploadPurpose } from '../api';

export interface PickedPhoto {
  /** The storage key, which is what the review endpoint takes. */
  key: string;
  /** Where it can already be previewed — the upload has finished by then. */
  url: string;
}

/**
 * Pick, upload, preview, remove.
 *
 * Uploading happens on selection rather than on submit. Two reasons: the photo
 * is verified by the server before the review is written, so a rejected image
 * is a message next to the picker instead of a lost review; and on a slow
 * connection the upload overlaps the time spent typing, which is most of it.
 *
 * The cost is orphaned objects when someone picks a photo and abandons the
 * form. That is what the lifecycle rule in `docs/04-storage.md` §5 is for.
 */
export function PhotoPicker({
  photos,
  onChange,
  purpose = 'place',
  max = 4,
  disabled = false,
  className,
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  purpose?: UploadPurpose;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const remaining = max - photos.length - uploading;

  const handleFiles = async (files: FileList) => {
    setError(null);

    // Sliced rather than rejected: someone who selects six photos when four
    // are allowed meant "these ones", not "cancel everything".
    const chosen = [...files].slice(0, Math.max(0, remaining));
    if (chosen.length === 0) return;

    setUploading((count) => count + chosen.length);

    /*
     * Sequential, not parallel.
     *
     * Four simultaneous uploads on a Vietnamese mobile connection share the
     * same uplink and all finish at roughly the same late moment; one at a
     * time means the first preview appears almost immediately. It also keeps
     * the failure legible — the picker can say which photo failed.
     */
    const uploaded: PickedPhoto[] = [];
    for (const file of chosen) {
      try {
        const result = await uploadImage(file, purpose);
        uploaded.push({ key: result.key, url: result.url });
      } catch (cause) {
        setError(
          cause instanceof UploadError || cause instanceof ApiError
            ? cause.message
            : t('picker.failed'),
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }

    if (uploaded.length > 0) onChange([...photos, ...uploaded]);
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.key}
            className="bg-surface-sunken relative size-20 overflow-hidden rounded-md"
          >
            <Image
              src={photo.url}
              alt={t('picker.photoAlt', { position: index + 1 })}
              fill
              sizes="80px"
              className="object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(photos.filter((candidate) => candidate.key !== photo.key));
              }}
              aria-label={t('picker.removePhoto', { position: index + 1 })}
              className="bg-ink/70 absolute top-1 right-1 flex size-6 items-center justify-center rounded-full text-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}

        {Array.from({ length: uploading }, (_, index) => (
          <div
            key={`uploading-${String(index)}`}
            className="bg-surface-sunken text-ink-subtle flex size-20 items-center justify-center rounded-md"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span className="sr-only">{t('picker.uploading')}</span>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              inputRef.current?.click();
            }}
            className={cn(
              'border-border text-ink-subtle flex size-20 flex-col items-center justify-center gap-1',
              'rounded-md border border-dashed active:scale-95 disabled:opacity-50',
            )}
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="text-[0.6875rem]">{t('picker.add')}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        className="sr-only"
        onChange={(event) => {
          const { files } = event.target;
          if (files) void handleFiles(files);
          // Cleared so picking the same file twice in a row still fires.
          event.target.value = '';
        }}
      />

      {error && (
        <p role="alert" className="text-danger mt-2 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
