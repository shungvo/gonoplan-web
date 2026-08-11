'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { fieldClass } from '@/components/ui/field';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils/cn';
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  fetchSearchInsights,
  updateCategory,
  type AdminCategory,
} from '../api';
import { Card, PageHeader, QueueEmpty, RowSkeleton, TimeAgo } from './primitives';
import { ReasonDialog } from './ReasonDialog';

type Tab = 'categories' | 'demand';

const BLANK = { slug: '', name: '', nameVi: '', iconKey: 'map-pin', colorHex: '#0F6CCD' };

/**
 * Taxonomy and demand — the two things the admin could see nothing of.
 *
 * Categories were read-only: every chip, marker colour and filter in the app
 * comes from that table, and changing it meant editing the seed and
 * redeploying.
 *
 * Unmet search demand was worse — recorded since Phase 7 and read by nothing,
 * because the popular-searches query filters to `result_count > 0`. The
 * failures are the useful half: they are a list of what to seed next, written
 * by the people who wanted it.
 *
 * One screen for both because they are the same job: this is where you find
 * out the catalogue is missing bakeries, and where you add the category.
 */
export function TaxonomyScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('categories');
  const [draft, setDraft] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchAdminCategories,
    enabled: tab === 'categories',
  });

  const insights = useQuery({
    queryKey: ['admin', 'search-insights'],
    queryFn: () => fetchSearchInsights(30),
    enabled: tab === 'demand',
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    // The public tree is cached server-side and client-side; the server drops
    // its copy on write, and this drops ours — otherwise the picker keeps the
    // old list until React Query decides to refetch.
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const add = useMutation({
    mutationFn: () => createCategory(draft),
    onSuccess: async () => {
      setDraft(BLANK);
      setAdding(false);
      await invalidate();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (category: AdminCategory) =>
      updateCategory(category.id, { isActive: !category.isActive }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidate();
    },
  });

  const parents = categories.data?.filter((category) => category.parentId === null) ?? [];

  return (
    <>
      <PageHeader
        title="Taxonomy"
        description="The categories everything is filed under, and what people searched for and did not find."
      />

      <div className="mb-5 flex gap-2">
        <Chip
          selected={tab === 'categories'}
          onClick={() => {
            setTab('categories');
          }}
        >
          Categories
        </Chip>
        <Chip
          selected={tab === 'demand'}
          onClick={() => {
            setTab('demand');
          }}
        >
          Unmet demand
        </Chip>
      </div>

      {tab === 'categories' && (
        <>
          {adding ? (
            <Card className="mb-4">
              <h3 className="text-ink text-sm font-semibold">New category</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['slug', 'Slug', 'bakery'],
                    ['name', 'Name (English)', 'Bakery'],
                    ['nameVi', 'Name (Vietnamese)', 'Tiệm bánh'],
                    ['iconKey', 'Icon key', 'bakery'],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <label key={key} className="block">
                    <span className="text-ink-muted text-xs font-medium">{label}</span>
                    <input
                      value={draft[key]}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, [key]: event.target.value }));
                      }}
                      placeholder={placeholder}
                      className={fieldClass('mt-1 h-10 px-3 text-sm')}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="text-ink-muted text-xs font-medium">Colour</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={draft.colorHex}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, colorHex: event.target.value }));
                      }}
                      className="border-border size-10 shrink-0 rounded-sm border"
                    />
                    <input
                      value={draft.colorHex}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, colorHex: event.target.value }));
                      }}
                      className={fieldClass('h-10 px-3 font-mono text-sm')}
                    />
                  </div>
                </label>
              </div>

              {add.error && (
                <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-2.5 text-sm">
                  {add.error instanceof ApiError ? add.error.message : 'Could not create that.'}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  isLoading={add.isPending}
                  disabled={!draft.slug || !draft.name || !draft.nameVi}
                  onClick={() => {
                    add.mutate();
                  }}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAdding(false);
                    add.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              size="sm"
              className="mb-4"
              leadingIcon={<Plus className="size-4" aria-hidden />}
              onClick={() => {
                setAdding(true);
              }}
            >
              Add category
            </Button>
          )}

          {categories.isPending && <RowSkeleton />}

          <div className="space-y-2.5">
            {parents.map((parent) => {
              const children =
                categories.data?.filter((child) => child.parentId === parent.id) ?? [];

              return (
                <Card key={parent.id}>
                  <CategoryRow
                    category={parent}
                    onToggle={() => {
                      toggleActive.mutate(parent);
                    }}
                    onDelete={() => {
                      setDeleteTarget(parent);
                    }}
                    busy={toggleActive.isPending}
                  />

                  {children.length > 0 && (
                    <ul className="border-border mt-3 space-y-2 border-t pt-3 pl-4">
                      {children.map((child) => (
                        <li key={child.id}>
                          <CategoryRow
                            category={child}
                            onToggle={() => {
                              toggleActive.mutate(child);
                            }}
                            onDelete={() => {
                              setDeleteTarget(child);
                            }}
                            busy={toggleActive.isPending}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === 'demand' && (
        <>
          {insights.isPending && <RowSkeleton />}

          {insights.data && (
            <>
              {/* The one number worth watching: how often search comes back
                  with nothing at all. */}
              <Card className="mb-4">
                <p className="text-ink-muted text-sm">
                  <span className="text-ink text-2xl font-semibold tabular-nums">
                    {Math.round(insights.data.totals.unmetShare * 100)}%
                  </span>{' '}
                  of searches in the last 30 days found nothing —{' '}
                  {insights.data.totals.unmetSearches.toLocaleString()} of{' '}
                  {insights.data.totals.searches.toLocaleString()}.
                </p>
              </Card>

              <h3 className="text-ink mb-2 flex items-center gap-2 text-sm font-semibold">
                <Search className="size-4" aria-hidden />
                Searched for, never found
              </h3>
              <p className="text-ink-subtle mb-3 text-xs">
                What to seed next, in the words of the people who wanted it.
              </p>

              {insights.data.unmet.length === 0 ? (
                <QueueEmpty label="Every search in this window found something." />
              ) : (
                <div className="mb-6 space-y-2">
                  {insights.data.unmet.map((row) => (
                    <Card key={row.query}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-ink text-sm font-medium">{row.query}</p>
                        <p className="text-ink-subtle shrink-0 text-xs tabular-nums">
                          {row.searches}× · <TimeAgo iso={row.lastSearchedAt} />
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <h3 className="text-ink mb-2 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4" aria-hidden />
                Found something
              </h3>
              <div className="space-y-2">
                {insights.data.popular.slice(0, 10).map((row) => (
                  <Card key={row.query}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-ink-muted text-sm">{row.query}</p>
                      <p className="text-ink-subtle shrink-0 text-xs tabular-nums">
                        {row.searches}×
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ReasonDialog
        open={deleteTarget !== null}
        title={`Remove ${deleteTarget?.name ?? ''}?`}
        description="Only possible if nothing uses it. If places are filed under it, retire it instead — they keep their label and it leaves the picker."
        confirmLabel="Remove"
        requireReason={false}
        destructive
        isPending={remove.isPending}
        {...(remove.error instanceof ApiError ? { error: remove.error.message } : {})}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
        onClose={() => {
          setDeleteTarget(null);
          remove.reset();
        }}
      />
    </>
  );
}

function CategoryRow({
  category,
  onToggle,
  onDelete,
  busy,
}: {
  category: AdminCategory;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const inUse = category.placeCount + category.subcategoryPlaceCount;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="size-5 shrink-0 rounded-full"
        style={{ backgroundColor: category.colorHex }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-semibold',
            category.isActive ? 'text-ink' : 'text-ink-subtle',
          )}
        >
          {category.name}
          <span className="text-ink-subtle font-normal"> · {category.nameVi}</span>
          {!category.isActive && (
            <span className="bg-surface-sunken text-ink-subtle ml-2 rounded-full px-2 py-0.5 text-[0.6875rem]">
              Retired
            </span>
          )}
        </p>
        <p className="text-ink-subtle mt-0.5 font-mono text-xs">
          {category.slug} · {inUse} {inUse === 1 ? 'place' : 'places'}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={onToggle}>
          {category.isActive ? 'Retire' : 'Restore'}
        </Button>
        {/* Only offered when it would actually work. A delete button that
            always 409s teaches people to ignore the error. */}
        {inUse === 0 && (
          <Button size="sm" variant="danger" onClick={onDelete}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
