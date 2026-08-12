'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileClock, LayoutDashboard, Store, Tags, Users } from 'lucide-react';

import { useSessionStore } from '@/features/auth/store';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber } from '@/i18n/format';
import type { MessageKey } from '@/i18n/messages/keys';
import { cn } from '@/lib/utils/cn';
import { fetchOverview } from '../api';

interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: ReactNode;
  /** Which overview queue drives this item's badge, if any. */
  queue?: 'moderation';
}

const NAV: NavItem[] = [
  {
    href: '/admin',
    labelKey: 'admin.overview',
    icon: <LayoutDashboard className="size-4" aria-hidden />,
  },
  {
    href: '/admin/moderation',
    labelKey: 'admin.moderation',
    icon: <ClipboardList className="size-4" aria-hidden />,
    queue: 'moderation',
  },
  { href: '/admin/content', labelKey: 'admin.content', icon: <Store className="size-4" aria-hidden /> },
  { href: '/admin/taxonomy', labelKey: 'admin.taxonomy', icon: <Tags className="size-4" aria-hidden /> },
  { href: '/admin/users', labelKey: 'admin.users', icon: <Users className="size-4" aria-hidden /> },
  {
    href: '/admin/audit',
    labelKey: 'admin.audit',
    icon: <FileClock className="size-4" aria-hidden />,
  },
];

/**
 * Admin shell (§40: desktop-first).
 *
 * Deliberately outside the `(app)` route group — no bottom nav, no
 * `h-dvh` mobile frame. Moderation is a two-monitor job: a queue, the listing
 * it refers to, and a decision box side by side. Squeezing that into a phone
 * layout would make the primary use case the worst-served one.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isInitializing } = useSessionStore();

  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchOverview,
    enabled: user?.role === 'ADMIN',
    // Queue depths go stale the moment a colleague acts on something.
    refetchInterval: 60_000,
  });

  const pending =
    (overview.data?.queues.places ?? 0) +
    (overview.data?.queues.revisions ?? 0) +
    (overview.data?.queues.owners ?? 0) +
    (overview.data?.queues.reports ?? 0);

  if (isInitializing) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center">
        <div className="bg-surface h-24 w-64 animate-pulse rounded-lg shadow-sm" />
      </div>
    );
  }

  /*
   * The server refuses every /admin route regardless — `requireAdmin` re-reads
   * the role from the database. This is only so a non-admin who finds the URL
   * gets an explanation instead of five failed requests and an empty page.
   */
  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-sm">
          <EmptyState
            icon={<LayoutDashboard className="size-7" aria-hidden />}
            title={t('admin.only')}
            description={
              user
                ? t('admin.onlyBody')
                : t('admin.signInBody')
            }
            action={
              <Button
                onClick={() => {
                  router.push('/');
                }}
              >
                {t('page.backToApp')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-dvh">
      <aside className="border-border bg-surface sticky top-0 hidden h-dvh w-60 shrink-0 border-r px-4 py-6 md:block">
        <Link href="/" className="text-ink px-2 text-lg font-semibold tracking-tight">
          Gonoplan
          <span className="text-ink-subtle ml-1.5 text-xs font-medium">{t('admin.label')}</span>
        </Link>

        <nav className="mt-6 space-y-1">
          {NAV.map((item) => {
            // `/admin` would otherwise match every child route.
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-tint text-primary'
                    : 'text-ink-muted hover:bg-surface-sunken',
                )}
              >
                {item.icon}
                <span className="flex-1">{t(item.labelKey)}</span>
                {item.queue === 'moderation' && pending > 0 && (
                  <span className="bg-danger inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-semibold text-white tabular-nums">
                    {pending > 99 ? '99+' : formatNumber(pending, locale)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-border mt-6 border-t pt-4">
          <p className="text-ink truncate px-3 text-sm font-medium">{user.name}</p>
          <p className="text-ink-subtle truncate px-3 text-xs">{user.email}</p>
        </div>
      </aside>

      {/* Narrow screens get the same content in a single column rather than a
          hidden sidebar with no way to navigate. */}
      <div className="min-w-0 flex-1">
        <nav className="border-border bg-surface flex gap-1 overflow-x-auto border-b px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                pathname === item.href ? 'bg-primary-tint text-primary' : 'text-ink-muted',
              )}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Wider than the reading measure the public app uses, deliberately.
            Nothing here is prose to be read top to bottom — it is queues to be
            scanned two abreast and charts to be compared side by side, and at
            1152px the second column of either was already cramped. */}
        <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
