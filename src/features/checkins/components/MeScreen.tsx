'use client';

import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSessionStore } from '@/features/auth/store';
import { useT } from '@/i18n/I18nProvider';
import { ProfileFeedScreen } from './ProfileFeedScreen';

/**
 * The tab's own thin shell: work out whose page this is, then hand over.
 *
 * `/u/:id` renders the same screen with the id from the URL. This one has to
 * get it from the session, which is the only difference between the two and
 * the reason the tab is not just a link to `/u/:me` — there is no id to put in
 * a link until the session has settled.
 */
export function MeScreen() {
  const router = useRouter();
  const t = useT();
  const { user, isInitializing } = useSessionStore();

  // A blank frame rather than a sign-in prompt that flashes and disappears:
  // the refresh cookie usually resolves within a few hundred milliseconds, and
  // showing "sign in" to somebody who is signed in is worse than showing
  // nothing for that long.
  if (isInitializing) return <div className="pt-safe-float min-h-[50dvh]" />;

  if (!user) {
    return (
      <div className="px-safe pt-safe-float px-5">
        <EmptyState
          className="py-16"
          icon={<UserRound className="size-7" aria-hidden />}
          title={t('me.signedOutTitle')}
          description={t('me.signedOutBody')}
          action={
            <Button
              onClick={() => {
                router.push('/profile');
              }}
            >
              {t('common.signIn')}
            </Button>
          }
        />
      </div>
    );
  }

  return <ProfileFeedScreen userId={user.id} />;
}
