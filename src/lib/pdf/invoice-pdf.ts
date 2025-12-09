/**
 * Générateur de PDF pour les factures
 *
 * Utilise jsPDF et jspdf-autotable pour créer des factures professionnelles
 * avec en-tête, détails client, tableau des articles et totaux
 *
 * @module lib/pdf
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Type pour les données de facture nécessaires au PDF
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
  doc.text('KmapIn Logistics', 20, 33);

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
    'KmapIn Logistics - Votre partenaire en logistique multi-modale',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Convertir en Buffer pour le retour
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
