'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/i18n/format';
import type { TranslateFn } from '@/i18n/translate';
import type { MessageKey } from '@/i18n/messages/keys';
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
  approveOwner,
  approvePlace,
  approveRevision,
  fetchPendingOwners,
  fetchPendingPlaces,
  fetchPendingRevisions,
  fetchReports,
  rejectOwner,
  rejectPlace,
  rejectRevision,
  resolveReport,
  type AdminReport,
} from '../api';

type Tab = 'places' | 'revisions' | 'owners' | 'reports';

const TABS: Array<{ key: Tab; labelKey: MessageKey }> = [
  { key: 'places', labelKey: 'moderation.places' },
  { key: 'revisions', labelKey: 'moderation.revisions' },
  { key: 'owners', labelKey: 'moderation.owners' },
  { key: 'reports', labelKey: 'moderation.reports' },
];

function isTab(value: string | null): value is Tab {
  return value !== null && TABS.some((tab) => tab.key === value);
}

/** The decision a dialog is currently collecting a reason for. */
interface PendingDecision {
  kind: 'reject-place' | 'reject-revision' | 'reject-owner' | 'resolve-report';
  id: string;
  label: string;
  /** Only used by report resolution, where the two outcomes differ. */
  outcome?: 'RESOLVED' | 'DISMISSED';
}

export function ModerationScreen() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  // The tab lives in the URL so a moderator can bookmark the reports queue and
  // so the overview's queue cards can deep-link straight into one.
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'places';

  const [decision, setDecision] = useState<PendingDecision | null>(null);

  const places = useQuery({
    queryKey: ['admin', 'queue', 'places'],
    queryFn: fetchPendingPlaces,
    enabled: tab === 'places',
  });
  const revisions = useQuery({
    queryKey: ['admin', 'queue', 'revisions'],
    queryFn: fetchPendingRevisions,
    enabled: tab === 'revisions',
  });
  const owners = useQuery({
    queryKey: ['admin', 'queue', 'owners'],
    queryFn: fetchPendingOwners,
    enabled: tab === 'owners',
  });
  const reports = useQuery({
    queryKey: ['admin', 'queue', 'reports'],
    queryFn: () => fetchReports('OPEN'),
    enabled: tab === 'reports',
  });

  /**
   * Every decision invalidates the whole `admin` key.
   *
   * Not just its own queue: approving a place changes the overview's counts
   * and the sidebar badge too, and a moderator who sees "3 waiting" over an
   * empty list stops trusting the numbers.
   */
  const invalidateQueues = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  /*
   * Two mutations, because the two halves of this screen report differently.
   *
   * Approving is one tap with nothing on screen to hold a message, so a
   * refusal rides the toast. Rejecting happens inside a dialog that is already
   * covering the page, so its refusal belongs in the dialog — and the dialog
   * stays open, holding the reason the moderator typed.
   *
   * They were one mutation, wired to the dialog. Approving your own submission
   * is refused by the API (§30) and the refusal went nowhere at all: the row
   * stayed in the queue, no message appeared, and the only evidence was a 403
   * in the network tab.
   */
  const act = useMutation({
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: invalidateQueues,
  });

  const decide = useMutation({
    meta: { inlineError: true },
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: async () => {
      setDecision(null);
      await invalidateQueues();
    },
  });

  const run = (fn: () => Promise<unknown>) => {
    act.mutate(fn);
  };

  const confirm = (fn: () => Promise<unknown>) => {
    decide.mutate(fn);
  };

  return (
    <>
      <PageHeader title={t('admin.moderation')} description={t('moderation.description')} />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Chip
            key={item.key}
            selected={tab === item.key}
            onClick={() => {
              router.replace(`/admin/moderation?tab=${item.key}`, { scroll: false });
            }}
          >
            {t(item.labelKey)}
          </Chip>
        ))}
      </div>

      {tab === 'places' && (
        <>
          {places.isPending && <RowSkeleton />}
          {places.data?.length === 0 && <QueueEmpty label={t('moderation.noPlaces')} />}

          <CardGrid>
            {places.data?.map((place) => (
              <Card key={place.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* See ContentScreen: a bare `min-w-0` block is sized by its
                      content, so the link beside it moved from card to card. */}
                  <div className="min-w-0 flex-1 basis-56">
                    <h3 className="text-ink font-semibold">{place.name}</h3>
                    <p className="text-ink-muted mt-0.5 flex items-center gap-1.5 text-sm">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {place.address ?? t('moderation.noAddress')}
                    </p>
                    <p className="text-ink-subtle mt-1 text-xs">
                      {place.category.name} · {t('moderation.submittedBy')}{' '}
                      {place.submittedBy?.name ?? t('moderation.removedAccountBy')} ·{' '}
                      <TimeAgo iso={place.createdAt} />
                    </p>
                  </div>

                  <a
                    href={`https://www.google.com/maps?q=${String(place.latitude)},${String(place.longitude)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                  >
                    {t('moderation.checkLocation')}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>

                {place.description && (
                  <p className="text-ink-muted bg-surface-sunken mt-3 rounded-md p-3 text-sm leading-relaxed">
                    {place.description}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    isLoading={act.isPending}
                    onClick={() => {
                      run(() => approvePlace(place.id));
                    }}
                  >
                    {t('moderation.approvePublish')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDecision({ kind: 'reject-place', id: place.id, label: place.name });
                    }}
                  >
                    {t('moderation.reject')}
                  </Button>
                </div>
              </Card>
            ))}
          </CardGrid>
        </>
      )}

      {tab === 'revisions' && (
        <>
          {revisions.isPending && <RowSkeleton />}
          {revisions.data?.length === 0 && <QueueEmpty label={t('moderation.noRevisions')} />}

          <CardGrid>
            {revisions.data?.map((revision) => (
              <Card key={revision.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* This one had no `min-w-0` at all, so a long place name
                      could not shrink even to the card's width. */}
                  <div className="min-w-0 flex-1 basis-56">
                    <h3 className="text-ink font-semibold">{revision.place.name}</h3>
                    <p className="text-ink-subtle mt-0.5 text-xs">
                      {t('moderation.proposedBy', {
                        name: revision.submittedBy?.name ?? t('moderation.removedAccountBy'),
                      })}{' '}
                      · <TimeAgo iso={revision.createdAt} />
                    </p>
                  </div>
                  <Link
                    href={`/place/${revision.place.slug}`}
                    target="_blank"
                    className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                  >
                    {t('moderation.seeListing')}
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </div>

                {/* The proposed values only. The live listing is one click away,
                  and rendering a red/green diff of every field would be mostly
                  unchanged rows. */}
                <dl className="border-border mt-3 divide-y rounded-md border text-sm">
                  {Object.entries(revision.payload).map(([field, value]) => (
                    <div key={field} className="flex gap-4 px-3 py-2">
                      <dt className="text-ink-subtle w-32 shrink-0 text-xs">{field}</dt>
                      <dd className="text-ink min-w-0 flex-1 break-words">
                        {typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value as string | number | boolean)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    isLoading={act.isPending}
                    onClick={() => {
                      run(() => approveRevision(revision.id));
                    }}
                  >
                    {t('moderation.applyChanges')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDecision({
                        kind: 'reject-revision',
                        id: revision.id,
                        label: revision.place.name,
                      });
                    }}
                  >
                    {t('moderation.discard')}
                  </Button>
                </div>
              </Card>
            ))}
          </CardGrid>
        </>
      )}

      {tab === 'owners' && (
        <>
          {owners.isPending && <RowSkeleton />}
          {owners.data?.length === 0 && <QueueEmpty label={t('moderation.noOwners')} />}

          <CardGrid>
            {owners.data?.map((owner) => (
              <Card key={owner.id}>
                <h3 className="text-ink font-semibold">{owner.businessName}</h3>
                <p className="text-ink-muted mt-0.5 text-sm">
                  {owner.user.name} · {owner.user.email}
                </p>
                <p className="text-ink-subtle mt-1 text-xs">
                  {t('moderation.applied')} <TimeAgo iso={owner.createdAt} /> ·{' '}
                  {t('moderation.ownerMetaRest', {
                    joined: formatDate(owner.user.joinedAt, locale),
                    places: owner.placeCount,
                    documents: owner.documentCount,
                  })}
                </p>

                <dl className="text-ink-muted mt-3 space-y-1 text-sm">
                  {owner.businessEmail && (
                    <dd>{t('moderation.contact', { value: owner.businessEmail })}</dd>
                  )}
                  {owner.businessPhone && (
                    <dd>{t('moderation.phone', { value: owner.businessPhone })}</dd>
                  )}
                  {owner.taxId && <dd>{t('moderation.taxId', { value: owner.taxId })}</dd>}
                </dl>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    isLoading={act.isPending}
                    onClick={() => {
                      run(() => approveOwner(owner.id));
                    }}
                  >
                    {t('moderation.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDecision({
                        kind: 'reject-owner',
                        id: owner.id,
                        label: owner.businessName,
                      });
                    }}
                  >
                    {t('moderation.reject')}
                  </Button>
                </div>
              </Card>
            ))}
          </CardGrid>
        </>
      )}

      {tab === 'reports' && (
        <>
          {reports.isPending && <RowSkeleton />}
          {reports.data?.length === 0 && <QueueEmpty label={t('moderation.noReports')} />}

          <CardGrid>
            {reports.data?.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDecide={(outcome) => {
                  setDecision({
                    kind: 'resolve-report',
                    id: report.id,
                    label: report.target?.label ?? t('moderation.thisReport'),
                    outcome,
                  });
                }}
              />
            ))}
          </CardGrid>
        </>
      )}

      <ReasonDialog
        open={decision !== null}
        title={decisionTitle(t, decision)}
        description={decisionDescription(t, decision)}
        confirmLabel={decisionConfirm(t, decision)}
        destructive={decision?.kind !== 'resolve-report'}
        placeholder={
          decision?.kind === 'resolve-report'
            ? t('moderation.resolvePlaceholder')
            : t('admin.reasonPlaceholder')
        }
        isPending={decide.isPending}
        error={decide.error}
        onConfirm={(reason) => {
          if (!decision) return;

          switch (decision.kind) {
            case 'reject-place':
              confirm(() => rejectPlace(decision.id, reason));
              break;
            case 'reject-revision':
              confirm(() => rejectRevision(decision.id, reason));
              break;
            case 'reject-owner':
              confirm(() => rejectOwner(decision.id, reason));
              break;
            case 'resolve-report':
              confirm(() => resolveReport(decision.id, decision.outcome ?? 'RESOLVED', reason));
              break;
          }
        }}
        onClose={() => {
          setDecision(null);
          decide.reset();
        }}
      />
    </>
  );
}

function ReportCard({
  report,
  onDecide,
}: {
  report: AdminReport;
  onDecide: (outcome: 'RESOLVED' | 'DISMISSED') => void;
}) {
  const t = useT();

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            {/* The reason and the target type are enum values, not prose, so
                they go through the catalogue like every other one. They were
                rendered raw — `toLowerCase()` is a translation strategy that
                works in exactly one language, and this queue is meant to be
                readable in two. */}
            <span className="bg-surface-sunken text-ink-muted inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold">
              {t(`reportReason.${report.reason}`)}
            </span>
            <span className="text-ink-subtle text-xs">
              {t(`moderation.targetType.${report.targetType}`)} · <TimeAgo iso={report.createdAt} />
            </span>
            {report.openReportsOnTarget > 1 && (
              <span className="bg-danger/10 text-danger rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold">
                {t('moderation.openReports', { count: report.openReportsOnTarget })}
              </span>
            )}
          </div>

          {/* Null when the target was deleted after the report was filed. The
              row still has to render and still has to be resolvable. */}
          <h3 className="text-ink mt-2 font-semibold">
            {report.target?.label ?? t('moderation.targetGone')}
          </h3>
          {report.target?.detail && (
            <p className="text-ink-muted mt-0.5 line-clamp-2 text-sm">{report.target.detail}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {report.target?.status && <StatusBadge status={report.target.status} />}
          {report.target?.href && (
            <Link
              href={report.target.href}
              target="_blank"
              className="text-primary inline-flex items-center gap-1 text-xs font-medium"
            >
              {t('admin.open')}
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {report.description && (
        <p className="bg-surface-sunken text-ink-muted mt-3 rounded-md p-3 text-sm leading-relaxed">
          “{report.description}”
        </p>
      )}

      <p className="text-ink-subtle mt-2 text-xs">
        {t('moderation.reportedBy', {
          name: report.reporter?.name ?? t('moderation.removedAccount'),
        })}
      </p>

      {/* Resolving does nothing to the target by design — the moderator acts
          on the listing itself, then records what they did here. */}
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            onDecide('RESOLVED');
          }}
        >
          {t('moderation.markHandled')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onDecide('DISMISSED');
          }}
        >
          {t('moderation.dismiss')}
        </Button>
      </div>
    </Card>
  );
}

// `t` is threaded in rather than these becoming hooks: they are pure mappings
// from a decision to a sentence, and a hook here would force the dialog's
// three strings to be recomputed inside the component that already has them.
function decisionTitle(t: TranslateFn, decision: PendingDecision | null): string {
  switch (decision?.kind) {
    case 'reject-place':
      return t('moderation.rejectPlaceTitle', { label: decision.label });
    case 'reject-revision':
      return t('moderation.rejectRevisionTitle', { label: decision.label });
    case 'reject-owner':
      return t('moderation.rejectOwnerTitle', { label: decision.label });
    case 'resolve-report':
      return decision.outcome === 'DISMISSED'
        ? t('moderation.dismissReportTitle')
        : t('moderation.resolveReportTitle');
    default:
      return '';
  }
}

function decisionDescription(t: TranslateFn, decision: PendingDecision | null): string {
  switch (decision?.kind) {
    case 'reject-place':
      return t('moderation.rejectPlaceBody');
    case 'reject-revision':
      return t('moderation.rejectRevisionBody');
    case 'reject-owner':
      return t('moderation.rejectOwnerBody');
    case 'resolve-report':
      return t('moderation.resolveReportBody');
    default:
      return '';
  }
}

function decisionConfirm(t: TranslateFn, decision: PendingDecision | null): string {
  switch (decision?.kind) {
    case 'reject-revision':
      return t('moderation.rejectRevisionConfirm');
    case 'resolve-report':
      return decision.outcome === 'DISMISSED'
        ? t('moderation.dismiss')
        : t('moderation.markHandled');
    default:
      return t('moderation.reject');
  }
}
