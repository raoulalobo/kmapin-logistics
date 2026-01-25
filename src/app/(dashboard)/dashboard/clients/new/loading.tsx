/**
 * Skeleton de chargement pour la page Nouveau Client
 */

import { FormSkeleton } from '@/components/skeletons';

export default function NewClientLoading() {
  return <FormSkeleton fields={8} showActions={true} />;
}
