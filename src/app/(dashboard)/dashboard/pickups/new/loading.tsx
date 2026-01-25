/**
 * Skeleton de chargement pour la page Nouvelle Demande d'Enlèvement
 */

import { FormSkeleton } from '@/components/skeletons';

export default function NewPickupLoading() {
  return <FormSkeleton fields={10} showActions={true} />;
}
