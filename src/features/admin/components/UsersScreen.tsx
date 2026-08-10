'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, Store } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useSessionStore } from '@/features/auth/store';
import { Card, PageHeader, QueueEmpty, RowSkeleton, StatusBadge, TimeAgo } from './primitives';
import { ReasonDialog } from './ReasonDialog';
import { banUser, fetchUser, fetchUsers, unbanUser, type AdminUser, type UserStatus } from '../api';

const FILTERS: Array<{ label: string; value: UserStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Banned', value: 'BANNED' },
  { label: 'Deleted', value: 'DELETED' },
];

export function UsersScreen() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useSessionStore();

  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => banUser(userId, reason),
    onSuccess: async () => {
      setBanTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
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
      <PageHeader title="Users" description="Search by name or email." />

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
            placeholder="Name or email"
            aria-label="Search users"
            autoCapitalize="none"
            className="bg-surface text-ink placeholder:text-ink-subtle focus-visible:outline-primary h-11 w-full rounded-md pr-4 pl-10 text-sm shadow-sm outline-none focus-visible:outline-2"
          />
        </label>
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Chip
            key={filter.label}
            selected={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
            }}
          >
            {filter.label}
          </Chip>
        ))}
      </div>

      {users.isPending && <RowSkeleton />}
      {users.data?.length === 0 && <QueueEmpty label="No users match that search." />}

      <div className="space-y-2.5">
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
                      Joined <TimeAgo iso={user.createdAt} /> · {user._count.reviews} reviews ·{' '}
                      {user._count.submittedPlaces} submissions
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={user.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : user.id);
                    }}
                  >
                    {isExpanded ? 'Hide' : 'History'}
                  </Button>

                  {/* Both refusals are enforced by the server; hiding the
                      buttons is so a moderator is never offered an action that
                      is going to fail. */}
                  {!isSelf && !isAdmin && user.status !== 'DELETED' && (
                    user.status === 'BANNED' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={unban.isPending}
                        onClick={() => {
                          unban.mutate(user.id);
                        }}
                      >
                        Reinstate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setBanTarget(user);
                        }}
                      >
                        Ban
                      </Button>
                    )
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
                          <dt className="text-ink-subtle text-xs">Saved places</dt>
                          <dd className="tabular-nums">{detail.data._count.favorites}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle text-xs">Email verified</dt>
                          <dd>{detail.data.emailVerifiedAt ? 'Yes' : 'No'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle text-xs">Last active</dt>
                          <dd>
                            {detail.data.lastActiveAt ? (
                              <TimeAgo iso={detail.data.lastActiveAt} />
                            ) : (
                              'Never'
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-subtle text-xs">Business</dt>
                          <dd className="truncate">
                            {detail.data.ownerProfile?.businessName ?? '—'}
                          </dd>
                        </div>
                      </dl>

                      <h4 className="text-ink mt-4 text-sm font-semibold">Moderation history</h4>
                      {detail.data.history.length === 0 ? (
                        <p className="text-ink-subtle mt-1 text-sm">
                          No action has ever been taken against this account.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {detail.data.history.map((entry) => (
                            <li key={entry.id} className="text-sm">
                              <span className="text-ink font-medium">
                                {entry.action.toLowerCase().replace(/_/g, ' ')}
                              </span>
                              <span className="text-ink-subtle"> by {entry.admin.name} · </span>
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
      </div>

      <ReasonDialog
        open={banTarget !== null}
        title={`Ban ${banTarget?.name ?? ''}`}
        description="They are signed out everywhere immediately and cannot sign back in. Their reviews and submissions stay published."
        confirmLabel="Ban this account"
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
