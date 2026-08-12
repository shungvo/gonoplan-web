'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { fieldClass } from '@/components/ui/field';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import type { TranslateFn } from '@/i18n/translate';
import { cn } from '@/lib/utils/cn';
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  fetchSearchInsights,
  updateCategory,
  type AdminCategory,
} from '../api';
import type { CategoryIconKey } from '@/features/categories/api';
import { Card, CardGrid, PageHeader, QueueEmpty, RowSkeleton, TimeAgo } from './primitives';
import { ReasonDialog } from './ReasonDialog';
import { categorySolid } from '@/features/categories/color';
import { CategoryGlyph } from '@/features/categories/CategoryGlyph';
import { CategoryStyle, type CategoryStyleValue } from './CategoryStyle';

type Tab = 'categories' | 'demand';

interface CategoryDraft {
  slug: string;
  name: string;
  nameVi: string;
  iconKey: CategoryIconKey;
  colorHex: string;
}

/**
 * `iconKey` defaulted to `'map-pin'` and the colour to the old brand blue —
 * neither a value the app can use. There is no `map-pin` shape, so a category
 * created without touching that field drew a grey dot on every one of its pins,
 * and the blue sat outside the palette every other category comes from. Both
 * are now the neutral choice: an honest placeholder that says "not picked yet"
 * beats a wrong one that looks picked.
 *
 * Annotated rather than `satisfies`, which would keep the literal type — then
 * `useState(BLANK)` infers `iconKey: 'dot'` and rejects every other key the
 * picker can set.
 */
const BLANK: CategoryDraft = {
  slug: '',
  name: '',
  nameVi: '',
  iconKey: 'dot',
  colorHex: '#676872',
};

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
  const t = useT();
  const describeError = useErrorMessage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('categories');
  const [draft, setDraft] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  /**
   * The category whose look is being changed, and what it would become.
   *
   * Editing exists because creating was never the whole problem. The icon and
   * colour of a category already in the table could not be changed from here at
   * all — `updateCategory` was only ever sent `isActive` — so a category
   * created through the old free-text form kept its wrong icon permanently. The
   * live table has one: `dating`, at `iconKey: 'heart'`, a shape that does not
   * exist.
   */
  const [styling, setStyling] = useState<({ id: string } & CategoryStyleValue) | null>(null);

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
    // Shown under the form that raised it.
    meta: { inlineError: true },
    mutationFn: () => createCategory(draft),
    onSuccess: async () => {
      setDraft(BLANK);
      setAdding(false);
      await invalidate();
    },
  });

  const restyle = useMutation({
    meta: { inlineError: true },
    mutationFn: ({ id, ...style }: { id: string } & CategoryStyleValue) =>
      updateCategory(id, style),
    onSuccess: async () => {
      setStyling(null);
      await invalidate();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (category: AdminCategory) =>
      updateCategory(category.id, { isActive: !category.isActive }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidate();
    },
  });

  const parents = categories.data?.filter((category) => category.parentId === null) ?? [];

  return (
    <>
      <PageHeader title={t('admin.taxonomy')} description={t('taxonomy.description')} />

      <div className="mb-5 flex gap-2">
        <Chip
          selected={tab === 'categories'}
          onClick={() => {
            setTab('categories');
          }}
        >
          {t('taxonomy.categories')}
        </Chip>
        <Chip
          selected={tab === 'demand'}
          onClick={() => {
            setTab('demand');
          }}
        >
          {t('taxonomy.demand')}
        </Chip>
      </div>

      {tab === 'categories' && (
        <>
          {adding ? (
            <Card className="mb-4">
              <h3 className="text-ink text-sm font-semibold">{t('taxonomy.newCategory')}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['slug', 'taxonomy.slug', 'bakery'],
                    ['name', 'taxonomy.nameEn', 'Bakery'],
                    ['nameVi', 'taxonomy.nameVi', 'Tiệm bánh'],
                  ] as const
                ).map(([key, labelKey, placeholder]) => (
                  <label key={key} className="block">
                    <span className="text-ink-muted text-xs font-medium">{t(labelKey)}</span>
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
              </div>

              <div className="mt-4">
                <CategoryStyle
                  value={draft}
                  onChange={(next) => {
                    setDraft((current) => ({ ...current, ...next }));
                  }}
                  label={draft.nameVi || draft.name || t('taxonomy.newCategory')}
                />
              </div>

              {add.error && (
                <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-2.5 text-sm">
                  {describeError(add.error)}
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
                  {t('taxonomy.create')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAdding(false);
                    add.reset();
                  }}
                >
                  {t('common.cancel')}
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
              {t('taxonomy.addCategory')}
            </Button>
          )}

          {categories.isPending && <RowSkeleton />}

          <CardGrid>
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
                    editing={styling?.id === parent.id ? styling : null}
                    onEdit={() => {
                      setStyling({
                        id: parent.id,
                        iconKey: parent.iconKey,
                        colorHex: parent.colorHex,
                      });
                      restyle.reset();
                    }}
                    onEditChange={(next) => {
                      setStyling({ id: parent.id, ...next });
                    }}
                    onSave={() => {
                      if (styling) restyle.mutate(styling);
                    }}
                    onCancel={() => {
                      setStyling(null);
                      restyle.reset();
                    }}
                    saving={restyle.isPending}
                    saveError={restyle.error}
                    describeError={describeError}
                    t={t}
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
                            editing={styling?.id === child.id ? styling : null}
                            onEdit={() => {
                              setStyling({
                                id: child.id,
                                iconKey: child.iconKey,
                                colorHex: child.colorHex,
                              });
                              restyle.reset();
                            }}
                            onEditChange={(next) => {
                              setStyling({ id: child.id, ...next });
                            }}
                            onSave={() => {
                              if (styling) restyle.mutate(styling);
                            }}
                            onCancel={() => {
                              setStyling(null);
                              restyle.reset();
                            }}
                            saving={restyle.isPending}
                            saveError={restyle.error}
                            describeError={describeError}
                            t={t}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </CardGrid>
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
                  {t('taxonomy.unmetShare', {
                    percent: Math.round(insights.data.totals.unmetShare * 100),
                    unmet: insights.data.totals.unmetSearches,
                    total: insights.data.totals.searches,
                  })}
                </p>
              </Card>

              <h3 className="text-ink mb-2 flex items-center gap-2 text-sm font-semibold">
                <Search className="size-4" aria-hidden />
                {t('taxonomy.unmetTitle')}
              </h3>
              <p className="text-ink-subtle mb-3 text-xs">{t('taxonomy.unmetHint')}</p>

              {insights.data.unmet.length === 0 ? (
                <QueueEmpty label={t('taxonomy.allFound')} />
              ) : (
                <div className="mb-6 space-y-2">
                  {insights.data.unmet.map((row) => (
                    <Card key={row.query}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-ink text-sm font-medium">{row.query}</p>
                        <p className="text-ink-subtle shrink-0 text-xs tabular-nums">
                          {t('taxonomy.searchCount', { count: row.searches })} ·{' '}
                          <TimeAgo iso={row.lastSearchedAt} />
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <h3 className="text-ink mb-2 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4" aria-hidden />
                {t('taxonomy.foundSomething')}
              </h3>
              <div className="space-y-2">
                {insights.data.popular.slice(0, 10).map((row) => (
                  <Card key={row.query}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-ink-muted text-sm">{row.query}</p>
                      <p className="text-ink-subtle shrink-0 text-xs tabular-nums">
                        {t('taxonomy.searchCount', { count: row.searches })}
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
        title={t('taxonomy.removeTitle', { name: deleteTarget?.name ?? '' })}
        description={t('taxonomy.removeBody')}
        confirmLabel={t('common.remove')}
        requireReason={false}
        destructive
        isPending={remove.isPending}
        error={remove.error}
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
  editing,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
  saving,
  saveError,
  describeError,
  t,
}: {
  category: AdminCategory;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
  /** The pending look, while this row is the one being edited. */
  editing: CategoryStyleValue | null;
  onEdit: () => void;
  onEditChange: (next: CategoryStyleValue) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveError: unknown;
  describeError: (error: unknown) => string;
  /* Passed down rather than hooked: this row renders once per category in a
     list the parent already has a translator for. */
  t: TranslateFn;
}) {
  const inUse = category.placeCount + category.subcategoryPlaceCount;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {/*
        The icon in its colour, and the button that changes both.

        A bare colour dot is a legend without a key — it says these eighteen
        things differ without saying how. It is also the control, because the
        thing you want to change is the thing you are looking at.
      */}
        <button
          type="button"
          onClick={editing ? onCancel : onEdit}
          aria-label={t('taxonomy.editStyle', { name: category.name })}
          aria-expanded={editing !== null}
          className={cn(
            'press-surface flex size-7 shrink-0 items-center justify-center rounded-full text-white',
            editing && 'ring-ink ring-offset-surface ring-2 ring-offset-2',
          )}
          style={{ backgroundColor: categorySolid(editing?.colorHex ?? category.colorHex) }}
        >
          <CategoryGlyph
            iconKey={editing?.iconKey ?? category.iconKey}
            className="size-4"
            strokeWidth={2}
          />
        </button>
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
              <span className="bg-surface-sunken text-ink-subtle text-2xs ml-2 rounded-full px-2 py-0.5">
                {t('taxonomy.retired')}
              </span>
            )}
          </p>
          <p className="text-ink-subtle mt-0.5 font-mono text-xs">
            {category.slug} · {t('taxonomy.placeCount', { count: inUse })}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={onToggle}>
            {category.isActive ? t('taxonomy.retire') : t('taxonomy.restore')}
          </Button>
          {/* Only offered when it would actually work. A delete button that
            always 409s teaches people to ignore the error. */}
          {inUse === 0 && (
            <Button size="sm" variant="danger" onClick={onDelete}>
              {t('common.remove')}
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="border-border mt-3 border-t pt-3">
          <CategoryStyle value={editing} onChange={onEditChange} label={category.nameVi} />

          {saveError !== null && (
            <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-2.5 text-sm">
              {describeError(saveError)}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button size="sm" isLoading={saving} onClick={onSave}>
              {t('common.save')}
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
