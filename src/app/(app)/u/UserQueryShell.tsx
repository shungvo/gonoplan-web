'use client';

import { useSearchParams } from 'next/navigation';
import { PublicProfileScreen } from '@/features/users/components/PublicProfileScreen';

export function UserQueryShell() {
  const id = useSearchParams().get('id');
  // A missing id is the same answer as a missing account: the screen already
  // renders "that profile is not available" for an id it cannot resolve.
  return <PublicProfileScreen userId={id ?? ''} />;
}
