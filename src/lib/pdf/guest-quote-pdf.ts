/**
 * Générateur de PDF pour les devis prospects (Guest Quotes)
 *
 * Similaire à quote-pdf.ts mais adapté pour les prospects sans compte
 *
 * @module lib/pdf/guest-quote-pdf
 */

import jsPDF from 'jspdf';

/**
 * Type pour les données de devis prospect nécessaires au PDF
 */
export interface GuestQuotePDFData {
  quoteNumber: string;
  createdAt: Date;
  validUntil: Date;
  prospect: {
    email: string;
    phone?: string | null;
    name?: string | null;
    company?: string | null;
  };
  originCountry: string;
  destinationCountry: string;
  transportMode: string[];
  cargoType: string;
  weight: number;
  volume?: number | null;
  estimatedCost: number;
  currency: string;
}

/**
 * Traduit le type de cargo en français
 */
function translateCargoType(type: string): string {
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
  return translations[type] || type;
}

/**
 * Traduit le mode de transport en français
 */
function translateTransportMode(mode: string): string {
  const translations: Record<string, string> = {
    ROAD: 'Route',
    SEA: 'Maritime',
    AIR: 'Aérien',
    RAIL: 'Ferroviaire',
  };
  return translations[mode] || mode;
}

/**
 * Génère un PDF de devis prospect (GuestQuote)
 *
 * @param data - Données du devis prospect
 * @returns Buffer du PDF généré
 */
export function generateGuestQuotePDF(data: GuestQuotePDFData): Buffer {
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
  const primaryColor: [number, number, number] = [0, 51, 255]; // Bleu Faso Fret
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
  doc.text('ESTIMATION DE DEVIS', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Faso Fret Logistics', 20, 33);

  yPos = 50;

  // ========================================
  // INFORMATIONS PROSPECT (colonne gauche)
  // ========================================
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMANDEUR :', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (data.prospect.name) {
    doc.text(data.prospect.name, 20, yPos);
    yPos += 5;
  }

  if (data.prospect.company) {
    doc.text(data.prospect.company, 20, yPos);
    yPos += 5;
  }

  doc.text(`Email: ${data.prospect.email}`, 20, yPos);

  if (data.prospect.phone) {
    yPos += 5;
    doc.text(`Tél: ${data.prospect.phone}`, 20, yPos);
  }

  // ========================================
  // DÉTAILS DU DEVIS (colonne droite)
  // ========================================
  const rightCol = pageWidth - 80;
  yPos = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('N° ESTIMATION :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quoteNumber, rightCol + 35, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('DATE :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.createdAt.toLocaleDateString('fr-FR'), rightCol + 35, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('VALIDE JUSQU\'AU :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.validUntil.toLocaleDateString('fr-FR'), rightCol + 35, yPos);

  yPos = 100;

  // ========================================
  // DÉTAILS DU TRANSPORT
  // ========================================
  doc.setFillColor(...lightGray);
  doc.rect(20, yPos, pageWidth - 40, 8, 'F');

  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DU TRANSPORT', 25, yPos + 5);
  yPos += 14;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Route
  doc.setFont('helvetica', 'bold');
  doc.text('Route :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.originCountry} → ${data.destinationCountry}`, 50, yPos);
  yPos += 6;

  // Modes de transport
  doc.setFont('helvetica', 'bold');
  doc.text('Modes de transport :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  const modes = data.transportMode.map(translateTransportMode).join(', ');
  doc.text(modes, 50, yPos);
  yPos += 6;

  // Type de marchandise
  doc.setFont('helvetica', 'bold');
  doc.text('Type de marchandise :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(translateCargoType(data.cargoType), 50, yPos);
  yPos += 6;

  // Poids
  doc.setFont('helvetica', 'bold');
  doc.text('Poids :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.weight.toLocaleString('fr-FR')} kg`, 50, yPos);
  yPos += 6;

  // Volume (si présent)
  if (data.volume) {
    doc.setFont('helvetica', 'bold');
    doc.text('Volume :', 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.volume.toLocaleString('fr-FR')} m³`, 50, yPos);
    yPos += 6;
  }

  yPos += 10;

  // ========================================
  // TARIFICATION
  // ========================================
  doc.setFillColor(230, 247, 237); // Fond vert clair
  doc.rect(20, yPos, pageWidth - 40, 25, 'F');

  doc.setTextColor(46, 125, 50); // Vert foncé
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TARIFICATION ESTIMÉE', 25, yPos + 6);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${data.estimatedCost.toLocaleString('fr-FR')} ${data.currency}`,
    25,
    yPos + 18
  );

  yPos += 35;

  // ========================================
  // AVERTISSEMENT IMPORTANT (Prospect)
  // ========================================
  doc.setFillColor(255, 243, 205); // Fond jaune clair
  doc.rect(20, yPos, pageWidth - 40, 30, 'F');

  doc.setTextColor(156, 77, 0); // Texte orange foncé
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('⚠ IMPORTANT', 25, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const warningLines = [
    'Cette estimation est indicative et calculée automatiquement.',
    'Pour obtenir un devis officiel et bénéficier de nos services complets,',
    'veuillez créer un compte gratuit sur notre plateforme.',
  ];

  let warningY = yPos + 12;
  warningLines.forEach((line) => {
    doc.text(line, 25, warningY);
    warningY += 5;
  });

  yPos += 40;

  // ========================================
  // CONDITIONS GÉNÉRALES
  // ========================================
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDITIONS :', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const conditions = [
    `• Cette estimation est valide jusqu'au ${data.validUntil.toLocaleDateString('fr-FR')}`,
    '• Les tarifs peuvent varier en fonction des conditions réelles de transport',
    '• Un devis détaillé vous sera fourni après création de votre compte',
    '• Les frais de douane et taxes ne sont pas inclus dans cette estimation',
  ];

  conditions.forEach((condition) => {
    doc.text(condition, 20, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ========================================
  // PIED DE PAGE
  // ========================================
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Merci de votre intérêt pour Faso Fret Logistics - Votre partenaire en logistique multi-modale',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );

  // Générer le Buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
