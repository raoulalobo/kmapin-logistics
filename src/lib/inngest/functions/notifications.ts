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
    const { shipmentId, trackingNumber, clientId, createdById } = event.data;

    /**
     * Step 1 : Récupérer les détails de l'expédition
     * Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
     */
    const shipment = await step.run('get-shipment-details', async () => {
      return prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          client: true,   // Client (COMPANY ou INDIVIDUAL)
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
        message: `Nouvelle expédition ${trackingNumber} pour ${shipment.client.name}`,
        data: { shipmentId, trackingNumber, clientId },  // clientId du Client (COMPANY ou INDIVIDUAL)
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
    //     to: shipment.client.email,
    //     subject: `Nouvelle expédition créée - ${trackingNumber}`,
    //     template: 'shipment-created',
    //     data: {
    //       trackingNumber,
    //       clientName: shipment.client.name,  // Nom du client (COMPANY ou INDIVIDUAL)
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
    const { shipmentId, trackingNumber, clientId } = event.data;

    /**
     * Step 1 : Récupérer les détails
     * Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
     */
    const shipment = await step.run('get-shipment', async () => {
      return prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          client: true,   // Client (COMPANY ou INDIVIDUAL)
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

      // Notifier tous les users du client (COMPANY ou INDIVIDUAL)
      const clientUsers = await prisma.user.findMany({
        where: { clientId: shipment.clientId },
      });

      const notifications = clientUsers
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
 * Fonction : Notifier la réception d'un paiement sur un devis
 *
 * Déclenchée par l'événement 'payment/received-quote'
 *
 * Note: Les factures ne sont plus stockées en base de données.
 * Cette notification confirme la réception du paiement et permet
 * de générer la facture à la volée en PDF.
 */
export const notifyPaymentReceivedOnQuote = inngest.createFunction(
  {
    id: 'notify-payment-received-quote',
    name: 'Notifier paiement reçu sur devis',
  },
  { event: 'payment/received-quote' },
  async ({ event, step }) => {
    const { quoteId, quoteNumber, clientId, receivedById, amount } = event.data;

    /**
     * Step 1 : Récupérer le devis avec les détails client
     */
    const quote = await step.run('get-quote', async () => {
      return prisma.quote.findUnique({
        where: { id: quoteId },
        include: { client: true },
      });
    });

    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    /**
     * Step 2 : Notifier les finance managers
     */
    await step.run('notify-finance-managers', async () => {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'FINANCE_MANAGER'] },
        },
      });

      const notifications = managers.map((manager) => ({
        userId: manager.id,
        type: 'INVOICE_PAID' as const, // Réutiliser le type existant pour les paiements
        title: 'Paiement reçu',
        message: `Paiement de ${amount}€ reçu pour le devis ${quoteNumber} (${quote.client?.name || 'Client'})`,
        data: { quoteId, quoteNumber, clientId, amount },
      }));

      await prisma.notification.createMany({ data: notifications });
    });

    /**
     * Step 3 : Notifier l'agent qui a confirmé le paiement
     */
    await step.run('notify-agent', async () => {
      await prisma.notification.create({
        data: {
          userId: receivedById,
          type: 'INVOICE_PAID' as const,
          title: 'Confirmation de paiement',
          message: `Vous avez confirmé le paiement de ${amount}€ pour le devis ${quoteNumber}`,
          data: { quoteId, quoteNumber, amount },
        },
      });
    });

    return { success: true };
  }
);

/**
 * Fonction : Notifier la réception d'un paiement sur un colis
 *
 * Déclenchée par l'événement 'payment/received-shipment'
 */
export const notifyPaymentReceivedOnShipment = inngest.createFunction(
  {
    id: 'notify-payment-received-shipment',
    name: 'Notifier paiement reçu sur colis',
  },
  { event: 'payment/received-shipment' },
  async ({ event, step }) => {
    const { shipmentId, trackingNumber, clientId, receivedById, amount } = event.data;

    /**
     * Step 1 : Récupérer le colis avec les détails client
     */
    const shipment = await step.run('get-shipment', async () => {
      return prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { client: true },
      });
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    /**
     * Step 2 : Notifier les finance managers
     */
    await step.run('notify-finance-managers', async () => {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'FINANCE_MANAGER'] },
        },
      });

      const notifications = managers.map((manager) => ({
        userId: manager.id,
        type: 'INVOICE_PAID' as const,
        title: 'Paiement reçu',
        message: `Paiement de ${amount}€ reçu pour le colis ${trackingNumber} (${shipment.client?.name || 'Client'})`,
        data: { shipmentId, trackingNumber, clientId, amount },
      }));

      await prisma.notification.createMany({ data: notifications });
    });

    return { success: true };
  }
);
