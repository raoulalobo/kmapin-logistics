/**
 * Fonctions Inngest - Notifications
 *
 * Gestion des notifications utilisateurs lors d'événements importants
 */

import { inngest } from '../client';
import { prisma } from '@/lib/db/client';

/**
 * Fonction : Envoyer une notification quand une expédition est créée
 *
 * Déclenchée par l'événement 'shipment/created'
 * - Crée une notification pour l'utilisateur créateur
 * - Notifie les operations managers
 * - Envoie un email au client
 */
export const notifyShipmentCreated = inngest.createFunction(
  {
    id: 'notify-shipment-created',
    name: 'Notifier la création d\'une expédition',
  },
  { event: 'shipment/created' },
  async ({ event, step }) => {
    const { shipmentId, trackingNumber, companyId, createdById } = event.data;

    /**
     * Step 1 : Récupérer les détails de l'expédition
     */
    const shipment = await step.run('get-shipment-details', async () => {
      return prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          company: true,
          createdBy: true,
        },
      });
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    /**
     * Step 2 : Créer une notification pour le créateur
     */
    await step.run('create-creator-notification', async () => {
      await prisma.notification.create({
        data: {
          userId: createdById,
          type: 'SHIPMENT_CREATED',
          title: 'Expédition créée',
          message: `Votre expédition ${trackingNumber} a été créée avec succès`,
          data: { shipmentId, trackingNumber },
        },
      });
    });

    /**
     * Step 3 : Notifier les operations managers
     */
    await step.run('notify-operations-managers', async () => {
      const managers = await prisma.user.findMany({
        where: {
          role: 'OPERATIONS_MANAGER',
        },
      });

      // Créer une notification pour chaque manager
      const notifications = managers.map((manager) => ({
        userId: manager.id,
        type: 'SHIPMENT_CREATED' as const,
        title: 'Nouvelle expédition',
        message: `Nouvelle expédition ${trackingNumber} pour ${shipment.company.name}`,
        data: { shipmentId, trackingNumber, companyId },
      }));

      await prisma.notification.createMany({
        data: notifications,
      });
    });

    /**
     * Step 4 : Envoyer un email au client (optionnel)
     */
    // await step.run('send-client-email', async () => {
    //   await sendEmail({
    //     to: shipment.company.email,
    //     subject: `Nouvelle expédition créée - ${trackingNumber}`,
    //     template: 'shipment-created',
    //     data: {
    //       trackingNumber,
    //       company: shipment.company.name,
    //       origin: `${shipment.originCity}, ${shipment.originCountry}`,
    //       destination: `${shipment.destinationCity}, ${shipment.destinationCountry}`,
    //     },
    //   });
    // });

    return { success: true, notificationsCreated: true };
  }
);

/**
 * Fonction : Notifier la livraison d'une expédition
 *
 * Déclenchée par l'événement 'shipment/delivered'
 */
export const notifyShipmentDelivered = inngest.createFunction(
  {
    id: 'notify-shipment-delivered',
    name: 'Notifier la livraison d\'une expédition',
  },
  { event: 'shipment/delivered' },
  async ({ event, step }) => {
    const { shipmentId, trackingNumber, companyId } = event.data;

    /**
     * Step 1 : Récupérer les détails
     */
    const shipment = await step.run('get-shipment', async () => {
      return prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          company: true,
          createdBy: true,
        },
      });
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    /**
     * Step 2 : Créer des notifications pour les utilisateurs concernés
     */
    await step.run('create-notifications', async () => {
      // Notification pour le créateur
      await prisma.notification.create({
        data: {
          userId: shipment.createdById,
          type: 'SHIPMENT_DELIVERED',
          title: 'Expédition livrée',
          message: `L'expédition ${trackingNumber} a été livrée avec succès`,
          data: { shipmentId, trackingNumber },
        },
      });

      // Notifier tous les users de la company
      const companyUsers = await prisma.user.findMany({
        where: { companyId: shipment.companyId },
      });

      const notifications = companyUsers
        .filter((user) => user.id !== shipment.createdById) // Éviter les doublons
        .map((user) => ({
          userId: user.id,
          type: 'SHIPMENT_DELIVERED' as const,
          title: 'Expédition livrée',
          message: `L'expédition ${trackingNumber} a été livrée`,
          data: { shipmentId, trackingNumber },
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
      }
    });

    return { success: true };
  }
);

/**
 * Fonction : Envoyer un rappel pour facture en retard
 *
 * Déclenchée par l'événement 'invoice/overdue'
 */
export const sendOverdueInvoiceReminder = inngest.createFunction(
  {
    id: 'send-overdue-invoice-reminder',
    name: 'Envoyer rappel facture en retard',
  },
  { event: 'invoice/overdue' },
  async ({ event, step }) => {
    const { invoiceId, invoiceNumber, companyId, daysOverdue } = event.data;

    /**
     * Step 1 : Récupérer la facture
     */
    const invoice = await step.run('get-invoice', async () => {
      return prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { company: true },
      });
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    /**
     * Step 2 : Mettre à jour le statut si nécessaire
     */
    await step.run('update-invoice-status', async () => {
      if (invoice.status !== 'OVERDUE') {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'OVERDUE' },
        });
      }
    });

    /**
     * Step 3 : Créer des notifications pour les finance managers
     */
    await step.run('notify-finance-managers', async () => {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'FINANCE_MANAGER'] },
        },
      });

      const notifications = managers.map((manager) => ({
        userId: manager.id,
        type: 'INVOICE_PAID' as const, // Réutiliser le type existant
        title: 'Facture en retard',
        message: `La facture ${invoiceNumber} est en retard de ${daysOverdue} jours`,
        data: { invoiceId, invoiceNumber, companyId, daysOverdue },
      }));

      await prisma.notification.createMany({ data: notifications });
    });

    /**
     * Step 4 : Envoyer un email de rappel au client
     */
    // await step.run('send-reminder-email', async () => {
    //   await sendEmail({
    //     to: invoice.company.email,
    //     subject: `Rappel - Facture en retard ${invoiceNumber}`,
    //     template: 'invoice-overdue-reminder',
    //     data: {
    //       invoiceNumber,
    //       company: invoice.company.name,
    //       total: invoice.total,
    //       dueDate: invoice.dueDate,
    //       daysOverdue,
    //     },
    //   });
    // });

    return { success: true };
  }
);
