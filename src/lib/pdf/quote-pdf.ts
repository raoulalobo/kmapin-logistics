/**
 * Générateur de PDF pour les devis
 *
 * Utilise jsPDF pour créer des devis professionnels
 * avec en-tête, détails transport, et conditions
 *
 * Supporte la configuration dynamique de la plateforme :
 * - Nom de la plateforme dans l'en-tête et le footer
 * - Couleur primaire pour les accents
 *
 * @module lib/pdf
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Configuration de la plateforme pour les PDF
 * Ces valeurs sont passées depuis la fonction de génération après récupération de SystemConfig
 */
export interface PlatformPDFConfig {
  /** Nom complet de la plateforme (ex: "Faso Fret Logistics") */
  platformFullName: string;
  /** Couleur primaire de la marque (format hexadécimal) */
  primaryColor: string;
}

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
 * Détails d'un colis pour le PDF
 * Correspond à QuotePackage en base de données
 */
export interface PackagePDFData {
  description?: string | null;
  quantity: number;
  cargoType: string;
  weight: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  unitPrice?: number | null;
}

/**
 * Type pour les données de devis nécessaires au PDF
 */
export interface QuotePDFData {
  quoteNumber: string;
  createdAt: Date;
  validUntil: Date;
  company: {
    name: string;
    legalName?: string | null;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    email: string;
    phone?: string | null;
  };
  originCountry: string;
  destinationCountry: string;
  transportMode: string[];
  cargoType: string;
  weight: number;
  volume?: number | null;
  /** Priorité de livraison - affecte le prix et le délai */
  priority?: string | null;
  estimatedCost: number;
  currency: string;
  status: string;
  /** Liste des colis détaillés (multi-colis) — si fourni et > 1, affiche un tableau */
  packages?: PackagePDFData[];
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
 * Traduit un code pays ISO 3166-1 alpha-2 en nom français
 *
 * @param code - Code ISO du pays (ex: "CM", "BF", "FR")
 * @returns Nom complet en français (ex: "Cameroun", "Burkina Faso", "France")
 */
function translateCountryCode(code: string | null | undefined): string {
  if (!code) return 'Non défini';
  const countries: Record<string, string> = {
    BF: 'Burkina Faso', CM: 'Cameroun', CI: 'Côte d\'Ivoire', SN: 'Sénégal',
    ML: 'Mali', NE: 'Niger', TG: 'Togo', BJ: 'Bénin', GH: 'Ghana', NG: 'Nigeria',
    GN: 'Guinée', GA: 'Gabon', CG: 'Congo', CD: 'RD Congo', TD: 'Tchad', CF: 'Centrafrique',
    MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie', EG: 'Égypte',
    FR: 'France', BE: 'Belgique', DE: 'Allemagne', ES: 'Espagne', IT: 'Italie',
    GB: 'Royaume-Uni', NL: 'Pays-Bas', PT: 'Portugal', CH: 'Suisse', LU: 'Luxembourg',
    US: 'États-Unis', CN: 'Chine', TR: 'Turquie', AE: 'Émirats Arabes Unis',
    SA: 'Arabie Saoudite', IN: 'Inde', JP: 'Japon', BR: 'Brésil',
    ZA: 'Afrique du Sud', KE: 'Kenya', ET: 'Éthiopie',
  };
  return countries[code.toUpperCase()] || code;
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
 * Traduit la priorité de livraison en français
 * Inclut le supplément tarifaire pour information client
 */
function translatePriority(priority: string | null | undefined): string {
  if (!priority) return 'Standard';

  const translations: Record<string, string> = {
    STANDARD: 'Standard',
    NORMAL: 'Normal (+10%)',
    EXPRESS: 'Express (+50%)',
    URGENT: 'Urgent (+30%)',
  };
  return translations[priority] || priority;
}

/**
 * Génère un PDF de devis
 *
 * @param data - Données du devis
 * @param platformConfig - Configuration de la plateforme (optionnel)
 * @returns Buffer du PDF généré
 *
 * @example
 * // Avec configuration personnalisée
 * const pdf = generateQuotePDF(quoteData, {
 *   platformFullName: 'Ma Plateforme Logistique',
 *   primaryColor: '#FF5722',
 * });
 */
export function generateQuotePDF(
  data: QuotePDFData,
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

  // Couleurs (utiliser la couleur primaire de la config pour l'en-tête)
  const primaryColor: [number, number, number] = hexToRgb(config.primaryColor);
  const textColor: [number, number, number] = [51, 51, 51]; // Gris foncé
  const lightGray: [number, number, number] = [240, 240, 240];
  const accentColor: [number, number, number] = [46, 204, 113]; // Vert

  // ========================================
  // EN-TÊTE : Logo et titre
  // ========================================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(config.platformFullName, 20, 33);

  yPos = 50;

  // ========================================
  // INFORMATIONS DEVIS
  // ========================================
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Colonne gauche : Client
  doc.text('CLIENT :', 20, yPos);
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
  doc.text(`Email: ${data.company.email}`, 20, yPos);

  if (data.company.phone) {
    yPos += 5;
    doc.text(`Tél: ${data.company.phone}`, 20, yPos);
  }

  // Colonne droite : Détails du devis
  const rightCol = pageWidth - 80;
  yPos = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('N° DEVIS :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quoteNumber, rightCol + 25, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('DATE :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.createdAt.toLocaleDateString('fr-FR'), rightCol + 25, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('VALIDE JUSQU\'AU :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.validUntil.toLocaleDateString('fr-FR'), rightCol + 25, yPos);

  yPos = 100;

  // ========================================
  // DÉTAILS DU TRANSPORT
  // ========================================
  doc.setFillColor(...lightGray);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('DÉTAILS DU TRANSPORT', 25, yPos);

  yPos += 12;
  doc.setTextColor(...textColor);
  doc.setFontSize(10);

  // Route
  doc.setFont('helvetica', 'bold');
  doc.text('Route :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${translateCountryCode(data.originCountry)} → ${translateCountryCode(data.destinationCountry)}`, 50, yPos);
  yPos += 8;

  // Mode de transport
  doc.setFont('helvetica', 'bold');
  doc.text('Mode de transport :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  const modes = data.transportMode.map(translateTransportMode).join(', ');
  doc.text(modes, 50, yPos);
  yPos += 8;

  // Affichage conditionnel multi-colis vs colis unique
  const hasMultiplePackages = data.packages && data.packages.length > 1;

  if (hasMultiplePackages && data.packages) {
    // ── MULTI-COLIS : Tableau détaillé des colis ──
    doc.setFont('helvetica', 'bold');
    doc.text('Détail des colis :', 25, yPos);
    yPos += 4;

    // Construire les données du tableau colis
    // Colonnes : #, Description, Qté, Type, Poids unit., Dimensions, Poids total
    const packagesTableData = data.packages.map((pkg, index) => {
      const dims = (pkg.length && pkg.width && pkg.height)
        ? `${pkg.length}×${pkg.width}×${pkg.height} cm`
        : '—';
      const totalWeight = (pkg.weight * pkg.quantity).toLocaleString('fr-FR');
      return [
        String(index + 1),
        pkg.description || translateCargoType(pkg.cargoType),
        String(pkg.quantity),
        translateCargoType(pkg.cargoType),
        `${pkg.weight.toLocaleString('fr-FR')} kg`,
        dims,
        `${totalWeight} kg`,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Description', 'Qté', 'Type', 'Poids unit.', 'Dimensions', 'Poids total']],
      body: packagesTableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textColor,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 15 },
        3: { cellWidth: 30 },
        4: { halign: 'right', cellWidth: 25 },
        5: { cellWidth: 35 },
        6: { halign: 'right', cellWidth: 25 },
      },
      margin: { left: 25, right: 25 },
      // Pied de tableau avec totaux
      foot: [[
        '', 'TOTAL', String(data.packages.reduce((s, p) => s + p.quantity, 0)), '', '',  '',
        `${data.weight.toLocaleString('fr-FR')} kg`,
      ]],
      footStyles: {
        fillColor: lightGray,
        textColor: textColor,
        fontSize: 8,
        fontStyle: 'bold',
      },
    });

    // Récupérer la position Y après le tableau
    yPos = (doc as any).lastAutoTable.finalY + 5;
  } else {
    // ── COLIS UNIQUE : Affichage simple (rétrocompatibilité) ──
    // Type de cargo
    doc.setFont('helvetica', 'bold');
    doc.text('Type de cargo :', 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(translateCargoType(data.cargoType), 50, yPos);
    yPos += 8;

    // Poids
    doc.setFont('helvetica', 'bold');
    doc.text('Poids :', 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.weight.toLocaleString('fr-FR')} kg`, 50, yPos);
    yPos += 8;

    // Volume (si présent)
    if (data.volume) {
      doc.setFont('helvetica', 'bold');
      doc.text('Volume :', 25, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.volume.toLocaleString('fr-FR')} m³`, 50, yPos);
      yPos += 8;
    }
  }

  // Priorité de livraison
  // Affiche toujours la priorité pour que le client connaisse le niveau de service
  doc.setFont('helvetica', 'bold');
  doc.text('Priorité :', 25, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(translatePriority(data.priority), 50, yPos);
  yPos += 8;

  yPos += 10;

  // ========================================
  // TARIFICATION
  // ========================================
  doc.setFillColor(...accentColor);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TARIFICATION', 25, yPos);

  yPos += 15;

  // Encadré avec le coût estimé
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(1);
  doc.rect(20, yPos - 8, pageWidth - 40, 20, 'S');

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Coût estimé :', 25, yPos);

  doc.setTextColor(...accentColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const costText = `${data.estimatedCost.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${data.currency}`;
  doc.text(costText, pageWidth - 25, yPos + 3, { align: 'right' });

  yPos += 30;

  // ========================================
  // CONDITIONS ET NOTES
  // ========================================
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONDITIONS :', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const conditions = [
    '• Ce devis est valable jusqu\'à la date indiquée ci-dessus',
    '• Les tarifs sont susceptibles de varier en fonction des conditions réelles',
    '• Le transport est soumis à nos conditions générales de vente',
    '• Un acompte de 30% peut être requis avant l\'expédition',
    '• Les frais de douane et taxes ne sont pas inclus sauf mention contraire',
  ];

  conditions.forEach((condition) => {
    doc.text(condition, 25, yPos);
    yPos += 6;
  });

  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMATIONS COMPLÉMENTAIRES :', 20, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Pour accepter ce devis ou obtenir plus d\'informations, veuillez nous contacter.',
    20,
    yPos
  );

  // ========================================
  // PIED DE PAGE
  // ========================================
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  const footer = 'Merci de votre confiance. Ce devis ne constitue pas un engagement contractuel.';
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
