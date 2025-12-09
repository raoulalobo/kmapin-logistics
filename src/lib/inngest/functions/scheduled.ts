/**
 * Fonctions Inngest - Jobs Scheduled (Cron)
 *
 * Jobs qui s'exécutent automatiquement selon un planning défini
 */

import { inngest } from '../client';
import { prisma } from '@/lib/db/client';

/**
 * Job quotidien : Vérifier les factures en retard
 *
 * S'exécute tous les jours à 9h00
 * - Identifie les factures dont la date d'échéance est dépassée
 * - Met à jour leur statut à OVERDUE
 * - Déclenche des événements pour envoyer des rappels
 */
export const checkOverdueInvoices = inngest.createFunction(
  {
    id: 'check-overdue-invoices',
    name: 'Vérifier les factures en retard',
  },
  // Cron : Tous les jours à 9h00 (heure UTC)
  { cron: '0 9 * * *' },
  async ({ step }) => {
    /**
     * Step 1 : Trouver toutes les factures en retard
     */
    const overdueInvoices = await step.run('find-overdue-invoices', async () => {
      const now = new Date();

      return prisma.invoice.findMany({
        where: {
          status: { in: ['SENT', 'VIEWED'] }, // Seulement les factures non payées
          dueDate: { lt: now }, // Date d'échéance dépassée
        },
        include: {
          company: true,
        },
      });
    });

    if (overdueInvoices.length === 0) {
      return { message: 'No overdue invoices found', count: 0 };
    }

    /**
     * Step 2 : Mettre à jour le statut des factures
     */
    await step.run('update-invoice-statuses', async () => {
      const invoiceIds = overdueInvoices.map((inv) => inv.id);

      await prisma.invoice.updateMany({
        where: { id: { in: invoiceIds } },
        data: { status: 'OVERDUE' },
      });
    });

    /**
     * Step 3 : Envoyer des événements pour chaque facture
     */
    await step.run('send-overdue-events', async () => {
      const now = new Date();

      for (const invoice of overdueInvoices) {
        // Calculer le nombre de jours de retard
        const daysOverdue = Math.floor(
          (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Envoyer un événement pour déclencher les notifications
        await inngest.send({
          name: 'invoice/overdue',
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            companyId: invoice.companyId,
            dueDate: invoice.dueDate.toISOString(),
            daysOverdue,
          },
        });
      }
    });

    return {
      success: true,
      count: overdueInvoices.length,
      invoices: overdueInvoices.map((inv) => inv.invoiceNumber),
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

      // Revenu total (factures payées)
      const invoicesPaid = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          paidDate: {
            gte: dates.start,
            lte: dates.end,
          },
        },
      });

      const totalRevenue = invoicesPaid.reduce((sum, inv) => sum + inv.total, 0);

      return {
        shipmentsCreated,
        shipmentsDelivered,
        invoicesPaid: invoicesPaid.length,
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
        message: `${stats.shipmentsCreated} expéditions créées, ${stats.shipmentsDelivered} livrées, ${stats.totalRevenue}€ de revenu`,
        data: { ...stats, period: 'weekly' },
      }));

      await prisma.notification.createMany({ data: notifications });
    });

    return { success: true, stats };
  }
);
