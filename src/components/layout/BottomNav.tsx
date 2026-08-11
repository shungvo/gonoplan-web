'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Compass, Home, Route, User, type LucideIcon } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/messages/keys';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  /** A key, not a string: the labels below are read by screen readers. */
  labelKey: MessageKey;
  icon: LucideIcon;
}

/**
 * Four tabs (docs/00-architecture.md §8).
 *
 * Plan took the slot Saved used to hold. Saved is a list you consult; a plan
 * is a thing you build, and only one of those is worth a permanent quarter of
 * the navigation. Saved now lives under the profile, one tap further in and
 * next to the account it belongs to.
 *
 * A route rather than a calendar for that tab. `CalendarDays` carries six
 * internal dots, which at 24px is a texture rather than a shape and read as
 * noise beside three simple outlines. Two nodes and a path is also closer to
 * what the screen does: a day in the order you will walk it.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.home', icon: Home },
  { href: '/explore', labelKey: 'nav.explore', icon: Compass },
  { href: '/plan', labelKey: 'nav.plan', icon: Route },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
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
        'fixed inset-x-0 bottom-0 z-40',
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
                {/*
                  One stroke weight for every tab, active or not.

                  The weight used to jump from 1.8 to 2.4 on selection, which
                  reads as the glyph thickening rather than as a state change —
                  and it made the four icons visibly unequal whenever the row
                  was scanned as a whole. The tinted pill and the colour are
                  the indicator; they do not need a third signal helping.
                */}
                <Icon className="relative size-6 shrink-0" strokeWidth={2} aria-hidden />
                <span className="sr-only">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
