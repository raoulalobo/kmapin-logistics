/**
 * Hook : usePendingQuotes
 *
 * Gère les devis en attente dans localStorage pour les visiteurs non connectés
 * Permet de sauvegarder les devis calculés et de les rattacher plus tard à un compte
 *
 * Cas d'usage :
 * 1. Visiteur calcule un devis sur /#calculateur → sauvegarde automatique
 * 2. Visiteur télécharge le PDF → devis reste en localStorage
 * 3. Visiteur crée un compte → PendingQuoteDetector propose le rattachement
 * 4. Rattachement via Server Action → suppression du localStorage
 *
 * @module hooks/use-pending-quotes
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Clé de stockage dans localStorage
 * Préfixe 'faso_fret_' pour éviter les collisions avec d'autres applications
 */
const STORAGE_KEY = 'faso_fret_pending_quotes';

/**
 * Durée d'expiration des devis en attente (en jours)
 * Après 7 jours, les devis sont automatiquement supprimés
 */
const EXPIRATION_DAYS = 7;

/**
 * Interface pour les données du formulaire de devis
 * Correspond aux champs du QuoteCalculator
 *
 * @property originCountry - Code pays d'origine (ISO 2 lettres ou nom complet)
 * @property destinationCountry - Code pays de destination (ISO 2 lettres ou nom complet)
 * @property cargoType - Type de marchandise (GENERAL, FRAGILE, etc.)
 * @property weight - Poids en kilogrammes
 * @property length - Longueur en centimètres (optionnel)
 * @property width - Largeur en centimètres (optionnel)
 * @property height - Hauteur en centimètres (optionnel)
 * @property transportMode - Mode(s) de transport sélectionné(s)
 * @property priority - Niveau de priorité (STANDARD, EXPRESS, URGENT)
 */
export interface PendingQuoteFormData {
  originCountry: string;
  destinationCountry: string;
  cargoType: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  transportMode: string[];
  priority?: string;
}

/**
 * Interface pour le résultat du calcul de devis
 * Contient le coût estimé et le détail du calcul
 *
 * @property estimatedCost - Coût total estimé en EUR
 * @property currency - Devise (toujours 'EUR' pour l'instant)
 * @property estimatedDeliveryDays - Délai de livraison estimé en jours
 * @property breakdown - Détail des composantes du coût
 */
export interface PendingQuoteResult {
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
}

/**
 * Interface complète pour un devis en attente
 * Stocké dans localStorage avec métadonnées de gestion
 *
 * @property id - Identifiant unique UUID
 * @property createdAt - Date de création (ISO string)
 * @property expiresAt - Date d'expiration (ISO string, +7 jours)
 * @property formData - Données du formulaire de devis
 * @property result - Résultat du calcul avec coût et breakdown
 */
export interface PendingQuote {
  id: string;
  createdAt: string;
  expiresAt: string;
  formData: PendingQuoteFormData;
  result: PendingQuoteResult;
}

/**
 * Hook pour gérer les devis en attente dans localStorage
 *
 * Fonctionnalités :
 * - Chargement automatique au montage avec nettoyage des expirés
 * - Ajout de nouveaux devis avec génération d'ID et dates
 * - Suppression individuelle ou totale
 * - État réactif synchronisé avec localStorage
 *
 * @returns Objet contenant l'état et les méthodes de gestion
 *
 * @example
 * // Dans QuoteCalculator
 * const { addPendingQuote } = usePendingQuotes();
 *
 * // Après calcul réussi (si non connecté)
 * if (!session?.user) {
 *   addPendingQuote(formData, result);
 * }
 *
 * @example
 * // Dans PendingQuoteDetector
 * const { pendingQuotes, hasPendingQuotes, clearAllPendingQuotes } = usePendingQuotes();
 *
 * if (hasPendingQuotes) {
 *   // Afficher le modal de rattachement
 * }
 */
export function usePendingQuotes() {
  /**
   * État local contenant la liste des devis en attente
   * Synchronisé avec localStorage à chaque modification
   */
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);

  /**
   * Indicateur de chargement initial
   * Passe à true après la première lecture de localStorage
   * Utile pour éviter d'afficher le modal avant d'avoir les données
   */
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Effet de chargement initial au montage du composant
   *
   * Workflow :
   * 1. Lire localStorage
   * 2. Parser le JSON (avec gestion d'erreur)
   * 3. Filtrer les devis expirés
   * 4. Mettre à jour localStorage si nettoyage effectué
   * 5. Mettre à jour l'état local
   * 6. Marquer comme chargé
   */
  useEffect(() => {
    // S'assurer d'être côté client (Next.js SSR)
    if (typeof window === 'undefined') {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const quotes = JSON.parse(stored) as PendingQuote[];

        // Filtrer les devis dont la date d'expiration n'est pas dépassée
        const now = new Date();
        const validQuotes = quotes.filter(
          (quote) => new Date(quote.expiresAt) > now
        );

        setPendingQuotes(validQuotes);

        // Nettoyer localStorage si des devis ont été supprimés
        if (validQuotes.length !== quotes.length) {
          if (validQuotes.length === 0) {
            localStorage.removeItem(STORAGE_KEY);
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validQuotes));
          }
          console.log(
            `🧹 [PendingQuotes] ${quotes.length - validQuotes.length} devis expirés supprimés`
          );
        }
      }
    } catch (error) {
      // En cas d'erreur de parsing, supprimer les données corrompues
      console.error(
        '❌ [PendingQuotes] Erreur lecture localStorage:',
        error
      );
      localStorage.removeItem(STORAGE_KEY);
    }

    setIsLoaded(true);
  }, []);

  /**
   * Ajouter un nouveau devis en attente
   *
   * @param formData - Données du formulaire (origine, destination, poids, etc.)
   * @param result - Résultat du calcul (coût, délai, breakdown)
   *
   * Génère automatiquement :
   * - id : UUID unique via crypto.randomUUID()
   * - createdAt : Date actuelle en ISO
   * - expiresAt : Date actuelle + EXPIRATION_DAYS en ISO
   */
  const addPendingQuote = useCallback(
    (formData: PendingQuoteFormData, result: PendingQuoteResult) => {
      // S'assurer d'être côté client
      if (typeof window === 'undefined') return;

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000
      );

      const newQuote: PendingQuote = {
        id: crypto.randomUUID(),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        formData,
        result,
      };

      setPendingQuotes((prev) => {
        const updated = [...prev, newQuote];

        // Persister dans localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        console.log(
          `✅ [PendingQuotes] Devis ajouté (${newQuote.id}), total: ${updated.length}`
        );

        return updated;
      });
    },
    []
  );

  /**
   * Supprimer un devis en attente spécifique
   *
   * @param id - UUID du devis à supprimer
   *
   * Utilisé quand l'utilisateur refuse le rattachement pour un devis spécifique
   * ou après un rattachement réussi (via la Server Action)
   */
  const removePendingQuote = useCallback((id: string) => {
    // S'assurer d'être côté client
    if (typeof window === 'undefined') return;

    setPendingQuotes((prev) => {
      const updated = prev.filter((quote) => quote.id !== id);

      // Mettre à jour localStorage
      if (updated.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      console.log(
        `🗑️ [PendingQuotes] Devis supprimé (${id}), restants: ${updated.length}`
      );

      return updated;
    });
  }, []);

  /**
   * Supprimer tous les devis en attente
   *
   * Utilisé dans deux cas :
   * 1. Après rattachement réussi de tous les devis
   * 2. Si l'utilisateur refuse tous les rattachements
   */
  const clearAllPendingQuotes = useCallback(() => {
    // S'assurer d'être côté client
    if (typeof window === 'undefined') return;

    localStorage.removeItem(STORAGE_KEY);
    setPendingQuotes([]);

    console.log('🧹 [PendingQuotes] Tous les devis en attente supprimés');
  }, []);

  return {
    /** Liste des devis en attente (non expirés) */
    pendingQuotes,

    /** Indique si le chargement initial depuis localStorage est terminé */
    isLoaded,

    /** Raccourci pour vérifier s'il y a des devis en attente */
    hasPendingQuotes: pendingQuotes.length > 0,

    /** Nombre de devis en attente */
    pendingQuotesCount: pendingQuotes.length,

    /** Ajouter un devis (appelé depuis QuoteCalculator) */
    addPendingQuote,

    /** Supprimer un devis spécifique par son ID */
    removePendingQuote,

    /** Supprimer tous les devis (après rattachement ou refus) */
    clearAllPendingQuotes,
  };
}
