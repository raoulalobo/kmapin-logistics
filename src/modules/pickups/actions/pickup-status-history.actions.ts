/**
 * Server Actions : Historique des Statuts de Demandes d'Enlèvement
 *
 * Gère l'enregistrement et la récupération de l'historique des changements
 * de statut pour assurer la traçabilité complète (audit trail pattern).
 *
 * Fonctionnalités :
 * - Enregistrer automatiquement chaque changement de statut
 * - Récupérer l'historique complet d'une demande
 * - Associer chaque changement à l'agent responsable
 * - Permettre l'ajout de notes explicatives
 *
 * @module modules/pickups/actions/pickup-status-history
 */

'use server';

import { getSession } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import { PickupStatus } from '@/generated/prisma';

/**
 * Type de retour pour un élément d'historique de statut
 */
export interface PickupStatusHistoryItem {
  id: string;
  oldStatus: PickupStatus | null;
  newStatus: PickupStatus;
  changedAt: Date;
  changedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  notes: string | null;
}

/**
 * Résultat d'opération pour les Server Actions
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Enregistre un changement de statut dans l'historique
 *
 * Cette fonction doit être appelée à chaque fois qu'un statut de demande
 * d'enlèvement est modifié, soit manuellement par un agent, soit
 * automatiquement par le système.
 *
 * @param params - Paramètres du changement de statut
 * @returns Résultat de l'opération avec l'entrée d'historique créée
 *
 * @example
 * ```typescript
 * await recordStatusChange({
 *   pickupRequestId: 'clxxx...',
 *   oldStatus: PickupStatus.REQUESTED,
 *   newStatus: PickupStatus.SCHEDULED,
 *   notes: 'Planifié pour demain 14h'
 * });
 * ```
 */
export async function recordStatusChange(params: {
  pickupRequestId: string;
  oldStatus: PickupStatus | null;
  newStatus: PickupStatus;
  notes?: string;
}): Promise<ActionResult<PickupStatusHistoryItem>> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        error: 'Vous devez être connecté pour effectuer cette action',
      };
    }

    const db = getEnhancedPrismaFromSession(session);

    // Récupérer la demande d'enlèvement pour obtenir le clientId
    const pickupRequest = await db.pickupRequest.findUnique({
      where: { id: params.pickupRequestId },
      select: { clientId: true },
    });

    if (!pickupRequest) {
      return {
        success: false,
        error: 'Demande d\'enlèvement introuvable',
      };
    }

    // Créer l'entrée d'historique avec access control automatique (Zenstack)
    const historyEntry = await db.pickupStatusHistory.create({
      data: {
        pickupRequestId: params.pickupRequestId,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        changedById: session.user.id,
        notes: params.notes || null,
        clientId: pickupRequest.clientId,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: historyEntry,
      message: 'Changement de statut enregistré dans l\'historique',
    };
  } catch (error) {
    console.error('[recordStatusChange] Erreur:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'enregistrement de l\'historique',
    };
  }
}

/**
 * Récupère l'historique complet des changements de statut d'une demande
 *
 * Retourne tous les changements de statut triés chronologiquement
 * (du plus ancien au plus récent) avec les informations de l'agent
 * qui a effectué chaque changement.
 *
 * Access Control : Seuls les utilisateurs autorisés à voir la demande
 * d'enlèvement peuvent voir son historique (appliqué automatiquement
 * via les policies Zenstack).
 *
 * @param pickupRequestId - ID de la demande d'enlèvement
 * @returns Liste des changements de statut
 *
 * @example
 * ```typescript
 * const result = await getPickupStatusHistory('clxxx...');
 * if (result.success && result.data) {
 *   result.data.forEach(entry => {
 *     console.log(`${entry.oldStatus} → ${entry.newStatus} par ${entry.changedBy.name}`);
 *   });
 * }
 * ```
 */
export async function getPickupStatusHistory(
  pickupRequestId: string
): Promise<ActionResult<PickupStatusHistoryItem[]>> {
  try {
    // Vérifier l'authentification
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        error: 'Vous devez être connecté pour voir l\'historique',
      };
    }

    const db = getEnhancedPrismaFromSession(session);

    // Récupérer l'historique avec access control automatique
    // Si l'utilisateur n'a pas accès à la demande, Zenstack retournera []
    const history = await db.pickupStatusHistory.findMany({
      where: {
        pickupRequestId,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        changedAt: 'asc', // Du plus ancien au plus récent
      },
    });

    return {
      success: true,
      data: history,
      message: `${history.length} entrée(s) d'historique récupérée(s)`,
    };
  } catch (error) {
    console.error('[getPickupStatusHistory] Erreur:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    };
  }
}

/**
 * Récupère le nombre total de changements de statut pour une demande
 *
 * Utile pour afficher un compteur ou valider qu'un historique existe.
 *
 * @param pickupRequestId - ID de la demande d'enlèvement
 * @returns Nombre d'entrées dans l'historique
 */
export async function getPickupStatusHistoryCount(
  pickupRequestId: string
): Promise<ActionResult<number>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return {
        success: false,
        error: 'Vous devez être connecté',
      };
    }

    const db = getEnhancedPrismaFromSession(session);

    const count = await db.pickupStatusHistory.count({
      where: {
        pickupRequestId,
      },
    });

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('[getPickupStatusHistoryCount] Erreur:', error);
    return {
      success: false,
      error: 'Erreur lors du comptage',
    };
  }
}
