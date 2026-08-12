import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

/**
 * Types come from the generated contract, never hand-declared.
 *
 * If the API renames a field, this stops compiling instead of returning
 * `undefined` at runtime — which is the entire point of the codegen pipeline
 * in docs/00-architecture.md §6.1.
 */
export type Category = components['schemas']['Category'];
export type CategoryTreeNode = components['schemas']['CategoryTreeNode'];

/**
 * The icon vocabulary, as a union of literals.
 *
 * Derived from the contract rather than re-listed here, so the glyph table in
 * `CategoryGlyph` is checked against what the API will actually accept. When a
 * shape is added server-side this stops compiling until it is drawn.
 */
export type CategoryIconKey = Category['iconKey'];

export function fetchCategories(): Promise<CategoryTreeNode[]> {
  return api.get<CategoryTreeNode[]>('/categories', { withAuth: false });
}

/** Flattens the tree so a marker can be styled from a place's categoryId alone. */
export function flattenCategories(tree: CategoryTreeNode[]): Category[] {
  return tree.flatMap((node) => [node, ...node.children]);
}
