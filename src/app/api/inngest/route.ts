/**
 * API Route Inngest - KmapIn Logistics
 *
 * Endpoint pour l'orchestration Inngest
 * - En développement : utilise le Dev Server local
 * - En production : connecte à Inngest Cloud
 *
 * Toutes les fonctions Inngest sont enregistrées ici
 *
 * @see https://www.inngest.com/docs/deploy/nextjs
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';

// Import de toutes les fonctions Inngest
import {
  notifyShipmentCreated,
  notifyShipmentDelivered,
  sendOverdueInvoiceReminder,
} from '@/lib/inngest/functions/notifications';

import {
  checkOverdueInvoices,
  cleanupTempFiles,
  generateWeeklyReport,
} from '@/lib/inngest/functions/scheduled';

/**
 * Liste de toutes les fonctions Inngest enregistrées
 */
const functions = [
  // Notifications
  notifyShipmentCreated,
  notifyShipmentDelivered,
  sendOverdueInvoiceReminder,

  // Scheduled jobs
  checkOverdueInvoices,
  cleanupTempFiles,
  generateWeeklyReport,
];

/**
 * Configuration du serveur Inngest
 *
 * En développement :
 * - Lance `npx inngest-cli@latest dev` dans un terminal séparé
 * - L'UI de dev est accessible sur http://localhost:8288
 *
 * En production :
 * - Se connecte automatiquement à Inngest Cloud
 * - Nécessite INNGEST_EVENT_KEY et INNGEST_SIGNING_KEY dans .env
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,

  /**
   * Options de configuration
   */
  options: {
    // Servir l'UI de dev en local
    servePath: '/api/inngest',

    // En production, désactiver l'UI
    serveOrigin:
      process.env.NODE_ENV === 'production'
        ? undefined
        : 'http://localhost:3000',
  },
});
