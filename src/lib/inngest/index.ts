/**
 * Exports centralisés pour Inngest
 *
 * @module lib/inngest
 */

// Client Inngest
export { inngest, type EventData, type EventName } from './client';

// Fonctions de notifications
export {
  notifyShipmentCreated,
  notifyShipmentDelivered,
  notifyPaymentReceivedOnQuote,
  notifyPaymentReceivedOnShipment,
} from './functions/notifications';

// Fonctions scheduled
export {
  checkPendingPayments,
  cleanupTempFiles,
  generateWeeklyReport,
} from './functions/scheduled';

// Fonctions prospects
export {
  markExpiredProspects,
  sendProspectReminders,
  onProspectConverted,
} from './functions/prospects';

/**
 * Guide d'utilisation :
 *
 * 1. Envoyer un événement depuis une Server Action :
 *    ```ts
 *    import { inngest } from '@/lib/inngest';
 *
 *    export async function createShipment(data: CreateShipmentInput) {
 *      const shipment = await db.shipment.create({ data });
 *
 *      // Déclencher un événement Inngest
 *      await inngest.send({
 *        name: 'shipment/created',
 *        data: {
 *          shipmentId: shipment.id,
 *          trackingNumber: shipment.trackingNumber,
 *          clientId: shipment.clientId,    // ID du Client (COMPANY ou INDIVIDUAL)
 *          createdById: shipment.createdById,
 *        },
 *      });
 *
 *      return shipment;
 *    }
 *    ```
 *
 * 2. Les fonctions Inngest s'exécutent automatiquement :
 *    - En réponse aux événements (ex: shipment/created)
 *    - Selon un planning cron (ex: tous les jours à 9h)
 *
 * 3. Développement local :
 *    - Lancer le dev server : `npx inngest-cli@latest dev`
 *    - UI disponible : http://localhost:8288
 *    - Voir les événements et l'exécution des fonctions en temps réel
 *
 * 4. Production :
 *    - Configurer INNGEST_EVENT_KEY et INNGEST_SIGNING_KEY
 *    - Les fonctions sont déployées automatiquement sur Vercel
 *    - Inngest Cloud orchestre l'exécution
 */
