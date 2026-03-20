/**
 * Helper : Récupération du dépôt par défaut
 *
 * Fournit le dépôt marqué isDefault=true avec son contact principal.
 * Utilisé comme fallback dans les PDFs quand un devis/expédition
 * n'a pas de dépôt explicitement assigné.
 *
 * Utilise unstable_cache de Next.js pour mise en cache côté serveur (1h).
 *
 * @module modules/depots/lib
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/client';

/**
 * Type retourné par getDefaultDepot
 * Contient les infos du dépôt + son contact principal (s'il existe)
 */
export type DefaultDepotInfo = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  primaryContact: {
    name: string;
    role: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

/**
 * Récupère le dépôt par défaut (isDefault=true) avec son contact principal
 *
 * Cache de 1h via unstable_cache. Le cache est invalidé via revalidateTag('default-depot')
 * dans les actions de création/modification de dépôt.
 *
 * @returns Le dépôt par défaut avec son contact principal, ou null si aucun dépôt par défaut
 *
 * @example
 * ```ts
 * const depot = await getDefaultDepot();
 * if (depot) {
 *   console.log(`Dépôt par défaut : ${depot.name} (${depot.code})`);
 *   console.log(`Contact : ${depot.primaryContact?.name}`);
 * }
 * ```
 */
export const getDefaultDepot = unstable_cache(
  async (): Promise<DefaultDepotInfo | null> => {
    // Utilise le client standard (pas enhanced) car c'est un helper de lecture publique
    // Les access policies ne s'appliquent pas ici — c'est pour le branding PDF
    const depot = await prisma.depot.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!depot) return null;

    const contact = depot.contacts[0] ?? null;

    return {
      id: depot.id,
      name: depot.name,
      code: depot.code,
      address: depot.address,
      city: depot.city,
      country: depot.country,
      postalCode: depot.postalCode,
      phone: depot.phone,
      email: depot.email,
      primaryContact: contact
        ? {
            name: contact.name,
            role: contact.role,
            phone: contact.phone,
            email: contact.email,
          }
        : null,
    };
  },
  ['default-depot'],
  {
    revalidate: 3600, // Cache pendant 1h
    tags: ['default-depot'], // Invalidation manuelle via revalidateTag('default-depot')
  }
);
