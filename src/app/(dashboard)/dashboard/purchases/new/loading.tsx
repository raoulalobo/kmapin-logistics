/**
 * Skeleton de chargement pour la page Nouvel Achat Délégué
 */

import { FormSkeleton } from '@/components/skeletons';

export default function NewPurchaseLoading() {
  return <FormSkeleton fields={9} showActions={true} />;
}
