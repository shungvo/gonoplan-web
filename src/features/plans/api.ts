import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

export type Plan = components['schemas']['Plan'];
export type PlanDetail = components['schemas']['PlanDetail'];
export type PlanStop = components['schemas']['PlanStop'];

export interface CreatePlanInput {
  title: string;
  date?: string;
  note?: string;
}

export function fetchPlans(): Promise<Plan[]> {
  return api.get<Plan[]>('/plans');
}

export function fetchPlan(id: string): Promise<PlanDetail> {
  return api.get<PlanDetail>(`/plans/${id}`);
}

export function createPlan(input: CreatePlanInput): Promise<PlanDetail> {
  return api.post<PlanDetail>('/plans', input);
}

/** `date: null` clears the day; omitting it leaves the day alone. */
export function updatePlan(
  id: string,
  input: { title?: string; date?: string | null; note?: string | null },
): Promise<PlanDetail> {
  return api.patch<PlanDetail>(`/plans/${id}`, input);
}

export function deletePlan(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/plans/${id}`);
}

export function addStop(
  planId: string,
  input: { placeId: string; startsAtMin?: number; endsAtMin?: number },
): Promise<PlanDetail> {
  return api.post<PlanDetail>(`/plans/${planId}/stops`, input);
}

export function updateStop(
  planId: string,
  stopId: string,
  input: { startsAtMin?: number | null; endsAtMin?: number | null; note?: string | null },
): Promise<PlanDetail> {
  return api.patch<PlanDetail>(`/plans/${planId}/stops/${stopId}`, input);
}

export function removeStop(planId: string, stopId: string): Promise<PlanDetail> {
  return api.delete<PlanDetail>(`/plans/${planId}/stops/${stopId}`);
}

/**
 * The whole order, every time.
 *
 * The server checks the list is a permutation of the plan's actual stops
 * before writing, so a client that has fallen behind gets a 409 rather than
 * writing an arrangement nobody chose.
 */
export function reorderStops(planId: string, stopIds: string[]): Promise<PlanDetail> {
  return api.request<PlanDetail>(`/plans/${planId}/stops/order`, {
    method: 'PUT',
    body: { stopIds },
  }).then((result) => result.data);
}
