import type { Metadata } from 'next';
import { SubmitPlaceScreen } from '@/features/places/components/SubmitPlaceScreen';

export const metadata: Metadata = {
  title: 'Add a place',
  description: 'Suggest somewhere worth going. Every submission is reviewed before it appears.',
};

export default function AddPlacePage() {
  return <SubmitPlaceScreen />;
}
