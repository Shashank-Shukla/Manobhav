import { apiRequest } from '../../shared/api/apiClient';
import type { AdminDashboardData } from './types';

export const emptyAdminDashboardData: AdminDashboardData = {
  insightMetrics: [],
  opsQueues: [],
  quickActions: [],
  providers: [],
  bookings: [],
  slots: [],
};

export async function getAdminDashboardData(signal?: AbortSignal): Promise<AdminDashboardData> {
  return apiRequest<AdminDashboardData>('/api/admin/dashboard', { signal });
}
