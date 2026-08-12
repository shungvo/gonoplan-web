'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Search, Shield, Store } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useT } from '@/i18n/I18nProvider';
import { useEnumLabel } from '@/i18n/useEnumLabel';
import type { MessageKey } from '@/i18n/messages/keys';
import { useSessionStore } from '@/features/auth/store';
import {
  Card,
  CardGrid,
  PageHeader,
  QueueEmpty,
  RowSkeleton,
  StatusBadge,
  TimeAgo,
} from './primitives';
import { ReasonDialog } from './ReasonDialog';
import {
  banUser,
  clearUserBio,
  deleteUser,
  fetchUser,
  fetchUsers,
  setUserRole,
  unbanUser,
  type AdminUser,
  type UserStatus,
} from '../api';

const FILTERS: Array<{ labelKey: MessageKey; value: UserStatus | undefined }> = [
  { labelKey: 'users.all', value: undefined },
  { labelKey: 'users.active', value: 'ACTIVE' },
  { labelKey: 'users.banned', value: 'BANNED' },
  { labelKey: 'users.deleted', value: 'DELETED' },
];

export function UsersScreen() {
  const t = useT();
  const enumLabel = useEnumLabel();
  const queryClient = useQueryClient();
  const { user: currentUser } = useSessionStore();

  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bioTarget, setBioTarget] = useState<{ id: string; name: string } | null>(null);

  const users = useQuery({
    queryKey: ['admin', 'users', submitted, status],
    queryFn: () => fetchUsers({ query: submitted || undefined, status }),
  });

  const detail = useQuery({
    queryKey: ['admin', 'user', expandedId],
    queryFn: () => fetchUser(expandedId ?? ''),
    enabled: expandedId !== null,
  });

  const ban = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => banUser(userId, reason),
    onSuccess: async () => {
      setBanTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  /**
   * The reviewer badge.
   *
   * Not a permission — every signed-in user may already submit a place. It
   * marks a track record so the moderation queue can be sorted by it.
   */
  const changeRole = useMutation({
    mutationFn: ({ user, next }: { user: AdminUser; next: 'USER' | 'REVIEWER' }) =>
      setUserRole(
        user.id,
        next,
        next === 'REVIEWER' ? 'Consistent, accurate contributions' : 'Reviewer badge removed',
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  /**
   * Soft delete. The endpoint has existed since Phase 11 with nothing calling
   * it, so the only way to remove an account was through the database.
   */
  const remove = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      deleteUser(userId, reason),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const clearBio = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: ({ id, reason }: { id: string; reason: string }) => clearUserBio(id, reason),
    onSuccess: async () => {
      setBioTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const unban = useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return (
    <>
      <PageHeader title={t('admin.users')} description={t('users.description')} />

      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(term.trim());
        }}
      >
        <label className="relative min-w-56 flex-1">
          <Search
            className="text-ink-subtle pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
            }}
            type="search"
            placeholder={t('users.searchPlaceholder')}
            aria-label={t('users.searchLabel')}
            autoCapitalize="none"
            className="bg-surface text-ink placeholder:text-ink-subtle focus-visible:outline-primary h-11 w-full rounded-md pr-4 pl-10 text-sm shadow-sm outline-none focus-visible:outline-2"
          />
        </label>
        <Button type="submit" size="sm">
          {t('admin.search')}
        </Button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Chip
            key={filter.labelKey}
            selected={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
            }}
          >
            {t(filter.labelKey)}
          </Chip>
        ))}
      </div>

      {users.isPending && <RowSkeleton />}
      {users.data?.length === 0 && <QueueEmpty label={t('users.noMatch')} />}

      <CardGrid>
        {users.data?.map((user) => {
          const isSelf = user.id === currentUser?.id;
          const isAdmin = user.role === 'ADMIN';
          const isExpanded = expandedId === user.id;

          return (
            <Card key={user.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="bg-primary-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-full font-semibold">
                    {user.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-ink flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{user.name}</span>
                      {isAdmin && <Shield className="text-primary size-3.5 shrink-0" aria-hidden />}
                      {user.role === 'PLACE_OWNER' && (
                        <Store className="text-ink-subtle size-3.5 shrink-0" aria-hidden />
                      )}
                    </p>
                    <p className="text-ink-muted truncate text-sm">{user.email}</p>
                    <p className="text-ink-subtle mt-1 text-xs">
                      {t('users.joined')} <TimeAgo iso={user.createdAt} /> ·{' '}
                      {t('users.metaRest', {
                        reviews: user._count.reviews,
                        submissions: user._count.submittedPlaces,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* The page everyone else sees. A moderator handling a report
                      about a person could read their row here and not the
                      thing being complained about. */}
                  {user.status === 'ACTIVE' && (
                    <Link
                      href={`/u/${user.id}`}
                      target="_blank"
                      className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                    >
                      {t('users.viewPublicProfile')}
                      <ExternalLink className="size-3" aria-hidden />
                    </Link>
                  )}
                  <StatusBadge status={user.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : user.id);
                    }}
                  >
                    {isExpanded ? t('users.hide') : t('users.history')}
                  </Button>

                  {/* Both refusals are enforced by the server; hiding the
                      buttons is so a moderator is never offered an action that
                      is going to fail. */}
                  {!isSelf &&
                    !isAdmin &&
                    user.status !== 'DELETED' &&
                    (user.status === 'BANNED' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={unban.isPending}
                        onClick={() => {
                          unban.mutate(user.id);
                        }}
                      >
                        {t('users.reinstate')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setBanTarget(user);
                        }}
                      >
                        {t('users.ban')}
                      </Button>
                    ))}

                  {/* Only USER and REVIEWER are interchangeable here. Owners
                      come from verification and admins are not grantable from
                      this screen, so neither is offered a toggle that would
                      400. */}
                  {!isSelf && (user.role === 'USER' || user.role === 'REVIEWER') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={changeRole.isPending}
                      onClick={() => {
                        changeRole.mutate({
                          user,
                          next: user.role === 'REVIEWER' ? 'USER' : 'REVIEWER',
                        });
                      }}
                    >
                      {user.role === 'REVIEWER'
                        ? t('users.removeBadge')
                        : t('users.makeReviewer')}
                    </Button>
                  )}

                  {!isSelf && !isAdmin && user.status !== 'DELETED' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setDeleteTarget(user);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-border mt-4 border-t pt-4">
                  {detail.isPending && (
                    <div className="bg-surface-sunken h-16 animate-pulse rounded-md" />
                  )}

                  {detail.data && (
                    <>
                      <dl className="text-ink-muted grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                        <div>
                          <dt className="text-ink-subtle text-xs">{t('users.savedPlaces')}</dt>
                          <dd className="tabular-nums">{detail.data._count.favorites}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle text-xs">{t('users.emailVerified')}</dt>
                          <dd>{detail.data.emailVerifiedAt ? t('users.yes') : t('users.no')}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle text-xs">{t('users.lastActive')}</dt>
                          <dd>
                            {detail.data.lastActiveAt ? (
                              <TimeAgo iso={detail.data.lastActiveAt} />
                            ) : (
                              t('users.never')
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle text-xs">{t('users.business')}</dt>
                          <dd className="truncate">
                            {detail.data.ownerProfile?.businessName ?? '—'}
                          </dd>
                        </div>
                      </dl>

                      {/* Public free text, and the reason this screen needed a
                          third verb: banning removes the profile along with
                          everything the account ever contributed, which is a
                          penalty aimed at the wrong thing. */}
                      {detail.data.bio && (
                        <div className="border-border bg-surface-sunken mt-4 rounded-md border p-3">
                          <p className="text-ink-subtle text-xs font-medium">{t('users.bio')}</p>
                          <p className="text-ink-muted mt-1 text-sm leading-relaxed">
                            {detail.data.bio}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setBioTarget({ id: user.id, name: user.name });
                            }}
                            className="text-danger mt-2 text-xs font-medium"
                          >
                            {t('users.clearBio')}
                          </button>
                        </div>
                      )}

                      <h4 className="text-ink mt-4 text-sm font-semibold">{t('users.moderationHistory')}</h4>
                      {detail.data.history.length === 0 ? (
                        <p className="text-ink-subtle mt-1 text-sm">
                          {t('users.noHistory')}
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {detail.data.history.map((entry) => (
                            <li key={entry.id} className="text-sm">
                              <span className="text-ink font-medium">
                                {enumLabel('action', entry.action)}
                              </span>
                              <span className="text-ink-subtle">
                                {' '}
                                {t('users.byAdmin', { name: entry.admin.name })} ·{' '}
                              </span>
                              <TimeAgo iso={entry.createdAt} />
                              {entry.reason && (
                                <span className="text-ink-muted block text-xs">
                                  “{entry.reason}”
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </CardGrid>

      <ReasonDialog
        open={deleteTarget !== null}
        title={t('users.deleteTitle', { name: deleteTarget?.name ?? '' })}
        description={t('users.deleteBody')}
        confirmLabel={t('users.deleteConfirm')}
        destructive
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={(reason) => {
          if (deleteTarget) remove.mutate({ userId: deleteTarget.id, reason });
        }}
        onClose={() => {
          setDeleteTarget(null);
          remove.reset();
        }}
      />

      <ReasonDialog
        open={bioTarget !== null}
        title={t('users.clearBioTitle')}
        description={t('users.clearBioBody')}
        confirmLabel={t('users.clearBio')}
        destructive
        isPending={clearBio.isPending}
        error={clearBio.error}
        onConfirm={(reason) => {
          if (bioTarget) clearBio.mutate({ id: bioTarget.id, reason });
        }}
        onClose={() => {
          setBioTarget(null);
          clearBio.reset();
        }}
      />

      <ReasonDialog
        open={banTarget !== null}
        title={t('users.banTitle', { name: banTarget?.name ?? '' })}
        description={t('users.banBody')}
        confirmLabel={t('users.banConfirm')}
        destructive
        isPending={ban.isPending}
        error={ban.error}
        onConfirm={(reason) => {
          if (banTarget) ban.mutate({ userId: banTarget.id, reason });
        }}
        onClose={() => {
          setBanTarget(null);
          ban.reset();
        }}
      />
    </>
  );
}
