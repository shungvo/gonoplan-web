'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { ReportSheet } from '@/features/reports/ReportSheet';
import { useIsAuthenticated } from '@/features/auth/store';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';
import { fetchPublicUser } from '../api';
import { ProfileBody } from './ProfileBody';
import { CheckInGrid } from '@/features/checkins/components/CheckInGrid';
import { CheckInCard } from '@/features/checkins/components/CheckInCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { flattenCheckIns, useCheckIns } from '@/features/checkins/hooks';
import type { CheckIn } from '@/features/checkins/api';
import { BackButton } from '@/components/ui/BackButton';
import { useGoBack } from '@/lib/navigation/useGoBack';

/** Somebody else's profile, reached from a review or a listing they added. */
export function PublicProfileScreen({ userId }: { userId: string }) {
  const t = useT();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const goBack = useGoBack();
  const [reporting, setReporting] = useState(false);
  const [opened, setOpened] = useState<CheckIn | null>(null);

  const feed = useCheckIns({ userId });
  const photos = flattenCheckIns(feed.data?.pages);

  const user = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchPublicUser(userId),
    // A closed account is a real answer, not a blip worth three attempts.
    retry: false,
  });

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float px-5">
        <BackButton onClick={goBack} />
      </header>

      <div className="mt-2 px-5">
        {user.isPending && <div className="bg-surface h-24 animate-pulse rounded-lg shadow-sm" />}

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

        {user.data && (
          <>
            <ProfileBody user={user.data} />

            {/*
              Their photographs, as a grid.

              The account tab renders a fuller version of this — a grid/feed
              switch, a composer, delete controls — and the two layouts should
              converge. They have not yet: this screen also carries the recent
              reviews and the places somebody added, which the tab does not,
              and folding all of it together is a bigger change than adding the
              one thing that was missing here. The grid is read-only, so
              nothing about ownership has to be decided to show it.
            */}
            {photos.length > 0 && (
              <section className="mt-6" aria-label={t('profile.posts')}>
                <h2 className="text-ink mb-2 text-sm font-semibold">{t('profile.posts')}</h2>
                <div className="-mx-5">
                  <CheckInGrid checkIns={photos} onOpen={setOpened} />
                </div>
              </section>
            )}

            {/* Low-key and at the end, the same shape the place page uses.
                `ReportTargetType.USER` has been in the schema and the queue
                since Phase 11 with nothing able to send one. */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setReporting(true);
                }}
                className="text-ink-subtle hover:text-ink-muted mt-6 inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <Flag className="size-3.5" aria-hidden />
                {t('report.profileAction')}
              </button>
            )}

            <ReportSheet
              target={{ type: 'USER', id: user.data.id, label: user.data.name }}
              open={reporting}
              onOpenChange={setReporting}
            />

            <BottomSheet
              open={opened !== null}
              onOpenChange={() => {
                setOpened(null);
              }}
            >
              {opened && (
                <div className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
                  <CheckInCard checkIn={opened} />
                  <div className="h-4" />
                </div>
              )}
            </BottomSheet>
          </>
        )}
      </div>
    </div>
  );
}
