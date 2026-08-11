'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStop,
  createPlan,
  deletePlan,
  fetchPlan,
  fetchPlans,
  removeStop,
  reorderStops,
  updatePlan,
  updateStop,
  type PlanDetail,
} from '../api';

export const planKeys = {
  all: ['plans'] as const,
  detail: (id: string) => ['plans', id] as const,
};

export function usePlans(enabled: boolean) {
  return useQuery({ queryKey: planKeys.all, queryFn: fetchPlans, enabled });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => fetchPlan(id),
    // A plan is private and only this device edits it, so a refetch on focus
    // would only ever overwrite what the user is in the middle of doing.
    refetchOnWindowFocus: false,
  });
}

/**
 * Every stop mutation answers with the whole plan.
 *
 * That is why they all share one handler: the server has already renumbered
 * the stops and bumped the timestamps, so writing its answer into the cache is
 * both cheaper and more correct than patching the list here and hoping the two
 * agree.
 */
function useStopMutation<TVariables>(
  planId: string,
  run: (variables: TVariables) => Promise<PlanDetail>,
  // Set by the two callers that put the error on screen themselves; everything
  // else here fires from a row control with nowhere to render one, and rides
  // the global toast instead.
  options: { inlineError?: boolean } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: run,
    ...(options.inlineError ? { meta: { inlineError: true } } : {}),
    onSuccess: (plan) => {
      queryClient.setQueryData(planKeys.detail(planId), plan);
      // The list shows a stop count, so it is stale the moment a stop moves.
      void queryClient.invalidateQueries({ queryKey: planKeys.all, exact: true });
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    // The dialog that raised it stays open and shows it.
    meta: { inlineError: true },
    mutationFn: createPlan,
    onSuccess: (plan) => {
      queryClient.setQueryData(planKeys.detail(plan.id), plan);
      void queryClient.invalidateQueries({ queryKey: planKeys.all, exact: true });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.all, exact: true });
    },
  });
}

export function useUpdatePlan(planId: string) {
  return useStopMutation(planId, (input: Parameters<typeof updatePlan>[1]) =>
    updatePlan(planId, input),
  );
}

export function useAddStop(planId: string) {
  return useStopMutation(
    planId,
    (input: Parameters<typeof addStop>[1]) => addStop(planId, input),
    { inlineError: true },
  );
}

export function useUpdateStop(planId: string) {
  return useStopMutation(
    planId,
    ({ stopId, ...input }: { stopId: string } & Parameters<typeof updateStop>[2]) =>
      updateStop(planId, stopId, input),
  );
}

export function useRemoveStop(planId: string) {
  return useStopMutation(planId, (stopId: string) => removeStop(planId, stopId));
}

export function useReorderStops(planId: string) {
  return useStopMutation(planId, (stopIds: string[]) => reorderStops(planId, stopIds), {
    inlineError: true,
  });
}
