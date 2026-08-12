import { Suspense } from 'react';
import { UserQueryShell } from './UserQueryShell';

/** The query-string form of `/u/[id]` — see `src/lib/navigation/links.ts`. */
export default function UserQueryPage() {
  return (
    <Suspense fallback={null}>
      <UserQueryShell />
    </Suspense>
  );
}
