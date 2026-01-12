'use server';

/**
 * Server Actions pour les demandes d'enlèvement guest (non connecté)
 *
 * Ces actions utilisent le client Prisma STANDARD (pas enhanced) car elles gèrent
 * des données accessibles publiquement (création par utilisateurs non authentifiés).
 *
 * Pattern similaire à GuestQuote:
 * 1. Création publique sans authentification
 * 2. Association à un Prospect (créé ou existant)
 * 3. Génération d'un numéro unique format GPK-YYYYMMDD-XXXXX
 * 4. Email de confirmation avec lien d'invitation
 * 5. Conversion en PickupRequest lors de l'inscription
 *
 * @module modules/pickups/actions/guest-pickup
 */

import { prisma } from '@/lib/db/client';
import { guestPickupRequestSchema } from '../schemas/guest-pickup.schema';
import { PickupStatus } from '@/lib/db/enums';
import { revalidatePath } from 'next/cache';

/**
 * Génère un numéro unique pour GuestPickupRequest
 * Format: GPK-YYYYMMDD-XXXXX (ex: GPK-20260109-00042)
 *
 * Logique:
 * 1. Récupère le dernier numéro créé aujourd'hui
 * 2. Incrémente le séquence (+1)
 * 3. Pad avec des zéros (5 chiffres)
 *
 * @returns Numéro unique de demande guest pickup
 */
async function generateGuestPickupRequestNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const lastRequest = await prisma.guestPickupRequest.findFirst({
    where: {
      requestNumber: {
        startsWith: `GPK-${dateStr}`,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let sequence = 1;
  if (lastRequest) {
    const lastSequence = parseInt(lastRequest.requestNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `GPK-${dateStr}-${sequence.toString().padStart(5, '0')}`;
}

/**
 * Créer une demande d'enlèvement pour un utilisateur non connecté
 *
 * Workflow:
 * 1. Valider les données avec Zod
 * 2. Créer ou réutiliser le Prospect (basé sur email)
 * 3. Générer un numéro unique GPK-YYYYMMDD-XXXXX
 * 4. Créer le GuestPickupRequest
 * 5. NOTIFICATIONS : Affichage modal seulement (pas d'email pour l'instant)
 * 6. Revalider les caches Next.js
 *
 * Notes:
 * - Utilise prisma standard (pas enhanced) car accès public
 * - Le token d'invitation expire après 7 jours
 * - Statut initial toujours REQUESTED
 * - IMPORTANT : Aucun email n'est envoyé pour l'instant (fonctionnalité future)
 * - Le client reçoit uniquement une notification modale avec invitation à créer un compte
 *
 * @param data - Données validées du formulaire
 * @returns Success avec prospectId, requestNumber et invitationToken, ou erreur
 */
export async function createGuestPickupRequestAction(data: unknown) {
  try {
    // 1. Valider les données avec Zod
    const validated = guestPickupRequestSchema.parse(data);

    // 2. Créer ou récupérer le Prospect
    let prospect = await prisma.prospect.findUnique({
      where: { email: validated.prospectEmail },
    });

    if (!prospect) {
      // Créer nouveau prospect avec token d'invitation
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 jours

      prospect = await prisma.prospect.create({
        data: {
          email: validated.prospectEmail,
          phone: validated.prospectPhone,
          name: validated.prospectName || null,
          invitationExpiresAt,
          status: 'PENDING',
        },
      });
    }

    // 3. Générer numéro de demande
    const requestNumber = await generateGuestPickupRequestNumber();

    // 4. Créer la demande d'enlèvement guest
    const guestPickup = await prisma.guestPickupRequest.create({
      data: {
        prospectId: prospect.id,
        requestNumber,

        // Adresse
        pickupAddress: validated.pickupAddress,
        pickupCity: validated.pickupCity,
        pickupPostalCode: validated.pickupPostalCode,
        pickupCountry: validated.pickupCountry,

        // Contact
        pickupContact: validated.pickupContact,
        pickupPhone: validated.pickupPhone,

        // Planification
        requestedDate: new Date(validated.requestedDate),
        timeSlot: validated.timeSlot,
        pickupTime: validated.pickupTime,

        // Marchandise
        cargoType: validated.cargoType,
        estimatedWeight: validated.estimatedWeight,
        estimatedVolume: validated.estimatedVolume,
        description: validated.description,

        // Instructions
        specialInstructions: validated.specialInstructions,
        accessInstructions: validated.accessInstructions,

        // Statut initial
        status: PickupStatus.REQUESTED,
      },
    });

    // 5. EMAILS DÉSACTIVÉS : Pas d'envoi d'email pour l'instant
    // Raison : Le client est notifié uniquement via une modale (toast) côté frontend
    // L'envoi d'email sera implémenté ultérieurement si nécessaire
    // await sendGuestPickupConfirmationEmail(prospect, guestPickup);

    // 6. Revalider les caches
    revalidatePath('/dashboard/pickups');

    return {
      success: true,
      data: {
        prospectId: prospect.id,
        requestNumber: guestPickup.requestNumber,
        guestPickupId: guestPickup.id,
        invitationToken: prospect.invitationToken,
      },
      message: 'Demande d\'enlèvement enregistrée avec succès',
    };
  } catch (error: any) {
    console.error('Erreur création GuestPickupRequest:', error);

    return {
      success: false,
      error: error.message || 'Erreur lors de la création de la demande',
    };
  }
}

/**
 * Lister les GuestPickupRequests (pour dashboard admin)
 *
 * Utilisation:
 * - Dashboard admin pour voir toutes les demandes guest
 * - Filtrage par statut optionnel
 * - Pagination avec limit/offset
 *
 * Permissions:
 * - Accessible uniquement côté serveur (via Server Action)
 * - Les access policies Zenstack s'appliquent automatiquement
 *
 * @param params - Paramètres de filtrage et pagination
 * @returns Liste de GuestPickupRequests avec Prospect inclus
 */
export async function listGuestPickupRequestsAction(params?: {
  status?: PickupStatus;
  page?: number;
  limit?: number;
}) {
  try {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.status) {
      where.status = params.status;
    }

    const [requests, total] = await Promise.all([
      prisma.guestPickupRequest.findMany({
        where,
        include: {
          prospect: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.guestPickupRequest.count({ where }),
    ]);

    return {
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération',
    };
  }
}
