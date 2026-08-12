'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Compass, MapPin, MapPinPlus, Route } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LocationPickerSheet } from '@/features/location/components/LocationPickerSheet';
import { useLocationStore } from '@/features/location/store';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useSetLocale } from '@/i18n/useSetLocale';
import type { MessageKey } from '@/i18n/messages/keys';
import { cn } from '@/lib/utils/cn';
import { useOnboardingStore } from '../store';

interface Panel {
  icon: typeof Compass;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

/**
 * Three panels, and the third is the only one that asks for anything.
 *
 * The order is the argument: say what the app is for, show what it does with
 * it, and only then ask for location — with the reason attached. A permission
 * dialog on cold start with no context is the fastest way to get the one
 * answer a browser will not let you ask again.
 */
const PANELS: Panel[] = [
  { icon: Compass, titleKey: 'onboarding.discoverTitle', bodyKey: 'onboarding.discoverBody' },
  { icon: Route, titleKey: 'onboarding.planTitle', bodyKey: 'onboarding.planBody' },
  {
    icon: MapPinPlus,
    titleKey: 'onboarding.contributeTitle',
    bodyKey: 'onboarding.contributeBody',
  },
];

const LAST_STEP = PANELS.length;

export function Onboarding() {
  const t = useT();
  const locale = useLocale();
  const { setLocale } = useSetLocale();
  const reduceMotion = useReducedMotion();
  const complete = useOnboardingStore((state) => state.complete);
  const requestLocation = useLocationStore((state) => state.requestLocation);

  const [step, setStep] = useState(0);
  const [pickingCity, setPickingCity] = useState(false);

  const isLocationStep = step === LAST_STEP;
  const panel = PANELS[step];

  return (
    <div className="bg-background px-safe fixed inset-y-0 inset-x-0 z-50 mx-auto flex max-w-app flex-col">
      <div className="pt-safe-float flex items-center justify-between px-5">
        {/*
          A language toggle on the very first screen.

          `Accept-Language` gets this right for most people, and for the rest
          the alternative is reading an unfamiliar language until they find
          Account settings — which are three taps behind a screen they cannot
          read.
        */}
        <div className="bg-surface-sunken flex rounded-full p-0.5">
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setLocale(option);
              }}
              aria-pressed={option === locale}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                option === locale ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle',
              )}
            >
              {LOCALE_LABELS[option]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={complete}
          className="text-ink-muted px-2 py-1.5 text-sm font-medium"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center px-8 text-center">
        <motion.div
          // Keyed on the step so each panel animates in rather than the text
          // swapping under a static icon.
          key={step}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <span className="bg-primary-tint text-primary mx-auto flex size-20 items-center justify-center rounded-lg">
            {isLocationStep ? (
              <MapPin className="size-9" aria-hidden />
            ) : (
              panel && <panel.icon className="size-9" aria-hidden />
            )}
          </span>

          <h1 className="text-ink mt-6 text-2xl leading-tight font-semibold tracking-tight">
            {isLocationStep ? t('onboarding.locationTitle') : panel && t(panel.titleKey)}
          </h1>
          <p className="text-ink-muted mx-auto mt-3 max-w-sm text-md leading-relaxed">
            {isLocationStep ? t('onboarding.locationBody') : panel && t(panel.bodyKey)}
          </p>
        </motion.div>
      </div>

      <div className="pb-safe-float px-5">
        <div
          className="mb-5 flex justify-center gap-1.5"
          role="status"
          aria-label={t('onboarding.step', { current: step + 1, total: LAST_STEP + 1 })}
        >
          {Array.from({ length: LAST_STEP + 1 }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                index === step ? 'bg-primary w-5' : 'bg-border w-1.5',
              )}
              aria-hidden
            />
          ))}
        </div>

        {isLocationStep ? (
          <div className="space-y-2">
            <Button
              fullWidth
              size="lg"
              leadingIcon={<MapPin className="size-[1.125rem]" aria-hidden />}
              onClick={() => {
                // Completed first: whatever the browser answers, onboarding is
                // over. Waiting for the promise would leave somebody who taps
                // "Don't allow" staring at this screen with no way past it.
                complete();
                void requestLocation();
              }}
            >
              {t('onboarding.useLocation')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              size="lg"
              onClick={() => {
                setPickingCity(true);
              }}
            >
              {t('onboarding.chooseCity')}
            </Button>
          </div>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              setStep((current) => current + 1);
            }}
          >
            {t('onboarding.next')}
          </Button>
        )}
      </div>

      <LocationPickerSheet
        open={pickingCity}
        onOpenChange={(open) => {
          setPickingCity(open);
          // Closing the picker ends onboarding either way. Somebody who opened
          // it and changed their mind has still answered the question.
          if (!open) complete();
        }}
      />
    </div>
  );
}
