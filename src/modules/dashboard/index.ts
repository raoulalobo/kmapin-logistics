/**
 * Module Dashboard - Exports centralisés
 *
 * Point d'entrée unique pour toutes les fonctionnalités du dashboard
 */

// Actions
export {
  getDashboardStats,
  getRecentShipments,
  getRevenueChartData,
  getShipmentsChartData,
  type DashboardStats,
  type RecentShipmentData,
} from './actions/dashboard.actions';
