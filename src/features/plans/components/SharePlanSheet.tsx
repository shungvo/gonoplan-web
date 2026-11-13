'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Check, Copy, Download, Link2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { categoryName } from '@/features/categories/name';
import { fullAddress } from '@/features/places/address';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/i18n/format';
import { formatTimeOfDay } from '../time';
import { renderPlanImage } from '../shareImage';
import { useSharePlan, useUnsharePlan } from '../hooks/usePlans';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { showToast } from '@/components/ui/toast';
import { publicOrigin, sharedPlanShareUrl } from '@/lib/navigation/links';
import type { PlanDetail } from '../api';

/**
 * Two ways to hand somebody a day: a link, or a picture.
 *
 * The link leads. It is the one that stays true — move a stop and whoever
 * holds the link sees the move — and it opens to something you can tap
 * through, where a picture is a picture. The image is still here for the chat
 * where a preview matters more than being current, and for anyone who would
 * rather not make their day reachable by URL at all.
 *
 * The picture is built when the sheet opens rather than on the download tap,
 * so the preview is the file — what somebody sees here is exactly what lands
 * in the chat, with no second render that could differ.
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
            /*
             * The full address, not just the area.
             *
             * A shared day is read by somebody who is not holding the app —
             * "Hải Châu" tells them a district, and they still have to look
             * every stop up. The street line is what makes the picture usable
             * on its own.
             */
            address: fullAddress(stop.place),
            meta: categoryName(stop.place.category, locale),
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
    <div className="pb-safe flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4">
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('share.title')}
      </Drawer.Title>

      <ShareLink plan={plan} />

      <h3 className="text-ink mt-6 text-sm font-semibold">{t('share.imageTitle')}</h3>
      <Drawer.Description className="text-ink-muted mt-0.5 text-sm">
        {t('share.body')}
      </Drawer.Description>

      {/* A fixed window onto the picture rather than a flexible one. The link
          panel above changes height when it is switched on, and a preview that
          resized with it made the whole sheet jump. */}
      <div className="border-border bg-surface-sunken mt-3 h-64 shrink-0 overflow-y-auto rounded-md border p-3">
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
        variant="secondary"
        className="mt-3 mb-6 shrink-0"
        disabled={!url}
        leadingIcon={<Download className="size-[1.125rem]" aria-hidden />}
        onClick={download}
      >
        {t('share.download')}
      </Button>
    </div>
  );
}

/**
 * The public link: off, or on with the link in hand.
 *
 * What it costs is said before the button, not after — anyone with the link
 * sees the day and the notes written on it. Somebody who finds that out from
 * a friend quoting their own note back to them has been let down by the
 * screen that made the link.
 */
function ShareLink({ plan }: { plan: PlanDetail }) {
  const t = useT();
  const describeError = useErrorMessage();
  const share = useSharePlan(plan.id);
  const unshare = useUnsharePlan(plan.id);
  const [copied, setCopied] = useState(false);

  const error = share.error ?? unshare.error;

  if (plan.shareToken === null) {
    return (
      <section className="bg-surface-sunken mt-4 rounded-lg p-4">
        <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4" aria-hidden />
          {t('share.linkTitle')}
        </h3>
        <p className="text-ink-muted mt-1 text-sm leading-relaxed">{t('share.linkBody')}</p>

        {error != null && (
          <p role="alert" className="text-danger mt-2 text-sm">
            {describeError(error)}
          </p>
        )}

        <Button
          fullWidth
          className="mt-3"
          isLoading={share.isPending}
          onClick={() => {
            share.mutate(undefined);
          }}
        >
          {t('share.linkCreate')}
        </Button>
      </section>
    );
  }

  const url = sharedPlanShareUrl(publicOrigin(), plan.shareToken);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast({ tone: 'success', messageKey: 'share.linkCopied' });
    } catch {
      // Clipboard access can be refused outright — an insecure origin, a
      // WebView without the permission. The link is on screen and selectable,
      // so there is still a way to take it.
      showToast({ tone: 'error', messageKey: 'share.linkCopyFailed' });
    }
  };

  /*
   * The system share sheet, where there is one.
   *
   * On a phone this is the real feature: it is how the link reaches Zalo or
   * Messages without a paste. Desktop browsers mostly lack it, and there the
   * button is not drawn rather than drawn and dead.
   */
  const canSend = typeof navigator.share === 'function';
  const send = async () => {
    try {
      await navigator.share({ title: plan.title, url });
    } catch {
      // Dismissing the system sheet rejects the promise. That is somebody
      // changing their mind, not an error to report.
    }
  };

  return (
    <section className="bg-surface-sunken mt-4 rounded-lg p-4">
      <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
        <Link2 className="size-4" aria-hidden />
        {t('share.linkTitle')}
        <span className="bg-success/12 text-success text-2xs ml-auto rounded-full px-2 py-0.5 font-semibold">
          {t('share.linkOn')}
        </span>
      </h3>

      {/* Selectable on purpose — the one piece of chrome that is. If copying
          fails, pressing and holding the link is the fallback. */}
      <p className="bg-surface text-ink mt-3 rounded-md px-3 py-2.5 text-xs leading-relaxed break-all select-all">
        {url}
      </p>

      <div className="mt-3 flex gap-2">
        <Button
          fullWidth
          size="sm"
          leadingIcon={
            copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )
          }
          onClick={() => {
            void copy();
          }}
        >
          {t('share.linkCopy')}
        </Button>
        {canSend && (
          <Button
            fullWidth
            size="sm"
            variant="secondary"
            leadingIcon={<Send className="size-4" aria-hidden />}
            onClick={() => {
              void send();
            }}
          >
            {t('share.linkSend')}
          </Button>
        )}
      </div>

      <p className="text-ink-muted mt-3 text-xs leading-relaxed">{t('share.linkBody')}</p>

      {error != null && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {describeError(error)}
        </p>
      )}

      <button
        type="button"
        disabled={unshare.isPending}
        onClick={() => {
          setCopied(false);
          unshare.mutate(undefined);
        }}
        className="text-danger mt-1 flex h-11 items-center text-sm font-medium disabled:opacity-50"
      >
        {t('share.linkStop')}
      </button>
      <p className="text-ink-subtle -mt-1.5 text-xs leading-relaxed">{t('share.linkStopHint')}</p>
    </section>
  );
}
