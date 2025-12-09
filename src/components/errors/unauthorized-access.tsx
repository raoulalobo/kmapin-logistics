/**
 * Composant : UnauthorizedAccess
 *
 * Affiche un message clair et convivial quand un utilisateur
 * n'a pas les permissions nécessaires pour accéder à une ressource
 *
 * Utilisé dans les pages du dashboard pour gérer les erreurs de permissions RBAC
 */

'use client';

import Link from 'next/link';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Props du composant UnauthorizedAccess
 */
interface UnauthorizedAccessProps {
  /**
   * Titre personnalisé (optionnel)
   * Par défaut : "Accès non autorisé"
   */
  title?: string;

  /**
   * Message personnalisé (optionnel)
   * Par défaut : message générique sur les permissions
   */
  message?: string;

  /**
   * Ressource concernée (optionnel)
   * Ex: "les clients", "les expéditions", "cette page"
   */
  resource?: string;

  /**
   * Afficher le bouton de retour (optionnel)
   * Par défaut : true
   */
  showBackButton?: boolean;

  /**
   * Afficher le bouton vers le dashboard (optionnel)
   * Par défaut : true
   */
  showDashboardButton?: boolean;
}

/**
 * Composant UnauthorizedAccess
 *
 * Affiche une page d'erreur conviviale avec :
 * - Icône de protection
 * - Message explicatif clair
 * - Suggestions d'action (retour, dashboard)
 * - Design cohérent avec le reste de l'application
 *
 * @example
 * ```tsx
 * // Utilisation basique
 * <UnauthorizedAccess />
 *
 * // Avec message personnalisé
 * <UnauthorizedAccess
 *   resource="les clients"
 *   message="Seuls les administrateurs et gestionnaires peuvent consulter la liste des clients."
 * />
 * ```
 */
export function UnauthorizedAccess({
  title = 'Accès non autorisé',
  message,
  resource = 'cette page',
  showBackButton = true,
  showDashboardButton = true,
}: UnauthorizedAccessProps) {
  // Message par défaut si non fourni
  const defaultMessage = `Vous n'avez pas les permissions nécessaires pour accéder à ${resource}. Cette fonctionnalité est réservée à certains rôles d'utilisateurs.`;

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-8">
          {/* Icône de sécurité */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-6">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>

          {/* Titre */}
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>

          {/* Description */}
          <CardDescription className="text-base mt-2">
            {message || defaultMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Informations supplémentaires */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Que puis-je faire ?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Vérifiez que vous êtes connecté avec le bon compte</li>
              <li>Contactez votre administrateur pour obtenir les autorisations nécessaires</li>
              <li>Retournez au tableau de bord pour accéder aux fonctionnalités disponibles</li>
            </ul>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            )}

            {showDashboardButton && (
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Aller au tableau de bord
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
