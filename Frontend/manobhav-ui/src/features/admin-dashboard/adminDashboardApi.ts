import { apiRequest } from '../../shared/api/apiClient';
import type { AdminDashboardData, AdminNotification, ProviderApplication, ProviderApplicationSectionReviewStatus } from './types';

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

export async function getProviderApplications(signal?: AbortSignal): Promise<ProviderApplication[]> {
  return apiRequest<ProviderApplication[]>('/api/admin/provider-applications', { signal });
}

export async function getProviderApplication(applicationId: string, signal?: AbortSignal): Promise<ProviderApplication> {
  return apiRequest<ProviderApplication>(`/api/admin/provider-applications/${applicationId}`, { signal });
}

export async function saveProviderApplicationSectionReview(input: {
  applicationId: string;
  sectionKey: string;
  status: ProviderApplicationSectionReviewStatus;
  comment?: string;
}): Promise<ProviderApplication> {
  return apiRequest<ProviderApplication>(
    `/api/admin/provider-applications/${encodeURIComponent(input.applicationId)}/sections/${encodeURIComponent(input.sectionKey)}/review`,
    {
      method: 'PUT',
      body: {
        status: input.status,
        comment: input.comment,
      },
    },
  );
}

export async function approveProviderApplication(applicationId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/provider-applications/${encodeURIComponent(applicationId)}/approve`, { method: 'POST' });
}

export async function rejectProviderApplication(applicationId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/provider-applications/${encodeURIComponent(applicationId)}/reject`, { method: 'POST' });
}

export async function getAdminNotifications(signal?: AbortSignal): Promise<AdminNotification[]> {
  return apiRequest<AdminNotification[]>('/api/admin/notifications', { signal });
}

export async function markAdminNotificationRead(notificationId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/notifications/${notificationId}/read`, { method: 'POST' });
}
