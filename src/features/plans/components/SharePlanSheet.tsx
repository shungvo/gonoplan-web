'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { categoryName } from '@/features/categories/name';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/i18n/format';
import { formatTimeOfDay } from '../time';
import { renderPlanImage } from '../shareImage';
import type { PlanDetail } from '../api';

/**
 * The plan as a picture.
 *
 * Built when the sheet opens rather than on the download tap, so the preview
 * is the file — what somebody sees here is exactly what lands in the chat, with
 * no second render that could differ.
 */
export function SharePlanSheet({
  plan,
  open,
  onOpenChange,
}: {
  plan: PlanDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} className="h-[82dvh]">
      {open && <ShareBody plan={plan} />}
    </BottomSheet>
  );
}

function ShareBody({ plan }: { plan: PlanDetail }) {
  const t = useT();
  const locale = useLocale();

  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const build = async () => {
      try {
        const blob = await renderPlanImage({
          title: plan.title,
          subtitle: plan.date
            ? formatDate(plan.date, locale)
            : t('plans.stopCount', { count: plan.stops.length }),
          stops: plan.stops.map((stop) => ({
            time:
              stop.startsAtMin === null
                ? ''
                : stop.endsAtMin === null
                  ? formatTimeOfDay(stop.startsAtMin, locale)
                  : `${formatTimeOfDay(stop.startsAtMin, locale)} – ${formatTimeOfDay(stop.endsAtMin, locale)}`,
            name: stop.place.name,
            meta: `${categoryName(stop.place.category, locale)} · ${stop.place.district ?? stop.place.province}`,
          })),
          footer: 'Gonoplan',
        });

        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void build();

    return () => {
      cancelled = true;
      // Object URLs pin the blob in memory until they are revoked, and this
      // sheet can be opened as many times as somebody edits the day.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [plan, locale, t]);

  const download = () => {
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    // Named after the day so a phone's downloads folder stays readable.
    link.download = `${plan.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`;
    link.click();
  };

  return (
    <div className="pb-safe flex min-h-0 flex-1 flex-col px-5 pt-4">
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('share.title')}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {t('share.body')}
      </Drawer.Description>

      <div className="border-border bg-surface-sunken mt-4 min-h-0 flex-1 overflow-y-auto rounded-md border p-3">
        {failed && <p className="text-danger py-10 text-center text-sm">{t('share.failed')}</p>}

        {!failed && !url && (
          <p className="text-ink-muted flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('share.building')}
          </p>
        )}

        {url && (
          // Plain `img`: this is a blob that exists only in this tab, so
          // there is nothing for next/image's optimiser to fetch or cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={t('share.imageAlt')} className="w-full rounded-sm" />
        )}
      </div>

      <Button
        fullWidth
        size="lg"
        className="mt-4 mb-6"
        disabled={!url}
        leadingIcon={<Download className="size-[1.125rem]" aria-hidden />}
        onClick={download}
      >
        {t('share.download')}
      </Button>
    </div>
  );
}
