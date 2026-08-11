'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Crosshair, MapPin, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { fieldClass } from '@/components/ui/field';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PhotoPicker, type PickedPhoto } from '@/features/uploads/components/PhotoPicker';
import { MapCanvas } from '@/features/map/components/MapCanvas';
import { AddressAutocomplete } from '@/features/geo/components/AddressAutocomplete';
import { reverseGeocodeOrNull, type Address } from '@/features/geo/api';
import { fetchCategories } from '@/features/categories/api';
import { useLocationStore } from '@/features/location/store';
import { useSessionStore } from '@/features/auth/store';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { categoryName } from '@/features/categories/name';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { submitPlace, PRICE_RANGES, type PriceRange } from '../api';

const DESCRIPTION_MAX = 2000;

/** Ho Chi Minh City, for the pin's starting position with no location. */
const FALLBACK = { latitude: 10.7769, longitude: 106.7009 };

/**
 * Long enough that the lookup waits for the map to settle rather than firing
 * once per frame of a pan.
 */
const PIN_SETTLE_MS = 700;

/**
 * What goes in the address field once a geocoder has answered.
 *
 * The street line when the provider gave one, because ward, district and
 * province each have their own field and repeating them here is how a listing
 * ends up reading "…, Quận 1, Hồ Chí Minh, Quận 1, Hồ Chí Minh". The whole
 * line when it did not, which is the honest fallback rather than a guess at
 * where to cut.
 */
function addressLine(found: Address): string {
  return found.street ?? found.formatted;
}

function Field({
  label,
  hint,
  required,
  optionalLabel,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** Passed in rather than translated here: `Field` is not a hook consumer. */
  optionalLabel: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="mt-5">
      <label htmlFor={htmlFor} className="text-ink block text-sm font-semibold">
        {label}
        {!required && <span className="text-ink-subtle font-normal"> {optionalLabel}</span>}
      </label>
      {hint && <p className="text-ink-subtle mt-0.5 text-xs">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * Add a place.
 *
 * Every submission is queued for approval regardless of who sends it, so this
 * screen's job is to collect enough for a moderator to make that decision
 * without going to look the place up themselves — which is why the address and
 * the pin are both required and neither is inferred from the other.
 *
 * One long form rather than a wizard. A wizard hides how much is left, and the
 * required part of this is six fields; splitting six fields across four screens
 * is ceremony, not guidance.
 */
export function SubmitPlaceScreen() {
  const t = useT();
  const locale = useLocale();
  const describeError = useErrorMessage();
  const router = useRouter();
  const { user } = useSessionStore();
  const { coordinates } = useLocationStore();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('Hồ Chí Minh');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange | ''>('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [pin, setPin] = useState(coordinates ?? FALLBACK);

  /**
   * Whether the pin is where someone put it, or merely where the map opened.
   *
   * Without this the form would look up an address the moment it mounts and
   * offer the centre of Ho Chi Minh City to somebody who has not touched
   * anything yet. A known location is different: standing at the place is the
   * usual way of adding one, so that pin counts as placed from the start.
   */
  const [pinPlaced, setPinPlaced] = useState(coordinates !== null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const settledPin = useDebouncedValue(pin, PIN_SETTLE_MS);

  /**
   * The address under the pin, offered rather than applied.
   *
   * Filling the field automatically would mean a small nudge of the map
   * silently overwrites an address somebody typed by hand — including the
   * alley addresses no geocoder knows, which are exactly the places this app
   * exists to collect. So it stays a suggestion and a button.
   */
  const pinAddress = useQuery({
    queryKey: [
      'geo',
      'reverse',
      settledPin.latitude.toFixed(4),
      settledPin.longitude.toFixed(4),
    ],
    queryFn: () => reverseGeocodeOrNull(settledPin),
    enabled: pinPlaced,
    staleTime: Infinity,
    retry: false,
  });

  /**
   * Applies a geocoded address to the form.
   *
   * Only overwrites the administrative fields the provider actually filled: a
   * result with no ward must not blank the ward somebody typed, and "the
   * geocoder does not know" is not the same as "there is none".
   */
  const applyAddress = (found: Address, movePin: boolean) => {
    setAddress(addressLine(found));
    if (found.ward) setWard(found.ward);
    if (found.district) setDistrict(found.district);
    if (found.province) setProvince(found.province);
    if (movePin) setPin({ latitude: found.latitude, longitude: found.longitude });
  };

  const submit = useMutation({
    // Rendered above the submit button, beside the fields it is about.
    meta: { inlineError: true },
    mutationFn: () =>
      submitPlace({
        name: name.trim(),
        categoryId,
        latitude: pin.latitude,
        longitude: pin.longitude,
        address: address.trim(),
        province: province.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(district.trim() ? { district: district.trim() } : {}),
        ...(ward.trim() ? { ward: ward.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(website.trim() ? { website: website.trim() } : {}),
        ...(priceRange ? { priceRange } : {}),
        ...(photos.length ? { imageKeys: photos.map((photo) => photo.key) } : {}),
      }),
  });

  // Mirrors the server's own required fields, so the button is disabled for
  // the same reasons a 400 would be — rather than letting someone submit and
  // then explaining why not.
  const ready =
    name.trim().length >= 2 &&
    categoryId !== '' &&
    address.trim().length >= 4 &&
    province.trim() !== '';

  if (!user) {
    return (
      <div className="px-safe px-5 pt-10 text-center">
        <MapPin className="text-ink-subtle mx-auto size-8" aria-hidden />
        <h1 className="text-ink mt-3 text-lg font-semibold">{t('submit.signInTitle')}</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {t('submit.signInBody')}
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            router.push('/profile');
          }}
        >
          {t('submit.goToSignIn')}
        </Button>
      </div>
    );
  }

  if (submit.isSuccess) {
    return (
      <div className="px-safe px-5 pt-10 text-center">
        <div className="bg-success/10 text-success mx-auto flex size-14 items-center justify-center rounded-full">
          <Check className="size-7" aria-hidden />
        </div>
        <h1 className="text-ink mt-4 text-lg font-semibold">{t('submit.doneTitle')}</h1>
        {/* Says what happens next. "Thanks!" with no timeline is how people
            conclude nothing happened and submit it again. */}
        <p className="text-ink-muted mx-auto mt-1 max-w-xs text-sm">
          {t('submit.doneBody', { name: name.trim() })}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              router.push('/explore');
            }}
          >
            {t('submit.backToExplore')}
          </Button>
          <Button
            onClick={() => {
              submit.reset();
              setName('');
              setDescription('');
              setAddress('');
              setPhotos([]);
            }}
          >
            {t('submit.addAnother')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float flex items-center gap-3 px-5">
        <button
          type="button"
          onClick={() => {
            router.back();
          }}
          aria-label={t('common.back')}
          className="text-ink -ml-2 flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-ink text-xl font-semibold tracking-tight">{t('submit.title')}</h1>
      </header>

      <div className="px-5">
        <p className="text-ink-muted mt-2 text-sm">
          {t('submit.intro')}
        </p>

        <Field optionalLabel={t('common.optional')} label={t('submit.name')} required htmlFor="place-name">
          <input
            id="place-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value.slice(0, 120));
            }}
            placeholder={t('submit.namePlaceholder')}
            className={fieldClass('h-12 px-3.5 text-[0.9375rem]')}
          />
        </Field>

        <Field optionalLabel={t('common.optional')} label={t('submit.category')} required>
          <div className="flex flex-wrap gap-2">
            {categories.data?.map((category) => (
              <Chip
                key={category.id}
                selected={categoryId === category.id}
                colorHex={category.colorHex}
                onClick={() => {
                  setCategoryId(category.id);
                }}
              >
                {categoryName(category, locale)}
              </Chip>
            ))}
          </div>
        </Field>

        <Field
          optionalLabel={t('common.optional')}
          label={t('submit.description')}
          hint={t('submit.descriptionHint')}
          htmlFor="place-description"
        >
          <RichTextEditor
            id="place-description"
            value={description}
            onChange={setDescription}
            maxLength={DESCRIPTION_MAX}
            disabled={submit.isPending}
            placeholder={t('submit.descriptionPlaceholder')}
          />
        </Field>

        <Field optionalLabel={t('common.optional')} label={t('submit.photos')} hint={t('submit.photosHint')}>
          <PhotoPicker photos={photos} onChange={setPhotos} max={8} disabled={submit.isPending} />
        </Field>

        <Field
          optionalLabel={t('common.optional')}
          label={t('submit.address')}
          required
          hint={t('submit.addressHint')}
          htmlFor="place-address"
        >
          <AddressAutocomplete
            id="place-address"
            value={address}
            onChange={setAddress}
            onPick={(found) => {
              applyAddress(found, true);
              // Choosing a suggestion is placing the pin, so the map is now
              // somewhere deliberate and worth reading back.
              setPinPlaced(true);
            }}
            near={pin}
            placeholder={t('submit.addressPlaceholder')}
            disabled={submit.isPending}
          />
        </Field>

        <div className="flex gap-3">
          <Field optionalLabel={t('common.optional')} label={t('submit.province')} required htmlFor="place-province">
            <input
              id="place-province"
              value={province}
              onChange={(event) => {
                setProvince(event.target.value.slice(0, 100));
              }}
              className={fieldClass('h-12 px-3.5 text-[0.9375rem]')}
            />
          </Field>
          <Field optionalLabel={t('common.optional')} label={t('submit.district')} htmlFor="place-district">
            <input
              id="place-district"
              value={district}
              onChange={(event) => {
                setDistrict(event.target.value.slice(0, 100));
              }}
              placeholder={t('submit.districtPlaceholder')}
              className={fieldClass('h-12 px-3.5 text-[0.9375rem]')}
            />
          </Field>
        </div>

        <Field optionalLabel={t('common.optional')} label={t('submit.ward')} htmlFor="place-ward">
          <input
            id="place-ward"
            value={ward}
            onChange={(event) => {
              setWard(event.target.value.slice(0, 100));
            }}
            placeholder={t('submit.wardPlaceholder')}
            className={fieldClass('h-12 px-3.5 text-[0.9375rem]')}
          />
        </Field>

        {/*
          The pin, and the address, both — and each can now offer to fill the
          other.

          Neither is *derived* from the other, which is the part that matters.
          Geocoding an address gets the wrong side of the street often enough
          to matter for somebody walking to it, and a pin alone gives a
          moderator nothing to verify against. So both are still required, both
          stay editable, and the link between them is always a suggestion
          somebody accepts.
        */}
        <Field optionalLabel={t('common.optional')} label={t('submit.pin')} required hint={t('submit.pinHint')}>
          <div className="border-border relative h-56 overflow-hidden rounded-md border">
            <MapCanvas
              className="absolute inset-0"
              center={pin}
              zoom={16}
              showPlaceMarkers={false}
              showZoomControls={false}
              onViewportChange={(bounds, _zoom, byUser) => {
                // The pin is fixed at the centre of the frame and the map moves
                // under it — a marker you drag on a phone is a marker your
                // thumb is covering at the moment of the drop.
                setPin({
                  latitude: (bounds.minLat + bounds.maxLat) / 2,
                  longitude: (bounds.minLng + bounds.maxLng) / 2,
                });

                // Only a pan counts as choosing a spot. The map also reports
                // its centre on load and after a resize, and acting on those
                // means offering an address for wherever the app opened.
                if (byUser) setPinPlaced(true);
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <MapPin
                className="text-primary size-8 drop-shadow-md"
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-ink-subtle text-xs tabular-nums">
              {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
            </p>
            {coordinates && (
              <button
                type="button"
                onClick={() => {
                  setPin(coordinates);
                  setPinPlaced(true);
                }}
                className="text-primary inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <Crosshair className="size-3.5" aria-hidden />
                {t('submit.useMyLocation')}
              </button>
            )}
          </div>

          {/* Only worth showing when it would actually change something. */}
          {pinAddress.data && addressLine(pinAddress.data) !== address && (
            <div className="border-border bg-surface-sunken mt-2 flex items-start gap-2.5 rounded-md border p-3">
              <MapPin className="text-ink-subtle mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm">{pinAddress.data.formatted}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (pinAddress.data) applyAddress(pinAddress.data, false);
                  }}
                  className="text-primary mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium"
                >
                  <Wand2 className="size-3.5" aria-hidden />
                  {t('submit.useThisAddress')}
                </button>
                {/*
                  Said out loud, because the fallback geocoder's Vietnamese
                  ward and house-number coverage is materially worse than the
                  real one's, and an address that looks confident is the wrong
                  thing to trust silently.
                */}
                {pinAddress.data.isFallbackProvider && (
                  <p className="text-ink-subtle mt-1 text-xs">
                    {t('submit.fallbackWarning')}
                  </p>
                )}
              </div>
            </div>
          )}
        </Field>

        <Field optionalLabel={t('common.optional')} label={t('submit.priceRange')}>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((range) => (
              <Chip
                key={range}
                selected={priceRange === range}
                onClick={() => {
                  setPriceRange((current) => (current === range ? '' : range));
                }}
              >
                {t(`priceRange.${range}`)}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="flex gap-3">
          <Field optionalLabel={t('common.optional')} label={t('submit.phone')} htmlFor="place-phone">
            <input
              id="place-phone"
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.slice(0, 30));
              }}
              placeholder={t('submit.phonePlaceholder')}
              className={fieldClass('h-12 px-3.5 text-[0.9375rem]')}
            />
          </Field>
          <Field optionalLabel={t('common.optional')} label={t('submit.website')} htmlFor="place-website">
            <input
              id="place-website"
              type="url"
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value.slice(0, 300));
              }}
              placeholder="https://…"
              className={fieldClass('h-12 px-3.5 text-[0.9375rem]')}
            />
          </Field>
        </div>

        {submit.error && (
          <p role="alert" className="bg-danger/10 text-danger mt-5 rounded-md p-3 text-sm">
            {describeError(submit.error)}
          </p>
        )}

        <Button
          fullWidth
          size="lg"
          className="mt-6"
          disabled={!ready}
          isLoading={submit.isPending}
          onClick={() => {
            submit.mutate();
          }}
        >
          {t('submit.send')}
        </Button>
      </div>
    </div>
  );
}
