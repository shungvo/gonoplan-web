'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, LogOut, MapPinPlus, Shield, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { LocaleSwitcher } from '@/i18n/LocaleSwitcher';
import { useSessionStore } from '../store';
import { logout } from '../api';
import { BackButton } from '@/components/ui/BackButton';

/**
 * Everything the profile screen used to be.
 *
 * The profile is now a page about a person — their reviews, the places they
 * added — and this is the account behind it: the email, the roles, the
 * language, the way out. Two different questions that happened to share a tab.
 */
export function AccountSettingsScreen() {
  const t = useT();
  const router = useRouter();
  const { user, isInitializing, clear } = useSessionStore();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await logout();
    clear();
    // Everything cached was fetched as the signed-in user; leaving it would
    // show the next visitor someone else's saves.
    queryClient.clear();
    router.push('/');
  };

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float px-5">
        <BackButton
          onClick={() => {
            router.push('/profile');
          }}
        />
        <h1 className="text-ink mt-1 text-title leading-tight font-semibold tracking-tight">
          {t('profile.settingsTitle')}
        </h1>
      </header>

      <div className="mt-4 px-5">
        {isInitializing && <div className="bg-surface h-20 animate-pulse rounded-lg shadow-sm" />}

        {!isInitializing && user && (
          <>
            <div className="bg-surface rounded-lg p-4 shadow-sm">
              <p className="text-ink truncate font-semibold">{user.name}</p>
              {/* The one screen where the email belongs. It is deliberately
                  absent from the profile the rest of the world can read. */}
              <p className="text-ink-muted truncate text-sm">{user.email}</p>
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
                      <span className="text-ink-subtle">
                        · {t(`ownerStatus.${user.ownerStatus}`)}
                      </span>
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
          </>
        )}
      </div>

      {/* Outside the signed-in branch on purpose: the person who most needs
          this control is the one who cannot read the screen it is on, and
          that person has not necessarily signed in. */}
      <div className="mt-6 px-5">
        <LocaleSwitcher />
      </div>

      {!isInitializing && user && (
        <div className="mt-6 px-5">
          <Button
            variant="secondary"
            fullWidth
            leadingIcon={<LogOut className="size-4" aria-hidden />}
            onClick={() => {
              void signOut();
            }}
          >
            {t('profile.signOut')}
          </Button>
        </div>
      )}
    </div>
  );
}
