'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from 'vaul';
import { Building2, LoaderCircle, MapPin, Navigation, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { errorToast, showToast } from '@/components/ui/toast';
import { resolveAddress, suggestAddresses } from '@/features/geo/api';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useT } from '@/i18n/I18nProvider';
import { searchCities, type City } from '../cities';
import { useLocationStore } from '../store';

interface LocationPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Long enough not to fire a metered lookup per keystroke. */
const DEBOUNCE_MS = 350;

/** The API's own floor: below two characters a suggestion is about the country. */
const MIN_INPUT = 2;

/**
 * `crypto.randomUUID` needs a secure context, which a plain-HTTP LAN address is
 * not. No token loses the provider's session billing and keeps the search
 * working, which is the right way round.
 */
function newSessionToken(): string | undefined {
  return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : undefined;
}

/**
 * Choosing where you are looking from.
 *
 * This started as a city list for the case where GPS was refused, and it stayed
 * a city list — which answers the wrong question. Somebody in Gò Vấp planning
 * an evening in District 1 is not lost and has not refused anything; they want
 * results around a point that is not where they are standing, and a list of
 * fifteen cities cannot express that. So the same sheet now searches real
 * addresses through the geocoder, with the cities kept as the offline
 * shortcut they were built to be.
 *
 * Cities are matched locally and appear instantly; addresses come from the
 * network. Both are offered at once rather than behind a toggle, because
 * "Đà Nẵng" and "72 Lê Thánh Tôn" are the same intent typed at two
 * granularities.
 */
export function LocationPickerSheet({ open, onOpenChange }: LocationPickerSheetProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [resolvingRef, setResolvingRef] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState(newSessionToken);

  const { status, coordinates, setManualLocation, requestLocation } = useLocationStore();

  const cannotLocate = status === 'UNAVAILABLE' || status === 'TIMEOUT';

  const debounced = useDebouncedValue(query, DEBOUNCE_MS);
  const typed = debounced.trim();
  const searchingAddresses = typed.length >= MIN_INPUT;

  const suggestions = useQuery({
    queryKey: ['geo', 'autocomplete', typed],
    queryFn: () =>
      suggestAddresses({
        input: typed,
        // Biased towards wherever the reader already is, which is what makes
        // "Lê Lợi" mean the one in their city rather than the one 900km away.
        ...(coordinates ? { near: coordinates } : {}),
        ...(sessionToken ? { sessionToken } : {}),
      }),
    enabled: open && searchingAddresses,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const cities = searchCities(query);
  const addresses = searchingAddresses ? (suggestions.data ?? []) : [];

  const close = () => {
    onOpenChange(false);
    setQuery('');
  };

  /**
   * Stays open when the browser says no.
   *
   * Closing regardless would dismiss the one screen still offering a way
   * forward, on the strength of a request that failed — and browsers remember
   * a refusal, so the retry that just failed will keep failing. The cities are
   * right there underneath.
   */
  const switchToCurrentLocation = async () => {
    await requestLocation();
    if (useLocationStore.getState().status === 'GRANTED') close();
  };

  const chooseCity = (city: City) => {
    setManualLocation({ latitude: city.latitude, longitude: city.longitude }, city.name);
    close();
  };

  const chooseAddress = async (ref: string, label: string) => {
    setResolvingRef(ref);

    try {
      const address = await resolveAddress({
        ref,
        ...(sessionToken ? { sessionToken } : {}),
      });

      /*
       * The suggestion's own short name, not the resolved `formatted`.
       *
       * A geocoder's formatted address runs to the country — "…, Phường Bến
       * Nghé, Quận 1, Thành phố Hồ Chí Minh, 70000, Việt Nam" — and this label
       * goes in a chip at the top of the home screen. What the person tapped
       * is what they will recognise.
       */
      setManualLocation({ latitude: address.latitude, longitude: address.longitude }, label);
      close();
    } catch (error) {
      /*
       * Said out loud. This is a plain call rather than a mutation, so the
       * global handler that reports every failed write never sees it — and a
       * suggestion that does nothing when tapped is the exact failure that
       * handler exists to prevent.
       *
       * The sheet stays open, so the next suggestion is one tap away instead
       * of a re-typed query.
       */
      showToast(errorToast(error));
    } finally {
      setResolvingRef(null);
      // One choice has ended; the next gets its own billing session.
      setSessionToken(newSessionToken());
    }
  };

  const showEmpty =
    searchingAddresses &&
    !suggestions.isFetching &&
    addresses.length === 0 &&
    cities.length === 0;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} className="h-[82dvh]">
      <div className="px-5 pt-4 pb-3">
        <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
          {t('city.title')}
        </Drawer.Title>
        {/* Three sentences for three situations. Telling somebody who chose to
            open this that "we could not find you automatically" is a
            explanation for a problem they do not have. */}
        <Drawer.Description className="text-ink-muted mt-1 text-sm leading-relaxed">
          {status === 'DENIED'
            ? t('city.deniedDescription')
            : cannotLocate
              ? t('city.unavailableDescription')
              : t('location.pickDescription')}
        </Drawer.Description>
      </div>

      {/* Always offered, not only after a refusal. Somebody who moved the
          search to another district needs the way back to be as easy as the
          way out. */}
      <div className="px-5 pb-3">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          leadingIcon={<Navigation className="size-4" aria-hidden />}
          onClick={() => {
            void switchToCurrentLocation();
          }}
        >
          {/* After a refusal the honest word is "again" — the browser has
              already been asked once and remembers the answer. */}
          {status === 'DENIED' ? t('city.retry') : t('location.useCurrent')}
        </Button>
      </div>

      <div className="px-5 pb-3">
        <div className="bg-surface-sunken flex h-12 items-center gap-2.5 rounded-md px-3.5">
          <Search className="text-ink-subtle size-4 shrink-0" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value.slice(0, 200));
            }}
            placeholder={t('location.searchPlaceholder')}
            aria-label={t('location.searchPlaceholder')}
            className="text-ink placeholder:text-ink-subtle w-full bg-transparent text-md outline-none"
          />
          {suggestions.isFetching && (
            <LoaderCircle className="text-ink-subtle size-4 shrink-0 animate-spin" aria-hidden />
          )}
        </div>
      </div>

      <div className="pb-safe flex-1 overflow-y-auto overscroll-contain px-5">
        {showEmpty && (
          <p className="text-ink-muted py-10 text-center text-sm">
            {t('location.noMatch', { query })}
          </p>
        )}

        <ul className="pb-6">
          {cities.length > 0 && (
            <>
              {searchingAddresses && <Heading>{t('location.cities')}</Heading>}
              {cities.map((city) => (
                <li key={city.slug}>
                  <Row
                    icon={<Building2 className="size-5" aria-hidden />}
                    primary={city.name}
                    secondary={city.nameVi}
                    onClick={() => {
                      chooseCity(city);
                    }}
                  />
                </li>
              ))}
            </>
          )}

          {addresses.length > 0 && (
            <>
              <Heading>{t('location.addresses')}</Heading>
              {addresses.map((option) => (
                <li key={option.ref}>
                  <Row
                    icon={
                      resolvingRef === option.ref ? (
                        <LoaderCircle className="size-5 animate-spin" aria-hidden />
                      ) : (
                        <MapPin className="size-5" aria-hidden />
                      )
                    }
                    primary={option.primary}
                    secondary={option.secondary}
                    disabled={resolvingRef !== null}
                    onClick={() => {
                      void chooseAddress(option.ref, option.primary);
                    }}
                  />
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-ink-subtle px-1 pt-3 pb-1 text-xs font-semibold" aria-hidden>
      {children}
    </li>
  );
}

function Row({
  icon,
  primary,
  secondary,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string | null | undefined;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors active:bg-surface-sunken disabled:opacity-50"
    >
      <span className="bg-primary-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-sm">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="text-ink block truncate text-md font-medium">{primary}</span>
        {secondary && (
          <span className="text-ink-muted block truncate text-sm">{secondary}</span>
        )}
      </span>
    </button>
  );
}
