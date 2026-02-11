/**
 * Composant : QuoteCalculator
 *
 * Calculateur de devis public multi-colis pour la page d'accueil
 * Permet aux visiteurs d'obtenir une estimation de prix sans authentification
 *
 * Fonctionnalités :
 * - Saisie de PLUSIEURS lignes d'articles (multi-colis via useFieldArray)
 * - Regroupement d'articles identiques sur une seule ligne avec quantité
 * - Calcul du prix par ligne (unitaire × quantité) + total global
 * - Surcharge priorité appliquée UNE SEULE FOIS sur le total
 * - Téléchargement PDF avec tableau détaillé (jspdf-autotable)
 * - Sauvegarde en base / localStorage
 *
 * Layout en pleine largeur avec formulaire horizontal
 *
 * @module components/quote-calculator
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import {
  CircleNotch,
  Calculator,
  Package,
  MapPin,
  Truck,
  Boat,
  Airplane,
  Train,
  TrendUp,
  Download,
  Envelope,
  FloppyDisk,
  UserPlus,
  Plus,
  Trash,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateMultiPackageEstimateAction } from '@/modules/quotes/actions/calculate-quote-estimate-v2';
import {
  quoteEstimateMultiPackageSchema,
  type QuoteEstimateMultiPackageData,
  type QuoteEstimateMultiPackageResult,
} from '@/modules/quotes/schemas/quote.schema';
import { CargoType, TransportMode } from '@/lib/db/enums';
import { QuoteRequestModal } from '@/components/quote-request/quote-request-modal';
import type { QuoteDataFormData } from '@/modules/prospects';
import { useSafeSession } from '@/lib/auth/hooks';
import { CountrySelect } from '@/components/countries';
import { usePendingQuotes } from '@/hooks';
import {
  getTransportModeOptionsAction,
  getPriorityOptionsAction,
  type TransportModeOption,
  type PriorityOption,
} from '@/modules/pricing-config';

/**
 * Traductions françaises pour les types de marchandise
 * Utilisé dans les selects du formulaire, le modal de résultat et le PDF
 */
const cargoTypeLabels: Record<CargoType, string> = {
  GENERAL: 'Générale',
  DANGEROUS: 'Dangereuse',
  PERISHABLE: 'Périssable',
  FRAGILE: 'Fragile',
  BULK: 'Vrac',
  CONTAINER: 'Conteneur',
  PALLETIZED: 'Palettisé',
  OTHER: 'Autre',
};

/**
 * Labels de base pour les modes de transport
 * Utilisés comme fallback quand les options dynamiques ne sont pas encore chargées
 */
const TRANSPORT_MODE_BASE_LABELS: Record<TransportMode, string> = {
  ROAD: 'Routier',
  SEA: 'Maritime',
  AIR: 'Aérien',
  RAIL: 'Ferroviaire',
};

/**
 * Icônes pour les modes de transport
 * Statiques car non configurables en BDD ; labels et multiplicateurs sont dynamiques
 */
const transportModeIcons: Record<TransportMode, React.ComponentType<{ className?: string }>> = {
  ROAD: Truck,
  SEA: Boat,
  AIR: Airplane,
  RAIL: Train,
};

/**
 * Mapping des codes pays (ISO 2 lettres) vers noms complets
 * Utilisé pour l'affichage dans le PDF et le modal
 */
const countryNames: Record<string, string> = {
  // Afrique de l'Ouest
  'BF': 'Burkina Faso', 'CI': 'Côte d\'Ivoire', 'SN': 'Sénégal', 'ML': 'Mali',
  'NE': 'Niger', 'BJ': 'Bénin', 'TG': 'Togo', 'GH': 'Ghana', 'NG': 'Nigéria',
  'GM': 'Gambie', 'GN': 'Guinée', 'GW': 'Guinée-Bissau', 'LR': 'Libéria',
  'SL': 'Sierra Leone', 'CV': 'Cap-Vert',
  // Afrique Centrale
  'CM': 'Cameroun', 'TD': 'Tchad', 'CF': 'République Centrafricaine', 'CG': 'Congo',
  'CD': 'République Démocratique du Congo', 'GA': 'Gabon', 'GQ': 'Guinée Équatoriale',
  'ST': 'Sao Tomé-et-Principe',
  // Afrique du Nord
  'MA': 'Maroc', 'DZ': 'Algérie', 'TN': 'Tunisie', 'LY': 'Libye', 'EG': 'Égypte',
  // Afrique de l'Est
  'KE': 'Kenya', 'ET': 'Éthiopie', 'TZ': 'Tanzanie', 'UG': 'Ouganda', 'RW': 'Rwanda',
  'BI': 'Burundi', 'SO': 'Somalie', 'DJ': 'Djibouti', 'ER': 'Érythrée',
  // Afrique Australe
  'ZA': 'Afrique du Sud', 'ZW': 'Zimbabwe', 'MZ': 'Mozambique', 'MW': 'Malawi',
  'ZM': 'Zambie', 'NA': 'Namibie', 'BW': 'Botswana', 'LS': 'Lesotho', 'SZ': 'Eswatini',
  // Europe
  'FR': 'France', 'BE': 'Belgique', 'DE': 'Allemagne', 'ES': 'Espagne', 'IT': 'Italie',
  'GB': 'Royaume-Uni', 'PT': 'Portugal', 'NL': 'Pays-Bas', 'CH': 'Suisse', 'LU': 'Luxembourg',
  // Amérique
  'US': 'États-Unis', 'CA': 'Canada', 'MX': 'Mexique', 'BR': 'Brésil',
  // Asie
  'CN': 'Chine', 'IN': 'Inde', 'JP': 'Japon', 'KR': 'Corée du Sud',
  'AE': 'Émirats Arabes Unis', 'SA': 'Arabie Saoudite', 'TR': 'Turquie',
  // Océanie
  'AU': 'Australie', 'NZ': 'Nouvelle-Zélande',
};

/**
 * Convertit un code pays (ex: "FR") en nom complet (ex: "France")
 * Retourne le code tel quel si non trouvé dans le mapping
 */
const getCountryName = (code: string): string => {
  return countryNames[code.toUpperCase()] || code;
};

/**
 * Formater un nombre pour l'affichage dans le PDF (compatible jsPDF)
 *
 * jsPDF ne supporte pas les espaces insécables Unicode (U+00A0, U+202F)
 * générés par toLocaleString('fr-FR'), qui s'affichent comme "/" ou "?"
 *
 * @param num - Nombre à formater
 * @param decimals - Nombre de décimales (défaut: 0)
 * @returns Nombre formaté avec espaces normaux
 */
const formatNumberForPDF = (num: number, decimals: number = 0): string => {
  const formatted = num.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  // Remplacer les espaces insécables par des espaces normaux pour jsPDF
  return formatted.replace(/[\u00A0\u202F]/g, ' ');
};

/**
 * Valeur par défaut pour une nouvelle ligne de colis
 * Utilisée par useFieldArray lors de l'ajout d'une ligne (append)
 */
const DEFAULT_PACKAGE_LINE = {
  description: '',
  quantity: 1,
  cargoType: 'GENERAL' as CargoType,
  weight: undefined as unknown as number,
  length: undefined as unknown as number,
  width: undefined as unknown as number,
  height: undefined as unknown as number,
};

export function QuoteCalculator() {
  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAT LOCAL
  // ═══════════════════════════════════════════════════════════════════════════

  /** Résultat du calcul multi-packages (prix par ligne + totaux) */
  const [result, setResult] = useState<QuoteEstimateMultiPackageResult | null>(null);

  /** Indicateur de calcul en cours */
  const [isCalculating, setIsCalculating] = useState(false);

  /** Message d'erreur affiché sous le formulaire */
  const [error, setError] = useState<string | null>(null);

  /** Contrôle du modal de demande de devis par email (non-connecté) */
  const [showEmailModal, setShowEmailModal] = useState(false);

  /** Contrôle du modal d'affichage des résultats */
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  /** Données du formulaire conservées après calcul (pour PDF, modal email, sauvegarde) */
  const [lastFormData, setLastFormData] = useState<QuoteEstimateMultiPackageData | null>(null);

  /** Options dynamiques transport : labels enrichis avec multiplicateurs et délais (depuis PricingConfig) */
  const [transportModeOptions, setTransportModeOptions] = useState<TransportModeOption[]>([]);

  /** Options dynamiques priorité : labels enrichis avec surcharges tarifaires (depuis PricingConfig) */
  const [priorityOptions, setPriorityOptions] = useState<PriorityOption[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION ET HOOKS EXTERNES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Session utilisateur (Better Auth) - null si non connecté */
  const { data: session } = useSafeSession();

  /** Gestion des devis en attente dans localStorage (pour visiteurs non connectés) */
  const { addPendingQuote } = usePendingQuotes();

  /** Query params pour pré-remplissage depuis /tarifs (origin, destination, mode) */
  const searchParams = useSearchParams();

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMULAIRE REACT HOOK FORM + USEFIELARRAY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Valeurs par défaut du formulaire
   * Pré-remplit les champs route et transport depuis les query params si présents
   * Initialise avec UNE seule ligne de colis par défaut
   */
  const defaultValues = useMemo(() => {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const mode = searchParams.get('mode');

    return {
      originCountry: origin || '',
      destinationCountry: destination || '',
      transportMode: mode && Object.values(TransportMode).includes(mode as TransportMode)
        ? [mode as TransportMode]
        : [],
      priority: 'STANDARD' as const,
      // Une seule ligne de colis par défaut
      packages: [{ ...DEFAULT_PACKAGE_LINE }],
    };
  }, [searchParams]);

  /**
   * Configuration React Hook Form avec validation Zod multi-packages
   *
   * Le resolver zodResolver valide l'ensemble du formulaire :
   * - Route (originCountry, destinationCountry)
   * - Transport (transportMode[], priority)
   * - Packages (array de colis avec quantité, poids, dimensions, type cargo)
   */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<QuoteEstimateMultiPackageData>({
    resolver: zodResolver(quoteEstimateMultiPackageSchema),
    defaultValues,
  });

  /**
   * useFieldArray pour gérer dynamiquement les lignes de colis
   *
   * Fournit les méthodes :
   * - fields : liste des lignes avec leurs IDs uniques (pour le key React)
   * - append : ajouter une nouvelle ligne de colis
   * - remove : supprimer une ligne de colis (si > 1)
   */
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'packages',
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFETS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Notifications et scroll lors de la navigation depuis /tarifs
   * Affiche les notifications de pré-remplissage après montage
   */
  useEffect(() => {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const mode = searchParams.get('mode');

    const timer = setTimeout(() => {
      if (origin) toast.info(`Origine pré-remplie : ${origin}`);
      if (destination) toast.info(`Destination pré-remplie : ${destination}`);
      if (mode && Object.values(TransportMode).includes(mode as TransportMode)) {
        toast.info(`Mode de transport sélectionné : ${TRANSPORT_MODE_BASE_LABELS[mode as TransportMode]}`);
      }

      // Scroll smooth vers le calculateur si des params sont présents
      if (origin || destination || mode) {
        const element = document.getElementById('calculateur');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchParams]);

  /**
   * Chargement des options dynamiques (mode transport + priorité)
   * depuis PricingConfig via Server Actions
   *
   * Ces options contiennent les labels enrichis avec multiplicateurs tarifaires
   * et délais de livraison estimés (affichés dans les boutons de sélection)
   */
  useEffect(() => {
    async function loadDynamicOptions() {
      try {
        const [transportResult, priorityResult] = await Promise.all([
          getTransportModeOptionsAction(),
          getPriorityOptionsAction(),
        ]);

        if (transportResult.success) setTransportModeOptions(transportResult.data);
        if (priorityResult.success) setPriorityOptions(priorityResult.data);
      } catch (error) {
        console.error('[QuoteCalculator] Erreur chargement options dynamiques:', error);
      }
    }

    loadDynamicOptions();
  }, []);

  /** Observer les modes de transport sélectionnés pour l'affichage des boutons */
  const selectedTransportModes = watch('transportMode') || [];

  /**
   * Sélection d'un mode de transport unique
   * Toggle : si déjà sélectionné on le désélectionne, sinon on remplace
   */
  const toggleTransportMode = (mode: TransportMode) => {
    const current = getValues('transportMode') || [];
    const updated = current.includes(mode) ? [] : [mode];
    setValue('transportMode', updated, { shouldValidate: true });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUMISSION DU FORMULAIRE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler de soumission du formulaire multi-colis
   *
   * 1. Appelle la Server Action calculateMultiPackageEstimateAction()
   * 2. Stocke le résultat (prix par ligne + totaux) dans l'état local
   * 3. Sauvegarde dans localStorage si non connecté
   * 4. Ouvre le modal de résultat
   */
  const onSubmit = async (data: QuoteEstimateMultiPackageData) => {
    try {
      setIsCalculating(true);
      setError(null);
      setResult(null);

      // Conserver les données du formulaire pour PDF, modal email et sauvegarde
      setLastFormData(data);

      // Appeler la Server Action multi-packages
      const response = await calculateMultiPackageEstimateAction(data);

      if (response.success && response.data) {
        setResult(response.data);

        // Sauvegarder dans localStorage si l'utilisateur n'est pas connecté
        // Les données sont adaptées au format PendingQuoteFormData
        if (!session?.user) {
          // Adapter les données multi-packages en format PendingQuote
          // On utilise le type cargo dominant et le poids total comme agrégats
          addPendingQuote(
            {
              originCountry: data.originCountry,
              destinationCountry: data.destinationCountry,
              cargoType: response.data.dominantCargoType,
              weight: response.data.totalWeight,
              transportMode: data.transportMode,
              priority: data.priority,
            },
            {
              estimatedCost: response.data.totalPrice,
              currency: 'EUR',
              estimatedDeliveryDays: response.data.estimatedDeliveryDays,
              breakdown: {
                baseCost: response.data.totalBeforePriority,
                transportModeCost: 0,
                cargoTypeSurcharge: 0,
                prioritySurcharge: response.data.totalPrice - response.data.totalBeforePriority,
                distanceFactor: 0,
              },
            }
          );
        }

        setIsResultModalOpen(true);
      } else if (!response.success) {
        setError(response.error || 'Une erreur est survenue');
      }
    } catch (err) {
      console.error('Error calculating estimate:', err);
      setError('Une erreur est survenue lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DU MODAL (PDF, EMAIL, SAUVEGARDE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Télécharger le devis en PDF avec tableau détaillé multi-lignes
   *
   * Utilise jsPDF + jspdf-autotable pour générer un tableau professionnel :
   * - Colonnes : Description | Qté | Type | Poids unit. | Prix unit. | Total ligne
   * - Ligne de total en gras en bas du tableau
   * - Surcharge priorité si applicable
   * - Total final
   */
  const handleDownloadPDF = () => {
    if (!result || !lastFormData) {
      toast.error('Aucun devis à télécharger');
      return;
    }

    try {
      // Import dynamique de jsPDF et autoTable pour éviter les problèmes SSR
      // autoTable est importé comme fonction directe (pas en side-effect)
      // pour garantir qu'il fonctionne avec l'import dynamique
      Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]).then(([{ default: jsPDF }, { default: autoTable }]) => {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Couleurs professionnelles
        const primaryColor: [number, number, number] = [0, 61, 130];
        const secondaryColor: [number, number, number] = [255, 152, 0];
        const textDark: [number, number, number] = [33, 33, 33];
        const textLight: [number, number, number] = [100, 100, 100];
        const borderGray: [number, number, number] = [220, 220, 220];

        let yPos = 15;

        // ============================================
        // EN-TÊTE AVEC INFORMATIONS SOCIÉTÉ
        // ============================================
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Logo et nom société
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('FASO FRET', 15, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Solutions Logistiques Internationales', 15, 27);

        // Coordonnées société
        doc.setFontSize(8);
        doc.text('Adresse : Ouagadougou, Burkina Faso', 15, 35);
        doc.text('Tel : +226 XX XX XX XX', 15, 40);
        doc.text('Email : contact@fasofret.com', 15, 45);

        // N° Devis et Date (à droite)
        const quoteNumber = `DEV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-5)}`;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const rightX = pageWidth - 15;
        doc.text('N° DEVIS', rightX, 20, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(quoteNumber, rightX, 26, { align: 'right' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('DATE', rightX, 34, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('fr-FR'), rightX, 39, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.text('VALIDITÉ', rightX, 45, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        const validityDate = new Date();
        validityDate.setDate(validityDate.getDate() + 30);
        doc.text(validityDate.toLocaleDateString('fr-FR'), rightX, 50, { align: 'right' });

        yPos = 60;

        // ============================================
        // SECTION TRAJET
        // ============================================
        doc.setFillColor(...secondaryColor);
        doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TRAJET', 20, yPos + 5.5);
        yPos += 14;

        doc.setTextColor(...textDark);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const originName = getCountryName(lastFormData.originCountry);
        const destinationName = getCountryName(lastFormData.destinationCountry);
        doc.text(`${originName} vers ${destinationName}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // ============================================
        // SECTION TRANSPORT ET PRIORITÉ
        // ============================================
        doc.setFontSize(9);
        const leftCol = 20;
        const valueCol = 75;

        doc.setFont('helvetica', 'bold');
        doc.text('Mode de transport :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        const modes = lastFormData.transportMode.map(m => TRANSPORT_MODE_BASE_LABELS[m as TransportMode]).join(', ');
        doc.text(modes, valueCol, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('Priorité :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(lastFormData.priority || 'STANDARD', valueCol, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('Nombre de colis :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`${result.totalPackageCount} colis (${result.totalWeight} kg total)`, valueCol, yPos);
        yPos += 10;

        // ============================================
        // TABLEAU DÉTAILLÉ DES COLIS (jspdf-autotable)
        // ============================================
        doc.setFillColor(...secondaryColor);
        doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DÉTAIL DES COLIS', 20, yPos + 5.5);
        yPos += 12;

        // Préparer les données du tableau
        // Chaque ligne : Description | Quantité | Type cargo | Poids unit. | Prix unit. | Total ligne
        const tableBody = result.lines.map((line) => [
          line.description || '-',
          String(line.quantity),
          cargoTypeLabels[line.cargoType as CargoType] || line.cargoType,
          `${formatNumberForPDF(line.weight, 1)} kg`,
          `${formatNumberForPDF(line.unitPrice, 2)} EUR`,
          `${formatNumberForPDF(line.lineTotal, 2)} EUR`,
        ]);

        // Générer le tableau avec autoTable — appel en fonction directe (pas via prototype)
        // Pattern identique à src/lib/pdf/quote-pdf.ts et invoice-pdf.ts
        autoTable(doc, {
          startY: yPos,
          margin: { left: 15, right: 15 },
          head: [['Description', 'Qté', 'Type', 'Poids unit.', 'Prix unit.', 'Total ligne']],
          body: tableBody,
          // Style du header : fond bleu professionnel
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          // Style du body : alternance de couleurs pour la lisibilité
          bodyStyles: {
            fontSize: 8,
            textColor: textDark,
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          // Largeurs de colonnes proportionnelles
          columnStyles: {
            0: { cellWidth: 45 }, // Description (plus large)
            1: { cellWidth: 15, halign: 'center' as const }, // Quantité
            2: { cellWidth: 30 }, // Type
            3: { cellWidth: 25, halign: 'right' as const }, // Poids
            4: { cellWidth: 30, halign: 'right' as const }, // Prix unit.
            5: { cellWidth: 30, halign: 'right' as const }, // Total ligne
          },
          theme: 'grid' as const,
        });

        // Récupérer la position Y après le tableau
        yPos = (doc as any).lastAutoTable.finalY + 8;

        // ============================================
        // SECTION TOTAUX
        // ============================================

        // Sous-total (avant priorité)
        doc.setFontSize(10);
        doc.setTextColor(...textDark);
        doc.setFont('helvetica', 'bold');
        doc.text('Sous-total :', pageWidth - 80, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatNumberForPDF(result.totalBeforePriority, 2)} EUR`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 6;

        // Surcharge priorité (si applicable)
        const prioritySurcharge = result.totalPrice - result.totalBeforePriority;
        if (prioritySurcharge > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(150, 50, 150); // Couleur violet pour la surcharge
          doc.text(`Supplément priorité (${result.priorite}) :`, pageWidth - 80, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(`+${formatNumberForPDF(prioritySurcharge, 2)} EUR`, pageWidth - 15, yPos, { align: 'right' });
          yPos += 6;
        }

        // Ligne de séparation
        yPos += 2;
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);
        yPos += 6;

        // ============================================
        // PRIX FINAL (mise en évidence)
        // ============================================
        doc.setFillColor(...primaryColor);
        doc.rect(15, yPos, pageWidth - 30, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PRIX TOTAL ESTIMÉ', 20, yPos + 10);
        doc.setFontSize(22);
        doc.text(`${formatNumberForPDF(result.totalPrice, 2)} EUR`, pageWidth - 20, yPos + 17, { align: 'right' });
        yPos += 33;

        // ============================================
        // FOOTER - CONDITIONS
        // ============================================
        const footerY = pageHeight - 35;
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.3);
        doc.line(15, footerY, pageWidth - 15, footerY);

        doc.setFontSize(7);
        doc.setTextColor(...textLight);
        doc.setFont('helvetica', 'italic');
        doc.text('Ce devis est valable 30 jours à compter de la date d\'émission.', pageWidth / 2, footerY + 5, { align: 'center' });
        doc.text('Les tarifs indiqués sont donnés à titre indicatif et peuvent varier selon les conditions réelles d\'expédition.', pageWidth / 2, footerY + 9, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text('FASO FRET - Solutions Logistiques Professionnelles', pageWidth / 2, footerY + 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...textLight);
        doc.text('www.fasofret.com | contact@fasofret.com | +226 XX XX XX XX', pageWidth / 2, footerY + 20, { align: 'center' });

        // Télécharger le PDF
        doc.save(`devis-fasofret-${quoteNumber}.pdf`);
        toast.success('Devis téléchargé avec succès !');
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  /**
   * Sauvegarder le devis dans l'espace client (utilisateur connecté)
   *
   * Appelle la Server Action saveQuoteFromCalculatorAction()
   * Les données multi-packages sont converties en format compatible :
   * - Les champs agrégats (weight, cargoType) utilisent le dominant du résultat
   * - Le schéma quoteEstimateSchema attend des champs plats (pas de packages[])
   */
  const handleSaveQuote = async () => {
    if (!result || !lastFormData) {
      toast.error('Aucun devis à sauvegarder');
      return;
    }

    try {
      const { saveQuoteFromCalculatorAction } = await import('@/modules/quotes/actions/quote.actions');

      const toastId = toast.loading('Sauvegarde en cours...');

      // Convertir les données multi-packages en format mono-colis (compatible saveQuoteFromCalculatorAction)
      // La Server Action attend le format quoteEstimateSchema (champs plats)
      const flatData = {
        originCountry: lastFormData.originCountry,
        destinationCountry: lastFormData.destinationCountry,
        cargoType: result.dominantCargoType as CargoType,
        weight: result.totalWeight,
        length: 0,
        width: 0,
        height: 0,
        transportMode: lastFormData.transportMode,
        priority: lastFormData.priority,
      };

      const response = await saveQuoteFromCalculatorAction(flatData);

      if (response.success && response.data) {
        toast.success(`Devis ${response.data.quoteNumber} sauvegardé dans votre espace !`, { id: toastId });
      } else if (!response.success) {
        toast.error(response.error || 'Erreur lors de la sauvegarde', { id: toastId });
      }
    } catch (error) {
      console.error('Erreur sauvegarde devis:', error);
      toast.dismiss();
      toast.error('Erreur lors de la sauvegarde du devis');
    }
  };

  /**
   * Préparer les données pour le QuoteRequestModal (envoi par email)
   *
   * Convertit QuoteEstimateMultiPackageData en QuoteDataFormData
   * en agrégeant les données multi-packages en champs plats
   */
  const prepareQuoteDataForModal = (): QuoteDataFormData | null => {
    if (!lastFormData || !result) return null;

    return {
      originCountry: lastFormData.originCountry,
      destinationCountry: lastFormData.destinationCountry,
      cargoType: result.dominantCargoType as CargoType,
      weight: result.totalWeight,
      volume: null,
      transportMode: lastFormData.transportMode,
      estimatedCost: result.totalPrice,
      currency: 'EUR',
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Formulaire en pleine largeur */}
      <Card className="border-0 shadow-xl w-full">
        <CardHeader className="bg-gradient-to-r from-[#003D82] to-[#002952] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Calculator className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl text-white">Calculateur de devis gratuit</CardTitle>
                <CardDescription className="text-blue-100 text-base mt-1">
                  Obtenez une estimation instantanée pour votre expédition multi-colis
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ═══════════════ ROUTE : Origine + Destination ═══════════════ */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pays d'origine */}
              <div className="space-y-2">
                <Label htmlFor="originCountry" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#003D82]" />
                  Pays d&apos;origine
                </Label>
                <CountrySelect
                  id="originCountry"
                  value={watch('originCountry')}
                  onValueChange={(value) => setValue('originCountry', value)}
                  placeholder="Sélectionnez un pays"
                  className={`h-11 ${errors.originCountry ? 'border-red-500' : ''}`}
                />
                {errors.originCountry && (
                  <p className="text-sm text-red-500">{errors.originCountry.message}</p>
                )}
              </div>

              {/* Pays de destination */}
              <div className="space-y-2">
                <Label htmlFor="destinationCountry" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#003D82]" />
                  Pays de destination
                </Label>
                <CountrySelect
                  id="destinationCountry"
                  value={watch('destinationCountry')}
                  onValueChange={(value) => setValue('destinationCountry', value)}
                  placeholder="Sélectionnez un pays"
                  className={`h-11 ${errors.destinationCountry ? 'border-red-500' : ''}`}
                />
                {errors.destinationCountry && (
                  <p className="text-sm text-red-500">{errors.destinationCountry.message}</p>
                )}
              </div>
            </div>

            {/* ═══════════════ COLIS MULTI-LIGNES ═══════════════ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#003D82]" />
                  Détail des colis
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ...DEFAULT_PACKAGE_LINE })}
                  className="border-[#003D82] text-[#003D82] hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un colis
                </Button>
              </div>

              {/* Erreur globale sur le tableau de packages */}
              {errors.packages && !Array.isArray(errors.packages) && (
                <p className="text-sm text-red-500">{(errors.packages as any).message}</p>
              )}

              {/* En-tête du tableau (visible en desktop) */}
              <div className="hidden lg:grid lg:grid-cols-[1fr_80px_140px_100px_90px_90px_90px_40px] gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <span>Description</span>
                <span>Quantité</span>
                <span>Type cargo</span>
                <span>Poids (kg)</span>
                <span>L (cm)</span>
                <span>l (cm)</span>
                <span>H (cm)</span>
                <span></span>
              </div>

              {/* Lignes de colis dynamiques (useFieldArray) */}
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_80px_140px_100px_90px_90px_90px_40px] gap-2 p-3 border rounded-lg bg-white hover:border-blue-200 transition-colors"
                >
                  {/* Description */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Description</Label>
                    <Input
                      placeholder="Ex: Tablette, Carton..."
                      {...register(`packages.${index}.description`)}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Quantité */}
                  <div>
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Quantité</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      {...register(`packages.${index}.quantity`, { valueAsNumber: true })}
                      className={`h-9 text-sm text-center ${errors.packages?.[index]?.quantity ? 'border-red-500' : ''}`}
                    />
                  </div>

                  {/* Type de marchandise */}
                  <div>
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Type cargo</Label>
                    <Select
                      defaultValue={field.cargoType || 'GENERAL'}
                      onValueChange={(value) => setValue(`packages.${index}.cargoType`, value as CargoType)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(cargoTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Poids unitaire */}
                  <div>
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Poids (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="kg"
                      {...register(`packages.${index}.weight`, { valueAsNumber: true })}
                      className={`h-9 text-sm ${errors.packages?.[index]?.weight ? 'border-red-500' : ''}`}
                    />
                  </div>

                  {/* Longueur */}
                  <div>
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Longueur (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="L"
                      {...register(`packages.${index}.length`, { valueAsNumber: true })}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Largeur */}
                  <div>
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Largeur (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="l"
                      {...register(`packages.${index}.width`, { valueAsNumber: true })}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Hauteur */}
                  <div>
                    <Label className="lg:hidden text-xs text-gray-500 mb-1">Hauteur (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="H"
                      {...register(`packages.${index}.height`, { valueAsNumber: true })}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Bouton supprimer (désactivé si 1 seule ligne) */}
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
                      title={fields.length <= 1 ? 'Au moins un colis requis' : 'Supprimer cette ligne'}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Erreurs de validation par ligne (affiché sous la ligne en mobile) */}
                  {(errors.packages?.[index]?.weight || errors.packages?.[index]?.quantity) && (
                    <div className="col-span-full text-xs text-red-500 -mt-1">
                      {errors.packages?.[index]?.weight?.message}
                      {errors.packages?.[index]?.weight && errors.packages?.[index]?.quantity && ' | '}
                      {errors.packages?.[index]?.quantity?.message}
                    </div>
                  )}
                </div>
              ))}

              {/* Note sur les dimensions */}
              <p className="text-xs text-gray-500">
                <strong>ℹ️</strong> Les dimensions sont en <strong>centimètres (cm)</strong> et sont optionnelles.
                Si renseignées, le poids volumétrique est calculé automatiquement.
              </p>
            </div>

            {/* ═══════════════ PRIORITÉ ═══════════════ */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-base font-semibold">Priorité de livraison</Label>
              <Select
                defaultValue="STANDARD"
                onValueChange={(value) => setValue('priority', value as 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT')}
              >
                <SelectTrigger id="priority" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.labelWithDetails}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ═══════════════ MODES DE TRANSPORT ═══════════════ */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#003D82]" />
                Mode de transport
              </Label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {transportModeOptions.map((option) => {
                  const isSelected = selectedTransportModes.includes(option.value);
                  const Icon = transportModeIcons[option.value];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleTransportMode(option.value)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-[#003D82] bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-[#003D82]' : 'text-gray-500'}`} />
                      <span className={`text-sm font-semibold ${isSelected ? 'text-[#003D82]' : 'text-gray-700'}`}>
                        {option.label}
                      </span>
                      <div className="text-center space-y-0.5">
                        <span className={`text-xs font-medium ${
                          option.percentageImpact === 'référence'
                            ? 'text-gray-500'
                            : option.percentageImpact.startsWith('+')
                              ? 'text-orange-600'
                              : 'text-green-600'
                        }`}>
                          {option.percentageImpact}
                        </span>
                        <span className="text-xs text-gray-400 block">
                          {option.deliveryLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.transportMode && (
                <p className="text-sm text-red-500">{errors.transportMode.message}</p>
              )}
            </div>

            {/* ═══════════════ BOUTON CALCULER ═══════════════ */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={isCalculating}
                className="bg-[#003D82] hover:bg-[#002952] h-14 px-12 text-lg shadow-lg hover:shadow-xl transition-all text-white"
              >
                {isCalculating ? (
                  <>
                    <CircleNotch className="mr-3 h-6 w-6 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-3 h-6 w-6" />
                    Calculer mon devis gratuitement
                  </>
                )}
              </Button>
            </div>

            {/* Erreur globale */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ═══════════════ MODAL DE RÉSULTAT MULTI-LIGNES ═══════════════ */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        {/*
         * DialogContent responsive :
         * - p-4 sur mobile (au lieu de p-6 par défaut) pour éviter l'excès de marge
         * - max-h-[90dvh] avec dvh pour s'adapter à la barre d'adresse mobile
         * - overflow-x-hidden pour éviter le débordement horizontal du tableau
         */}
        <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <DialogHeader>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[#003D82]">
                <TrendUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl text-[#003D82]">Votre estimation</DialogTitle>
                <p className="text-sm sm:text-base text-gray-600">
                  {result?.totalPackageCount || 0} colis - {result?.totalWeight || 0} kg
                </p>
              </div>
            </div>
          </DialogHeader>
          {result && (
            <CardContent className="p-0 sm:p-4">
              <div className="space-y-6 sm:space-y-8">

                {/* Prix total — padding réduit sur mobile pour maximiser l'espace */}
                <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#003D82] to-[#002952] p-5 sm:p-8 text-white shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div className="space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="text-base sm:text-lg font-medium text-blue-100">Prix total estimé</div>
                      </div>
                      <div className="text-3xl sm:text-5xl font-bold">
                        {result.totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-100 text-sm mb-1">Délai estimé</div>
                      <div className="text-2xl sm:text-3xl font-semibold">
                        {result.estimatedDeliveryDays} jour{result.estimatedDeliveryDays > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tableau détaillé des lignes */}
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <div className="h-8 w-1 bg-[#003D82]"></div>
                    Détail par colis
                  </h4>

                  {/* Tableau — scroll horizontal sur mobile si contenu trop large */}
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm min-w-[400px]">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2.5 px-2 sm:py-3 sm:px-4 font-semibold text-gray-700">Description</th>
                          <th className="text-center py-2.5 px-1.5 sm:py-3 sm:px-3 font-semibold text-gray-700">Qté</th>
                          <th className="text-left py-2.5 px-1.5 sm:py-3 sm:px-3 font-semibold text-gray-700 hidden sm:table-cell">Type</th>
                          <th className="text-right py-2.5 px-1.5 sm:py-3 sm:px-3 font-semibold text-gray-700 hidden md:table-cell">Poids</th>
                          <th className="text-right py-2.5 px-1.5 sm:py-3 sm:px-3 font-semibold text-gray-700">P.U.</th>
                          <th className="text-right py-2.5 px-2 sm:py-3 sm:px-4 font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.lines.map((line, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-gray-900">{line.description || `Colis ${idx + 1}`}</td>
                            <td className="py-2.5 px-1.5 sm:py-3 sm:px-3 text-center text-gray-700">{line.quantity}</td>
                            <td className="py-2.5 px-1.5 sm:py-3 sm:px-3 text-gray-700 hidden sm:table-cell">
                              {cargoTypeLabels[line.cargoType as CargoType] || line.cargoType}
                            </td>
                            <td className="py-2.5 px-1.5 sm:py-3 sm:px-3 text-right text-gray-700 hidden md:table-cell">{line.weight} kg</td>
                            <td className="py-2.5 px-1.5 sm:py-3 sm:px-3 text-right text-gray-700">
                              {line.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-right font-semibold text-gray-900">
                              {line.lineTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Sous-totaux et total */}
                  <div className="space-y-3 max-w-md ml-auto">
                    {/* Sous-total (avant priorité) */}
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                      <span className="text-gray-700 font-medium">Sous-total</span>
                      <span className="font-bold text-gray-900">
                        {result.totalBeforePriority.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>

                    {/* Surcharge priorité (si applicable) */}
                    {result.totalPrice !== result.totalBeforePriority && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50">
                        <span className="text-purple-700 font-medium">
                          Supplément priorité ({result.priorite})
                        </span>
                        <span className="font-bold text-purple-900">
                          +{(result.totalPrice - result.totalBeforePriority).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    )}

                    {/* Total final */}
                    <div className="border-t-2 border-[#003D82] pt-3 flex justify-between items-center p-4 rounded-lg bg-blue-50">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-[#003D82]">
                        {result.totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions conditionnelles selon l'état de connexion */}
                <div className="space-y-4">
                  {session?.user ? (
                    // Utilisateur connecté : Télécharger + Sauvegarder
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={handleDownloadPDF}
                        variant="outline"
                        className="h-12 text-base border-[#003D82] text-[#003D82] hover:bg-blue-50"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Télécharger PDF
                      </Button>
                      <Button
                        onClick={handleSaveQuote}
                        className="h-12 text-base bg-[#003D82] hover:bg-[#002952] text-white"
                      >
                        <FloppyDisk className="mr-2 h-5 w-5" />
                        Sauvegarder
                      </Button>
                    </div>
                  ) : (
                    // Utilisateur non-connecté : Télécharger + Email + Créer compte
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          className="h-12 text-base border-[#003D82] text-[#003D82] hover:bg-blue-50"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Télécharger PDF
                        </Button>
                        <Button
                          onClick={() => setShowEmailModal(true)}
                          className="h-12 text-base bg-[#003D82] hover:bg-[#002952] text-white"
                        >
                          <Envelope className="mr-2 h-5 w-5" />
                          Recevoir par email
                        </Button>
                      </div>
                      <Button
                        className="w-full h-12 text-base bg-gradient-to-r from-[#003D82] to-[#002952] hover:opacity-90 shadow-lg"
                        asChild
                      >
                        <Link href="/register">
                          <UserPlus className="mr-2 h-5 w-5" />
                          Créer un compte pour suivre mes expéditions
                        </Link>
                      </Button>
                    </>
                  )}

                  {/* Bouton Fermer — visible et intuitif, surtout sur mobile
                   * où la petite croix X en haut à droite est facile à rater */}
                  <Button
                    variant="outline"
                    onClick={() => setIsResultModalOpen(false)}
                    className="w-full h-11 text-base"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Fermer et revenir au calculateur
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de demande de devis par email (utilisateurs non-connectés) */}
      {prepareQuoteDataForModal() && (
        <QuoteRequestModal
          open={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          quoteData={prepareQuoteDataForModal()!}
        />
      )}
    </div>
  );
}
