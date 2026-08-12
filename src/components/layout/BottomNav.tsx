'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ExploreTabIcon,
  HomeTabIcon,
  PlanTabIcon,
  ProfileTabIcon,
  type TabIconProps,
} from '@/components/icons/tabs';
import { useT } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/messages/keys';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  /** A key, not a string: the labels below are read by screen readers. */
  labelKey: MessageKey;
  icon: (props: TabIconProps) => React.ReactElement;
}

/**
 * Four tabs (docs/00-architecture.md §8).
 *
 * Plan took the slot Saved used to hold. Saved is a list you consult; a plan
 * is a thing you build, and only one of those is worth a permanent quarter of
 * the navigation. Saved now lives under the profile, one tap further in and
 * next to the account it belongs to.
 *
 * The fourth slot was held empty for whatever earned it. What earned it is the
 * profile — not the account settings page that used to live there, but the
 * page of photographs somebody has posted from the places they went. That is
 * something you browse rather than something you visit, which is the test the
 * slot was being held against. Settings stay one tap further in, on the
 * profile itself.
 *
 * The glyphs are drawn in `components/icons/tabs.tsx` rather than taken from
 * lucide, because the selected tab is filled and lucide ships no filled
 * variants — filling its outlines turns the compass into a plain disc.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.home', icon: HomeTabIcon },
  { href: '/explore', labelKey: 'nav.explore', icon: ExploreTabIcon },
  { href: '/plan', labelKey: 'nav.plan', icon: PlanTabIcon },
  { href: '/me', labelKey: 'nav.me', icon: ProfileTabIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      aria-label={t('nav.main')}
      /* The hook globals.css matches on. It used to select the aria-label,
         which stopped working the moment that label became translatable —
         a selector must not depend on prose. */
      data-nav="main"
      className={cn(
        // Centred on the app column, not the monitor. `inset-x-0` alone left the
        // nav pill floating in the middle of a 1440px page with the content
        // 480px away on the left.
        'fixed inset-x-0 bottom-0 z-40 mx-auto max-w-app',
        // The gradient fades content out beneath the floating bar instead of
        // letting it collide with it — cleaner than an opaque block.
        'bg-gradient-to-t from-background via-background/90 to-transparent pt-4',
        'pb-safe-float px-safe',
      )}
    >
      {/*
        Hugs its content instead of stretching to the screen.

        `flex-1` across a `max-w-md` bar made every tab a quarter of the
        viewport, so on a phone the nav was a full-width slab and the map or
        list behind it lost a band of screen for four icons. Sized to content
        it is about 260px — a floating control rather than a shelf.

        No visible labels. The tinted pill is the indicator, and four icons at
        this size are distinguishable without captions — the labels stay in the
        tree as `sr-only`, because a link with no accessible name is unusable
        by anyone not looking at it.

        Solid white rather than translucent: over the map the blurred backdrop
        picked up whatever was behind it, so the bar changed colour as you
        panned and never settled into being one object.
      */}
      <ul className="mx-auto flex w-fit items-center gap-1 rounded-full bg-surface p-1.5 shadow-lg">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  // 48px square, past the 44px floor the rest of the app holds
                  // to, and identical for every tab so the row cannot shift
                  // when the active one changes.
                  'relative flex size-12 items-center justify-center rounded-full',
                  'transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-ink-subtle hover:text-ink-muted',
                )}
              >
                {/* A shared layoutId animates the pill between tabs instead of
                    cross-fading two of them. Confined to the nav — layout
                    animations must never run over the map's WebGL canvas. */}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-primary-tint"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                )}
                {/* Filled when selected. The silhouette is identical either
                    way, so the tab gains weight rather than changing shape. */}
                <Icon filled={isActive} className="relative size-6 shrink-0" />
                <span className="sr-only">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
