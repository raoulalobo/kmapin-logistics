/**
 * Fonctions Inngest - Jobs Scheduled (Cron)
 *
 * Jobs qui s'exécutent automatiquement selon un planning défini
 */

import { inngest } from '../client';
import { prisma } from '@/lib/db/client';

/**
 * Job quotidien : Vérifier les devis en attente de paiement
 *
 * S'exécute tous les jours à 9h00
 * - Identifie les devis validés (VALIDATED) sans paiement reçu
 * - Vérifie si la date de validité est dépassée
 * - Déclenche des notifications de rappel
 *
 * Note: Les factures ne sont plus stockées en base de données.
 * Elles sont générées à la volée depuis les données du devis
 * quand le paiement est confirmé (paymentReceivedAt != null)
 */
export const checkPendingPayments = inngest.createFunction(
  {
    id: 'check-pending-payments',
    name: 'Vérifier les devis en attente de paiement',
  },
  // Cron : Tous les jours à 9h00 (heure UTC)
  { cron: '0 9 * * *' },
  async ({ step }) => {
    /**
     * Step 1 : Trouver tous les devis validés sans paiement
     */
    const pendingQuotes = await step.run('find-pending-quotes', async () => {
      return prisma.quote.findMany({
        where: {
          status: 'VALIDATED',
          paymentReceivedAt: null,
        },
        include: {
          client: true,
        },
      });
    });

    if (pendingQuotes.length === 0) {
      return { message: 'No pending payments found', count: 0 };
    }

    /**
     * Step 2 : Identifier les devis expirés (validité dépassée)
     */
    const now = new Date();
    const expiredQuotes = pendingQuotes.filter(
      (quote) => quote.validUntil && quote.validUntil < now
    );

    /**
     * Step 3 : Envoyer des notifications pour les devis expirés
     */
    await step.run('notify-expired-quotes', async () => {
      for (const quote of expiredQuotes) {
        // Calculer le nombre de jours depuis expiration
        const daysExpired = quote.validUntil
          ? Math.floor(
              (now.getTime() - quote.validUntil.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        // TODO: Envoyer une notification/email au client
        console.log(
          `[Inngest] Devis ${quote.quoteNumber} expiré depuis ${daysExpired} jours`
        );
      }
    });

    return {
      success: true,
      pendingCount: pendingQuotes.length,
      expiredCount: expiredQuotes.length,
      expiredQuotes: expiredQuotes.map((q) => q.quoteNumber),
    };
  }
);

/**
 * Job quotidien : Nettoyer les fichiers temporaires
 *
 * S'exécute tous les jours à 3h00
 * - Supprime les fichiers du dossier temp/ plus vieux que 24h
 * - Libère de l'espace de stockage Backblaze
 */
export const cleanupTempFiles = inngest.createFunction(
  {
    id: 'cleanup-temp-files',
    name: 'Nettoyer les fichiers temporaires',
  },
  // Cron : Tous les jours à 3h00 (heure UTC)
  { cron: '0 3 * * *' },
  async ({ step }) => {
    /**
     * Step 1 : Lister les fichiers dans temp/
     */
    // const files = await step.run('list-temp-files', async () => {
    //   return listFiles('temp/');
    // });

    /**
     * Step 2 : Filtrer les fichiers plus vieux que 24h
     */
    // const oldFiles = await step.run('filter-old-files', async () => {
    //   const now = Date.now();
    //   const twentyFourHours = 24 * 60 * 60 * 1000;

    //   return files.filter((key) => {
    //     // Extraire le timestamp du nom de fichier
    //     const match = key.match(/\/(\d+)-/);
    //     if (!match) return false;

    //     const timestamp = parseInt(match[1], 10);
    //     return now - timestamp > twentyFourHours;
    //   });
    // });

    /**
     * Step 3 : Supprimer les fichiers
     */
    // await step.run('delete-old-files', async () => {
    //   for (const key of oldFiles) {
    //     await deleteFile(key);
    //   }
    // });

    // return {
    //   success: true,
    //   deletedCount: oldFiles.length,
    //   deletedFiles: oldFiles,
    // };

    // Placeholder pour l'instant
    return { success: true, message: 'Cleanup scheduled' };
  }
);

/**
 * Job hebdomadaire : Générer un rapport d'activité
 *
 * S'exécute tous les lundis à 8h00
 * - Génère des statistiques pour la semaine écoulée
 * - Envoie un rapport aux admins et managers
 */
export const generateWeeklyReport = inngest.createFunction(
  {
    id: 'generate-weekly-report',
    name: 'Générer rapport hebdomadaire',
  },
  // Cron : Tous les lundis à 8h00 (heure UTC)
  { cron: '0 8 * * 1' },
  async ({ step }) => {
    /**
     * Step 1 : Calculer les dates de la semaine précédente
     */
    const dates = await step.run('calculate-dates', async () => {
      const now = new Date();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - now.getDay() - 6); // Lundi dernier
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6); // Dimanche dernier
      lastSunday.setHours(23, 59, 59, 999);

      return { start: lastMonday, end: lastSunday };
    });

    /**
     * Step 2 : Récupérer les statistiques
     *
     * Note: Les factures ne sont plus stockées en base de données.
     * On utilise maintenant paymentReceivedAt sur les devis pour suivre les revenus.
     */
    const stats = await step.run('get-statistics', async () => {
      // Nombre d'expéditions créées
      const shipmentsCreated = await prisma.shipment.count({
        where: {
          createdAt: {
            gte: dates.start,
            lte: dates.end,
          },
        },
      });

      // Nombre d'expéditions livrées
      const shipmentsDelivered = await prisma.shipment.count({
        where: {
          status: 'DELIVERED',
          actualDeliveryDate: {
            gte: dates.start,
            lte: dates.end,
          },
        },
      });

      // Revenu total (devis dont le paiement a été reçu durant la période)
      const quotesWithPayment = await prisma.quote.findMany({
        where: {
          paymentReceivedAt: {
            gte: dates.start,
            lte: dates.end,
          },
        },
        select: {
          estimatedCost: true,
        },
      });

      // Calculer le revenu total à partir des coûts estimés des devis payés
      const totalRevenue = quotesWithPayment.reduce(
        (sum, quote) => sum + Number(quote.estimatedCost || 0),
        0
      );

      return {
        shipmentsCreated,
        shipmentsDelivered,
        paymentsReceived: quotesWithPayment.length,
        totalRevenue,
      };
    });

    /**
     * Step 3 : Notifier les managers
     */
    await step.run('notify-managers', async () => {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER'] },
        },
      });

      const notifications = managers.map((manager) => ({
        userId: manager.id,
        type: 'SHIPMENT_CREATED' as const, // Réutiliser un type existant
        title: 'Rapport hebdomadaire disponible',
        message: `${stats.shipmentsCreated} expéditions créées, ${stats.shipmentsDelivered} livrées, ${stats.paymentsReceived} paiements reçus (${stats.totalRevenue}€)`,
        data: { ...stats, period: 'weekly' },
      }));

      await prisma.notification.createMany({ data: notifications });
    });

    return { success: true, stats };
  }
);
