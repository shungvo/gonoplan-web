'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';
import { fetchPublicUser } from '../api';
import { ProfileBody } from './ProfileBody';

/** Somebody else's profile, reached from a review or a listing they added. */
export function PublicProfileScreen({ userId }: { userId: string }) {
  const t = useT();
  const router = useRouter();

  const user = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchPublicUser(userId),
    // A closed account is a real answer, not a blip worth three attempts.
    retry: false,
  });

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float px-5">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push('/');
          }}
          aria-label={t('common.back')}
          className="text-ink -ml-2 flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
      </header>

      <div className="mt-2 px-5">
        {user.isPending && (
          <div className="bg-surface h-24 animate-pulse rounded-lg shadow-sm" />
        )}

        {user.error != null && (
          <EmptyState
            className="pt-16"
            title={t('profile.notFound')}
            description={t('profile.notFoundBody')}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  router.push('/');
                }}
              >
                {t('page.backToApp')}
              </Button>
            }
          />
        )}

        {user.data && <ProfileBody user={user.data} />}
      </div>
    </div>
  );
}
