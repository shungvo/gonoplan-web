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

export function fetchCategories(): Promise<CategoryTreeNode[]> {
  return api.get<CategoryTreeNode[]>('/categories', { withAuth: false });
}

/** Flattens the tree so a marker can be styled from a place's categoryId alone. */
export function flattenCategories(tree: CategoryTreeNode[]): Category[] {
  return tree.flatMap((node) => [node, ...node.children]);
}
