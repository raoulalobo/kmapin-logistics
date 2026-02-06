/**
 * Générateur de PDF pour les factures
 *
 * Utilise jsPDF et jspdf-autotable pour créer des factures professionnelles
 * avec en-tête, détails client, tableau des articles et totaux
 *
 * Supporte la configuration dynamique de la plateforme :
 * - Nom de la plateforme dans l'en-tête et le footer
 * - Couleur primaire pour les accents
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
import { type PlatformPDFConfig, type PackagePDFData } from './quote-pdf';

/**
 * Configuration par défaut si non fournie
 */
const DEFAULT_PDF_CONFIG: PlatformPDFConfig = {
  platformFullName: 'Faso Fret Logistics',
  primaryColor: '#003D82',
};

/**
 * Convertit une couleur hexadécimale en tuple RGB
 *
 * @param hex - Couleur au format hexadécimal (#RRGGBB)
 * @returns Tuple [R, G, B] avec des valeurs de 0 à 255
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

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

  // Expéditeur (adresse et contact d'origine) — optionnel, snapshot du devis
  origin?: {
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  };

  // Destinataire (adresse et contact de destination) — optionnel, snapshot du devis
  destination?: {
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  };

  // Montants
  estimatedCost: number;
  currency: string;

  // Paiement
  paymentMethod?: string | null;

  // Notes
  agentComment?: string | null;

  /** Liste des colis détaillés (multi-colis) — si fourni et > 1, affiche un tableau détaillé */
  packages?: PackagePDFData[];
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
 * @param platformConfig - Configuration de la plateforme (optionnel)
 * @returns Buffer du PDF généré
 */
export function generateInvoicePDF(
  data: InvoicePDFData,
  platformConfig?: Partial<PlatformPDFConfig>
): Buffer {
  // Fusionner la config par défaut avec celle fournie
  const config: PlatformPDFConfig = {
    ...DEFAULT_PDF_CONFIG,
    ...platformConfig,
  };

  // Créer un nouveau document PDF (A4, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Couleurs (utiliser la couleur primaire de la config)
  const primaryColor: [number, number, number] = hexToRgb(config.primaryColor);
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
  doc.text(config.platformFullName, 20, 33);

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
    `${config.platformFullName} - Votre partenaire en logistique multi-modale`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Convertir en Buffer pour le retour
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Traduit un code pays ISO 3166-1 alpha-2 en nom français
 *
 * Couvre les pays fréquents en logistique Afrique de l'Ouest / Europe.
 * Fallback : retourne le code brut si non trouvé.
 *
 * @param code - Code ISO du pays (ex: "CM", "BF", "FR")
 * @returns Nom complet en français (ex: "Cameroun", "Burkina Faso", "France")
 */
function translateCountryCode(code: string | null | undefined): string {
  if (!code) return 'Non défini';
  const countries: Record<string, string> = {
    // Afrique de l'Ouest et Centrale
    BF: 'Burkina Faso',
    CM: 'Cameroun',
    CI: 'Côte d\'Ivoire',
    SN: 'Sénégal',
    ML: 'Mali',
    NE: 'Niger',
    TG: 'Togo',
    BJ: 'Bénin',
    GH: 'Ghana',
    NG: 'Nigeria',
    GN: 'Guinée',
    GA: 'Gabon',
    CG: 'Congo',
    CD: 'RD Congo',
    TD: 'Tchad',
    CF: 'Centrafrique',
    // Afrique du Nord
    MA: 'Maroc',
    DZ: 'Algérie',
    TN: 'Tunisie',
    EG: 'Égypte',
    // Europe
    FR: 'France',
    BE: 'Belgique',
    DE: 'Allemagne',
    ES: 'Espagne',
    IT: 'Italie',
    GB: 'Royaume-Uni',
    NL: 'Pays-Bas',
    PT: 'Portugal',
    CH: 'Suisse',
    LU: 'Luxembourg',
    // Autres
    US: 'États-Unis',
    CN: 'Chine',
    TR: 'Turquie',
    AE: 'Émirats Arabes Unis',
    SA: 'Arabie Saoudite',
    IN: 'Inde',
    JP: 'Japon',
    BR: 'Brésil',
    ZA: 'Afrique du Sud',
    KE: 'Kenya',
    ET: 'Éthiopie',
  };
  return countries[code.toUpperCase()] || code;
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
function translateTransportModes(modes: string[] | undefined | null): string {
  if (!modes || modes.length === 0) return 'Non défini';
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
 * @param platformConfig - Configuration de la plateforme (optionnel)
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
 * }, {
 *   platformFullName: 'Ma Plateforme',
 *   primaryColor: '#FF5722',
 * });
 */
export function generateInvoiceFromQuotePDF(
  data: QuoteInvoicePDFData,
  platformConfig?: Partial<PlatformPDFConfig>
): Buffer {
  // Fusionner la config par défaut avec celle fournie
  const config: PlatformPDFConfig = {
    ...DEFAULT_PDF_CONFIG,
    ...platformConfig,
  };

  // Créer un nouveau document PDF (A4, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Couleurs (utiliser la couleur primaire de la config)
  const primaryColor: [number, number, number] = hexToRgb(config.primaryColor);
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
  doc.text(config.platformFullName, 20, 33);

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
  // Protection défensive : fallback si client manquant (ne devrait pas arriver pour une facture)
  const clientName = data.client?.name || 'Client non renseigné';
  const clientEmail = data.client?.email || '—';
  const clientAddress = data.client?.address || '';
  const clientCity = data.client?.city || '';
  const clientCountry = data.client?.country || '';
  const clientPostalCode = data.client?.postalCode || '';
  const clientLegalName = data.client?.legalName;
  const clientTaxId = data.client?.taxId;
  const clientPhone = data.client?.phone;

  doc.text('CLIENT :', 20, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(clientName, 20, yPos);
  yPos += 5;

  if (clientLegalName && clientLegalName !== clientName) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(clientLegalName, 20, yPos);
    yPos += 4;
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
  }

  if (clientAddress) {
    doc.text(clientAddress, 20, yPos);
    yPos += 5;
  }
  doc.text(`${clientPostalCode} ${clientCity}`.trim(), 20, yPos);
  yPos += 5;
  if (clientCountry) {
    doc.text(clientCountry, 20, yPos);
    yPos += 5;
  }

  if (clientTaxId) {
    doc.text(`TVA: ${clientTaxId}`, 20, yPos);
    yPos += 5;
  }

  doc.text(`Email: ${clientEmail}`, 20, yPos);
  if (clientPhone) {
    yPos += 5;
    doc.text(`Tél: ${clientPhone}`, 20, yPos);
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

  // Ligne 1 : Origine → Destination (noms complets des pays)
  doc.text(`Trajet : ${translateCountryCode(data.expedition.originCountry)} → ${translateCountryCode(data.expedition.destinationCountry)}`, 25, yPos);
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

  yPos += 10;

  // ========================================
  // EXPÉDITEUR ET DESTINATAIRE (côte à côte)
  // ========================================
  // Affichés uniquement si au moins un des deux a des données renseignées
  const hasOrigin = data.origin && (data.origin.contactName || data.origin.address || data.origin.city);
  const hasDestination = data.destination && (data.destination.contactName || data.destination.address || data.destination.city);

  if (hasOrigin || hasDestination) {
    // Sauvegarder yPos de départ pour aligner les deux colonnes
    const sectionStartY = yPos;
    const colLeft = 25;     // Colonne gauche : Expéditeur
    const colRight = pageWidth / 2 + 5; // Colonne droite : Destinataire

    // --- Colonne gauche : EXPÉDITEUR ---
    if (hasOrigin && data.origin) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text('EXPÉDITEUR', colLeft, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...textColor);

      if (data.origin.contactName) {
        doc.setFont('helvetica', 'bold');
        doc.text(data.origin.contactName, colLeft, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 4;
      }
      if (data.origin.address) {
        doc.text(data.origin.address, colLeft, yPos);
        yPos += 4;
      }
      // Ville, code postal, pays
      const originLocation = [data.origin.postalCode, data.origin.city].filter(Boolean).join(' ');
      if (originLocation) {
        doc.text(originLocation, colLeft, yPos);
        yPos += 4;
      }
      doc.text(translateCountryCode(data.expedition.originCountry), colLeft, yPos);
      yPos += 4;

      if (data.origin.contactPhone) {
        doc.text(`Tél: ${data.origin.contactPhone}`, colLeft, yPos);
        yPos += 4;
      }
      if (data.origin.contactEmail) {
        doc.text(`Email: ${data.origin.contactEmail}`, colLeft, yPos);
        yPos += 4;
      }
    }

    // Hauteur maximale atteinte par la colonne gauche
    const leftEndY = yPos;

    // --- Colonne droite : DESTINATAIRE ---
    yPos = sectionStartY; // Revenir en haut pour la colonne droite

    if (hasDestination && data.destination) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text('DESTINATAIRE', colRight, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...textColor);

      if (data.destination.contactName) {
        doc.setFont('helvetica', 'bold');
        doc.text(data.destination.contactName, colRight, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 4;
      }
      if (data.destination.address) {
        doc.text(data.destination.address, colRight, yPos);
        yPos += 4;
      }
      const destLocation = [data.destination.postalCode, data.destination.city].filter(Boolean).join(' ');
      if (destLocation) {
        doc.text(destLocation, colRight, yPos);
        yPos += 4;
      }
      doc.text(translateCountryCode(data.expedition.destinationCountry), colRight, yPos);
      yPos += 4;

      if (data.destination.contactPhone) {
        doc.text(`Tél: ${data.destination.contactPhone}`, colRight, yPos);
        yPos += 4;
      }
      if (data.destination.contactEmail) {
        doc.text(`Email: ${data.destination.contactEmail}`, colRight, yPos);
        yPos += 4;
      }
    }

    // Prendre le max des deux colonnes pour positionner la suite
    yPos = Math.max(leftEndY, yPos) + 5;
  }

  yPos += 5;

  // ========================================
  // TABLEAU DES PRESTATIONS
  // ========================================
  // Affichage conditionnel : multi-colis détaillé ou ligne unique
  const hasMultiplePackages = data.packages && data.packages.length > 1;

  let tableData: string[][];

  if (hasMultiplePackages && data.packages) {
    // Multi-colis : une ligne par type de colis avec prix unitaire et montant
    // Si les unitPrice sont null (anciens devis), on distribue estimatedCost proportionnellement au poids
    const allHavePrice = data.packages.every((pkg) => pkg.unitPrice != null && pkg.unitPrice > 0);
    const totalWeightQty = data.packages.reduce((sum, pkg) => sum + pkg.weight * pkg.quantity, 0);

    tableData = data.packages.map((pkg) => {
      const desc = pkg.description || translateCargoType(pkg.cargoType);
      // Priorité : unitPrice sauvegardé > fallback proportionnel au poids
      let unitPrice: number;
      if (allHavePrice) {
        unitPrice = pkg.unitPrice!;
      } else {
        // Distribution proportionnelle : (poids colis / poids total) × estimatedCost / quantité
        unitPrice = totalWeightQty > 0
          ? (pkg.weight / totalWeightQty) * data.estimatedCost
          : 0;
      }
      const amount = unitPrice * pkg.quantity;
      return [
        `${desc} (${pkg.weight}kg${pkg.length && pkg.width && pkg.height ? `, ${pkg.length}×${pkg.width}×${pkg.height}cm` : ''})`,
        String(pkg.quantity),
        `${unitPrice.toFixed(2)} ${data.currency}`,
        `${amount.toFixed(2)} ${data.currency}`,
      ];
    });
  } else {
    // Colis unique ou anciens devis : une seule ligne globale
    tableData = [
      [
        `Service d'expédition ${translateCountryCode(data.expedition.originCountry)} → ${translateCountryCode(data.expedition.destinationCountry)}`,
        '1',
        `${data.estimatedCost.toFixed(2)} ${data.currency}`,
        `${data.estimatedCost.toFixed(2)} ${data.currency}`,
      ],
    ];
  }

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
    `${config.platformFullName} - Votre partenaire en logistique multi-modale`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Convertir en Buffer pour le retour
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
