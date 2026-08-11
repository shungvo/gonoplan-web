'use client';

import { useRouter } from 'next/navigation';
import { MapPinPlus, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';

/**
 * What an area with nothing in it should say.
 *
 * The honest reading of an empty result here is not "you chose badly" — it is
 * that nobody has added this part of the map yet. Gonoplan's catalogue is the
 * one people using it have built, so an empty area is an invitation rather
 * than a dead end, and this is where that invitation belongs: at the exact
 * moment somebody has looked and found nothing.
 *
 * Two ways out, in the order they are likely to be wanted. Adding a place
 * leads, because it is the one that makes the area less empty for whoever
 * looks next. Moving the search is second, because it is what most people will
 * actually do — but offering only that says the app has nothing for them here
 * and never will.
 */
export function NothingNearby({
  onChangeLocation,
  className,
}: {
  onChangeLocation: () => void;
  className?: string;
}) {
  const t = useT();
  const router = useRouter();

  return (
    <EmptyState
      className={className}
      icon={<MapPinPlus className="size-7" aria-hidden />}
      title={t('nearby.emptyTitle')}
      description={t('nearby.emptyBody')}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            leadingIcon={<MapPinPlus className="size-4" aria-hidden />}
            onClick={() => {
              router.push('/places/new');
            }}
          >
            {t('nearby.addPlace')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Navigation className="size-4" aria-hidden />}
            onClick={onChangeLocation}
          >
            {t('nearby.changeLocation')}
          </Button>
        </div>
      }
    />
  );
}
