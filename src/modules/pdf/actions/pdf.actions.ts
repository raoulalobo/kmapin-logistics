/**
 * Server Actions pour la génération de PDFs
 *
 * Fournit des actions sécurisées pour générer et télécharger
 * des PDFs de devis et factures (générées à la volée depuis Quote)
 *
 * NOUVEAU WORKFLOW (v2) :
 * - Les factures sont générées à la volée depuis les données du devis (Quote)
 * - Pas de table Invoice en base de données
 * - Le PDF est généré quand paymentReceivedAt != null
 *
 * @module modules/pdf/actions
 */

'use server';

import { requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { generateInvoiceFromQuotePDF, type QuoteInvoicePDFData } from '@/lib/pdf/invoice-pdf';
import { generateQuotePDF } from '@/lib/pdf/quote-pdf';
import type { ActionResponse } from '@/types';

/**
 * Génère et retourne un PDF de facture depuis un devis
 *
 * Cette action génère une facture à la volée à partir des données du devis.
 * Le paiement doit avoir été confirmé (paymentReceivedAt != null).
 *
 * @param quoteId - ID du devis source
 * @returns Buffer du PDF en base64 avec le nom de fichier
 *
 * @example
 * const result = await generateQuoteInvoicePDFAction('cm123...');
 * if (result.success) {
 *   // result.data.pdf est le PDF en base64
 *   // result.data.filename est le nom du fichier
 * }
 */
export async function generateQuoteInvoicePDFAction(
  quoteId: string
): Promise<ActionResponse<{ pdf: string; filename: string }>> {
  try {
    // Vérifier l'authentification
    const session = await requireAuth();

    // Récupérer le devis avec toutes les relations nécessaires
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: true,
        items: true,
        shipment: {
          select: {
            trackingNumber: true,
          },
        },
      },
    });

    if (!quote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // Vérifier que le paiement a été reçu
    if (!quote.paymentReceivedAt) {
      return {
        success: false,
        error: 'Le paiement n\'a pas encore été confirmé pour ce devis',
      };
    }

    // Vérifier les permissions RBAC
    // L'utilisateur doit être admin ou appartenir au même client
    const isAdmin = session.user.role === 'ADMIN';
    const isSameClient = session.user.clientId === quote.clientId;

    if (!isAdmin && !isSameClient) {
      return {
        success: false,
        error: 'Accès non autorisé à ce devis',
      };
    }

    // Préparer les données pour le PDF
    const pdfData: QuoteInvoicePDFData = {
      quoteNumber: quote.quoteNumber,
      trackingNumber: quote.shipment?.trackingNumber,
      paymentReceivedAt: quote.paymentReceivedAt,
      quoteDate: quote.createdAt,
      client: {
        name: quote.client?.name || quote.contactName || 'N/A',
        legalName: quote.client?.legalName,
        address: quote.client?.address || '',
        city: quote.client?.city || '',
        postalCode: quote.client?.postalCode,
        country: quote.client?.country || '',
        taxId: quote.client?.taxId,
        email: quote.client?.email || quote.contactEmail || '',
        phone: quote.client?.phone || quote.contactPhone,
      },
      expedition: {
        originCountry: quote.originCountry,
        destinationCountry: quote.destinationCountry,
        weight: Number(quote.weight),
        cargoType: quote.cargoType,
        transportModes: quote.transportModes,
        dimensions: quote.dimensions as QuoteInvoicePDFData['expedition']['dimensions'],
      },
      estimatedCost: Number(quote.estimatedCost || 0),
      currency: quote.currency,
      paymentMethod: quote.paymentMethod,
      agentComment: quote.agentComment,
    };

    // Générer le PDF
    const pdfBuffer = generateInvoiceFromQuotePDF(pdfData);

    // Convertir en base64 pour le transfert
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      success: true,
      data: {
        pdf: pdfBase64,
        filename: `facture-${quote.quoteNumber}.pdf`,
      },
    };
  } catch (error) {
    console.error('Erreur lors de la génération du PDF de facture:', error);
    return {
      success: false,
      error: 'Erreur lors de la génération du PDF',
    };
  }
}

/**
 * Génère et retourne un PDF de facture depuis un colis
 *
 * Cette action génère une facture à la volée à partir des données
 * du devis source du colis. Le paiement doit avoir été confirmé.
 *
 * @param shipmentId - ID du colis
 * @returns Buffer du PDF en base64 avec le nom de fichier
 */
export async function generateShipmentInvoicePDFAction(
  shipmentId: string
): Promise<ActionResponse<{ pdf: string; filename: string }>> {
  try {
    // Vérifier l'authentification
    const session = await requireAuth();

    // Récupérer le colis avec son devis source
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        fromQuote: {
          include: {
            client: true,
            items: true,
          },
        },
        client: true,
      },
    });

    if (!shipment) {
      return {
        success: false,
        error: 'Colis introuvable',
      };
    }

    // Vérifier que le colis a un devis source
    if (!shipment.fromQuote) {
      return {
        success: false,
        error: 'Ce colis n\'a pas de devis source associé',
      };
    }

    // Vérifier que le paiement a été reçu
    if (!shipment.paymentReceivedAt) {
      return {
        success: false,
        error: 'Le paiement n\'a pas encore été confirmé pour ce colis',
      };
    }

    // Vérifier les permissions RBAC
    const isAdmin = session.user.role === 'ADMIN';
    const isSameClient = session.user.clientId === shipment.clientId;

    if (!isAdmin && !isSameClient) {
      return {
        success: false,
        error: 'Accès non autorisé à ce colis',
      };
    }

    const quote = shipment.fromQuote;
    const client = quote.client || shipment.client;

    // Préparer les données pour le PDF
    const pdfData: QuoteInvoicePDFData = {
      quoteNumber: quote.quoteNumber,
      trackingNumber: shipment.trackingNumber,
      paymentReceivedAt: shipment.paymentReceivedAt,
      quoteDate: quote.createdAt,
      client: {
        name: client?.name || quote.contactName || 'N/A',
        legalName: client?.legalName,
        address: client?.address || '',
        city: client?.city || '',
        postalCode: client?.postalCode,
        country: client?.country || '',
        taxId: client?.taxId,
        email: client?.email || quote.contactEmail || '',
        phone: client?.phone || quote.contactPhone,
      },
      expedition: {
        originCountry: quote.originCountry,
        destinationCountry: quote.destinationCountry,
        weight: Number(quote.weight),
        cargoType: quote.cargoType,
        transportModes: quote.transportModes,
        dimensions: quote.dimensions as QuoteInvoicePDFData['expedition']['dimensions'],
      },
      estimatedCost: Number(quote.estimatedCost || 0),
      currency: quote.currency,
      paymentMethod: quote.paymentMethod,
      agentComment: quote.agentComment,
    };

    // Générer le PDF
    const pdfBuffer = generateInvoiceFromQuotePDF(pdfData);

    // Convertir en base64 pour le transfert
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      success: true,
      data: {
        pdf: pdfBase64,
        filename: `facture-${shipment.trackingNumber}.pdf`,
      },
    };
  } catch (error) {
    console.error('Erreur lors de la génération du PDF de facture:', error);
    return {
      success: false,
      error: 'Erreur lors de la génération du PDF',
    };
  }
}

/**
 * Génère et retourne un PDF de devis
 *
 * @param quoteId - ID du devis
 * @returns Buffer du PDF en base64
 */
export async function generateQuotePDFAction(
  quoteId: string
): Promise<ActionResponse<{ pdf: string; filename: string }>> {
  try {
    // Vérifier l'authentification
    const session = await requireAuth();

    // Récupérer le devis avec toutes les relations nécessaires
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: true,
      },
    });

    if (!quote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // Vérifier les permissions RBAC
    const isAdmin = session.user.role === 'ADMIN';
    const isSameCompany = session.user.clientId === quote.clientId;

    if (!isAdmin && !isSameCompany) {
      return {
        success: false,
        error: 'Accès non autorisé à ce devis',
      };
    }

    // Préparer les données pour le PDF
    // Inclut la priorité de livraison pour affichage sur le devis
    const pdfData = {
      quoteNumber: quote.quoteNumber,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      company: {
        name: quote.client?.name || quote.contactName || 'N/A',
        legalName: quote.client?.legalName,
        address: quote.client?.address || '',
        city: quote.client?.city || '',
        postalCode: quote.client?.postalCode,
        country: quote.client?.country || '',
        email: quote.client?.email || quote.contactEmail || '',
        phone: quote.client?.phone || quote.contactPhone,
      },
      originCountry: quote.originCountry,
      destinationCountry: quote.destinationCountry,
      transportMode: quote.transportModes,
      cargoType: quote.cargoType,
      weight: quote.weight,
      volume: quote.volume,
      // Priorité de livraison : STANDARD, NORMAL, EXPRESS, URGENT
      priority: quote.priority,
      estimatedCost: quote.estimatedCost,
      currency: quote.currency,
      status: quote.status,
    };

    // Générer le PDF
    const pdfBuffer = generateQuotePDF(pdfData);

    // Convertir en base64 pour le transfert
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      success: true,
      data: {
        pdf: pdfBase64,
        filename: `devis-${quote.quoteNumber}.pdf`,
      },
    };
  } catch (error) {
    console.error('Erreur lors de la génération du PDF de devis:', error);
    return {
      success: false,
      error: 'Erreur lors de la génération du PDF',
    };
  }
}
