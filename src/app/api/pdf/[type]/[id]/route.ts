/**
 * API Route : Génération et téléchargement de PDF
 *
 * Gère la génération de PDFs pour les factures et devis
 * en évitant les problèmes de bundling client avec Better Auth
 *
 * @route GET /api/pdf/[type]/[id]
 * @param type - 'invoice' ou 'quote'
 * @param id - ID du document
 *
 * @module app/api/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf/invoice-pdf';
import { generateQuotePDF } from '@/lib/pdf/quote-pdf';

/**
 * Forcer l'utilisation du runtime Node.js (requis pour Better Auth avec async_hooks)
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime
 */
export const runtime = 'nodejs';

/**
 * Paramètres de la route dynamique
 */
interface RouteParams {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

/**
 * GET - Générer et télécharger un PDF
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Vérifier l'authentification
    const session = await requireAuth();

    // Extraire les paramètres (Next.js 16 - params est une Promise)
    const { type, id } = await params;

    // Valider le type
    if (type !== 'invoice' && type !== 'quote') {
      return NextResponse.json(
        { error: 'Type de document invalide. Utilisez "invoice" ou "quote".' },
        { status: 400 }
      );
    }

    // Générer le PDF selon le type
    if (type === 'invoice') {
      return await generateInvoicePDFRoute(id, session);
    } else {
      return await generateQuotePDFRoute(id, session);
    }
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);

    // Si l'erreur est liée à l'authentification
    if (error instanceof Error && error.message.includes('authenticated')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}

/**
 * Générer le PDF d'une facture
 */
async function generateInvoicePDFRoute(invoiceId: string, session: any) {
  // Récupérer la facture avec toutes les relations nécessaires
  // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,   // Client (COMPANY ou INDIVIDUAL)
      items: true,
      createdBy: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  }

  // Vérifier les permissions RBAC
  // L'utilisateur doit être admin ou appartenir au même client (COMPANY ou INDIVIDUAL)
  const isAdmin = session.user.role === 'ADMIN';
  const isSameClient = session.user.clientId === invoice.clientId;

  if (!isAdmin && !isSameClient) {
    return NextResponse.json(
      { error: 'Accès non autorisé à cette facture' },
      { status: 403 }
    );
  }

  // Préparer les données pour le PDF
  // Les informations du client (COMPANY ou INDIVIDUAL) sont utilisées pour l'en-tête
  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    company: {  // Garder "company" pour compatibilité avec le template PDF
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

  // Nom du fichier
  const filename = `facture-${invoice.invoiceNumber}.pdf`;

  // Retourner le PDF avec les bons headers
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}

/**
 * Générer le PDF d'un devis
 */
async function generateQuotePDFRoute(quoteId: string, session: any) {
  // Récupérer le devis avec toutes les relations nécessaires
  // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,   // Client (COMPANY ou INDIVIDUAL)
      items: true,
      createdBy: true,
    },
  });

  if (!quote) {
    return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
  }

  // Vérifier les permissions RBAC
  // L'utilisateur doit être admin ou appartenir au même client (COMPANY ou INDIVIDUAL)
  const isAdmin = session.user.role === 'ADMIN';
  const isSameClient = session.user.clientId === quote.clientId;

  if (!isAdmin && !isSameClient) {
    return NextResponse.json(
      { error: 'Accès non autorisé à ce devis' },
      { status: 403 }
    );
  }

  // Préparer les données pour le PDF
  // Les informations du client (COMPANY ou INDIVIDUAL) sont utilisées pour l'en-tête
  const pdfData = {
    quoteNumber: quote.quoteNumber,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    company: {  // Garder "company" pour compatibilité avec le template PDF
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
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    subtotal: quote.subtotal,
    taxRate: quote.taxRate,
    taxAmount: quote.taxAmount,
    discount: quote.discount,
    total: quote.total,
    currency: quote.currency,
    notes: quote.notes,
  };

  // Générer le PDF
  const pdfBuffer = generateQuotePDF(pdfData);

  // Nom du fichier
  const filename = `devis-${quote.quoteNumber}.pdf`;

  // Retourner le PDF avec les bons headers
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
