/**
 * Page : Création d'une Demande d'Enlèvement (Authentifié)
 *
 * User Story US-1.4 : Création de demande par un utilisateur connecté
 *
 * Formulaire de création d'une nouvelle demande d'enlèvement avec :
 * - Pré-remplissage depuis le profil utilisateur
 * - Rattachement automatique au compte (userId non null)
 * - Company héritée de l'utilisateur
 * - Redirection vers la liste après succès
 *
 * Route protégée accessible à tous les utilisateurs authentifiés
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PickupForm } from '@/components/pickups';
import { createPickup, type CreatePickupInput } from '@/modules/pickups';

/**
 * Page de création de demande (mode authentifié)
 */
export default function NewPickupPage() {
  const router = useRouter();

  /**
   * Handler de soumission du formulaire
   */
  const handleSubmit = async (data: CreatePickupInput) => {
    try {
      const result = await createPickup(data);

      if (result.success) {
        // Rediriger vers la liste des demandes
        router.push('/dashboard/pickups');
        router.refresh();
      }

      return result;
    } catch (error) {
      console.error('Erreur création demande:', error);
      return {
        success: false,
        error: 'Une erreur inattendue est survenue',
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/pickups">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Nouvelle Demande d&apos;Enlèvement
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez une demande d&apos;enlèvement pour votre entreprise
            </p>
          </div>
        </div>
      </div>

      {/* Informations importantes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-blue-900">
            Informations importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>
              La demande sera automatiquement rattachée à votre compte
            </li>
            <li>
              Nos équipes vous recontacteront sous 24-48h pour confirmer la planification
            </li>
            <li>
              Vous recevrez un email de confirmation avec votre numéro de suivi
            </li>
            <li>
              Pour un enlèvement urgent, contactez-nous directement au +33 1 XX XX XX XX
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Formulaire */}
      <PickupForm mode="authenticated" onSubmit={handleSubmit} />
    </div>
  );
}
