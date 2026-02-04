'use client';

/**
 * Composant d'affichage du tracking public
 *
 * Affiche les informations publiques d'une expédition (sans données sensibles).
 * Ce composant est utilisé pour les utilisateurs NON connectés et affiche
 * uniquement les données filtrées par la Server Action `getPublicTracking()`.
 *
 * Features :
 * - En-tête avec numéro tracking et badge statut
 * - Informations transport (origine/destination, poids, dates)
 * - Timeline simplifiée des événements de tracking
 * - Alert d'incitation à se connecter pour plus de détails
 *
 * Données EXCLUES (sécurité) :
 * - ❌ Coordonnées GPS (latitude/longitude)
 * - ❌ Coûts (estimatedCost, actualCost)
 * - ❌ Métadonnées internes (metadata, notes)
 * - ❌ Boutons d'action (réservés aux utilisateurs authentifiés)
 *
 * @module components/tracking/PublicTrackingDisplay
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Package,
  MapPin,
  Calendar,
  TrendUp,
  CheckCircle,
  Clock,
  XCircle,
  Warning,
  Info,
} from '@phosphor-icons/react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { PublicShipmentTracking } from '@/modules/tracking';

/**
 * Props du composant PublicTrackingDisplay
 */
interface PublicTrackingDisplayProps {
  /** Données publiques de tracking (filtrées) */
  tracking: PublicShipmentTracking;
}

/**
 * Obtenir la couleur et l'icône du badge selon le statut
 */
function getStatusBadge(status: string) {
  const statusConfig: Record<
    string,
    { color: string; icon: React.ReactNode }
  > = {
    DRAFT: { color: 'bg-gray-500', icon: <Clock className="h-3 w-3" /> },
    PENDING_APPROVAL: { color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
    APPROVED: { color: 'bg-blue-500', icon: <CheckCircle className="h-3 w-3" /> },
    PICKED_UP: { color: 'bg-indigo-500', icon: <Package className="h-3 w-3" /> },
    IN_TRANSIT: { color: 'bg-blue-600', icon: <TrendUp className="h-3 w-3" /> },
    AT_CUSTOMS: { color: 'bg-orange-500', icon: <Warning className="h-3 w-3" /> },
    CUSTOMS_CLEARED: { color: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
    OUT_FOR_DELIVERY: { color: 'bg-purple-500', icon: <TrendUp className="h-3 w-3" /> },
    READY_FOR_PICKUP: { color: 'bg-teal-500', icon: <MapPin className="h-3 w-3" /> },
    DELIVERED: { color: 'bg-green-600', icon: <CheckCircle className="h-3 w-3" /> },
    CANCELLED: { color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
    ON_HOLD: { color: 'bg-orange-600', icon: <Warning className="h-3 w-3" /> },
    EXCEPTION: { color: 'bg-red-600', icon: <XCircle className="h-3 w-3" /> },
  };

  return (
    statusConfig[status] || {
      color: 'bg-gray-400',
      icon: <Info className="h-3 w-3" />,
    }
  );
}

/**
 * Composant PublicTrackingDisplay
 *
 * Structure :
 * 1. En-tête (tracking number + statut)
 * 2. Informations transport (origine/destination + détails)
 * 3. Timeline des événements
 * 4. Alert incitation connexion
 */
export function PublicTrackingDisplay({ tracking }: PublicTrackingDisplayProps) {
  const statusBadge = getStatusBadge(tracking.status);

  return (
    <div className="space-y-6">
      {/* ===================================================================
          SECTION 1 : EN-TÊTE (Numéro + Statut + Company)
          =================================================================== */}
      <Card className="dashboard-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold font-mono">
                {tracking.trackingNumber}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Expéditeur : <span className="font-medium">{tracking.companyName}</span>
              </p>
            </div>
            <Badge className={`${statusBadge.color} flex items-center gap-2 text-white px-3 py-2`}>
              {statusBadge.icon}
              {tracking.statusLabel}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* ===================================================================
          SECTION 2 : INFORMATIONS TRANSPORT (Design compact)
          - Ligne 1 : Origine → Destination (horizontal compact)
          - Ligne 2 : Grille 4 colonnes (poids, colis, type, transport)
          - Ligne 3 : Dates (optionnel, horizontal compact)
          =================================================================== */}
      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Informations Transport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ligne 1 : Origine → Destination (compact horizontal) */}
          <div className="flex items-center justify-between gap-4">
            {/* Origine (à gauche) */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" weight="fill" />
              <span className="font-medium truncate">
                {tracking.originCity}, {tracking.originCountry}
              </span>
            </div>

            {/* Flèche centrale avec lignes décoratives */}
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-8 h-px bg-gray-300" />
              <TrendUp className="h-4 w-4 text-blue-600 flex-shrink-0" weight="bold" />
              <div className="w-8 h-px bg-gray-300" />
            </div>

            {/* Destination (à droite) */}
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="font-medium truncate text-right">
                {tracking.destinationCity}, {tracking.destinationCountry}
              </span>
              <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" weight="fill" />
            </div>
          </div>

          {/* Ligne 2 : Grille 4 colonnes (poids, colis, type, transport) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 px-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Poids</p>
              <p className="font-semibold text-sm">{tracking.weight.toLocaleString('fr-FR')} kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Colis</p>
              <p className="font-semibold text-sm">{tracking.packageCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Marchandise</p>
              <p className="font-semibold text-sm">{tracking.cargoType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Transport</p>
              <div className="flex gap-1 flex-wrap">
                {tracking.transportMode.map((mode, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1.5 py-0">
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Ligne 3 : Dates (si présentes) - compact horizontal */}
          {(tracking.estimatedDeliveryDate || tracking.actualDeliveryDate) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {tracking.estimatedDeliveryDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-600">Livraison estimée :</span>
                  <span className="font-medium">
                    {format(new Date(tracking.estimatedDeliveryDate), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
              {tracking.actualDeliveryDate && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />
                  <span className="text-gray-600">Livré le :</span>
                  <span className="font-medium">
                    {format(new Date(tracking.actualDeliveryDate), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================
          SECTION 3 : HISTORIQUE DE TRACKING (Timeline complète)
          Affiche tous les événements de tracking avec un design vertical
          =================================================================== */}
      <Card className="dashboard-card">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Historique de tracking
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Événements de localisation et transit
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {tracking.trackingEvents.length === 0 ? (
            // Aucun événement de tracking enregistré
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">
                Aucun événement pour le moment
              </p>
              <p className="text-sm text-gray-600 mt-1">
                L'expédition est en cours de préparation
              </p>
            </div>
          ) : (
            // Timeline verticale complète avec tous les événements
            <div className="relative">
              {tracking.trackingEvents.map((event, index) => {
                // Déterminer si c'est le dernier élément (pas de ligne après)
                const isLast = index === tracking.trackingEvents.length - 1;

                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Colonne timeline : point circulaire + ligne verticale */}
                    <div className="relative flex flex-col items-center">
                      {/* Point de la timeline */}
                      <div className="h-3 w-3 rounded-full bg-gray-400 z-10 ring-4 ring-background" />
                      {/* Ligne verticale (sauf pour le dernier élément) */}
                      {!isLast && (
                        <div className="w-0.5 bg-gray-200 flex-1 min-h-[80px]" />
                      )}
                    </div>

                    {/* Contenu de l'événement */}
                    <div className="flex-1 pb-6">
                      {/* Statut en gras */}
                      <h4 className="font-semibold text-base">{event.statusLabel}</h4>

                      {/* Description (si présente) */}
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                      )}

                      {/* Localisation avec icône MapPin */}
                      <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" weight="fill" />
                        {event.location}
                      </p>

                      {/* Date et heure formatées */}
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================
          SECTION 4 : ALERT INCITATION À SE CONNECTER
          =================================================================== */}
      {/* ===================================================================
          SECTION 4 : ALERT INCITATION À SE CONNECTER
          Liste les fonctionnalités exclusives aux utilisateurs connectés
          =================================================================== */}
      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 text-lg">
          Accédez à plus de fonctionnalités
        </AlertTitle>
        <AlertDescription className="text-blue-800 space-y-3">
          <p>
            Connectez-vous ou créez un compte pour accéder à :
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Les coordonnées GPS et localisation détaillée</li>
            <li>Les documents de transport et factures</li>
            <li>Les notifications en temps réel par email/SMS</li>
            <li>Les informations de coût et de tarification</li>
          </ul>
          <div className="flex gap-2 mt-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/sign-in">Se connecter</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Créer un compte gratuit</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
