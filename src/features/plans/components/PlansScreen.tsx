'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fieldClass } from '@/components/ui/field';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Drawer } from 'vaul';
import { useIsAuthenticated } from '@/features/auth/store';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { formatDate } from '@/i18n/format';
import { usePlans, useCreatePlan } from '../hooks/usePlans';

/**
 * The Plan tab.
 *
 * A list of days, newest first, and one button. Everything about arranging a
 * day lives one screen in — this one only has to answer "which day?".
 */
export function PlansScreen() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [composing, setComposing] = useState(false);

  const plans = usePlans(isAuthenticated);

  return (
    <div className="px-safe">
      <header className="pt-safe px-5">
        <h1 className="text-ink pt-6 text-[1.75rem] leading-tight font-semibold tracking-tight">
          {t('plans.title')}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">{t('plans.description')}</p>
      </header>

      <div className="mt-4 px-5">
        {!isAuthenticated && (
          <EmptyState
            icon={<CalendarDays className="size-7" aria-hidden />}
            title={t('plans.signedOutTitle')}
            description={t('plans.signedOutBody')}
            action={
              <Button
                onClick={() => {
                  router.push('/profile');
                }}
              >
                {t('common.signIn')}
              </Button>
            }
          />
        )}

        {isAuthenticated && (
          <>
            <Button
              fullWidth
              leadingIcon={<Plus className="size-4" aria-hidden />}
              onClick={() => {
                setComposing(true);
              }}
            >
              {t('plans.new')}
            </Button>

            {plans.isPending && (
              <div className="mt-4 space-y-2.5">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="bg-surface h-20 animate-pulse rounded-lg shadow-sm" />
                ))}
              </div>
            )}

            {plans.data?.length === 0 && (
              <EmptyState
                icon={<CalendarDays className="size-7" aria-hidden />}
                title={t('plans.emptyTitle')}
                description={t('plans.emptyBody')}
              />
            )}

            <ul className="mt-4 space-y-2.5">
              {plans.data?.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={`/plan/${plan.id}`}
                    className="bg-surface flex items-center gap-3 rounded-lg p-4 shadow-sm active:scale-[0.99]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-ink truncate font-semibold">{plan.title}</p>
                      <p className="text-ink-subtle mt-0.5 text-xs">
                        {plan.date ? formatDate(plan.date, locale) : t('plans.noDate')} ·{' '}
                        {t('plans.stopCount', { count: plan.stopCount })}
                      </p>
                    </div>
                    <ChevronRight className="text-ink-subtle size-4 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="h-6" />

      <BottomSheet open={composing} onOpenChange={setComposing}>
        {composing && (
          <NewPlanForm
            onCreated={(id) => {
              setComposing(false);
              router.push(`/plan/${id}`);
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function NewPlanForm({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT();
  const describeError = useErrorMessage();
  const create = useCreatePlan();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const submit = () => {
    if (!title.trim()) return;

    create.mutate(
      { title: title.trim(), ...(date ? { date } : {}) },
      { onSuccess: (plan) => { onCreated(plan.id); } },
    );
  };

  return (
    <form
      className="pb-safe overflow-y-auto px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('plans.createTitle')}
      </Drawer.Title>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">{t('plans.titleLabel')}</span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, 120));
          }}
          placeholder={t('plans.titlePlaceholder')}
          autoFocus
          className={fieldClass('mt-1.5 h-12 px-3.5 text-[0.9375rem]')}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">
          {t('plans.dateLabel')}{' '}
          <span className="text-ink-subtle font-normal">{t('common.optional')}</span>
        </span>
        {/* A native date input: it speaks the device's locale and calendar for
            free, and a hand-rolled picker on a phone is a worse version of the
            one the OS already ships. */}
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
          }}
          className={fieldClass('mt-1.5 h-12 px-3.5 text-[0.9375rem]')}
        />
      </label>

      {create.error != null && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {describeError(create.error)}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        className="mt-5 mb-6"
        disabled={!title.trim()}
        isLoading={create.isPending}
      >
        {t('plans.create')}
      </Button>
    </form>
  );
}
