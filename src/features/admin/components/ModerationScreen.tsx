'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Card, PageHeader, QueueEmpty, RowSkeleton, StatusBadge, TimeAgo } from './primitives';
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

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'places', label: 'Places' },
  { key: 'revisions', label: 'Edits' },
  { key: 'owners', label: 'Businesses' },
  { key: 'reports', label: 'Reports' },
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
  const act = useMutation({
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: async () => {
      setDecision(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const run = (fn: () => Promise<unknown>) => {
    act.mutate(fn);
  };

  return (
    <>
      <PageHeader title="Moderation" description="Oldest first. Every decision is audited." />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Chip
            key={item.key}
            selected={tab === item.key}
            onClick={() => {
              router.replace(`/admin/moderation?tab=${item.key}`, { scroll: false });
            }}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {tab === 'places' && (
        <div className="space-y-3">
          {places.isPending && <RowSkeleton />}
          {places.data?.length === 0 && <QueueEmpty label="No places waiting for review." />}

          {places.data?.map((place) => (
            <Card key={place.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-ink font-semibold">{place.name}</h3>
                  <p className="text-ink-muted mt-0.5 flex items-center gap-1.5 text-sm">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {place.address ?? 'No address given'}
                  </p>
                  <p className="text-ink-subtle mt-1 text-xs">
                    {place.category.name} · submitted by{' '}
                    {place.submittedBy?.name ?? 'a removed account'} ·{' '}
                    <TimeAgo iso={place.createdAt} />
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${String(place.latitude)},${String(place.longitude)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                >
                  Check the location
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
                  Approve and publish
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDecision({ kind: 'reject-place', id: place.id, label: place.name });
                  }}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'revisions' && (
        <div className="space-y-3">
          {revisions.isPending && <RowSkeleton />}
          {revisions.data?.length === 0 && <QueueEmpty label="No proposed edits waiting." />}

          {revisions.data?.map((revision) => (
            <Card key={revision.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-ink font-semibold">{revision.place.name}</h3>
                  <p className="text-ink-subtle mt-0.5 text-xs">
                    Proposed by {revision.submittedBy?.name ?? 'a removed account'} ·{' '}
                    <TimeAgo iso={revision.createdAt} />
                  </p>
                </div>
                <Link
                  href={`/place/${revision.place.slug}`}
                  target="_blank"
                  className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                >
                  See the live listing
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
                  Apply the changes
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
                  Discard
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'owners' && (
        <div className="space-y-3">
          {owners.isPending && <RowSkeleton />}
          {owners.data?.length === 0 && <QueueEmpty label="No businesses waiting for approval." />}

          {owners.data?.map((owner) => (
            <Card key={owner.id}>
              <h3 className="text-ink font-semibold">{owner.businessName}</h3>
              <p className="text-ink-muted mt-0.5 text-sm">
                {owner.user.name} · {owner.user.email}
              </p>
              <p className="text-ink-subtle mt-1 text-xs">
                Applied <TimeAgo iso={owner.createdAt} /> · account joined{' '}
                {new Date(owner.user.joinedAt).toLocaleDateString()} · {owner.placeCount} places ·{' '}
                {owner.documentCount} documents
              </p>

              <dl className="text-ink-muted mt-3 space-y-1 text-sm">
                {owner.businessEmail && <dd>Contact: {owner.businessEmail}</dd>}
                {owner.businessPhone && <dd>Phone: {owner.businessPhone}</dd>}
                {owner.taxId && <dd>Tax ID: {owner.taxId}</dd>}
              </dl>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  isLoading={act.isPending}
                  onClick={() => {
                    run(() => approveOwner(owner.id));
                  }}
                >
                  Approve
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
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.isPending && <RowSkeleton />}
          {reports.data?.length === 0 && <QueueEmpty label="No open reports." />}

          {reports.data?.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDecide={(outcome) => {
                setDecision({
                  kind: 'resolve-report',
                  id: report.id,
                  label: report.target?.label ?? 'this report',
                  outcome,
                });
              }}
            />
          ))}
        </div>
      )}

      <ReasonDialog
        open={decision !== null}
        title={decisionTitle(decision)}
        description={decisionDescription(decision)}
        confirmLabel={decisionConfirm(decision)}
        destructive={decision?.kind !== 'resolve-report'}
        placeholder={
          decision?.kind === 'resolve-report'
            ? 'What did you do about it? Only other moderators see this.'
            : 'Explain the decision. The person affected will see this.'
        }
        isPending={act.isPending}
        error={act.error}
        onConfirm={(reason) => {
          if (!decision) return;

          switch (decision.kind) {
            case 'reject-place':
              run(() => rejectPlace(decision.id, reason));
              break;
            case 'reject-revision':
              run(() => rejectRevision(decision.id, reason));
              break;
            case 'reject-owner':
              run(() => rejectOwner(decision.id, reason));
              break;
            case 'resolve-report':
              run(() => resolveReport(decision.id, decision.outcome ?? 'RESOLVED', reason));
              break;
          }
        }}
        onClose={() => {
          setDecision(null);
          act.reset();
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
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.reason} />
            <span className="text-ink-subtle text-xs">
              {report.targetType.toLowerCase()} · <TimeAgo iso={report.createdAt} />
            </span>
            {report.openReportsOnTarget > 1 && (
              <span className="bg-danger/10 text-danger rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold">
                {report.openReportsOnTarget} open reports on this target
              </span>
            )}
          </div>

          {/* Null when the target was deleted after the report was filed. The
              row still has to render and still has to be resolvable. */}
          <h3 className="text-ink mt-2 font-semibold">
            {report.target?.label ?? 'Target no longer exists'}
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
              Open
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
        Reported by {report.reporter?.name ?? 'a removed account'}
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
          Mark handled
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onDecide('DISMISSED');
          }}
        >
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

function decisionTitle(decision: PendingDecision | null): string {
  switch (decision?.kind) {
    case 'reject-place':
      return `Reject “${decision.label}”`;
    case 'reject-revision':
      return `Discard the edit to “${decision.label}”`;
    case 'reject-owner':
      return `Reject ${decision.label}`;
    case 'resolve-report':
      return decision.outcome === 'DISMISSED' ? 'Dismiss this report' : 'Mark this report handled';
    default:
      return '';
  }
}

function decisionDescription(decision: PendingDecision | null): string {
  switch (decision?.kind) {
    case 'reject-place':
      return 'The submitter sees this reason and can fix and resubmit. Nothing is deleted.';
    case 'reject-revision':
      return 'The live listing is untouched — only the proposed change is discarded.';
    case 'reject-owner':
      return 'They can correct the details and resubmit, which returns the application to the queue.';
    case 'resolve-report':
      return 'This closes the report. It does not change the reported content — do that on the listing itself first.';
    default:
      return '';
  }
}

function decisionConfirm(decision: PendingDecision | null): string {
  switch (decision?.kind) {
    case 'reject-revision':
      return 'Discard the edit';
    case 'resolve-report':
      return decision.outcome === 'DISMISSED' ? 'Dismiss' : 'Mark handled';
    default:
      return 'Reject';
  }
}
