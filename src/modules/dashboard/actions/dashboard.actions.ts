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
import { ShipmentStatus, InvoiceStatus, QuoteStatus } from '@/generated/prisma';

/**
 * Type pour les statistiques du dashboard
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
  pendingRevenue: number;

  deliveryRate: number; // Pourcentage de livraisons réussies

  // Alertes
  pendingInvoices: number;
  overdueInvoices: number;
  pendingQuotes: number;
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
  const companyId = session.user.companyId;

  // Sécurité : Si CLIENT sans company, retourner des stats vides
  if (isClient && !companyId) {
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
      pendingInvoices: 0,
      overdueInvoices: 0,
      pendingQuotes: 0,
      deliveredToday: 0,
    };
  }

  // Filtre par company pour les CLIENTs uniquement
  const whereCompany = isClient ? { companyId: companyId! } : {};

  // Dates pour les calculs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Récupérer les statistiques en parallèle pour optimiser les performances
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

    // Revenus (factures payées)
    paidInvoices,
    paidInvoicesLastMonth,
    pendingInvoicesData,
    overdueInvoicesCount,

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
    isClient ? Promise.resolve(0) : prisma.company.count(),
    isClient ? Promise.resolve(0) : prisma.company.count({
      where: {
        shipments: { some: {} },
      },
    }),
    isClient ? Promise.resolve(0) : prisma.company.count({
      where: { createdAt: { gte: startOfMonth } },
    }),

    // Revenus (filtrés par company pour les CLIENTs)
    prisma.invoice.findMany({
      where: {
        ...whereCompany,
        status: InvoiceStatus.PAID,
        paidDate: { gte: startOfMonth },
      },
      select: { total: true },
    }),
    prisma.invoice.findMany({
      where: {
        ...whereCompany,
        status: InvoiceStatus.PAID,
        paidDate: { gte: startOfLastMonth, lt: startOfMonth },
      },
      select: { total: true },
    }),
    prisma.invoice.findMany({
      where: {
        ...whereCompany,
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED],
        },
      },
      select: { total: true },
    }),
    prisma.invoice.count({
      where: {
        ...whereCompany,
        status: InvoiceStatus.OVERDUE
      },
    }),

    // Alertes (filtrées par company pour les CLIENTs)
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

  // Calculs dérivés
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const lastMonthRevenue = paidInvoicesLastMonth.reduce((sum, inv) => sum + inv.total, 0);
  const pendingRevenue = pendingInvoicesData.reduce((sum, inv) => sum + inv.total, 0);

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

    pendingInvoices: pendingInvoicesData.length,
    overdueInvoices: overdueInvoicesCount,
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
  const companyId = session.user.companyId;

  // Sécurité : Si CLIENT sans company, retourner tableau vide
  if (isClient && !companyId) {
    return [];
  }

  const whereCompany = isClient ? { companyId: companyId! } : {};

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
      company: {
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
    companyName: shipment.company.name,
  }));
}

/**
 * Récupérer les données pour le graphique d'évolution des revenus
 * (derniers 6 mois)
 * Les CLIENTs ne voient QUE les factures de leur company
 */
export async function getRevenueChartData() {
  const session = await requireAuth();

  // Filtrer par company pour les CLIENTs
  const userRole = session.user.role;
  const isClient = userRole === 'CLIENT' || userRole === 'VIEWER';
  const companyId = session.user.companyId;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Sécurité : Si CLIENT sans company, retourner données vides
  const whereCompany = (isClient && !companyId) ? null : (isClient ? { companyId: companyId! } : {});

  const invoices = whereCompany === null ? [] : await prisma.invoice.findMany({
    where: {
      ...whereCompany,
      status: InvoiceStatus.PAID,
      paidDate: { gte: sixMonthsAgo },
    },
    select: {
      total: true,
      paidDate: true,
    },
  });

  // Grouper par mois
  const monthlyData: Record<string, number> = {};

  invoices.forEach((invoice) => {
    if (!invoice.paidDate) return;

    const monthKey = `${invoice.paidDate.getFullYear()}-${String(invoice.paidDate.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + invoice.total;
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
  const companyId = session.user.companyId;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Sécurité : Si CLIENT sans company, retourner données vides
  const whereCompany = (isClient && !companyId) ? null : (isClient ? { companyId: companyId! } : {});

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
