'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { updateProfile } from '@/features/auth/api';
import { useSessionStore } from '@/features/auth/store';
import { ACCEPT_ATTRIBUTE, UploadError, uploadImage } from '@/features/uploads/api';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';

/**
 * The avatar, and — if it is yours — the way to change it.
 *
 * The picture is the control. A separate "change photo" button beside it is a
 * second thing to look at that says what the first one already implies, and on
 * a profile header there is no room for either.
 *
 * Two writes, not one: the image goes to storage through the same signed-URL
 * path every other upload uses, and only the resulting URL is PATCHed onto the
 * account. The bytes never pass through the API, which is the whole point of
 * that path — but it does mean a failure between them leaves an orphaned
 * object, which the bucket lifecycle rule collects.
 */
export function AvatarUpload({
  name,
  url,
  editable,
}: {
  name: string;
  url: string | null | undefined;
  editable: boolean;
}) {
  const t = useT();
  const describeError = useErrorMessage();
  const setUser = useSessionStore((state) => state.setUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editable) return <Avatar name={name} url={url} size="2xl" />;

  const pick = async (file: File) => {
    setBusy(true);
    setError(null);

    try {
      const uploaded = await uploadImage(file, 'avatar');
      const updated = await updateProfile({ avatarUrl: uploaded.url });
      // The store, not a refetch: the PATCH already returned the fresh user,
      // and every header on the app reads its avatar from here.
      setUser(updated);
    } catch (cause) {
      setError(
        cause instanceof UploadError
          ? cause.message
          : cause instanceof ApiError
            ? describeError(cause)
            : t('common.somethingWrong'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          inputRef.current?.click();
        }}
        aria-label={t('profile.changeAvatar')}
        className="press-firm relative block rounded-full disabled:opacity-70"
      >
        <Avatar name={name} url={url} size="2xl" />

        {/* On the rim rather than centred over the face: a badge in the middle
            of somebody's photograph hides the one thing they chose it for. */}
        <span className="bg-ink ring-background absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full text-white ring-2">
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Camera className="size-3.5" aria-hidden />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared before the upload starts, so choosing the same file twice
          // in a row still fires `change` the second time.
          event.target.value = '';
          if (file) void pick(file);
        }}
      />

      {error && (
        <p role="alert" className="text-danger mt-2 max-w-32 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
