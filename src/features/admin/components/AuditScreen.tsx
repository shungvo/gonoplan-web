'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { Card, PageHeader, QueueEmpty, RowSkeleton, TimeAgo } from './primitives';
import { fetchAuditLog } from '../api';

/** Approvals read as neutral; anything that removes or blocks reads as severe. */
const ACTION_TONE: Record<string, string> = {
  PLACE_APPROVE: 'bg-success/10 text-success',
  REVISION_APPROVE: 'bg-success/10 text-success',
  OWNER_APPROVE: 'bg-success/10 text-success',
  USER_UNBAN: 'bg-success/10 text-success',
  REPORT_RESOLVE: 'bg-primary-tint text-primary',
  REPORT_DISMISS: 'bg-surface-sunken text-ink-muted',
  PLACE_REJECT: 'bg-warning/15 text-warning',
  REVISION_REJECT: 'bg-warning/15 text-warning',
  OWNER_REJECT: 'bg-warning/15 text-warning',
  PLACE_SUSPEND: 'bg-danger/10 text-danger',
  OWNER_SUSPEND: 'bg-danger/10 text-danger',
  PLACE_DELETE: 'bg-danger/10 text-danger',
  REVIEW_DELETE: 'bg-danger/10 text-danger',
  REVIEW_HIDE: 'bg-danger/10 text-danger',
  USER_BAN: 'bg-danger/10 text-danger',
  USER_DELETE: 'bg-danger/10 text-danger',
};

export function AuditScreen() {
  const entries = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => fetchAuditLog() });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only. Every entry was written in the same transaction as the change it describes, so there are no gaps for actions that failed halfway."
      />

      {entries.isPending && <RowSkeleton rows={5} />}
      {entries.data?.length === 0 && <QueueEmpty label="No moderation actions recorded yet." />}

      <Card className="p-0">
        <ul className="divide-border divide-y">
          {entries.data?.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
                  ACTION_TONE[entry.action] ?? 'bg-surface-sunken text-ink-muted',
                )}
              >
                {entry.action.toLowerCase().replace(/_/g, ' ')}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm">
                  <span className="font-medium">{entry.admin.name}</span>
                  <span className="text-ink-muted"> · </span>
                  {/* The label, not the id. The log outlives the rows it
                      describes, and "place ba2c1358" is not evidence anyone
                      can act on months later. */}
                  {entry.target?.href ? (
                    <Link href={entry.target.href} target="_blank" className="hover:text-primary">
                      {entry.target.label}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">
                      {entry.target?.label ?? `${entry.targetType.toLowerCase()} (removed)`}
                    </span>
                  )}
                </p>
                {entry.reason && (
                  <p className="text-ink-muted mt-0.5 text-sm">“{entry.reason}”</p>
                )}
              </div>

              <TimeAgo iso={entry.createdAt} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
