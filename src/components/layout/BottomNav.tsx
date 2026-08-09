'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Compass, Home, Bookmark, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Four tabs for MVP (docs/00-architecture.md §8). `Trips` joins this array
 * once trip planning does something — a tab that opens onto a placeholder
 * makes the whole app read as unfinished.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40',
        // The gradient fades content out beneath the floating bar instead of
        // letting it collide with it — cleaner than an opaque block.
        'bg-gradient-to-t from-background via-background/90 to-transparent pt-4',
        'pb-safe-float px-safe',
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch gap-1 rounded-xl border border-border/60 bg-surface/85 p-1.5 shadow-lg backdrop-blur-xl">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-14 flex-col items-center justify-center gap-1 rounded-lg',
                  'text-[0.6875rem] font-medium transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-ink-subtle hover:text-ink-muted',
                )}
              >
                {/* A shared layoutId animates the pill between tabs instead of
                    cross-fading two of them. Confined to the nav — layout
                    animations must never run over the map's WebGL canvas. */}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-lg bg-primary-tint"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                )}
                <Icon
                  className="relative size-[1.375rem]"
                  strokeWidth={isActive ? 2.4 : 1.8}
                  aria-hidden
                />
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
