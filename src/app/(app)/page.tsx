import { HomeScreen } from '@/features/places/components/HomeScreen';

/**
 * The home route is a thin server shell around a client screen.
 *
 * Everything here depends on the user's location, which only exists in the
 * browser, so there is nothing meaningful to render on the server. Keeping the
 * route itself a Server Component still lets metadata and the layout stay
 * static.
 */
export default function HomePage() {
  return <HomeScreen />;
}
