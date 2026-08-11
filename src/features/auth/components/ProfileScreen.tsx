'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, LogOut, MapPinPlus, Shield, Store, User } from 'lucide-react';
import { AuthSheet } from './AuthSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';
import { LocaleSwitcher } from '@/i18n/LocaleSwitcher';
import { useSessionStore } from '../store';
import { logout } from '../api';

export function ProfileScreen() {
  const t = useT();
  const router = useRouter();
  const { user, isInitializing, clear } = useSessionStore();
  const [authOpen, setAuthOpen] = useState(false);
  const queryClient = useQueryClient();

  const signOut = async () => {
    await logout();
    clear();
    // Everything cached was fetched as the signed-in user; leaving it would
    // show the next visitor someone else's saves.
    queryClient.clear();
  };

  return (
    <div className="px-safe">
      <header className="pt-safe px-5">
        <h1 className="text-ink pt-6 text-[1.75rem] leading-tight font-semibold tracking-tight">
          {t('profile.title')}
        </h1>
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
        )}

        {!isInitializing && user && (
          <>
            <div className="bg-surface flex items-center gap-3 rounded-lg p-4 shadow-sm">
              <span className="bg-primary-tint text-primary flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
                {user.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-ink truncate font-semibold">{user.name}</p>
                <p className="text-ink-muted truncate text-sm">{user.email}</p>
              </div>
            </div>

            {(user.role === 'ADMIN' || user.ownerProfileId) && (
              <div className="mt-3 space-y-2">
                {user.role === 'ADMIN' && (
                  <p className="bg-surface text-ink flex items-center gap-2.5 rounded-lg p-3.5 text-sm shadow-sm">
                    <Shield className="text-primary size-4" aria-hidden />
                    {t('profile.administrator')}
                  </p>
                )}
                {user.ownerProfileId && (
                  <p className="bg-surface text-ink flex items-center gap-2.5 rounded-lg p-3.5 text-sm shadow-sm">
                    <Store className="text-primary size-4" aria-hidden />
                    {t('profile.businessOwner')}
                    {user.ownerStatus && user.ownerStatus !== 'APPROVED' && (
                      <span className="text-ink-subtle">· {t(`ownerStatus.${user.ownerStatus}`)}</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/*
              Above the business entry, because far more people have somewhere
              to suggest than have a business to claim. Everyone sees it: any
              signed-in user may submit, and every submission is reviewed.
            */}
            <button
              type="button"
              onClick={() => {
                router.push('/places/new');
              }}
              className="bg-surface mt-3 flex w-full items-center gap-2.5 rounded-lg p-3.5 text-left shadow-sm active:scale-[0.99]"
            >
              <MapPinPlus className="text-primary size-4 shrink-0" aria-hidden />
              <span className="text-ink flex-1 text-sm font-medium">{t('profile.addPlace')}</span>
              <ChevronRight className="text-ink-subtle size-4 shrink-0" aria-hidden />
            </button>

            {/* Shown to everyone, not only existing owners: this is how a
                business discovers it can claim its listing (§24). */}
            <button
              type="button"
              onClick={() => {
                router.push('/owner');
              }}
              className="bg-surface mt-3 flex w-full items-center gap-2.5 rounded-lg p-3.5 text-left shadow-sm active:scale-[0.99]"
            >
              <Store className="text-primary size-4 shrink-0" aria-hidden />
              <span className="text-ink flex-1 text-sm font-medium">
                {user.ownerProfileId ? t('profile.yourBusiness') : t('profile.registerBusiness')}
              </span>
              <ChevronRight className="text-ink-subtle size-4 shrink-0" aria-hidden />
            </button>

            <Button
              variant="secondary"
              fullWidth
              className="mt-4"
              leadingIcon={<LogOut className="size-4" aria-hidden />}
              onClick={() => {
                void signOut();
              }}
            >
              {t('profile.signOut')}
            </Button>
          </>
        )}
      </div>

      {/* Outside the signed-in branch on purpose: the person who most needs
          this control is the one who cannot read the screen it is on, and
          that person has not necessarily signed in. */}
      <div className="mt-6 px-5">
        <LocaleSwitcher />
      </div>

      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
