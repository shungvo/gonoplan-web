'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, CalendarDays, ChevronRight, Settings, User } from 'lucide-react';
import { AuthSheet } from './AuthSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchPublicUser } from '@/features/users/api';
import { ProfileBody } from '@/features/users/components/ProfileBody';
import { useT } from '@/i18n/I18nProvider';
import { LocaleSwitcher } from '@/i18n/LocaleSwitcher';
import { useSessionStore } from '../store';

/**
 * Your own profile.
 *
 * Rendered from the same public endpoint anybody else would read, so what is
 * on this screen is exactly what a stranger sees. That is the honest way to
 * answer "what have I made public?" — better than a settings toggle that
 * describes it.
 *
 * The links above it are the private half: saved places and plans, which are
 * yours alone and appear on nobody else's copy of this page.
 */
export function ProfileScreen() {
  const t = useT();
  const { user, isInitializing } = useSessionStore();
  const [authOpen, setAuthOpen] = useState(false);

  const profile = useQuery({
    queryKey: ['users', user?.id],
    queryFn: () => fetchPublicUser(user!.id),
    enabled: user !== null,
  });

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float flex items-center justify-between gap-3 px-5">
        <h1 className="text-ink pt-6 text-[1.75rem] leading-tight font-semibold tracking-tight">
          {t('profile.title')}
        </h1>
        {user && (
          <Link
            href="/profile/settings"
            aria-label={t('profile.settings')}
            className="text-ink-muted mt-6 flex size-10 items-center justify-center rounded-full"
          >
            <Settings className="size-5" aria-hidden />
          </Link>
        )}
      </header>

      <div className="mt-4 px-5">
        {/* Held until the refresh cookie has been exchanged, so a returning
            user never sees "browsing as a guest" for a beat before their name
            appears. */}
        {isInitializing && (
          <div className="bg-surface flex items-center gap-3 rounded-lg p-4 shadow-sm">
            <div className="bg-surface-sunken size-12 animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-surface-sunken h-4 w-1/3 animate-pulse rounded" />
              <div className="bg-surface-sunken h-3 w-1/2 animate-pulse rounded" />
            </div>
          </div>
        )}

        {!isInitializing && !user && (
          <>
            <EmptyState
              icon={<User className="size-7" aria-hidden />}
              title={t('profile.guestTitle')}
              description={t('profile.guestDescription')}
              action={
                <Button
                  onClick={() => {
                    setAuthOpen(true);
                  }}
                >
                  {t('profile.signInCta')}
                </Button>
              }
            />

            {/* The one control a guest still needs — the person who cannot read
                this screen has not necessarily signed in. */}
            <div className="mt-6">
              <LocaleSwitcher />
            </div>
          </>
        )}

        {!isInitializing && user && (
          <>
            <nav className="bg-surface overflow-hidden rounded-lg shadow-sm">
              {[
                { href: '/profile/saved', icon: Bookmark, label: t('profile.saved') },
                { href: '/plan', icon: CalendarDays, label: t('profile.myPlans') },
                { href: '/profile/settings', icon: Settings, label: t('profile.settings') },
              ].map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 p-3.5 ${index > 0 ? 'border-border border-t' : ''}`}
                >
                  <item.icon className="text-primary size-4 shrink-0" aria-hidden />
                  <span className="text-ink flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronRight className="text-ink-subtle size-4 shrink-0" aria-hidden />
                </Link>
              ))}
            </nav>

            <p className="text-ink-subtle mt-3 text-xs">{t('profile.publicNotice')}</p>

            <div className="mt-5">
              {profile.isPending && (
                <div className="bg-surface h-24 animate-pulse rounded-lg shadow-sm" />
              )}
              {profile.data && <ProfileBody user={profile.data} />}
            </div>
          </>
        )}
      </div>

      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
