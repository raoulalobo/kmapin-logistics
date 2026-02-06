/**
 * API Route : Génération et téléchargement de PDF
 *
 * Gère la génération de PDFs pour les devis et factures.
 * Les factures sont générées à la volée depuis le devis (pas de table Invoice).
 *
 * Types de documents supportés :
 * - 'quote' : PDF du devis
 * - 'quote-invoice' : Facture générée depuis le devis (si paiement confirmé)
 * - 'shipment-invoice' : Facture générée depuis le colis (si paiement confirmé)
 *
 * @route GET /api/pdf/[type]/[id]
 * @param type - Type de document ('quote', 'quote-invoice', 'shipment-invoice')
 * @param id - ID du document (Quote ou Shipment selon le type)
 *
 * @example
 * // Télécharger un devis
 * GET /api/pdf/quote/cm123...
 *
 * // Télécharger une facture depuis un devis payé
 * GET /api/pdf/quote-invoice/cm123...
 *
 * // Télécharger une facture depuis un colis payé
 * GET /api/pdf/shipment-invoice/cm456...
 *
 * @module app/api/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { generateInvoiceFromQuotePDF, type QuoteInvoicePDFData } from '@/lib/pdf/invoice-pdf';
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
    const validTypes = ['quote', 'shipment-invoice', 'quote-invoice'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type de document invalide. Types supportés: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Générer le PDF selon le type
    switch (type) {
      case 'quote':
        return await generateQuotePDFRoute(id, session);
      case 'shipment-invoice':
        return await generateShipmentInvoicePDFRoute(id, session);
      case 'quote-invoice':
        return await generateQuoteInvoicePDFRoute(id, session);
      default:
        return NextResponse.json({ error: 'Type non supporté' }, { status: 400 });
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
 * Générer le PDF d'une facture depuis un Shipment
 *
 * Cette fonction génère une facture à la volée à partir du colis (Shipment)
 * en utilisant les données du devis source (Quote).
 * Le paiement doit avoir été confirmé (paymentReceivedAt != null).
 *
 * @param shipmentId - ID du colis
 * @param session - Session de l'utilisateur authentifié
 * @returns Response avec le PDF ou une erreur
 */
async function generateShipmentInvoicePDFRoute(shipmentId: string, session: any) {
  // Récupérer le colis avec son devis source, le client et les packages multi-colis
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      fromQuote: {
        include: {
          client: true,
          packages: { orderBy: { createdAt: 'asc' } }, // Colis détaillés multi-colis
        },
      },
      client: true,
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Colis introuvable' }, { status: 404 });
  }

  // Vérifier que le colis provient d'un devis
  if (!shipment.fromQuote) {
    return NextResponse.json(
      { error: 'Ce colis n\'a pas de devis source associé' },
      { status: 400 }
    );
  }

  // Vérifier que le paiement a été reçu
  if (!shipment.paymentReceivedAt) {
    return NextResponse.json(
      { error: 'Le paiement n\'a pas encore été confirmé pour ce colis' },
      { status: 400 }
    );
  }

  // Vérifier les permissions RBAC
  // L'utilisateur doit être admin ou appartenir au même client
  const isAdmin = session.user.role === 'ADMIN';
  const isSameClient = session.user.clientId === shipment.clientId;

  if (!isAdmin && !isSameClient) {
    return NextResponse.json(
      { error: 'Accès non autorisé à ce colis' },
      { status: 403 }
    );
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
      transportModes: quote.transportMode,
      dimensions: quote.dimensions as QuoteInvoicePDFData['expedition']['dimensions'],
    },
    estimatedCost: Number(quote.estimatedCost || 0),
    currency: quote.currency,
    paymentMethod: quote.paymentMethod,
    agentComment: quote.agentComment,
    // Adresses expéditeur et destinataire (snapshots du devis)
    origin: {
      address: quote.originAddress,
      city: quote.originCity,
      postalCode: quote.originPostalCode,
      contactName: quote.originContactName,
      contactPhone: quote.originContactPhone,
      contactEmail: quote.originContactEmail,
    },
    destination: {
      address: quote.destinationAddress,
      city: quote.destinationCity,
      postalCode: quote.destinationPostalCode,
      contactName: quote.destinationContactName,
      contactPhone: quote.destinationContactPhone,
      contactEmail: quote.destinationContactEmail,
    },
    // Colis détaillés pour le tableau multi-colis dans la facture
    packages: quote.packages?.map((pkg) => ({
      description: pkg.description,
      quantity: pkg.quantity,
      cargoType: pkg.cargoType,
      weight: Number(pkg.weight),
      length: pkg.length ? Number(pkg.length) : null,
      width: pkg.width ? Number(pkg.width) : null,
      height: pkg.height ? Number(pkg.height) : null,
      unitPrice: pkg.unitPrice ? Number(pkg.unitPrice) : null,
    })),
  };

  // Générer le PDF
  const pdfBuffer = generateInvoiceFromQuotePDF(pdfData);

  // Nom du fichier avec le numéro de suivi
  const filename = `facture-${shipment.trackingNumber}.pdf`;

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
 * Générer le PDF d'une facture depuis un Quote
 *
 * Cette fonction génère une facture à la volée à partir du devis (Quote).
 * Le paiement doit avoir été confirmé (paymentReceivedAt != null).
 *
 * @param quoteId - ID du devis
 * @param session - Session de l'utilisateur authentifié
 * @returns Response avec le PDF ou une erreur
 */
async function generateQuoteInvoicePDFRoute(quoteId: string, session: any) {
  // Récupérer le devis avec le client, le colis éventuel et les packages multi-colis
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      shipment: true, // Pour récupérer le numéro de suivi si disponible
      packages: { orderBy: { createdAt: 'asc' } }, // Colis détaillés multi-colis
    },
  });

  if (!quote) {
    return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
  }

  // Vérifier que le paiement a été reçu
  if (!quote.paymentReceivedAt) {
    return NextResponse.json(
      { error: 'Le paiement n\'a pas encore été confirmé pour ce devis' },
      { status: 400 }
    );
  }

  // Vérifier les permissions RBAC
  // L'utilisateur doit être admin ou appartenir au même client
  const isAdmin = session.user.role === 'ADMIN';
  const isSameClient = session.user.clientId === quote.clientId;

  if (!isAdmin && !isSameClient) {
    return NextResponse.json(
      { error: 'Accès non autorisé à ce devis' },
      { status: 403 }
    );
  }

  // Préparer les données pour le PDF
  const pdfData: QuoteInvoicePDFData = {
    quoteNumber: quote.quoteNumber,
    trackingNumber: quote.shipment?.trackingNumber, // Numéro de suivi si colis créé
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
      transportModes: quote.transportMode,
      dimensions: quote.dimensions as QuoteInvoicePDFData['expedition']['dimensions'],
    },
    estimatedCost: Number(quote.estimatedCost || 0),
    currency: quote.currency,
    paymentMethod: quote.paymentMethod,
    agentComment: quote.agentComment,
    // Adresses expéditeur et destinataire (snapshots du devis)
    origin: {
      address: quote.originAddress,
      city: quote.originCity,
      postalCode: quote.originPostalCode,
      contactName: quote.originContactName,
      contactPhone: quote.originContactPhone,
      contactEmail: quote.originContactEmail,
    },
    destination: {
      address: quote.destinationAddress,
      city: quote.destinationCity,
      postalCode: quote.destinationPostalCode,
      contactName: quote.destinationContactName,
      contactPhone: quote.destinationContactPhone,
      contactEmail: quote.destinationContactEmail,
    },
    // Colis détaillés pour le tableau multi-colis dans la facture
    packages: quote.packages?.map((pkg) => ({
      description: pkg.description,
      quantity: pkg.quantity,
      cargoType: pkg.cargoType,
      weight: Number(pkg.weight),
      length: pkg.length ? Number(pkg.length) : null,
      width: pkg.width ? Number(pkg.width) : null,
      height: pkg.height ? Number(pkg.height) : null,
      unitPrice: pkg.unitPrice ? Number(pkg.unitPrice) : null,
    })),
  };

  // Générer le PDF
  const pdfBuffer = generateInvoiceFromQuotePDF(pdfData);

  // Nom du fichier
  const filename = `facture-${quote.quoteNumber}.pdf`;

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
  // Les packages sont inclus pour le tableau multi-colis dans le PDF
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,   // Client (COMPANY ou INDIVIDUAL)
      createdBy: true,
      packages: { orderBy: { createdAt: 'asc' } }, // Colis détaillés multi-colis
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
  // Note: Cette route utilise la structure V1 avec items, mais on ajoute priority
  const pdfData = {
    quoteNumber: quote.quoteNumber,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    company: {  // Garder "company" pour compatibilité avec le template PDF
      name: quote.client?.name || quote.contactName || 'N/A',
      legalName: quote.client?.legalName,
      address: quote.client?.address || '',
      city: quote.client?.city || '',
      postalCode: quote.client?.postalCode || '',
      country: quote.client?.country || '',
      taxId: quote.client?.taxId,
      email: quote.client?.email || quote.contactEmail || '',
      phone: quote.client?.phone || quote.contactPhone,
    },
    // Données transport pour le template simplifié
    originCountry: quote.originCountry,
    destinationCountry: quote.destinationCountry,
    transportMode: quote.transportMode,
    cargoType: quote.cargoType,
    weight: Number(quote.weight),
    volume: quote.volume ? Number(quote.volume) : null,
    // Priorité de livraison (STANDARD, NORMAL, EXPRESS, URGENT)
    priority: quote.priority,
    estimatedCost: Number(quote.estimatedCost),
    currency: quote.currency,
    status: quote.status,
    // Colis détaillés pour le tableau multi-colis dans le PDF
    // Si packages est vide ou absent, le PDF utilise l'affichage simple
    packages: quote.packages?.map((pkg) => ({
      description: pkg.description,
      quantity: pkg.quantity,
      cargoType: pkg.cargoType,
      weight: Number(pkg.weight),
      length: pkg.length ? Number(pkg.length) : null,
      width: pkg.width ? Number(pkg.width) : null,
      height: pkg.height ? Number(pkg.height) : null,
      unitPrice: pkg.unitPrice ? Number(pkg.unitPrice) : null,
    })),
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
