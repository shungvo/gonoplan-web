import { PublicProfileScreen } from '@/features/users/components/PublicProfileScreen';

export default async function UserPage({ params }: PageProps<'/u/[id]'>) {
  const { id } = await params;
  return <PublicProfileScreen userId={id} />;
}
