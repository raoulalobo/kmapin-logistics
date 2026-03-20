/**
 * Page : Création d'un nouveau dépôt
 *
 * Server Component qui affiche le formulaire de création de dépôt.
 * Accessible uniquement aux administrateurs.
 *
 * @route /dashboard/depots/new
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth/config';
import { DepotForm } from '@/components/depots/depot-form';

export default async function NewDepotPage() {
  // Vérifier que l'utilisateur est admin
  await requireAdmin();

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton retour */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/depots">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau dépôt</h1>
          <p className="text-muted-foreground">
            Créez un nouveau dépôt ou entrepôt
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <DepotForm />
    </div>
  );
}
