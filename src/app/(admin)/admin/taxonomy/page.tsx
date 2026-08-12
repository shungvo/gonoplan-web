import { TaxonomyScreen } from '@/features/admin/components/TaxonomyScreen';

/*
 * No `metadata` of its own.
 *
 * This was the only admin page that set one, and it set it in English —
 * "Taxonomy · Admin" in the tab while every sibling inherited the layout's
 * translated title. A title that is hard-coded in one language is worse than
 * no title at all here, because the layout already has the right one.
 */

export default function TaxonomyPage() {
  return <TaxonomyScreen />;
}
