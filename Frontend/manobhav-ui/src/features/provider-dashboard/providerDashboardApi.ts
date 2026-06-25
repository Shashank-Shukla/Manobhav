import { apiRequest } from '../../shared/api/apiClient';

export type ProviderDashboardStatus = 'Provider' | 'ProviderApplicant' | 'PendingProfile';

export type ProviderDashboardProvider = {
  name: string;
  shortName: string;
  title: string | null;
  avatarInitials: string;
  avatarColor: string;
  status: ProviderDashboardStatus;
  profilePublished: boolean;
};

export type ProviderDashboardMetrics = {
  sessionsTotal: number;
  sessionsThisWeek: number;
  upcomingCount: number;
};

export type ProviderTodayAppointment = {
  id: string;
  patientName: string;
  startsAtUtc: string;
  endsAtUtc: string;
};

export type ProviderUpcomingAppointment = {
  id: string;
  patientName: string;
  startsAtUtc: string;
};

export type ProviderWeekCalendarDay = {
  dateUtc: string;
  appointmentCount: number;
  isToday: boolean;
};

export type ProviderDashboardNotifications = {
  unreadCount: number;
};

export type ProviderDashboard = {
  provider: ProviderDashboardProvider;
  metrics: ProviderDashboardMetrics;
  todayAppointments: ProviderTodayAppointment[];
  upcomingAppointments: ProviderUpcomingAppointment[];
  weekCalendar: ProviderWeekCalendarDay[];
  notifications: ProviderDashboardNotifications;
};

export async function getProviderDashboard(signal?: AbortSignal): Promise<ProviderDashboard> {
  return apiRequest<ProviderDashboard>('/api/provider/dashboard', { signal });
}
