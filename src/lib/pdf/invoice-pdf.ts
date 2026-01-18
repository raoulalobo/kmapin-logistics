/**
 * Générateur de PDF pour les factures
 *
 * Utilise jsPDF et jspdf-autotable pour créer des factures professionnelles
 * avec en-tête, détails client, tableau des articles et totaux
 *
 * NOUVEAU WORKFLOW (v2) :
 * - Les factures sont générées à la volée depuis les données du devis (Quote)
 * - Pas de table Invoice en base de données
 * - Le PDF est généré quand paymentReceivedAt != null
 *
 * @module lib/pdf
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Type pour les données de facture générée depuis un Quote
 *
 * Cette interface représente les données nécessaires pour générer
 * une facture PDF à partir d'un devis validé et payé.
 */
export interface QuoteInvoicePDFData {
  // Numéros de référence
  quoteNumber: string;           // Numéro du devis source
  trackingNumber?: string;       // Numéro de suivi du colis (si créé)

  // Dates
  paymentReceivedAt: Date;       // Date de confirmation du paiement
  quoteDate: Date;               // Date de création du devis

  // Client (COMPANY ou INDIVIDUAL)
  client: {
    name: string;
    legalName?: string | null;
    address: string;
    city: string;
    postalCode?: string | null;
    country: string;
    taxId?: string | null;
    email: string;
    phone?: string | null;
  };

  // Détails de l'expédition
  expedition: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    cargoType: string;
    transportModes: string[];
    dimensions?: {
      length?: number | null;
      width?: number | null;
      height?: number | null;
    };
  };

  // Montants
  estimatedCost: number;
  currency: string;

  // Paiement
  paymentMethod?: string | null;

  // Notes
  agentComment?: string | null;
}

/**
 * Type legacy pour compatibilité (ancienne table Invoice)
 * @deprecated Utiliser QuoteInvoicePDFData à la place
 */
export interface InvoicePDFData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  company: {
    name: string;
    legalName?: string | null;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    taxId?: string | null;
    email: string;
    phone?: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string | null;
}

/**
 * Génère un PDF de facture
 *
 * @param data - Données de la facture
 * @returns Buffer du PDF généré
 */
export function generateInvoicePDF(data: InvoicePDFData): Buffer {
  // Créer un nouveau document PDF (A4, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Couleurs
  const primaryColor: [number, number, number] = [41, 128, 185]; // Bleu
  const textColor: [number, number, number] = [51, 51, 51]; // Gris foncé
  const lightGray: [number, number, number] = [240, 240, 240];

  // ========================================
  // EN-TÊTE : Logo et titre
  // ========================================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Faso Fret Logistics', 20, 33);

  yPos = 50;

  // ========================================
  // INFORMATIONS FACTURE
  // ========================================
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Colonne gauche : Informations de facturation
  doc.text('FACTURER À :', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.company.name, 20, yPos);
  yPos += 5;

  if (data.company.legalName && data.company.legalName !== data.company.name) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(data.company.legalName, 20, yPos);
    yPos += 4;
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
  }

  doc.text(data.company.address, 20, yPos);
  yPos += 5;
  doc.text(`${data.company.postalCode} ${data.company.city}`, 20, yPos);
  yPos += 5;
  doc.text(data.company.country, 20, yPos);
  yPos += 5;

  if (data.company.taxId) {
    doc.text(`TVA: ${data.company.taxId}`, 20, yPos);
    yPos += 5;
  }

  doc.text(`Email: ${data.company.email}`, 20, yPos);
  if (data.company.phone) {
    yPos += 5;
    doc.text(`Tél: ${data.company.phone}`, 20, yPos);
  }

  // Colonne droite : Détails de la facture
  const rightCol = pageWidth - 80;
  yPos = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('N° FACTURE :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, rightCol + 30, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('DATE ÉMISSION :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.issueDate.toLocaleDateString('fr-FR'), rightCol + 30, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('DATE ÉCHÉANCE :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dueDate.toLocaleDateString('fr-FR'), rightCol + 30, yPos);

  yPos = 100;

  // ========================================
  // TABLEAU DES ARTICLES
  // ========================================
  const tableData = data.items.map((item) => [
    item.description,
    item.quantity.toString(),
    `${item.unitPrice.toFixed(2)} ${data.currency}`,
    `${item.amount.toFixed(2)} ${data.currency}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Quantité', 'Prix unitaire', 'Montant']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 20, right: 20 },
  });

  // Récupérer la position Y après le tableau
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // ========================================
  // TOTAUX
  // ========================================
  const totalsX = pageWidth - 75;
  yPos = finalY;

  // Sous-total
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total :', totalsX, yPos);
  doc.text(`${data.subtotal.toFixed(2)} ${data.currency}`, totalsX + 40, yPos, {
    align: 'right',
  });
  yPos += 7;

  // Remise (si applicable)
  if (data.discount > 0) {
    doc.setTextColor(200, 50, 50);
    doc.text('Remise :', totalsX, yPos);
    doc.text(`-${data.discount.toFixed(2)} ${data.currency}`, totalsX + 40, yPos, {
      align: 'right',
    });
    doc.setTextColor(...textColor);
    yPos += 7;
  }

  // TVA
  doc.text(`TVA (${data.taxRate}%) :`, totalsX, yPos);
  doc.text(`${data.taxAmount.toFixed(2)} ${data.currency}`, totalsX + 40, yPos, {
    align: 'right',
  });
  yPos += 10;

  // Total (encadré)
  doc.setFillColor(...lightGray);
  doc.rect(totalsX - 5, yPos - 6, 50, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL :', totalsX, yPos);
  doc.text(`${data.total.toFixed(2)} ${data.currency}`, totalsX + 40, yPos, {
    align: 'right',
  });

  // ========================================
  // NOTES (si présentes)
  // ========================================
  if (data.notes) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('NOTES :', 20, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPos);
  }

  // ========================================
  // PIED DE PAGE
  // ========================================
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  const footer = 'Merci pour votre confiance. Paiement à effectuer avant la date d\'échéance.';
  doc.text(footer, pageWidth / 2, pageHeight - 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text(
    'Faso Fret Logistics - Votre partenaire en logistique multi-modale',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Convertir en Buffer pour le retour
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Traduit le type de cargo en français
 */
function translateCargoType(cargoType: string): string {
  const translations: Record<string, string> = {
    GENERAL: 'Général',
    DANGEROUS: 'Dangereux',
    PERISHABLE: 'Périssable',
    FRAGILE: 'Fragile',
    BULK: 'Vrac',
    CONTAINER: 'Conteneur',
    PALLETIZED: 'Palettisé',
    OTHER: 'Autre',
  };
  return translations[cargoType] || cargoType;
}

/**
 * Traduit les modes de transport en français
 */
function translateTransportModes(modes: string[]): string {
  const translations: Record<string, string> = {
    ROAD: 'Routier',
    SEA: 'Maritime',
    AIR: 'Aérien',
    RAIL: 'Ferroviaire',
  };
  return modes.map((m) => translations[m] || m).join(' + ');
}

/**
 * Traduit la méthode de paiement en français
 */
function translatePaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Non spécifié';
  const translations: Record<string, string> = {
    CASH: 'Comptant',
    ON_DELIVERY: 'À la livraison',
    BANK_TRANSFER: 'Virement bancaire',
  };
  return translations[method] || method;
}

/**
 * Génère un numéro de facture à partir du numéro de devis
 *
 * Format: FACT-{YYYYMMDD}-{quoteNumber suffix}
 * Exemple: QT-20250117-00001 → FACT-20250117-00001
 */
function generateInvoiceNumberFromQuote(quoteNumber: string, paymentDate: Date): string {
  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
  const day = String(paymentDate.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Extraire le suffixe du numéro de devis (ex: QT-20250117-00001 → 00001)
  const suffix = quoteNumber.split('-').pop() || '00001';

  return `FACT-${datePrefix}-${suffix}`;
}

/**
 * Génère un PDF de facture à partir des données d'un devis
 *
 * Cette fonction est utilisée pour générer une facture à la volée
 * lorsque le paiement a été confirmé sur un devis ou un colis.
 *
 * @param data - Données du devis pour générer la facture
 * @returns Buffer du PDF généré
 *
 * @example
 * const pdfBuffer = generateInvoiceFromQuotePDF({
 *   quoteNumber: 'QT-20250117-00001',
 *   trackingNumber: 'BF-XK7-1725-00001',
 *   paymentReceivedAt: new Date(),
 *   quoteDate: quote.createdAt,
 *   client: { ... },
 *   expedition: { ... },
 *   estimatedCost: 1500.00,
 *   currency: 'EUR',
 * });
 */
export function generateInvoiceFromQuotePDF(data: QuoteInvoicePDFData): Buffer {
  // Créer un nouveau document PDF (A4, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Couleurs Faso Fret
  const primaryColor: [number, number, number] = [0, 61, 130]; // Bleu Faso Fret #003D82
  const successColor: [number, number, number] = [34, 197, 94]; // Vert pour PAYÉ
  const textColor: [number, number, number] = [51, 51, 51]; // Gris foncé
  const lightGray: [number, number, number] = [240, 240, 240];

  // Générer le numéro de facture
  const invoiceNumber = generateInvoiceNumberFromQuote(data.quoteNumber, data.paymentReceivedAt);

  // ========================================
  // EN-TÊTE : Logo et titre
  // ========================================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Faso Fret Logistics', 20, 33);

  // Badge PAYÉ (coin droit)
  doc.setFillColor(...successColor);
  doc.roundedRect(pageWidth - 45, 15, 35, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYÉ', pageWidth - 27.5, 23, { align: 'center' });

  yPos = 50;

  // ========================================
  // INFORMATIONS CLIENT
  // ========================================
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Colonne gauche : Client
  doc.text('CLIENT :', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.client.name, 20, yPos);
  yPos += 5;

  if (data.client.legalName && data.client.legalName !== data.client.name) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(data.client.legalName, 20, yPos);
    yPos += 4;
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
  }

  doc.text(data.client.address, 20, yPos);
  yPos += 5;
  doc.text(`${data.client.postalCode || ''} ${data.client.city}`.trim(), 20, yPos);
  yPos += 5;
  doc.text(data.client.country, 20, yPos);
  yPos += 5;

  if (data.client.taxId) {
    doc.text(`TVA: ${data.client.taxId}`, 20, yPos);
    yPos += 5;
  }

  doc.text(`Email: ${data.client.email}`, 20, yPos);
  if (data.client.phone) {
    yPos += 5;
    doc.text(`Tél: ${data.client.phone}`, 20, yPos);
  }

  // Colonne droite : Détails de la facture
  const rightCol = pageWidth - 80;
  yPos = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('N° FACTURE :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNumber, rightCol + 30, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('N° DEVIS :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quoteNumber, rightCol + 30, yPos);
  yPos += 7;

  if (data.trackingNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('N° SUIVI :', rightCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.trackingNumber, rightCol + 30, yPos);
    yPos += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('DATE PAIEMENT :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentReceivedAt.toLocaleDateString('fr-FR'), rightCol + 30, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('MODE PAIEMENT :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(translatePaymentMethod(data.paymentMethod), rightCol + 30, yPos);

  yPos = 110;

  // ========================================
  // DÉTAILS DE L'EXPÉDITION
  // ========================================
  doc.setFillColor(...lightGray);
  doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DÉTAILS DE L\'EXPÉDITION', 25, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Ligne 1 : Origine → Destination
  doc.text(`Trajet : ${data.expedition.originCountry} → ${data.expedition.destinationCountry}`, 25, yPos);
  yPos += 6;

  // Ligne 2 : Transport
  doc.text(`Mode de transport : ${translateTransportModes(data.expedition.transportModes)}`, 25, yPos);
  yPos += 6;

  // Ligne 3 : Marchandise
  doc.text(`Type de marchandise : ${translateCargoType(data.expedition.cargoType)}`, 25, yPos);
  yPos += 6;

  // Ligne 4 : Poids et dimensions
  let weightLine = `Poids : ${data.expedition.weight} kg`;
  if (data.expedition.dimensions?.length && data.expedition.dimensions?.width && data.expedition.dimensions?.height) {
    const volume = data.expedition.dimensions.length * data.expedition.dimensions.width * data.expedition.dimensions.height;
    weightLine += ` | Dimensions : ${data.expedition.dimensions.length}m × ${data.expedition.dimensions.width}m × ${data.expedition.dimensions.height}m (${volume.toFixed(2)} m³)`;
  }
  doc.text(weightLine, 25, yPos);

  yPos += 15;

  // ========================================
  // TABLEAU DES PRESTATIONS
  // ========================================
  const tableData = [
    [
      `Service d'expédition ${data.expedition.originCountry} → ${data.expedition.destinationCountry}`,
      '1',
      `${data.estimatedCost.toFixed(2)} ${data.currency}`,
      `${data.estimatedCost.toFixed(2)} ${data.currency}`,
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qté', 'Prix unitaire', 'Montant']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 20, right: 20 },
  });

  // Récupérer la position Y après le tableau
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // ========================================
  // TOTAUX
  // ========================================
  const totalsX = pageWidth - 75;
  yPos = finalY;

  // Sous-total HT
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total HT :', totalsX, yPos);
  doc.text(`${data.estimatedCost.toFixed(2)} ${data.currency}`, totalsX + 40, yPos, {
    align: 'right',
  });
  yPos += 7;

  // TVA (0% car export ou exonéré)
  doc.text('TVA (0%) :', totalsX, yPos);
  doc.text(`0.00 ${data.currency}`, totalsX + 40, yPos, {
    align: 'right',
  });
  yPos += 10;

  // Total TTC (encadré)
  doc.setFillColor(...successColor);
  doc.rect(totalsX - 5, yPos - 6, 50, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL TTC :', totalsX, yPos);
  doc.text(`${data.estimatedCost.toFixed(2)} ${data.currency}`, totalsX + 40, yPos, {
    align: 'right',
  });

  // ========================================
  // NOTES / COMMENTAIRE AGENT
  // ========================================
  if (data.agentComment) {
    yPos += 20;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('NOTES :', 20, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(data.agentComment, pageWidth - 40);
    doc.text(splitNotes, 20, yPos);
  }

  // ========================================
  // PIED DE PAGE
  // ========================================
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Merci pour votre confiance. Cette facture a été générée automatiquement suite à la confirmation de votre paiement.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.text(
    'Faso Fret Logistics - Votre partenaire en logistique multi-modale',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Convertir en Buffer pour le retour
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
