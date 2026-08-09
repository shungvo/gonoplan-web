import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * §36: an empty result is a designed state, never a blank screen.
 *
 * Each one should say what happened *and* what to do next — "No hidden gems
 * around here yet" plus a way to widen the search beats an empty list, which
 * reads as a broken app.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-8 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-16 items-center justify-center rounded-xl bg-primary-tint text-primary">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
