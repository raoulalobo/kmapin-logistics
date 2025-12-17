/**
 * Server Actions : Tracking
 *
 * Actions serveur pour la gestion du suivi des expéditions
 * - Récupération des expéditions en cours
 * - Historique de tracking d'une expédition
 * - Ajout d'événements de tracking
 *
 * @module modules/tracking/actions
 */

'use server';

import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
import { ShipmentStatus } from '@/generated/prisma';

/**
 * Type pour une expédition avec ses événements de tracking
 */
export interface ShipmentWithTracking {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  cargoType: string;
  weight: number;
  estimatedDeliveryDate: Date | null;
  actualPickupDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
  };
  trackingEvents: TrackingEventData[];
}

/**
 * Type pour un événement de tracking
 */
export interface TrackingEventData {
  id: string;
  status: ShipmentStatus;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  timestamp: Date;
  metadata: any;
}

/**
 * Récupérer toutes les expéditions en cours avec leurs événements de tracking
 */
export async function getActiveShipmentsWithTracking(): Promise<ShipmentWithTracking[]> {
  const session = await requireAuth();

  // Statuts considérés comme "en cours"
  const activeStatuses = [
    ShipmentStatus.PENDING_APPROVAL,
    ShipmentStatus.APPROVED,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.AT_CUSTOMS,
    ShipmentStatus.CUSTOMS_CLEARED,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.READY_FOR_PICKUP,
  ];

  // Construire le filtre selon le rôle
  const where: any = {
    status: {
      in: activeStatuses,
    },
  };

  // Les clients ne voient que les expéditions de leur company
  if (session.user.role === 'CLIENT' || session.user.role === 'VIEWER') {
    where.companyId = session.user.companyId;
  }

  // Récupérer les expéditions avec tracking
  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      trackingEvents: {
        orderBy: { timestamp: 'desc' },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return shipments;
}

/**
 * Récupérer l'historique de tracking d'une expédition
 *
 * @param shipmentId - ID de l'expédition
 */
export async function getShipmentTracking(shipmentId: string): Promise<ShipmentWithTracking | null> {
  const session = await requireAuth();

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      trackingEvents: {
        orderBy: { timestamp: 'asc' },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!shipment) {
    return null;
  }

  // Vérifier les permissions
  const isAdmin = session.user.role === 'ADMIN';
  const isManager =
    session.user.role === 'OPERATIONS_MANAGER' ||
    session.user.role === 'FINANCE_MANAGER';
  const isSameCompany = shipment.companyId === session.user.companyId;

  if (!isAdmin && !isManager && !isSameCompany) {
    throw new Error('Accès non autorisé à cette expédition');
  }

  return shipment;
}

/**
 * Ajouter un événement de tracking à une expédition
 *
 * @param data - Données de l'événement de tracking
 */
export async function addTrackingEvent(data: {
  shipmentId: string;
  status: ShipmentStatus;
  location: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  metadata?: any;
}) {
  const session = await requireAuth();

  // Seuls les admins et operations managers peuvent ajouter des événements
  if (
    session.user.role !== 'ADMIN' &&
    session.user.role !== 'OPERATIONS_MANAGER'
  ) {
    throw new Error('Vous n\'avez pas la permission d\'ajouter des événements de tracking');
  }

  // Vérifier que l'expédition existe
  const shipment = await prisma.shipment.findUnique({
    where: { id: data.shipmentId },
  });

  if (!shipment) {
    throw new Error('Expédition introuvable');
  }

  // Créer l'événement de tracking
  const trackingEvent = await prisma.trackingEvent.create({
    data: {
      shipmentId: data.shipmentId,
      status: data.status,
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
      metadata: data.metadata,
    },
  });

  // Mettre à jour le statut de l'expédition si nécessaire
  if (shipment.status !== data.status) {
    await prisma.shipment.update({
      where: { id: data.shipmentId },
      data: { status: data.status },
    });
  }

  return trackingEvent;
}

/**
 * Récupérer les statistiques de tracking
 */
export async function getTrackingStats() {
  const session = await requireAuth();

  // Construire le filtre selon le rôle
  const where: any = {};
  if (session.user.role === 'CLIENT' || session.user.role === 'VIEWER') {
    where.companyId = session.user.companyId;
  }

  // Compter les expéditions par statut
  const [
    pickedUp,
    readyForPickup,
    inTransit,
    atCustoms,
    outForDelivery,
    deliveredToday,
    totalActive,
  ] = await Promise.all([
    prisma.shipment.count({
      where: { ...where, status: ShipmentStatus.PICKED_UP },
    }),
    prisma.shipment.count({
      where: { ...where, status: ShipmentStatus.READY_FOR_PICKUP },
    }),
    prisma.shipment.count({
      where: { ...where, status: ShipmentStatus.IN_TRANSIT },
    }),
    prisma.shipment.count({
      where: { ...where, status: ShipmentStatus.AT_CUSTOMS },
    }),
    prisma.shipment.count({
      where: { ...where, status: ShipmentStatus.OUT_FOR_DELIVERY },
    }),
    prisma.shipment.count({
      where: {
        ...where,
        status: ShipmentStatus.DELIVERED,
        actualDeliveryDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.shipment.count({
      where: {
        ...where,
        status: {
          in: [
            ShipmentStatus.PENDING_APPROVAL,
            ShipmentStatus.APPROVED,
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.AT_CUSTOMS,
            ShipmentStatus.CUSTOMS_CLEARED,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.READY_FOR_PICKUP,
          ],
        },
      },
    }),
  ]);

  return {
    pickedUp,
    readyForPickup,
    inTransit,
    atCustoms,
    outForDelivery,
    deliveredToday,
    totalActive,
  };
}
