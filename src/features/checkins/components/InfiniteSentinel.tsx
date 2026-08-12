'use client';

import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';

/**
 * Loads the next page when it scrolls into view.
 *
 * A callback ref rather than an effect: it needs the laid-out node, and this
 * runs the moment React attaches it. Returning the disconnect makes React 19
 * tear the observer down when the node goes — an effect with a ref would need
 * a dependency on something that is null on the first render.
 *
 * `rootMargin: 400px` so the fetch starts a screen before the sentinel is
 * visible. Waiting for it to actually appear means a spinner every time, which
 * is the thing infinite scroll exists to avoid.
 *
 * ─── The button is not a fallback, it is the failure path ─────────────────
 *
 * When a page fails, auto-loading has nowhere to go: the observer has already
 * fired and will not fire again without a scroll, so the list would simply
 * stop with no explanation. That is when a control has to appear, and it is
 * the only time — an always-visible "load more" beside an observer is two
 * mechanisms racing for the same job.
 */
export function InfiniteSentinel({
  hasMore,
  isLoading,
  isError,
  onLoad,
}: {
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  onLoad: () => void;
}) {
  const t = useT();

  const observe = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) onLoad();
        },
        { rootMargin: '400px' },
      );
      observer.observe(node);

      return () => {
        observer.disconnect();
      };
    },
    [onLoad],
  );

  if (!hasMore) return null;

  if (isError) {
    return (
      <div className="px-5 py-6">
        <Button
          fullWidth
          variant="secondary"
          onClick={() => {
            onLoad();
          }}
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div ref={observe} className="flex justify-center py-8" aria-live="polite">
      {isLoading && (
        <>
          <Loader2 className="text-ink-subtle size-5 animate-spin" aria-hidden />
          <span className="sr-only">{t('common.loading')}</span>
        </>
      )}
    </div>
  );
}
