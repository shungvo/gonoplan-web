'use client';

import { Onboarding } from './Onboarding';
import { useOnboardingPending } from '../store';

/**
 * Renders onboarding, or nothing.
 *
 * A component rather than a branch in the layout so the layout can stay a
 * Server Component: only this piece needs the persisted flag, and only this
 * piece has to be a client boundary.
 *
 * Nothing renders until the store has rehydrated (`completed === undefined`),
 * which is what stops the whole overlay flashing at a returning user for one
 * frame before localStorage is read back.
 */
export function OnboardingGate() {
  return useOnboardingPending() ? <Onboarding /> : null;
}
