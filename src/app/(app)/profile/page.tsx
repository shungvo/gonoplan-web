import { User } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <div className="px-safe pt-safe">
      <h1 className="px-5 pt-6 text-[1.75rem] font-semibold tracking-tight text-ink">Profile</h1>
      <EmptyState
        icon={<User className="size-7" aria-hidden />}
        title="You're browsing as a guest"
        description="Sign in to save places, write reviews and get recommendations tuned to you."
        action={
          <Button size="md" disabled>
            Sign in · Phase 3
          </Button>
        }
      />
    </div>
  );
}
