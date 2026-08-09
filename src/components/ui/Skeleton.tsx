import { cn } from '@/lib/utils/cn';

/**
 * Shimmer placeholder.
 *
 * §35: skeletons over spinners. A skeleton tells the user what is arriving and
 * keeps the layout from jumping when it does; a spinner tells them only that
 * something is happening, then reflows the page underneath them.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm bg-surface-sunken',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent',
        className,
      )}
      aria-hidden
    />
  );
}

export function PlaceCardSkeleton() {
  return (
    <div className="w-[16.5rem] shrink-0 rounded-lg bg-surface p-3 shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-sm" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}
