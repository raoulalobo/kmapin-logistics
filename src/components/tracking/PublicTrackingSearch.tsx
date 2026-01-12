'use client';

/**
 * Formulaire de recherche de tracking public
 *
 * Permet aux utilisateurs (connectés ou non) de rechercher une expédition
 * en saisissant son numéro de tracking. Le composant valide le format en temps réel
 * et redirige vers la page de résultats si le format est valide.
 *
 * Features :
 * - Validation format en temps réel avec regex
 * - Conversion automatique en majuscules
 * - Gestion des erreurs avec feedback visuel
 * - Loading state pendant la recherche
 * - Message d'aide avec exemple de format
 * - Lien vers inscription pour encourager la création de compte
 *
 * Format attendu : SHP-YYYYMMDD-XXXXX
 * Exemple : SHP-20250109-A1B2C
 *
 * @module components/tracking/PublicTrackingSearch
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlass, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

/**
 * Valider le format du numéro de tracking
 * Format : SHP-YYYYMMDD-XXXXX
 *
 * @param value - Numéro de tracking à valider
 * @returns true si le format est valide, false sinon
 */
function isValidFormat(value: string): boolean {
  const regex = /^SHP-\d{8}-[A-Z0-9]{5}$/;
  return regex.test(value.trim().toUpperCase());
}

/**
 * Composant PublicTrackingSearch
 *
 * Workflow :
 * 1. Utilisateur saisit le numéro de tracking
 * 2. Conversion automatique en majuscules à chaque changement
 * 3. Validation côté client au submit
 * 4. Redirection vers /tracking/[trackingNumber] si valide
 * 5. Affichage d'erreur si format invalide
 */
export function PublicTrackingSearch() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  /**
   * Handler de soumission du formulaire
   * Valide le format et redirige vers la page de résultats
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = trackingNumber.trim().toUpperCase();

    // Validation côté client
    if (!trimmed) {
      setError('Veuillez saisir un numéro de tracking');
      return;
    }

    if (!isValidFormat(trimmed)) {
      setError('Format invalide. Exemple : SHP-20250109-A1B2C');
      return;
    }

    // Recherche en cours
    setIsSearching(true);
    setError('');

    // Rediriger vers la page de résultats
    router.push(`/tracking/${trimmed}`);
  }

  /**
   * Handler de changement de l'input
   * Conversion automatique en majuscules + reset de l'erreur
   */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toUpperCase();
    setTrackingNumber(value);

    // Effacer l'erreur lors de la saisie
    if (error) {
      setError('');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Formulaire de recherche */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trackingNumber" className="text-lg font-medium">
            Numéro de tracking
          </Label>
          <div className="flex gap-2">
            <Input
              id="trackingNumber"
              type="text"
              placeholder="SHP-20250109-A1B2C"
              value={trackingNumber}
              onChange={handleChange}
              className={`text-lg font-mono ${error ? 'border-red-500' : ''}`}
              disabled={isSearching}
              autoFocus
            />
            <Button
              type="submit"
              size="lg"
              disabled={!trackingNumber || isSearching}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <MagnifyingGlass className="h-5 w-5" weight="fill" />
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>

          {/* Message d'erreur */}
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <Warning className="h-4 w-4" weight="fill" />
              {error}
            </p>
          )}

          {/* Message d'aide */}
          <p className="text-sm text-gray-600">
            Format attendu : <span className="font-mono">SHP-YYYYMMDD-XXXXX</span>
          </p>
        </div>
      </form>

      {/* Alert : Incitation à créer un compte */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTitle className="text-blue-900">
          Suivi limité sans compte
        </AlertTitle>
        <AlertDescription className="text-blue-800">
          Le tracking public affiche uniquement le statut actuel et la dernière localisation.{' '}
          <Link
            href="/sign-up"
            className="font-semibold underline underline-offset-4 hover:text-blue-600"
          >
            Créez un compte gratuit
          </Link>{' '}
          pour accéder à l'historique complet, aux documents et aux notifications en temps réel.
        </AlertDescription>
      </Alert>

      {/* Section aide : Comment trouver mon numéro ? */}
      <div className="pt-6 border-t">
        <h3 className="text-lg font-semibold mb-4">
          Comment trouver mon numéro de tracking ?
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h4 className="font-medium">📧 Email de confirmation</h4>
            <p className="text-sm text-gray-600">
              Votre numéro de tracking est indiqué dans l'email de confirmation d'expédition
              que vous avez reçu lors de la création de votre commande.
            </p>
          </div>
          <div className="p-4 border rounded-lg space-y-2">
            <h4 className="font-medium">📄 Document de transport</h4>
            <p className="text-sm text-gray-600">
              Le numéro de tracking figure sur le bordereau de transport (lettre de voiture)
              fourni avec votre colis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
