/**
 * Page : Création d'une Demande d'Achat Délégué (Authentifié)
 *
 * User Story : Création de demande par un utilisateur connecté
 *
 * Formulaire de création d'une nouvelle demande d'achat délégué avec :
 * - Pré-remplissage depuis le profil utilisateur (email, téléphone, nom)
 * - Rattachement automatique au compte (userId non null)
 * - Company héritée de l'utilisateur (si applicable)
 * - Redirection vers la liste après succès
 *
 * Route protégée accessible à tous les utilisateurs authentifiés.
 * Les utilisateurs non connectés sont automatiquement redirigés vers
 * /purchases/request par le middleware.
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
import { PurchaseForm } from '@/components/purchases';
import { createPurchase, type CreatePurchaseInput } from '@/modules/purchases';

/**
 * Page de création de demande d'achat délégué (mode authentifié)
 *
 * Workflow :
 * 1. Utilisateur authentifié remplit le formulaire (pré-rempli avec ses infos)
 * 2. Soumission → createPurchase() Server Action
 * 3. PurchaseRequest créé avec userId et companyId automatiques
 * 4. Redirection vers /dashboard/purchases avec confirmation
 */
export default function NewPurchasePage() {
  const router = useRouter();

  /**
   * Handler de soumission du formulaire
   *
   * Crée la demande d'achat via Server Action et redirige vers la liste.
   * Le rattachement au compte se fait automatiquement côté serveur via
   * la session utilisateur.
   *
   * @param data - Données validées du formulaire (CreatePurchaseInput)
   * @returns Résultat de l'opération (success, error, data)
   */
  const handleSubmit = async (data: CreatePurchaseInput) => {
    try {
      const result = await createPurchase(data);

      if (result.success) {
        // Rediriger vers la liste des demandes d'achats
        router.push('/dashboard/purchases');
        router.refresh();
      }

      return result;
    } catch (error) {
      console.error('❌ [NewPurchasePage] Erreur création demande:', error);
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
            <Link href="/dashboard/purchases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Nouvelle Demande d&apos;Achat Délégué
            </h1>
            <p className="text-muted-foreground mt-1">
              Confiez-nous l&apos;achat d&apos;un produit et nous nous occupons de tout
            </p>
          </div>
        </div>
      </div>

      {/* Informations importantes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-blue-900">
            Comment ça marche ?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>
              La demande sera automatiquement rattachée à votre compte
            </li>
            <li>
              Notre équipe recherche le meilleur prix et effectue l&apos;achat pour vous
            </li>
            <li>
              Vous recevrez un email de confirmation avec le détail des coûts
            </li>
            <li>
              Le produit sera livré directement à l&apos;adresse indiquée
            </li>
            <li>
              <strong>Tarification :</strong> Prix du produit + Livraison + Frais de service (15%, minimum 10€)
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Formulaire */}
      <PurchaseForm mode="authenticated" onSubmit={handleSubmit} />
    </div>
  );
}
