/**
 * EXEMPLE D'UTILISATION : Tracking des modifications d'adresses
 *
 * Ce fichier montre comment utiliser les helpers de logging pour tracker
 * les modifications d'adresses dans les devis et expéditions.
 *
 * Pattern Snapshot/Immutable Data :
 * - Les anciennes valeurs sont conservées dans metadata
 * - Permet la résolution de litiges
 * - Conforme RGPD/ISO (audit trail complet)
 *
 * @module modules/quotes/lib/address-tracking-example
 */

import { logQuoteAddressUpdated } from './quote-log-helper';
import { logShipmentAddressUpdated } from '@/modules/shipments/lib/shipment-log-helper';
import { prisma } from '@/lib/db/client';

// ============================================
// EXEMPLE 1 : Mise à jour d'adresse dans un Quote
// ============================================

/**
 * Fonction helper pour détecter et logger les changements d'adresse dans un Quote
 *
 * Cette fonction compare les anciennes et nouvelles valeurs,
 * identifie les champs modifiés et enregistre l'événement dans l'historique.
 *
 * @param quoteId - ID du devis à modifier
 * @param newAddressData - Nouvelles données d'adresse
 * @param changedById - ID de l'utilisateur effectuant la modification
 * @param addressType - Type d'adresse ('origin' ou 'destination')
 *
 * @example
 * ```ts
 * // Dans une Server Action de mise à jour de devis
 * await updateQuoteAddressWithTracking(
 *   'clxxx',
 *   {
 *     destinationAddress: '456 Avenue Nouvelle',
 *     destinationCity: 'Lyon',
 *     destinationPostalCode: '69001',
 *   },
 *   session.user.id,
 *   'destination'
 * );
 * ```
 */
export async function updateQuoteAddressWithTracking(
  quoteId: string,
  newAddressData: {
    // Adresse origine
    originAddress?: string;
    originCity?: string;
    originPostalCode?: string;
    originContactName?: string;
    originContactPhone?: string;
    originContactEmail?: string;
    // Adresse destination
    destinationAddress?: string;
    destinationCity?: string;
    destinationPostalCode?: string;
    destinationContactName?: string;
    destinationContactPhone?: string;
    destinationContactEmail?: string;
  },
  changedById: string,
  addressType: 'origin' | 'destination',
  reason?: string
) {
  // 1. Récupérer le devis existant
  const existingQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      // Adresses origine
      originAddress: true,
      originCity: true,
      originPostalCode: true,
      originContactName: true,
      originContactPhone: true,
      originContactEmail: true,
      // Adresses destination
      destinationAddress: true,
      destinationCity: true,
      destinationPostalCode: true,
      destinationContactName: true,
      destinationContactPhone: true,
      destinationContactEmail: true,
    },
  });

  if (!existingQuote) {
    throw new Error('Devis introuvable');
  }

  // 2. Déterminer les champs modifiés
  const changedFields: string[] = [];
  const oldAddress: Record<string, string | null> = {};
  const newAddress: Record<string, string | null> = {};

  // Définir les champs à comparer selon le type d'adresse
  const fieldsToCheck =
    addressType === 'origin'
      ? [
          { key: 'originAddress', label: 'address' },
          { key: 'originCity', label: 'city' },
          { key: 'originPostalCode', label: 'postalCode' },
          { key: 'originContactName', label: 'contactName' },
          { key: 'originContactPhone', label: 'contactPhone' },
          { key: 'originContactEmail', label: 'contactEmail' },
        ]
      : [
          { key: 'destinationAddress', label: 'address' },
          { key: 'destinationCity', label: 'city' },
          { key: 'destinationPostalCode', label: 'postalCode' },
          { key: 'destinationContactName', label: 'contactName' },
          { key: 'destinationContactPhone', label: 'contactPhone' },
          { key: 'destinationContactEmail', label: 'contactEmail' },
        ];

  // Comparer chaque champ
  for (const field of fieldsToCheck) {
    const oldValue = existingQuote[field.key as keyof typeof existingQuote] as
      | string
      | null;
    const newValue =
      newAddressData[field.key as keyof typeof newAddressData] ?? oldValue;

    // Si modification détectée
    if (oldValue !== newValue) {
      changedFields.push(field.label);
      oldAddress[field.label] = oldValue;
      newAddress[field.label] = newValue ?? null;
    }
  }

  // 3. Si aucun changement, ne rien faire
  if (changedFields.length === 0) {
    console.log('Aucune modification d\'adresse détectée');
    return { updated: false, changedFields: [] };
  }

  // 4. Mettre à jour le devis
  const updateData: Record<string, string | null> = {};
  for (const field of fieldsToCheck) {
    const newValue =
      newAddressData[field.key as keyof typeof newAddressData];
    if (newValue !== undefined) {
      updateData[field.key] = newValue ?? null;
    }
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: updateData,
  });

  // 5. Logger la modification dans l'historique
  await logQuoteAddressUpdated({
    quoteId,
    changedById,
    addressType,
    changedFields,
    oldAddress,
    newAddress,
    reason,
    notes: `Adresse ${addressType === 'origin' ? 'expéditeur' : 'destinataire'} modifiée (${changedFields.join(', ')})`,
  });

  return {
    updated: true,
    changedFields,
    oldAddress,
    newAddress,
  };
}

// ============================================
// EXEMPLE 2 : Mise à jour d'adresse dans un Shipment
// ============================================

/**
 * Fonction helper pour détecter et logger les changements d'adresse dans un Shipment
 *
 * Similaire à updateQuoteAddressWithTracking mais pour les expéditions.
 * Utilisé lorsque le client modifie son adresse après création du Shipment.
 *
 * @param shipmentId - ID de l'expédition à modifier
 * @param newAddressData - Nouvelles données d'adresse
 * @param changedById - ID de l'utilisateur effectuant la modification
 * @param addressType - Type d'adresse ('origin' ou 'destination')
 * @param reason - Raison de la modification (recommandé pour audit)
 *
 * @example Changement d'adresse de livraison suite à déménagement
 * ```ts
 * await updateShipmentAddressWithTracking(
 *   'clxxx',
 *   {
 *     destinationAddress: '789 Nouvelle Résidence',
 *     destinationCity: 'Bobo-Dioulasso',
 *     destinationPostalCode: '01 BP 5678',
 *     destinationContactPhone: '+226 70 99 88 77',
 *   },
 *   session.user.id,
 *   'destination',
 *   'Client a déménagé - nouvelle adresse confirmée par téléphone'
 * );
 * ```
 */
export async function updateShipmentAddressWithTracking(
  shipmentId: string,
  newAddressData: {
    // Adresse origine
    originAddress?: string;
    originCity?: string;
    originPostalCode?: string;
    originContact?: string;
    originPhone?: string;
    originEmail?: string;
    // Adresse destination
    destinationAddress?: string;
    destinationCity?: string;
    destinationPostalCode?: string;
    destinationContact?: string;
    destinationPhone?: string;
    destinationEmail?: string;
  },
  changedById: string,
  addressType: 'origin' | 'destination',
  reason?: string
) {
  // 1. Récupérer l'expédition existante
  const existingShipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      // Adresses origine
      originAddress: true,
      originCity: true,
      originPostalCode: true,
      originContact: true,
      originPhone: true,
      originEmail: true,
      // Adresses destination
      destinationAddress: true,
      destinationCity: true,
      destinationPostalCode: true,
      destinationContact: true,
      destinationPhone: true,
      destinationEmail: true,
    },
  });

  if (!existingShipment) {
    throw new Error('Expédition introuvable');
  }

  // 2. Déterminer les champs modifiés
  const changedFields: string[] = [];
  const oldAddress: Record<string, string | null> = {};
  const newAddress: Record<string, string | null> = {};

  // Définir les champs à comparer selon le type d'adresse
  const fieldsToCheck =
    addressType === 'origin'
      ? [
          { key: 'originAddress', label: 'address' },
          { key: 'originCity', label: 'city' },
          { key: 'originPostalCode', label: 'postalCode' },
          { key: 'originContact', label: 'contactName' },
          { key: 'originPhone', label: 'contactPhone' },
          { key: 'originEmail', label: 'contactEmail' },
        ]
      : [
          { key: 'destinationAddress', label: 'address' },
          { key: 'destinationCity', label: 'city' },
          { key: 'destinationPostalCode', label: 'postalCode' },
          { key: 'destinationContact', label: 'contactName' },
          { key: 'destinationPhone', label: 'contactPhone' },
          { key: 'destinationEmail', label: 'contactEmail' },
        ];

  // Comparer chaque champ
  for (const field of fieldsToCheck) {
    const oldValue = existingShipment[
      field.key as keyof typeof existingShipment
    ] as string | null;
    const newValue =
      newAddressData[field.key as keyof typeof newAddressData] ?? oldValue;

    // Si modification détectée
    if (oldValue !== newValue) {
      changedFields.push(field.label);
      oldAddress[field.label] = oldValue;
      newAddress[field.label] = newValue ?? null;
    }
  }

  // 3. Si aucun changement, ne rien faire
  if (changedFields.length === 0) {
    console.log('Aucune modification d\'adresse détectée');
    return { updated: false, changedFields: [] };
  }

  // 4. Mettre à jour l'expédition
  const updateData: Record<string, string | null> = {};
  for (const field of fieldsToCheck) {
    const newValue =
      newAddressData[field.key as keyof typeof newAddressData];
    if (newValue !== undefined) {
      updateData[field.key] = newValue ?? null;
    }
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: updateData,
  });

  // 5. Logger la modification dans l'historique
  await logShipmentAddressUpdated({
    shipmentId,
    changedById,
    addressType,
    changedFields,
    oldAddress,
    newAddress,
    reason,
    notes:
      reason ||
      `Adresse ${addressType === 'origin' ? 'expéditeur' : 'destinataire'} modifiée (${changedFields.join(', ')})`,
  });

  return {
    updated: true,
    changedFields,
    oldAddress,
    newAddress,
  };
}

// ============================================
// EXEMPLE 3 : Utilisation dans une Server Action
// ============================================

/**
 * Exemple de Server Action pour mettre à jour l'adresse d'un devis
 *
 * Cette action :
 * 1. Vérifie l'authentification
 * 2. Valide les données avec Zod
 * 3. Détecte les modifications d'adresse
 * 4. Met à jour le devis ET enregistre l'événement dans l'historique
 *
 * @example Utilisation dans un composant
 * ```tsx
 * 'use client';
 * import { updateQuoteDestinationAddressAction } from '@/modules/quotes/actions/quote.actions';
 *
 * function UpdateAddressForm({ quoteId }) {
 *   const handleSubmit = async (data) => {
 *     const result = await updateQuoteDestinationAddressAction(quoteId, data);
 *     if (result.success) {
 *       toast.success('Adresse mise à jour avec succès');
 *     }
 *   };
 *   // ...
 * }
 * ```
 */
export async function exampleServerAction(
  quoteId: string,
  newAddressData: {
    destinationAddress?: string;
    destinationCity?: string;
    destinationPostalCode?: string;
    destinationContactName?: string;
    destinationContactPhone?: string;
    destinationContactEmail?: string;
  },
  reason?: string
) {
  'use server';

  // 1. Vérifier l'authentification (utiliser requireAuth dans le vrai code)
  // const session = await requireAuth();
  const session = { user: { id: 'clxxx', role: 'ADMIN' } }; // Mock pour l'exemple

  // 2. Mettre à jour avec tracking
  const result = await updateQuoteAddressWithTracking(
    quoteId,
    newAddressData,
    session.user.id,
    'destination',
    reason
  );

  if (result.updated) {
    return {
      success: true,
      message: `${result.changedFields.length} champ(s) modifié(s)`,
      changedFields: result.changedFields,
    };
  }

  return {
    success: true,
    message: 'Aucune modification',
  };
}

// ============================================
// EXEMPLE 4 : Récupérer l'historique des modifications
// ============================================

/**
 * Récupère toutes les modifications d'adresse pour un devis
 *
 * Utile pour afficher un historique complet dans l'interface utilisateur
 * ou pour résoudre des litiges.
 *
 * @param quoteId - ID du devis
 * @returns Liste des modifications d'adresse avec détails
 *
 * @example
 * ```ts
 * const history = await getQuoteAddressHistory('clxxx');
 *
 * // Afficher dans l'UI
 * history.forEach((change) => {
 *   console.log(`${change.createdAt}: ${change.notes}`);
 *   console.log(`Modifié par: ${change.changedBy?.name}`);
 *   console.log(`Champs: ${change.metadata.changedFields.join(', ')}`);
 * });
 * ```
 */
export async function getQuoteAddressHistory(quoteId: string) {
  return await prisma.quoteLog.findMany({
    where: {
      quoteId,
      eventType: 'ADDRESS_UPDATED',
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Récupère toutes les modifications d'adresse pour une expédition
 *
 * @param shipmentId - ID de l'expédition
 * @returns Liste des modifications d'adresse avec détails
 */
export async function getShipmentAddressHistory(shipmentId: string) {
  return await prisma.shipmentLog.findMany({
    where: {
      shipmentId,
      eventType: 'ADDRESS_UPDATED',
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
