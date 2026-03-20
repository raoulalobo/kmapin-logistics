/**
 * Server Actions : Dépôts (Depots)
 *
 * Actions serveur pour la gestion CRUD des dépôts et de leurs contacts.
 * - Dépôts : listDepots, getDepot, createDepot, updateDepot, deleteDepot, listDepotsForSelect
 * - Contacts : addDepotContact, updateDepotContact, removeDepotContact
 *
 * La gestion du flag `isDefault` (dépôt par défaut) et `isPrimary` (contact principal)
 * utilise des transactions Prisma pour garantir l'unicité.
 *
 * @module modules/depots/actions
 */

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { requireAuth, requireAdmin } from '@/lib/auth/config';
import {
  createDepotSchema,
  updateDepotSchema,
  depotContactSchema,
  type CreateDepotData,
  type UpdateDepotData,
  type DepotContactData,
} from '../schemas/depot.schema';

// ════════════════════════════════════════════
// ACTIONS DÉPÔTS
// ════════════════════════════════════════════

/**
 * Lister tous les dépôts actifs
 *
 * Retourne les dépôts actifs triés par nom, avec le nombre de contacts par dépôt.
 * Accessible à tous les utilisateurs authentifiés (pour affichage dans les sélecteurs).
 *
 * @returns Liste des dépôts actifs avec count contacts
 *
 * @example
 * ```ts
 * const depots = await listDepots();
 * // [{ id: "...", name: "Dépôt Ouaga", code: "OUA-01", _count: { contacts: 3 }, ... }]
 * ```
 */
export async function listDepots() {
  await requireAuth();

  const depots = await prisma.depot.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { contacts: true },
      },
    },
    orderBy: [
      { isDefault: 'desc' }, // Dépôt par défaut en premier
      { name: 'asc' },
    ],
  });

  return depots;
}

/**
 * Récupérer un dépôt par son ID avec tous ses contacts
 *
 * @param id - ID du dépôt
 * @returns Le dépôt avec ses contacts triés (primary en premier), ou null si introuvable
 */
export async function getDepot(id: string) {
  await requireAuth();

  const depot = await prisma.depot.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [
          { isPrimary: 'desc' }, // Contact principal en premier
          { name: 'asc' },
        ],
      },
      _count: {
        select: {
          quotes: true,
          shipments: true,
        },
      },
    },
  });

  return depot;
}

/**
 * Créer un nouveau dépôt
 *
 * Si `isDefault=true`, tous les autres dépôts perdent leur flag default via transaction.
 * Réservé aux administrateurs.
 *
 * @param data - Données du dépôt validées par createDepotSchema
 * @returns Le dépôt créé
 * @throws Error si le code existe déjà ou si l'utilisateur n'est pas admin
 */
export async function createDepot(data: CreateDepotData) {
  await requireAdmin();

  // Valider les données avec Zod
  const validated = createDepotSchema.parse(data);

  // Nettoyer l'email vide (champ optionnel qui peut être envoyé comme '')
  if (validated.email === '') {
    validated.email = undefined;
  }

  // Vérifier l'unicité du code
  const existing = await prisma.depot.findUnique({
    where: { code: validated.code },
  });
  if (existing) {
    throw new Error(`Un dépôt avec le code "${validated.code}" existe déjà`);
  }

  // Transaction : si isDefault=true, reset les autres dépôts
  const depot = await prisma.$transaction(async (tx) => {
    if (validated.isDefault) {
      // Désactiver le flag default sur tous les autres dépôts
      await tx.depot.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.depot.create({
      data: validated,
    });
  });

  // Invalider le cache du dépôt par défaut si nécessaire
  if (validated.isDefault) {
    revalidateTag('default-depot');
  }

  revalidatePath('/dashboard/depots');
  return depot;
}

/**
 * Mettre à jour un dépôt existant
 *
 * Si `isDefault=true`, tous les autres dépôts perdent leur flag default via transaction.
 * Si le code change, vérifie l'unicité du nouveau code.
 * Réservé aux administrateurs.
 *
 * @param id - ID du dépôt à modifier
 * @param data - Données partielles à mettre à jour
 * @returns Le dépôt mis à jour
 */
export async function updateDepot(id: string, data: UpdateDepotData) {
  await requireAdmin();

  const validated = updateDepotSchema.parse(data);

  // Nettoyer l'email vide
  if (validated.email === '') {
    validated.email = undefined;
  }

  // Vérifier l'unicité du code si changement
  if (validated.code) {
    const existing = await prisma.depot.findFirst({
      where: {
        code: validated.code,
        id: { not: id },
      },
    });
    if (existing) {
      throw new Error(`Un dépôt avec le code "${validated.code}" existe déjà`);
    }
  }

  // Transaction : si isDefault=true, reset les autres dépôts
  const depot = await prisma.$transaction(async (tx) => {
    if (validated.isDefault) {
      await tx.depot.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.depot.update({
      where: { id },
      data: validated,
    });
  });

  // Invalider le cache du dépôt par défaut
  revalidateTag('default-depot');
  revalidatePath('/dashboard/depots');
  revalidatePath(`/dashboard/depots/${id}`);

  return depot;
}

/**
 * Supprimer un dépôt (soft-delete via isActive=false)
 *
 * Empêche la suppression du dernier dépôt actif.
 * Si le dépôt supprimé est le dépôt par défaut, aucun dépôt ne sera par défaut
 * (l'admin devra en désigner un autre manuellement).
 *
 * @param id - ID du dépôt à désactiver
 * @throws Error si c'est le seul dépôt actif
 */
export async function deleteDepot(id: string) {
  await requireAdmin();

  // Vérifier qu'il reste au moins un autre dépôt actif
  const activeCount = await prisma.depot.count({
    where: { isActive: true },
  });

  if (activeCount <= 1) {
    throw new Error('Impossible de supprimer le dernier dépôt actif. Créez un autre dépôt avant de supprimer celui-ci.');
  }

  await prisma.depot.update({
    where: { id },
    data: { isActive: false },
  });

  // Invalider les caches
  revalidateTag('default-depot');
  revalidatePath('/dashboard/depots');

  return { success: true };
}

// ════════════════════════════════════════════
// ACTIONS CONTACTS
// ════════════════════════════════════════════

/**
 * Ajouter un contact à un dépôt
 *
 * Si c'est le premier contact du dépôt, il est automatiquement marqué isPrimary=true.
 * Si isPrimary=true, les autres contacts du dépôt perdent leur flag via transaction.
 * Met à jour les champs dénormalisés phone/email du dépôt si le contact est primary.
 *
 * @param depotId - ID du dépôt parent
 * @param data - Données du contact validées par depotContactSchema
 * @returns Le contact créé
 */
export async function addDepotContact(depotId: string, data: DepotContactData) {
  await requireAdmin();

  const validated = depotContactSchema.parse(data);

  // Nettoyer l'email vide
  if (validated.email === '') {
    validated.email = undefined;
  }

  // Vérifier que le dépôt existe
  const depot = await prisma.depot.findUnique({
    where: { id: depotId },
    include: { _count: { select: { contacts: true } } },
  });

  if (!depot) {
    throw new Error('Dépôt introuvable');
  }

  // Si c'est le premier contact, forcer isPrimary=true
  const isFirstContact = depot._count.contacts === 0;
  if (isFirstContact) {
    validated.isPrimary = true;
  }

  const contact = await prisma.$transaction(async (tx) => {
    // Si isPrimary, désactiver les autres contacts primary du même dépôt
    if (validated.isPrimary) {
      await tx.depotContact.updateMany({
        where: { depotId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await tx.depotContact.create({
      data: {
        ...validated,
        depotId,
      },
    });

    // Synchroniser les champs dénormalisés du dépôt si contact primary
    if (validated.isPrimary) {
      await tx.depot.update({
        where: { id: depotId },
        data: {
          phone: validated.phone ?? depot.phone,
          email: validated.email ?? depot.email,
        },
      });
    }

    return created;
  });

  revalidateTag('default-depot');
  revalidatePath(`/dashboard/depots/${depotId}`);

  return contact;
}

/**
 * Mettre à jour un contact de dépôt
 *
 * Si isPrimary passe à true, les autres contacts du dépôt perdent leur flag.
 * Synchronise les champs dénormalisés phone/email du dépôt si le contact est primary.
 *
 * @param contactId - ID du contact à modifier
 * @param data - Données partielles du contact
 * @returns Le contact mis à jour
 */
export async function updateDepotContact(contactId: string, data: DepotContactData) {
  await requireAdmin();

  const validated = depotContactSchema.parse(data);

  // Nettoyer l'email vide
  if (validated.email === '') {
    validated.email = undefined;
  }

  // Récupérer le contact existant pour connaître son depotId
  const existingContact = await prisma.depotContact.findUnique({
    where: { id: contactId },
  });

  if (!existingContact) {
    throw new Error('Contact introuvable');
  }

  const depotId = existingContact.depotId;

  const contact = await prisma.$transaction(async (tx) => {
    // Si isPrimary, désactiver les autres contacts primary du même dépôt
    if (validated.isPrimary) {
      await tx.depotContact.updateMany({
        where: { depotId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updated = await tx.depotContact.update({
      where: { id: contactId },
      data: validated,
    });

    // Synchroniser les champs dénormalisés du dépôt si contact primary
    if (validated.isPrimary) {
      await tx.depot.update({
        where: { id: depotId },
        data: {
          phone: validated.phone,
          email: validated.email,
        },
      });
    }

    return updated;
  });

  revalidateTag('default-depot');
  revalidatePath(`/dashboard/depots/${depotId}`);

  return contact;
}

/**
 * Supprimer un contact de dépôt
 *
 * Si le contact supprimé est le contact principal (isPrimary=true),
 * le flag est reporté sur le contact le plus ancien du dépôt.
 *
 * @param contactId - ID du contact à supprimer
 */
export async function removeDepotContact(contactId: string) {
  await requireAdmin();

  const contact = await prisma.depotContact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    throw new Error('Contact introuvable');
  }

  const depotId = contact.depotId;

  await prisma.$transaction(async (tx) => {
    // Supprimer le contact
    await tx.depotContact.delete({
      where: { id: contactId },
    });

    // Si c'était le contact primary, reporter sur le plus ancien
    if (contact.isPrimary) {
      const nextPrimary = await tx.depotContact.findFirst({
        where: { depotId },
        orderBy: { createdAt: 'asc' },
      });

      if (nextPrimary) {
        await tx.depotContact.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });

        // Synchroniser les champs dénormalisés
        await tx.depot.update({
          where: { id: depotId },
          data: {
            phone: nextPrimary.phone,
            email: nextPrimary.email,
          },
        });
      } else {
        // Plus de contacts → vider les champs dénormalisés
        await tx.depot.update({
          where: { id: depotId },
          data: { phone: null, email: null },
        });
      }
    }
  });

  revalidateTag('default-depot');
  revalidatePath(`/dashboard/depots/${depotId}`);

  return { success: true };
}

// ════════════════════════════════════════════
// SÉLECTEURS (pour formulaires Quote/Shipment)
// ════════════════════════════════════════════

/**
 * Lister les dépôts actifs pour un sélecteur (combobox)
 *
 * Retourne uniquement id, name, code et isDefault pour minimiser le payload.
 * Le dépôt par défaut est en premier pour la pré-sélection automatique.
 *
 * @returns Liste simplifiée des dépôts pour les sélecteurs
 *
 * @example
 * ```ts
 * const options = await listDepotsForSelect();
 * // [{ id: "...", name: "Dépôt Ouaga", code: "OUA-01", isDefault: true }]
 * ```
 */
export async function listDepotsForSelect() {
  await requireAuth();

  const depots = await prisma.depot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      isDefault: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  });

  return depots;
}
