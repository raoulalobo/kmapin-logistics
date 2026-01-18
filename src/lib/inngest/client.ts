/**
 * Configuration Inngest - Faso Fret Logistics
 *
 * Client Inngest pour orchestrer les workflows et jobs asynchrones
 *
 * Inngest gère :
 * - Jobs asynchrones avec retry automatique
 * - Workflows multi-steps
 * - Scheduled jobs (cron)
 * - Event-driven architecture
 *
 * @see https://www.inngest.com/docs
 */

import { Inngest, EventSchemas } from 'inngest';

/**
 * Définition du schéma d'événements pour type-safety
 *
 * Chaque événement possède un nom et des données typées
 */
type Events = {
  /**
   * Événement : Nouvelle expédition créée
   */
  'shipment/created': {
    data: {
      shipmentId: string;
      trackingNumber: string;
      clientId: string;
      createdById: string;
    };
  };

  /**
   * Événement : Expédition livrée
   */
  'shipment/delivered': {
    data: {
      shipmentId: string;
      trackingNumber: string;
      clientId: string;
      deliveredAt: string;
    };
  };

  /**
   * Événement : Expédition retardée
   */
  'shipment/delayed': {
    data: {
      shipmentId: string;
      trackingNumber: string;
      reason: string;
      estimatedDelay: number; // en minutes
    };
  };

  /**
   * Événement : Paiement reçu sur un devis
   *
   * Déclenché quand un agent marque un devis comme payé
   * La facture peut ensuite être générée à la volée en PDF
   */
  'payment/received-quote': {
    data: {
      quoteId: string;
      quoteNumber: string;
      clientId: string;
      receivedAt: string;
      receivedById: string;
      amount: number;
    };
  };

  /**
   * Événement : Paiement reçu sur un colis
   *
   * Déclenché quand un agent marque un colis comme payé
   * La facture peut ensuite être générée à la volée en PDF
   */
  'payment/received-shipment': {
    data: {
      shipmentId: string;
      trackingNumber: string;
      quoteId?: string;
      clientId: string;
      receivedAt: string;
      receivedById: string;
      amount: number;
    };
  };

  /**
   * Événement : Nouveau devis créé
   */
  'quote/created': {
    data: {
      quoteId: string;
      quoteNumber: string;
      clientId: string;
    };
  };

  /**
   * Événement : Document uploadé
   *
   * Déclenché quand un document est uploadé vers Backblaze B2
   * Le document peut être lié à un colis ou un devis
   */
  'document/uploaded': {
    data: {
      documentId: string;
      shipmentId?: string;
      quoteId?: string;
      type: string;
      fileUrl: string;
    };
  };

  /**
   * Événement : Email à envoyer
   */
  'email/send': {
    data: {
      to: string;
      subject: string;
      template: string;
      data: Record<string, any>;
    };
  };

  /**
   * Événement : Tracking mis à jour
   */
  'tracking/updated': {
    data: {
      shipmentId: string;
      status: string;
      location: string;
      timestamp: string;
    };
  };

  /**
   * Événement : Prospect converti en User
   */
  'prospect/converted': {
    data: {
      prospectId: string;
      userId: string;
    };
  };
};

/**
 * Instance du client Inngest configurée pour l'application
 *
 * @example
 * ```ts
 * import { inngest } from '@/lib/inngest/client';
 *
 * // Envoyer un événement
 * await inngest.send({
 *   name: 'shipment/created',
 *   data: {
 *     shipmentId: 'ship-123',
 *     trackingNumber: 'TRK-001',
 *     clientId: 'comp-456',
 *     createdById: 'user-789'
 *   }
 * });
 * ```
 */
export const inngest = new Inngest({
  id: 'kmapin-logistics',
  name: 'Faso Fret Logistics',

  /**
   * Schémas d'événements pour validation
   */
  schemas: new EventSchemas().fromRecord<Events>(),

  /**
   * Event key pour authentification avec Inngest Cloud
   * En développement, Inngest Dev Server ne nécessite pas de clé
   */
  eventKey: process.env.INNGEST_EVENT_KEY,

  /**
   * Configuration du logger
   */
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

/**
 * Type helper pour extraire le type de données d'un événement
 */
export type EventData<T extends keyof Events> = Events[T]['data'];

/**
 * Type pour tous les noms d'événements
 */
export type EventName = keyof Events;
