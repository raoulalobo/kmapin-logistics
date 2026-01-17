/**
 * Server Actions pour la gestion des GuestQuotes
 *
 * IMPORTANT : Utilise le client Prisma STANDARD (pas enhanced)
 * car ces actions sont publiques
 *
 * @module modules/guest-quotes/actions
 */

'use server';

import { prisma } from '@/lib/db/client';
import { guestQuoteSchema, type GuestQuoteFormData } from '../schemas/guest-quote.schema';

/**
 * Créer un GuestQuote
 *
 * @param data - Données du GuestQuote
 * @returns GuestQuote créé
 */
export async function createGuestQuoteAction(data: unknown) {
  try {
    const validated = guestQuoteSchema.parse(data);

    const guestQuote = await prisma.guestQuote.create({
      data: {
        ...validated,
        validUntil: new Date(validated.validUntil),
      },
    });

    return {
      success: true,
      data: guestQuote,
    };
  } catch (error: any) {
    console.error('Erreur createGuestQuoteAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la création du GuestQuote',
    };
  }
}

/**
 * Récupérer un GuestQuote par ID
 *
 * @param id - ID du GuestQuote
 * @returns GuestQuote avec Prospect
 */
export async function getGuestQuoteAction(id: string) {
  try {
    const guestQuote = await prisma.guestQuote.findUnique({
      where: { id },
      include: {
        prospect: true,
      },
    });

    if (!guestQuote) {
      return {
        success: false,
        error: 'GuestQuote introuvable',
      };
    }

    return {
      success: true,
      data: guestQuote,
    };
  } catch (error: any) {
    console.error('Erreur getGuestQuoteAction:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération du GuestQuote',
    };
  }
}

/**
 * Convertir un GuestQuote en Quote standard
 *
 * Cette action est appelée par finalizeProspectConversionAction
 *
 * @param guestQuoteId - ID du GuestQuote
 * @param clientId - ID de la Company
 * @returns Quote créé
 */
export async function convertGuestQuoteToQuoteAction(
  guestQuoteId: string,
  clientId: string
) {
  try {
    const guestQuote = await prisma.guestQuote.findUnique({
      where: { id: guestQuoteId },
    });

    if (!guestQuote) {
      return {
        success: false,
        error: 'GuestQuote introuvable',
      };
    }

    // Générer un numéro de Quote
    const quoteNumber = await generateQuoteNumber();

    // Créer le Quote
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientId,
        originCountry: guestQuote.originCountry,
        destinationCountry: guestQuote.destinationCountry,
        transportMode: guestQuote.transportMode,
        cargoType: guestQuote.cargoType,
        weight: guestQuote.weight,
        volume: guestQuote.volume,
        estimatedCost: guestQuote.estimatedCost,
        currency: guestQuote.currency,
        validUntil: guestQuote.validUntil,
        status: 'DRAFT',
      },
    });

    // Marquer le GuestQuote comme converti
    await prisma.guestQuote.update({
      where: { id: guestQuoteId },
      data: { convertedToQuoteId: quote.id },
    });

    return {
      success: true,
      data: quote,
    };
  } catch (error: any) {
    console.error('Erreur convertGuestQuoteToQuoteAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la conversion du GuestQuote',
    };
  }
}

/**
 * Générer un numéro de Quote unique
 * Format : QTE-YYYYMMDD-XXXXX
 */
async function generateQuoteNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await prisma.quote.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(5, '0');
  return `QTE-${datePrefix}-${sequence}`;
}
