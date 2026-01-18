/**
 * Server Actions : Dashboard
 *
 * Actions serveur pour récupérer les statistiques et métriques du dashboard
 * - KPIs globaux (expéditions, clients, revenus)
 * - Activité récente
 * - Alertes et notifications
 *
 * @module modules/dashboard/actions
 */

'use server';

import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
// Import des enums depuis le client Prisma généré (valeurs runtime, pas seulement types)
// Note: InvoiceStatus n'existe plus - les factures sont générées à la volée depuis les devis payés
import { ShipmentStatus, QuoteStatus } from '@/lib/db/enums';

/**
 * Type pour les statistiques du dashboard
 *
 * Note: Les factures ne sont plus stockées en base de données.
 * Les revenus sont calculés depuis les devis ayant reçu un paiement (paymentReceivedAt != null).
 */
export interface DashboardStats {
  // KPIs principaux
  totalShipments: number;
  activeShipments: number;
  shipmentsGrowth: number; // Pourcentage de croissance vs mois dernier

  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;

  totalRevenue: number;
  revenueGrowth: number;
  pendingRevenue: number; // Devis validés mais pas encore payés

  deliveryRate: number; // Pourcentage de livraisons réussies

  // Alertes
  quotesAwaitingPayment: number; // Devis validés en attente de paiement
  expiredQuotes: number; // Devis dont la date de validité est dépassée
  pendingQuotes: number; // Devis envoyés en attente de réponse client
  deliveredToday: number;
}

/**
 * Type pour une expédition récente
 */
export interface RecentShipmentData {
  id: string;
  trackingNumber: string;
  destination: string;
  destinationCountry: string;
  status: ShipmentStatus;
  createdAt: Date;
  companyName: string;
}

/**
 * Récupérer les statistiques du dashboard
 * Les CLIENTs ne voient QUE les données de leur company
 * Les ADMIN/MANAGERS voient TOUTES les données
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await requireAuth();

  // Déterminer si l'utilisateur est un CLIENT/VIEWER (données limitées) ou ADMIN/MANAGER (données globales)
  const userRole = session.user.role;
  const isClient = userRole === 'CLIENT' || userRole === 'VIEWER';
  const clientId = session.user.clientId;

  // Sécurité : Si CLIENT sans company, retourner des stats vides
  if (isClient && !clientId) {
    return {
      totalShipments: 0,
      activeShipments: 0,
      shipmentsGrowth: 0,
      totalClients: 0,
      activeClients: 0,
      newClientsThisMonth: 0,
      totalRevenue: 0,
      revenueGrowth: 0,
      pendingRevenue: 0,
      deliveryRate: 0,
      quotesAwaitingPayment: 0,
      expiredQuotes: 0,
      pendingQuotes: 0,
      deliveredToday: 0,
    };
  }

  // Filtre par company pour les CLIENTs uniquement
  const whereCompany = isClient ? { clientId: clientId! } : {};

  // Dates pour les calculs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Récupérer les statistiques en parallèle pour optimiser les performances
  // Note: Les revenus sont calculés depuis les devis avec paymentReceivedAt (plus de table Invoice)
  const [
    // Expéditions
    totalShipments,
    activeShipments,
    shipmentsThisMonth,
    shipmentsLastMonth,
    deliveredShipments,

    // Clients
    totalClients,
    activeClientsCount,
    newClientsThisMonth,

    // Revenus (devis payés - basé sur paymentReceivedAt)
    paidQuotesThisMonth,
    paidQuotesLastMonth,
    quotesAwaitingPaymentData,
    expiredQuotesCount,

    // Alertes
    pendingQuotesCount,
    deliveredTodayCount,
  ] = await Promise.all([
    // Expéditions (filtrées par company pour les CLIENTs)
    prisma.shipment.count({
      where: whereCompany,
    }),
    // Compte les expéditions actives (en cours de traitement/transit)
    prisma.shipment.count({
      where: {
        ...whereCompany,
        status: {
          in: [
            ShipmentStatus.PENDING_APPROVAL,
            ShipmentStatus.APPROVED,
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.AT_CUSTOMS,
            ShipmentStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
    }),
    prisma.shipment.count({
      where: {
        ...whereCompany,
        createdAt: { gte: startOfMonth }
      },
    }),
    prisma.shipment.count({
      where: {
        ...whereCompany,
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    }),
    prisma.shipment.count({
      where: {
        ...whereCompany,
        status: ShipmentStatus.DELIVERED
      },
    }),

    // Clients (ADMIN/MANAGER uniquement - CLIENTs retournent 0)
    isClient ? Promise.resolve(0) : prisma.client.count(),
    isClient ? Promise.resolve(0) : prisma.client.count({
      where: {
        shipments: { some: {} },
      },
    }),
    isClient ? Promise.resolve(0) : prisma.client.count({
      where: { createdAt: { gte: startOfMonth } },
    }),

    // Revenus depuis les devis payés (paymentReceivedAt != null)
    // Devis payés ce mois-ci
    prisma.quote.findMany({
      where: {
        ...whereCompany,
        paymentReceivedAt: { gte: startOfMonth },
      },
      select: { estimatedCost: true },
    }),
    // Devis payés le mois dernier
    prisma.quote.findMany({
      where: {
        ...whereCompany,
        paymentReceivedAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
      select: { estimatedCost: true },
    }),
    // Devis validés mais pas encore payés (en attente de paiement)
    prisma.quote.findMany({
      where: {
        ...whereCompany,
        status: QuoteStatus.VALIDATED,
        paymentReceivedAt: null,
      },
      select: { estimatedCost: true },
    }),
    // Devis expirés (validité dépassée et non payés)
    prisma.quote.count({
      where: {
        ...whereCompany,
        status: QuoteStatus.VALIDATED,
        paymentReceivedAt: null,
        validUntil: { lt: now },
      },
    }),

    // Alertes (filtrées par company pour les CLIENTs)
    // Devis envoyés en attente de réponse client
    prisma.quote.count({
      where: {
        ...whereCompany,
        status: QuoteStatus.SENT
      },
    }),
    prisma.shipment.count({
      where: {
        ...whereCompany,
        status: ShipmentStatus.DELIVERED,
        updatedAt: { gte: startOfToday },
      },
    }),
  ]);

  // Calculs dérivés basés sur les devis payés
  // Note: estimatedCost est un Decimal, on le convertit en number
  const totalRevenue = paidQuotesThisMonth.reduce(
    (sum, quote) => sum + Number(quote.estimatedCost || 0),
    0
  );
  const lastMonthRevenue = paidQuotesLastMonth.reduce(
    (sum, quote) => sum + Number(quote.estimatedCost || 0),
    0
  );
  const pendingRevenue = quotesAwaitingPaymentData.reduce(
    (sum, quote) => sum + Number(quote.estimatedCost || 0),
    0
  );

  const revenueGrowth = lastMonthRevenue > 0
    ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  const shipmentsGrowth = shipmentsLastMonth > 0
    ? ((shipmentsThisMonth - shipmentsLastMonth) / shipmentsLastMonth) * 100
    : 0;

  const deliveryRate = totalShipments > 0
    ? (deliveredShipments / totalShipments) * 100
    : 0;

  return {
    totalShipments,
    activeShipments,
    shipmentsGrowth,

    totalClients,
    activeClients: activeClientsCount,
    newClientsThisMonth,

    totalRevenue,
    revenueGrowth,
    pendingRevenue,

    deliveryRate,

    quotesAwaitingPayment: quotesAwaitingPaymentData.length,
    expiredQuotes: expiredQuotesCount,
    pendingQuotes: pendingQuotesCount,
    deliveredToday: deliveredTodayCount,
  };
}

/**
 * Récupérer les expéditions récentes
 * Les CLIENTs ne voient QUE les expéditions de leur company
 */
export async function getRecentShipments(limit: number = 5): Promise<RecentShipmentData[]> {
  const session = await requireAuth();

  // Filtrer par company pour les CLIENTs
  const userRole = session.user.role;
  const isClient = userRole === 'CLIENT' || userRole === 'VIEWER';
  const clientId = session.user.clientId;

  // Sécurité : Si CLIENT sans company, retourner tableau vide
  if (isClient && !clientId) {
    return [];
  }

  const whereCompany = isClient ? { clientId: clientId! } : {};

  const shipments = await prisma.shipment.findMany({
    where: whereCompany,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      trackingNumber: true,
      destinationCity: true,
      destinationCountry: true,
      status: true,
      createdAt: true,
      client: {
        select: {
          name: true,
        },
      },
    },
  });

  return shipments.map((shipment) => ({
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    destination: shipment.destinationCity || shipment.destinationCountry,
    destinationCountry: shipment.destinationCountry,
    status: shipment.status,
    createdAt: shipment.createdAt,
    companyName: shipment.client.name,
  }));
}

/**
 * Récupérer les données pour le graphique d'évolution des revenus
 * (derniers 6 mois)
 *
 * Note: Les revenus sont maintenant calculés depuis les devis payés
 * (paymentReceivedAt != null) au lieu de la table Invoice supprimée.
 *
 * Les CLIENTs ne voient QUE les revenus de leur company
 */
export async function getRevenueChartData() {
  const session = await requireAuth();

  // Filtrer par company pour les CLIENTs
  const userRole = session.user.role;
  const isClient = userRole === 'CLIENT' || userRole === 'VIEWER';
  const clientId = session.user.clientId;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Sécurité : Si CLIENT sans company, retourner données vides
  const whereCompany = (isClient && !clientId) ? null : (isClient ? { clientId: clientId! } : {});

  // Récupérer les devis payés depuis les 6 derniers mois
  const paidQuotes = whereCompany === null ? [] : await prisma.quote.findMany({
    where: {
      ...whereCompany,
      paymentReceivedAt: { gte: sixMonthsAgo },
    },
    select: {
      estimatedCost: true,
      paymentReceivedAt: true,
    },
  });

  // Grouper par mois basé sur la date de réception du paiement
  const monthlyData: Record<string, number> = {};

  paidQuotes.forEach((quote) => {
    if (!quote.paymentReceivedAt) return;

    const monthKey = `${quote.paymentReceivedAt.getFullYear()}-${String(quote.paymentReceivedAt.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(quote.estimatedCost || 0);
  });

  // Créer un tableau avec tous les 6 derniers mois (même ceux à 0)
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });

    chartData.push({
      month: monthName,
      revenue: monthlyData[monthKey] || 0,
    });
  }

  return chartData;
}

/**
 * Récupérer les données pour le graphique d'évolution des expéditions
 * (derniers 6 mois)
 * Les CLIENTs ne voient QUE les expéditions de leur company
 */
export async function getShipmentsChartData() {
  const session = await requireAuth();

  // Filtrer par company pour les CLIENTs
  const userRole = session.user.role;
  const isClient = userRole === 'CLIENT' || userRole === 'VIEWER';
  const clientId = session.user.clientId;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Sécurité : Si CLIENT sans company, retourner données vides
  const whereCompany = (isClient && !clientId) ? null : (isClient ? { clientId: clientId! } : {});

  const shipments = whereCompany === null ? [] : await prisma.shipment.findMany({
    where: {
      ...whereCompany,
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  // Grouper par mois et statut
  const monthlyData: Record<string, { total: number; delivered: number }> = {};

  shipments.forEach((shipment) => {
    const monthKey = `${shipment.createdAt.getFullYear()}-${String(shipment.createdAt.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, delivered: 0 };
    }

    monthlyData[monthKey].total++;
    if (shipment.status === ShipmentStatus.DELIVERED) {
      monthlyData[monthKey].delivered++;
    }
  });

  // Créer un tableau avec tous les 6 derniers mois
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });

    const data = monthlyData[monthKey] || { total: 0, delivered: 0 };

    chartData.push({
      month: monthName,
      total: data.total,
      delivered: data.delivered,
    });
  }

  return chartData;
}
