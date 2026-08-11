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
import { BackButton } from '@/components/ui/BackButton';

/** Somebody else's profile, reached from a review or a listing they added. */
export function PublicProfileScreen({ userId }: { userId: string }) {
  const t = useT();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [reporting, setReporting] = useState(false);

  const user = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchPublicUser(userId),
    // A closed account is a real answer, not a blip worth three attempts.
    retry: false,
  });

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float px-5">
        <BackButton
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push('/');
          }}
        />
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

        {user.data && (
          <>
            <ProfileBody user={user.data} />

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
          </>
        )}
      </div>
    </div>
  );
}
