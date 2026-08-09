'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, LoaderCircle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

interface HealthReport {
  status: 'ok' | 'degraded';
  environment: string;
  checks: {
    database: {
      reachable: boolean;
      latencyMs: number | null;
      postgisVersion: string | null;
    };
  };
}

/**
 * Phase 1 scaffolding check — removed once real features land.
 *
 * It earns its place for now by exercising the whole client path end to end:
 * the same-origin rewrite proxy, the typed API client, the response envelope
 * and TanStack Query. If this renders green, the plumbing is real.
 */
export function ApiStatus() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthReport>('/health/ready', { withAuth: false }),
    staleTime: 30_000,
  });

  const tone = isPending
    ? 'pending'
    : isError || data?.status !== 'ok'
      ? 'error'
      : 'ok';

  const Icon = tone === 'pending' ? LoaderCircle : tone === 'ok' ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-sm',
        tone === 'ok' && 'border-success/20 bg-success/5',
        tone === 'error' && 'border-danger/20 bg-danger/5',
        tone === 'pending' && 'border-border bg-surface',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          tone === 'ok' && 'text-success',
          tone === 'error' && 'text-danger',
          tone === 'pending' && 'animate-spin text-ink-subtle',
        )}
        aria-hidden
      />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-ink">
          {tone === 'pending'
            ? 'Checking API…'
            : tone === 'ok'
              ? 'API connected'
              : 'API unreachable'}
        </p>
        <p className="mt-0.5 text-ink-muted">
          {isError
            ? error.message
            : data
              ? `PostGIS ${data.checks.database.postgisVersion?.split(' ')[0] ?? '—'} · ${String(data.checks.database.latencyMs ?? 0)}ms · ${data.environment}`
              : 'Proxying /api/v1 → Express'}
        </p>
      </div>
    </div>
  );
}
