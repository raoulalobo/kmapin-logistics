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
import { Separator } from '@/components/ui/separator';
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
          SECTION 2 : INFORMATIONS TRANSPORT
          =================================================================== */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informations Transport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Origine → Destination */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Origine</p>
              <p className="text-lg font-semibold">
                {tracking.originCity}, {tracking.originCountry}
              </p>
            </div>

            <div className="px-4">
              <TrendUp className="h-6 w-6 text-blue-600" weight="bold" />
            </div>

            <div className="flex-1 text-right">
              <p className="text-sm text-gray-600">Destination</p>
              <p className="text-lg font-semibold">
                {tracking.destinationCity}, {tracking.destinationCountry}
              </p>
            </div>
          </div>

          <Separator />

          {/* Détails */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Poids</p>
              <p className="font-semibold">{tracking.weight.toLocaleString('fr-FR')} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nombre de colis</p>
              <p className="font-semibold">{tracking.packageCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type de marchandise</p>
              <p className="font-semibold">{tracking.cargoType}</p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            {tracking.estimatedDeliveryDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Livraison estimée</p>
                  <p className="font-semibold">
                    {format(new Date(tracking.estimatedDeliveryDate), 'dd MMMM yyyy', {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            )}

            {tracking.actualDeliveryDate && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" weight="fill" />
                <div>
                  <p className="text-sm text-gray-600">Livré le</p>
                  <p className="font-semibold">
                    {format(new Date(tracking.actualDeliveryDate), 'dd MMMM yyyy à HH:mm', {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mode de transport */}
          {tracking.transportMode.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-gray-600 mb-2">Mode(s) de transport</p>
                <div className="flex gap-2 flex-wrap">
                  {tracking.transportMode.map((mode, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {mode}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================
          SECTION 3 : DERNIER STATUT (un seul événement pour les guests)
          =================================================================== */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Dernier Statut
          </CardTitle>
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
            // Affichage du dernier événement uniquement (guests)
            <div className="space-y-4">
              {(() => {
                // Récupérer le dernier (et unique) événement
                const event = tracking.trackingEvents[0];
                const eventBadge = getStatusBadge(event.status);

                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Icône du statut */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-12 w-12 rounded-full ${eventBadge.color} flex items-center justify-center text-white`}
                      >
                        {eventBadge.icon}
                      </div>
                    </div>

                    {/* Contenu de l'événement */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-xl">{event.statusLabel}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(event.timestamp), 'dd MMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4" weight="fill" />
                        {event.location}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Message pour inciter à créer un compte */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  <Info className="h-4 w-4 inline-block mr-1" />
                  Connectez-vous pour voir l'historique complet des événements
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================================================================
          SECTION 4 : ALERT INCITATION À SE CONNECTER
          =================================================================== */}
      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 text-lg">
          Accédez à plus de fonctionnalités
        </AlertTitle>
        <AlertDescription className="text-blue-800 space-y-3">
          <p>
            Le tracking public affiche uniquement le dernier statut. Connectez-vous
            ou créez un compte pour accéder à :
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>L'historique complet</strong> de tous les événements de suivi</li>
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
