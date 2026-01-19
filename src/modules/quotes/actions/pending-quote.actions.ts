/**
 * Server Actions : Rattachement des devis en attente
 *
 * Actions serveur pour créer des devis à partir des données
 * sauvegardées dans localStorage par les visiteurs non connectés
 *
 * Cas d'usage :
 * 1. Visiteur calcule un devis sur /#calculateur
 * 2. Le devis est sauvegardé dans localStorage
 * 3. Visiteur crée un compte et se connecte
 * 4. PendingQuoteDetector détecte les devis en localStorage
 * 5. Cette action crée les Quote en base et les rattache au compte
 *
 * @module modules/quotes/actions/pending-quote
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
import type { CargoType, TransportMode } from '@/lib/db/enums';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 * Cohérent avec le pattern utilisé dans le reste du codebase
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Interface pour les données d'un devis en attente provenant de localStorage
 * Structure identique à PendingQuote dans use-pending-quotes.ts
 *
 * @property formData - Données du formulaire de calcul
 * @property result - Résultat du calcul avec coût estimé
 */
interface PendingQuoteData {
  formData: {
    originCountry: string;
    destinationCountry: string;
    cargoType: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    transportMode: string[];
    priority?: string;
  };
  result: {
    estimatedCost: number;
    currency: string;
    estimatedDeliveryDays: number;
    breakdown: {
      baseCost: number;
      transportModeCost: number;
      cargoTypeSurcharge: number;
      prioritySurcharge: number;
      distanceFactor: number;
    };
  };
}

/**
 * Générer un numéro de devis unique
 *
 * Format: QTE-YYYYMMDD-XXXXX (ex: QTE-20250119-00042)
 *
 * Composants :
 * - QTE : Préfixe identifiant les devis
 * - YYYYMMDD : Date du jour en format compact
 * - XXXXX : Séquence sur 5 chiffres (compteur journalier)
 *
 * @returns Numéro de devis unique garanti
 *
 * @example
 * const quoteNumber = await generateQuoteNumber();
 * // => "QTE-20250119-00001"
 */
async function generateQuoteNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Compter le nombre de devis créés aujourd'hui
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.quote.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Formater le numéro séquentiel
  const sequence = String(count + 1).padStart(5, '0');
  const quoteNumber = `QTE-${datePrefix}-${sequence}`;

  // Vérifier l'unicité (très rare mais possible en cas de race condition)
  const existing = await prisma.quote.findUnique({
    where: { quoteNumber },
  });

  if (existing) {
    // En cas de collision, ajouter un timestamp pour unicité garantie
    const timestamp = Date.now().toString().slice(-5);
    return `QTE-${datePrefix}-${timestamp}`;
  }

  return quoteNumber;
}

/**
 * Action : Créer des devis à partir des données en attente (localStorage)
 *
 * Workflow :
 * 1. Vérifier l'authentification de l'utilisateur
 * 2. Vérifier qu'il a un clientId associé
 * 3. Pour chaque devis en attente :
 *    - Générer un numéro de devis unique
 *    - Créer le Quote en base avec statut DRAFT
 *    - Lier au client de l'utilisateur
 * 4. Revalider les caches pour afficher les nouveaux devis
 *
 * @param pendingQuotes - Liste des devis en attente depuis localStorage
 * @returns Nombre de devis créés et leurs numéros
 *
 * @permissions Utilisateur authentifié avec clientId
 *
 * @example
 * // Dans PendingQuoteModal après confirmation
 * const result = await createQuotesFromPendingAction(pendingQuotes);
 * if (result.success) {
 *   toast.success(`${result.data.createdCount} devis rattachés !`);
 *   clearAllPendingQuotes(); // Vider localStorage
 * }
 */
export async function createQuotesFromPendingAction(
  pendingQuotes: PendingQuoteData[]
): Promise<ActionResult<{ createdCount: number; quoteNumbers: string[] }>> {
  try {
    // 1. Vérifier l'authentification
    const session = await requireAuth();

    // 2. Vérifier que l'utilisateur a un clientId associé
    // Le clientId est requis pour créer des devis
    if (!session.user.clientId) {
      return {
        success: false,
        error: 'Votre compte n\'est pas associé à une compagnie. Veuillez contacter le support.',
      };
    }

    // 3. Validation des données
    if (!pendingQuotes || pendingQuotes.length === 0) {
      return {
        success: false,
        error: 'Aucun devis à rattacher.',
      };
    }

    console.log(
      `📦 [createQuotesFromPending] Début création de ${pendingQuotes.length} devis pour ${session.user.email}`
    );

    // 4. Créer les devis un par un
    // Note: On pourrait utiliser une transaction, mais ici on préfère
    // créer les devis valides même si certains échouent
    const createdQuotes: { id: string; quoteNumber: string }[] = [];
    const errors: string[] = [];

    for (const pending of pendingQuotes) {
      try {
        // Générer un numéro de devis unique
        const quoteNumber = await generateQuoteNumber();

        // Date de validité : 30 jours à partir de maintenant
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        // Date d'expiration du token : 72h (même si le devis est déjà rattaché)
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 72);

        // Créer le devis en DRAFT
        const quote = await prisma.quote.create({
          data: {
            // Identifiant
            quoteNumber,

            // Token de suivi (obligatoire dans le schéma)
            // Le token est généré automatiquement par Prisma (@default(cuid()))
            tokenExpiresAt,

            // Rattachement au client de l'utilisateur
            clientId: session.user.clientId,
            userId: session.user.id,

            // Contact (utiliser l'email de l'utilisateur connecté)
            contactEmail: session.user.email,

            // Route (pays origine/destination)
            originCountry: pending.formData.originCountry,
            destinationCountry: pending.formData.destinationCountry,

            // Marchandise
            cargoType: pending.formData.cargoType as CargoType,
            weight: pending.formData.weight,
            length: pending.formData.length ?? null,
            width: pending.formData.width ?? null,
            height: pending.formData.height ?? null,

            // Transport
            transportMode: pending.formData.transportMode as TransportMode[],

            // Financier (utiliser le résultat du calcul)
            estimatedCost: pending.result.estimatedCost,
            currency: pending.result.currency || 'EUR',
            validUntil,

            // Statut : DRAFT car créé depuis le calculateur
            // L'utilisateur peut ensuite l'envoyer pour traitement
            status: 'DRAFT',

            // Marquer comme rattaché à un compte
            isAttachedToAccount: true,
          },
        });

        createdQuotes.push({
          id: quote.id,
          quoteNumber: quote.quoteNumber,
        });

        console.log(`✅ [createQuotesFromPending] Devis ${quoteNumber} créé`);
      } catch (itemError) {
        console.error(
          `❌ [createQuotesFromPending] Erreur création devis:`,
          itemError
        );
        errors.push(
          `Erreur pour ${pending.formData.originCountry} → ${pending.formData.destinationCountry}`
        );
      }
    }

    // 5. Vérifier les résultats
    if (createdQuotes.length === 0) {
      return {
        success: false,
        error: `Aucun devis n'a pu être créé. ${errors.join(', ')}`,
      };
    }

    // 6. Revalider les caches
    revalidatePath('/dashboard/quotes');
    revalidatePath('/dashboard');

    console.log(
      `📊 [createQuotesFromPending] Résumé: ${createdQuotes.length}/${pendingQuotes.length} devis créés`
    );

    // 7. Retourner le résultat
    return {
      success: true,
      data: {
        createdCount: createdQuotes.length,
        quoteNumbers: createdQuotes.map((q) => q.quoteNumber),
      },
    };
  } catch (error) {
    console.error('❌ [createQuotesFromPending] Erreur globale:', error);

    // Gestion des erreurs d'authentification
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour rattacher des devis.',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du rattachement des devis.',
    };
  }
}
