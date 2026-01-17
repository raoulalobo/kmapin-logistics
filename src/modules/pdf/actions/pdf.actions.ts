/**
 * Server Actions pour la génération de PDFs
 *
 * Fournit des actions sécurisées pour générer et télécharger
 * des PDFs de factures et devis
 *
 * @module modules/pdf/actions
 */

'use server';

import { requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf/invoice-pdf';
import { generateQuotePDF } from '@/lib/pdf/quote-pdf';
import type { ActionResponse } from '@/types';

/**
 * Génère et retourne un PDF de facture
 *
 * @param invoiceId - ID de la facture
 * @returns Buffer du PDF en base64
 */
export async function generateInvoicePDFAction(
  invoiceId: string
): Promise<ActionResponse<{ pdf: string; filename: string }>> {
  try {
    // Vérifier l'authentification
    const session = await requireAuth();

    // Récupérer la facture avec toutes les relations nécessaires
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        items: true,
        createdBy: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Facture introuvable',
      };
    }

    // Vérifier les permissions RBAC
    // L'utilisateur doit être admin ou appartenir à la même compagnie
    const isAdmin = session.user.role === 'ADMIN';
    const isSameCompany = session.user.clientId === invoice.clientId;

    if (!isAdmin && !isSameCompany) {
      return {
        success: false,
        error: 'Accès non autorisé à cette facture',
      };
    }

    // Préparer les données pour le PDF
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      company: {
        name: invoice.client.name,
        legalName: invoice.client.legalName,
        address: invoice.client.address,
        city: invoice.client.city,
        postalCode: invoice.client.postalCode,
        country: invoice.client.country,
        taxId: invoice.client.taxId,
        email: invoice.client.email,
        phone: invoice.client.phone,
      },
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discount: invoice.discount,
      total: invoice.total,
      currency: invoice.currency,
      notes: invoice.notes,
    };

    // Générer le PDF
    const pdfBuffer = generateInvoicePDF(pdfData);

    // Convertir en base64 pour le transfert
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      success: true,
      data: {
        pdf: pdfBase64,
        filename: `facture-${invoice.invoiceNumber}.pdf`,
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
    const pdfData = {
      quoteNumber: quote.quoteNumber,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      company: {
        name: quote.client.name,
        legalName: quote.client.legalName,
        address: quote.client.address,
        city: quote.client.city,
        postalCode: quote.client.postalCode,
        country: quote.client.country,
        email: quote.client.email,
        phone: quote.client.phone,
      },
      originCountry: quote.originCountry,
      destinationCountry: quote.destinationCountry,
      transportMode: quote.transportMode,
      cargoType: quote.cargoType,
      weight: quote.weight,
      volume: quote.volume,
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
