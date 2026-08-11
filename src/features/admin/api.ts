import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

/*
 * Every type here comes from the generated contract, not a hand-written copy.
 * A hand-copied SessionUser already drifted once — it was missing
 * `ownerStatus`, and nothing caught it until the UI rendered `undefined`.
 */
export type AdminOverview = components['schemas']['AdminOverview'];
export type AdminAnalytics = components['schemas']['AdminAnalytics'];
export type AdminUser = components['schemas']['AdminUser'];
export type AdminUserDetail = components['schemas']['AdminUserDetail'];
export type AdminPlace = components['schemas']['AdminPlace'];
export type AdminReview = components['schemas']['AdminReview'];
export type AdminReport = components['schemas']['AdminReport'];
export type PendingPlace = components['schemas']['PendingPlace'];
export type PendingRevision = components['schemas']['PendingRevision'];
export type PendingOwner = components['schemas']['PendingOwner'];
export type AuditEntry = components['schemas']['AuditEntry'];
export type SearchInsights = components['schemas']['SearchInsights'];
export type AdminCategory = components['schemas']['AdminCategory'];

export type UserStatus = AdminUser['status'];
export type ReportStatus = AdminReport['status'];

export function fetchOverview(): Promise<AdminOverview> {
  return api.get<AdminOverview>('/admin/dashboard');
}

export function fetchAnalytics(days: number): Promise<AdminAnalytics> {
  return api.get<AdminAnalytics>('/admin/analytics', { query: { days } });
}

// ─── Queues ─────────────────────────────────────────────────────────────────

export function fetchPendingPlaces(): Promise<PendingPlace[]> {
  return api.get<PendingPlace[]>('/admin/places/pending', { query: { limit: 50 } });
}

export function fetchPendingRevisions(): Promise<PendingRevision[]> {
  return api.get<PendingRevision[]>('/admin/revisions/pending', { query: { limit: 50 } });
}

export function fetchPendingOwners(): Promise<PendingOwner[]> {
  return api.get<PendingOwner[]>('/admin/owners/pending');
}

export function fetchReports(status: ReportStatus): Promise<AdminReport[]> {
  return api.get<AdminReport[]>('/admin/reports', { query: { status, limit: 50 } });
}

// ─── Decisions ──────────────────────────────────────────────────────────────

export function approvePlace(placeId: string): Promise<unknown> {
  return api.post(`/admin/places/${placeId}/approve`, {});
}

export function rejectPlace(placeId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/places/${placeId}/reject`, { reason });
}

export function suspendPlace(placeId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/places/${placeId}/suspend`, { reason });
}

export function approveRevision(revisionId: string): Promise<unknown> {
  return api.post(`/admin/revisions/${revisionId}/approve`, {});
}

export function rejectRevision(revisionId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/revisions/${revisionId}/reject`, { reason });
}

export function approveOwner(ownerProfileId: string): Promise<unknown> {
  return api.post(`/admin/owners/${ownerProfileId}/approve`, {});
}

export function rejectOwner(ownerProfileId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/owners/${ownerProfileId}/reject`, { reason });
}

export function suspendOwner(ownerProfileId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/owners/${ownerProfileId}/suspend`, { reason });
}

export function resolveReport(
  reportId: string,
  status: 'RESOLVED' | 'DISMISSED',
  resolution: string,
): Promise<unknown> {
  return api.post(`/admin/reports/${reportId}/resolve`, { status, resolution });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function fetchUsers(params: {
  query?: string | undefined;
  status?: UserStatus | undefined;
}): Promise<AdminUser[]> {
  return api.get<AdminUser[]>('/admin/users', {
    query: {
      limit: 50,
      ...(params.query ? { query: params.query } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
  });
}

export function fetchUser(userId: string): Promise<AdminUserDetail> {
  return api.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export function banUser(userId: string, reason: string): Promise<AdminUser> {
  return api.post<AdminUser>(`/admin/users/${userId}/ban`, { reason });
}

export function unbanUser(userId: string): Promise<AdminUser> {
  return api.post<AdminUser>(`/admin/users/${userId}/unban`, {});
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

export function fetchPlaces(params: {
  status?: string | undefined;
  query?: string | undefined;
}): Promise<AdminPlace[]> {
  return api.get<AdminPlace[]>('/admin/places', {
    query: {
      limit: 50,
      ...(params.status ? { status: params.status } : {}),
      ...(params.query ? { query: params.query } : {}),
    },
  });
}

export function fetchReviews(params: { maxRating?: number | undefined }): Promise<AdminReview[]> {
  return api.get<AdminReview[]>('/admin/reviews', {
    query: { limit: 50, ...(params.maxRating ? { maxRating: params.maxRating } : {}) },
  });
}

/**
 * Deletion goes through the public review route, not an admin-only twin.
 * That path locks the place row, recomputes the rating and writes the audit
 * entry; a second endpoint would be a second chance to skip one of the three.
 */
export function deleteReview(reviewId: string): Promise<unknown> {
  return api.delete(`/reviews/${reviewId}`);
}

/**
 * Hide a review, reversibly.
 *
 * The action a moderator actually reaches for. Deletion is for content that
 * should never be seen again; most reports are about a review that is
 * borderline, disputed, or wrong in a way that may be appealed — and the only
 * tool here used to be the irreversible one.
 *
 * Hiding also drops it from the place's rating, which deletion does too but
 * which nothing made obvious.
 */
export function hideReview(reviewId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/reviews/${reviewId}/hide`, { reason });
}

export function restoreReview(reviewId: string): Promise<unknown> {
  return api.post(`/admin/reviews/${reviewId}/restore`);
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export function fetchAuditLog(targetId?: string): Promise<AuditEntry[]> {
  return api.get<AuditEntry[]>('/admin/actions', {
    query: { limit: 100, ...(targetId ? { targetId } : {}) },
  });
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function fetchAdminCategories(): Promise<AdminCategory[]> {
  return api.get<AdminCategory[]>('/admin/categories');
}

export interface CategoryInput {
  slug: string;
  name: string;
  nameVi: string;
  iconKey: string;
  colorHex: string;
  parentId?: string;
  sortOrder?: number;
}

export function createCategory(input: CategoryInput): Promise<AdminCategory> {
  return api.post<AdminCategory>('/admin/categories', input);
}

export function updateCategory(
  id: string,
  input: Partial<Omit<CategoryInput, 'slug'>> & { isActive?: boolean },
): Promise<AdminCategory> {
  return api.patch<AdminCategory>(`/admin/categories/${id}`, input);
}

export function deleteCategory(id: string): Promise<unknown> {
  return api.delete(`/admin/categories/${id}`);
}

// ─── Search insights ────────────────────────────────────────────────────────

export function fetchSearchInsights(days = 30): Promise<SearchInsights> {
  return api.get<SearchInsights>('/admin/search-insights', { query: { days } });
}

// ─── Users ──────────────────────────────────────────────────────────────────

/**
 * Grant or revoke the reviewer badge.
 *
 * Not a permission — every signed-in user may already submit a place. It marks
 * a track record so the moderation queue can be sorted by it.
 */
export function setUserRole(
  userId: string,
  role: 'USER' | 'REVIEWER',
  reason: string,
): Promise<unknown> {
  return api.patch(`/admin/users/${userId}/role`, { role, reason });
}

/** Soft delete. The API has had this since Phase 11 with nothing calling it. */
export function deleteUser(userId: string, reason: string): Promise<unknown> {
  return api.delete(`/admin/users/${userId}`, { body: { reason } });
}

// ─── Place photos ───────────────────────────────────────────────────────────

export function removePlaceImage(
  placeId: string,
  imageId: string,
  reason: string,
): Promise<unknown> {
  return api.delete(`/admin/places/${placeId}/images/${imageId}`, { body: { reason } });
}

/**
 * Remove an owner's reply, leaving the review alone.
 *
 * A reply is published under the business's name on a page the business does
 * not otherwise control. Hiding the whole thread to remove one abusive reply
 * would punish the reviewer for what the owner wrote.
 */
export function removeReviewReply(reviewId: string, reason: string): Promise<unknown> {
  return api.delete(`/admin/reviews/${reviewId}/reply`, { body: { reason } });
}

/**
 * Clears a public bio and nothing else.
 *
 * Deliberately not part of a general "edit this user": renaming somebody is a
 * different power, and the endpoint does not offer it either.
 */
export function clearUserBio(userId: string, reason: string): Promise<{ cleared: boolean }> {
  return api.request<{ cleared: boolean }>(`/admin/users/${userId}/bio`, {
    method: 'DELETE',
    body: { reason },
  }).then((result) => result.data);
}
