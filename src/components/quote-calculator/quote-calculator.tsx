/**
 * Composant : QuoteCalculator
 *
 * Calculateur de devis public pour la page d'accueil
 * Permet aux visiteurs d'obtenir une estimation de prix sans authentification
 *
 * Layout en pleine largeur avec formulaire horizontal
 *
 * @module components/quote-calculator
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { CircleNotch, Calculator, Package, MapPin, Truck, Boat, Airplane, Train, ArrowRight, TrendUp, Download, Envelope, FloppyDisk, UserPlus } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateQuoteEstimateV2Action } from '@/modules/quotes/actions/calculate-quote-estimate-v2';
import { quoteEstimateSchema, type QuoteEstimateData, type QuoteEstimateResult } from '@/modules/quotes/schemas/quote.schema';
import { CargoType, TransportMode } from '@/lib/db/enums';
import { QuoteRequestModal } from '@/components/quote-request/quote-request-modal';
import type { QuoteDataFormData } from '@/modules/prospects';
import { useSafeSession } from '@/lib/auth/hooks';
import { CountrySelect } from '@/components/countries';

/**
 * Traductions françaises pour les types de marchandise
 */
const cargoTypeLabels: Record<CargoType, string> = {
  GENERAL: 'Marchandise générale',
  DANGEROUS: 'Matières dangereuses',
  PERISHABLE: 'Périssable',
  FRAGILE: 'Fragile',
  BULK: 'Vrac',
  CONTAINER: 'Conteneur',
  PALLETIZED: 'Palettisé',
  OTHER: 'Autre',
};

/**
 * Traductions françaises pour les modes de transport
 */
const transportModeLabels: Record<TransportMode, { label: string; icon: any }> = {
  ROAD: { label: 'Routier', icon: Truck },
  SEA: { label: 'Maritime', icon: Boat },
  AIR: { label: 'Aérien', icon: Airplane },
  RAIL: { label: 'Ferroviaire', icon: Train },
};

/**
 * Traductions françaises pour les priorités
 */
const priorityLabels = {
  STANDARD: 'Standard',
  NORMAL: 'Normal (+10%)',
  EXPRESS: 'Express (+50%)',
  URGENT: 'Urgent (+30%)',
};

/**
 * Mapping des codes pays (ISO 2 lettres) vers noms complets
 * Utilisé pour l'affichage dans le PDF et autres documents
 */
const countryNames: Record<string, string> = {
  // Afrique de l'Ouest
  'BF': 'Burkina Faso',
  'CI': 'Côte d\'Ivoire',
  'SN': 'Sénégal',
  'ML': 'Mali',
  'NE': 'Niger',
  'BJ': 'Bénin',
  'TG': 'Togo',
  'GH': 'Ghana',
  'NG': 'Nigéria',
  'GM': 'Gambie',
  'GN': 'Guinée',
  'GW': 'Guinée-Bissau',
  'LR': 'Libéria',
  'SL': 'Sierra Leone',
  'CV': 'Cap-Vert',
  // Afrique Centrale
  'CM': 'Cameroun',
  'TD': 'Tchad',
  'CF': 'République Centrafricaine',
  'CG': 'Congo',
  'CD': 'République Démocratique du Congo',
  'GA': 'Gabon',
  'GQ': 'Guinée Équatoriale',
  'ST': 'Sao Tomé-et-Principe',
  // Afrique du Nord
  'MA': 'Maroc',
  'DZ': 'Algérie',
  'TN': 'Tunisie',
  'LY': 'Libye',
  'EG': 'Égypte',
  // Afrique de l'Est
  'KE': 'Kenya',
  'ET': 'Éthiopie',
  'TZ': 'Tanzanie',
  'UG': 'Ouganda',
  'RW': 'Rwanda',
  'BI': 'Burundi',
  'SO': 'Somalie',
  'DJ': 'Djibouti',
  'ER': 'Érythrée',
  // Afrique Australe
  'ZA': 'Afrique du Sud',
  'ZW': 'Zimbabwe',
  'MZ': 'Mozambique',
  'MW': 'Malawi',
  'ZM': 'Zambie',
  'NA': 'Namibie',
  'BW': 'Botswana',
  'LS': 'Lesotho',
  'SZ': 'Eswatini',
  // Europe
  'FR': 'France',
  'BE': 'Belgique',
  'DE': 'Allemagne',
  'ES': 'Espagne',
  'IT': 'Italie',
  'GB': 'Royaume-Uni',
  'PT': 'Portugal',
  'NL': 'Pays-Bas',
  'CH': 'Suisse',
  'LU': 'Luxembourg',
  // Amérique
  'US': 'États-Unis',
  'CA': 'Canada',
  'MX': 'Mexique',
  'BR': 'Brésil',
  // Asie
  'CN': 'Chine',
  'IN': 'Inde',
  'JP': 'Japon',
  'KR': 'Corée du Sud',
  'AE': 'Émirats Arabes Unis',
  'SA': 'Arabie Saoudite',
  'TR': 'Turquie',
  // Océanie
  'AU': 'Australie',
  'NZ': 'Nouvelle-Zélande',
};

/**
 * Convertit un code pays (ex: "FR") en nom complet (ex: "France")
 * Si le code n'est pas trouvé, retourne le code tel quel
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
 * Cette fonction formate le nombre avec des espaces normaux
 *
 * @param num - Nombre à formater
 * @param decimals - Nombre de décimales (défaut: 0)
 * @returns Nombre formaté avec espaces normaux (ex: "112 725" au lieu de "112 725")
 */
const formatNumberForPDF = (num: number, decimals: number = 0): string => {
  // Formater avec toLocaleString pour obtenir le format français
  const formatted = num.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Remplacer les espaces insécables (U+00A0, U+202F) par des espaces normaux
  // pour compatibilité avec jsPDF
  return formatted.replace(/[\u00A0\u202F]/g, ' ');
};

export function QuoteCalculator() {
  /**
   * État local pour stocker le résultat du calcul
   */
  const [result, setResult] = useState<QuoteEstimateResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * État du modal de demande de devis par email
   */
  const [showEmailModal, setShowEmailModal] = useState(false);

  /**
   * État du modal d'affichage des résultats
   */
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  /**
   * Données du formulaire pour le modal (conservées après calcul)
   */
  const [lastFormData, setLastFormData] = useState<QuoteEstimateData | null>(null);

  /**
   * Récupération de la session utilisateur via Better Auth
   * Utilise un hook sécurisé compatible React 19
   * Si l'utilisateur est connecté, `session.user` contiendra les infos utilisateur
   * Sinon, `session` sera null
   */
  const { data: session } = useSafeSession();

  /**
   * Lire les query params pour pré-remplissage depuis /tarifs
   */
  const searchParams = useSearchParams();

  /**
   * Préparer les valeurs par défaut depuis les query params
   * Cela évite le warning "uncontrolled to controlled"
   */
  const defaultValues = useMemo(() => {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const mode = searchParams.get('mode');

    return {
      originCountry: origin || '',
      destinationCountry: destination || '',
      cargoType: 'GENERAL' as const,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      transportMode: mode && Object.values(TransportMode).includes(mode as TransportMode)
        ? [mode as TransportMode]
        : [],
      priority: 'STANDARD' as const,
    };
  }, [searchParams]);

  /**
   * Configuration de React Hook Form avec validation Zod
   */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<QuoteEstimateData>({
    resolver: zodResolver(quoteEstimateSchema),
    defaultValues,
  });

  /**
   * Afficher les notifications et scroller si des query params sont présents
   */
  useEffect(() => {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const mode = searchParams.get('mode');

    // Afficher les notifications après un petit délai pour laisser le composant se monter
    const timer = setTimeout(() => {
      if (origin) {
        toast.info(`Origine pré-remplie : ${origin}`);
      }

      if (destination) {
        toast.info(`Destination pré-remplie : ${destination}`);
      }

      if (mode && Object.values(TransportMode).includes(mode as TransportMode)) {
        toast.info(`Mode de transport sélectionné : ${transportModeLabels[mode as TransportMode].label}`);
      }

      // Scroll smooth vers le calculateur si params présents
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
   * Observer les modes de transport sélectionnés
   */
  const selectedTransportModes = watch('transportMode') || [];

  /**
   * Gérer la sélection d'un seul mode de transport
   * Un seul mode peut être sélectionné à la fois
   */
  const toggleTransportMode = (mode: TransportMode) => {
    const current = getValues('transportMode') || [];
    // Si on clique sur le mode déjà sélectionné, on le désélectionne
    // Sinon, on remplace la sélection par le nouveau mode
    const updated = current.includes(mode) ? [] : [mode];
    setValue('transportMode', updated, { shouldValidate: true });
  };

  /**
   * Soumettre le formulaire et calculer l'estimation
   */
  const onSubmit = async (data: QuoteEstimateData) => {
    try {
      setIsCalculating(true);
      setError(null);
      setResult(null);

      // Sauvegarder les données du formulaire pour le modal email
      setLastFormData(data);

      // Appeler la Server Action V2 (algorithme dynamique du PDF)
      const response = await calculateQuoteEstimateV2Action(data);

      if (response.success && response.data) {
        setResult(response.data);
        setIsResultModalOpen(true); // Ouvrir le modal automatiquement
      } else {
        setError(response.error || 'Une erreur est survenue');
      }
    } catch (err) {
      console.error('Error calculating estimate:', err);
      setError('Une erreur est survenue lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Télécharger le devis en PDF
   * Génère un PDF professionnel côté client avec jsPDF
   */
  const handleDownloadPDF = () => {
    if (!result || !lastFormData) {
      toast.error('Aucun devis à télécharger');
      return;
    }

    try {
      // Import dynamique de jsPDF pour éviter les problèmes SSR
      import('jspdf').then(({ default: jsPDF }) => {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Couleurs professionnelles
        const primaryColor: [number, number, number] = [0, 61, 130]; // Bleu professionnel
        const secondaryColor: [number, number, number] = [255, 152, 0]; // Orange accent
        const textDark: [number, number, number] = [33, 33, 33];
        const textLight: [number, number, number] = [100, 100, 100];
        const lightGray: [number, number, number] = [245, 245, 245];
        const borderGray: [number, number, number] = [220, 220, 220];

        let yPos = 15;

        // ============================================
        // EN-TÊTE AVEC INFORMATIONS SOCIÉTÉ
        // ============================================
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Logo et nom société (gauche)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('FASO FRET', 15, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Solutions Logistiques Internationales', 15, 27);

        // Coordonnées société (gauche, sous le nom)
        doc.setFontSize(8);
        doc.text('Adresse : Ouagadougou, Burkina Faso', 15, 35);
        doc.text('Tel : +226 XX XX XX XX', 15, 40);
        doc.text('Email : contact@fasofret.com', 15, 45);

        // N° Devis et Date (droite)
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
        // Convertir les codes pays en noms complets
        const originName = getCountryName(lastFormData.originCountry);
        const destinationName = getCountryName(lastFormData.destinationCountry);
        doc.text(`${originName} vers ${destinationName}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // ============================================
        // SECTION CARACTÉRISTIQUES DU TRANSPORT
        // ============================================
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        doc.setTextColor(...textDark);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('CARACTERISTIQUES DU TRANSPORT', 20, yPos + 5.5);
        yPos += 14;

        doc.setFontSize(9);
        const leftCol = 20;
        const valueCol = 75;

        // Modes de transport
        doc.setFont('helvetica', 'bold');
        doc.text('Modes de transport :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textDark);
        const modes = lastFormData.transportMode.map(m => transportModeLabels[m].label).join(', ');
        doc.text(modes, valueCol, yPos);
        yPos += 6;

        // Type de marchandise
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textDark);
        doc.text('Type de marchandise :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(cargoTypeLabels[lastFormData.cargoType], valueCol, yPos);
        yPos += 6;

        // Priorité
        doc.setFont('helvetica', 'bold');
        doc.text('Priorité :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        const priorityValue = lastFormData.priority || 'STANDARD';
        doc.text(priorityValue, valueCol, yPos);
        yPos += 10;

        // ============================================
        // SECTION MESURES ET POIDS
        // ============================================
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        doc.setTextColor(...textDark);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MESURES ET POIDS', 20, yPos + 5.5);
        yPos += 14;

        doc.setFontSize(9);

        // Poids réel
        doc.setFont('helvetica', 'bold');
        doc.text('Poids réel :', leftCol, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatNumberForPDF(lastFormData.weight)} kg`, valueCol, yPos);
        yPos += 6;

        // Dimensions et volume (si présents)
        if (lastFormData.length && lastFormData.width && lastFormData.height) {
          const volume_cm3 = lastFormData.length * lastFormData.width * lastFormData.height;
          const volume_m3 = volume_cm3 / 1_000_000;

          doc.setFont('helvetica', 'bold');
          doc.text('Dimensions :', leftCol, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(`${lastFormData.length} × ${lastFormData.width} × ${lastFormData.height} cm`, valueCol, yPos);
          yPos += 6;

          doc.setFont('helvetica', 'bold');
          doc.text('Volume calculé :', leftCol, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(`${volume_m3.toFixed(4)} m³`, valueCol, yPos);
          yPos += 6;

          // POIDS TAXABLE RETENU (mise en évidence)
          doc.setDrawColor(...secondaryColor);
          doc.setLineWidth(0.5);
          doc.rect(15, yPos - 2, pageWidth - 30, 8);
          doc.setFillColor(255, 248, 240);
          doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F');

          // Calculer le poids volumétrique et le poids taxable
          const poidsVolumetrique = volume_m3 * 167; // Ratio aérien par défaut
          const poidsTaxable = Math.max(lastFormData.weight, poidsVolumetrique);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...secondaryColor);
          doc.text('POIDS TAXABLE RETENU :', leftCol, yPos + 3);
          doc.setFontSize(11);
          doc.text(`${formatNumberForPDF(poidsTaxable, 2)} kg`, valueCol + 40, yPos + 3);
          yPos += 12;
        } else {
          // Pas de dimensions, poids taxable = poids réel
          doc.setDrawColor(...secondaryColor);
          doc.setLineWidth(0.5);
          doc.rect(15, yPos - 2, pageWidth - 30, 8);
          doc.setFillColor(255, 248, 240);
          doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F');

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...secondaryColor);
          doc.text('POIDS TAXABLE RETENU :', leftCol, yPos + 3);
          doc.setFontSize(11);
          doc.text(`${formatNumberForPDF(lastFormData.weight)} kg`, valueCol + 40, yPos + 3);
          yPos += 12;
        }

        yPos += 5;

        // ============================================
        // SECTION TARIFICATION
        // ============================================
        doc.setFillColor(...primaryColor);
        doc.rect(15, yPos, pageWidth - 30, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TARIFICATION', 20, yPos + 8);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`${formatNumberForPDF(result.estimatedCost)} €`, pageWidth / 2, yPos + 20, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Prix estimé TTC', pageWidth / 2, yPos + 26, { align: 'center' });
        yPos += 38;

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
   * Appelle la Server Action pour créer un Quote en DRAFT
   */
  const handleSaveQuote = async () => {
    if (!result || !lastFormData) {
      toast.error('Aucun devis à sauvegarder');
      return;
    }

    try {
      const { saveQuoteFromCalculatorAction } = await import('@/modules/quotes/actions/quote.actions');

      // Créer un toast de chargement et récupérer son ID
      const toastId = toast.loading('Sauvegarde en cours...');

      const response = await saveQuoteFromCalculatorAction(lastFormData);

      if (response.success && response.data) {
        // Remplacer le toast de chargement par le toast de succès
        toast.success(`Devis ${response.data.quoteNumber} sauvegardé dans votre espace !`, { id: toastId });
      } else {
        // Remplacer le toast de chargement par le toast d'erreur
        toast.error(response.error || 'Erreur lors de la sauvegarde', { id: toastId });
      }
    } catch (error) {
      console.error('Erreur sauvegarde devis:', error);
      // Dismiss le toast de chargement en cas d'erreur inattendue
      toast.dismiss();
      toast.error('Erreur lors de la sauvegarde du devis');
    }
  };

  /**
   * Préparer les données pour le QuoteRequestModal
   * Convertit QuoteEstimateData en QuoteDataFormData
   * Calcule le volume à partir des dimensions si présentes
   */
  const prepareQuoteDataForModal = (): QuoteDataFormData | null => {
    if (!lastFormData || !result) return null;

    // Calculer le volume à partir des dimensions si toutes sont présentes
    const volume = lastFormData.length && lastFormData.width && lastFormData.height
      ? lastFormData.length * lastFormData.width * lastFormData.height
      : null;

    return {
      originCountry: lastFormData.originCountry,
      destinationCountry: lastFormData.destinationCountry,
      cargoType: lastFormData.cargoType,
      weight: lastFormData.weight,
      volume,
      transportMode: lastFormData.transportMode,
      estimatedCost: result.estimatedCost,
      currency: 'EUR',
    };
  };

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
                  Obtenez une estimation instantanée pour votre expédition
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Première ligne - Origine, Destination, Poids */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Pays d'origine */}
              <div className="space-y-2">
                <Label htmlFor="originCountry" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#003D82]" />
                  Pays d'origine
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

              {/* Poids */}
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#003D82]" />
                  Poids (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="1000"
                  {...register('weight', { valueAsNumber: true })}
                  className={`h-11 ${errors.weight ? 'border-red-500' : ''}`}
                />
                {errors.weight && (
                  <p className="text-sm text-red-500">{errors.weight.message}</p>
                )}
              </div>
            </div>

            {/* Deuxième ligne - Dimensions (optionnel) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-[#003D82]" />
                Dimensions (optionnel)
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                <strong>⚠️ Attention :</strong> Les dimensions doivent être saisies en <strong>centimètres (cm)</strong>.
                {' '}Volume calculé : L × W × H
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    placeholder="Longueur (cm)"
                    {...register('length', { valueAsNumber: true })}
                    className={`h-11 ${errors.length ? 'border-red-500' : ''}`}
                  />
                  {errors.length && (
                    <p className="text-sm text-red-500">{errors.length.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    id="width"
                    type="number"
                    step="0.01"
                    placeholder="Largeur (cm)"
                    {...register('width', { valueAsNumber: true })}
                    className={`h-11 ${errors.width ? 'border-red-500' : ''}`}
                  />
                  {errors.width && (
                    <p className="text-sm text-red-500">{errors.width.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    placeholder="Hauteur (cm)"
                    {...register('height', { valueAsNumber: true })}
                    className={`h-11 ${errors.height ? 'border-red-500' : ''}`}
                  />
                  {errors.height && (
                    <p className="text-sm text-red-500">{errors.height.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Troisième ligne - Type de marchandise et Priorité */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Type de marchandise */}
              <div className="space-y-2">
                <Label htmlFor="cargoType" className="text-base font-semibold">Type de marchandise</Label>
                <Select
                  defaultValue="GENERAL"
                  onValueChange={(value) => setValue('cargoType', value as CargoType)}
                >
                  <SelectTrigger id="cargoType" className="h-11">
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
                {errors.cargoType && (
                  <p className="text-sm text-red-500">{errors.cargoType.message}</p>
                )}
              </div>

              {/* Priorité */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-base font-semibold">Priorité</Label>
                <Select
                  defaultValue="STANDARD"
                  onValueChange={(value) => setValue('priority', value as 'STANDARD' | 'EXPRESS' | 'URGENT')}
                >
                  <SelectTrigger id="priority" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modes de transport */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#003D82]" />
                Mode de transport
              </Label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(transportModeLabels).map(([value, { label, icon: Icon }]) => {
                  const isSelected = selectedTransportModes.includes(value as TransportMode);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleTransportMode(value as TransportMode)}
                      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-[#003D82] bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-[#003D82]' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-[#003D82]' : 'text-gray-700'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.transportMode && (
                <p className="text-sm text-red-500">{errors.transportMode.message}</p>
              )}
            </div>

            {/* Bouton de soumission */}
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

            {/* Erreur */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Modal de résultat */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003D82]">
                <TrendUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl text-[#003D82]">Votre estimation personnalisée</DialogTitle>
                <p className="text-base text-gray-600">
                  Cette estimation est indicative et peut varier selon les conditions réelles
                </p>
              </div>
            </div>
          </DialogHeader>
          {result && (
            <CardContent className="p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Prix total - Grande carte à gauche */}
                <div className="rounded-2xl bg-gradient-to-br from-[#003D82] to-[#002952] p-8 text-white shadow-xl">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="text-lg font-medium text-blue-100">Prix estimé</div>
                    </div>
                    <div className="text-6xl font-bold">
                      {result.estimatedCost.toLocaleString('fr-FR')} €
                    </div>
                  <div className="flex items-center gap-2 text-blue-100">
                    <div className="h-px flex-1 bg-white/20"></div>
                    <span className="text-sm">Délai estimé</span>
                    <div className="h-px flex-1 bg-white/20"></div>
                  </div>
                  <div className="text-center text-3xl font-semibold">
                    {result.estimatedDeliveryDays} jour{result.estimatedDeliveryDays > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Détail des coûts - Droite */}
              <div className="space-y-6">
                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="h-8 w-1 bg-[#003D82]"></div>
                  Détail du calcul
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Coût de base</span>
                    <span className="font-bold text-gray-900">{result.breakdown.baseCost} €</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Facteur distance</span>
                    <span className="font-bold text-gray-900">{result.breakdown.distanceFactor} €</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Coût mode de transport</span>
                    <span className="font-bold text-gray-900">{result.breakdown.transportModeCost} €</span>
                  </div>
                  {result.breakdown.cargoTypeSurcharge > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50">
                      <span className="text-orange-700 font-medium">Supplément type marchandise</span>
                      <span className="font-bold text-orange-900">+{result.breakdown.cargoTypeSurcharge} €</span>
                    </div>
                  )}
                  {result.breakdown.prioritySurcharge > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50">
                      <span className="text-purple-700 font-medium">Supplément priorité</span>
                      <span className="font-bold text-purple-900">+{result.breakdown.prioritySurcharge} €</span>
                    </div>
                  )}
                  <div className="border-t-2 border-[#003D82] pt-3 mt-4 flex justify-between items-center p-4 rounded-lg bg-blue-50">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#003D82]">{result.estimatedCost} €</span>
                  </div>
                </div>

                {/* Actions conditionnelles selon l'état de connexion */}
                <div className="space-y-4">
                  {session?.user ? (
                    // Utilisateur connecté : Télécharger + Sauvegarder
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
                          onClick={handleSaveQuote}
                          className="h-12 text-base bg-[#003D82] hover:bg-[#002952] text-white"
                        >
                          <FloppyDisk className="mr-2 h-5 w-5" />
                          Sauvegarder
                        </Button>
                      </div>
                    </>
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
                </div>
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
