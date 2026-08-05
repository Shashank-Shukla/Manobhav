import { apiRequest } from '../../shared/api/apiClient';

export type PatientOnboardingStatus = {
  isRegisteredPatient: boolean;
  hasCompletedProfile: boolean;
  hasAppointments: boolean;
  resumableIntakeSubmissionId?: string | null;
  activeBookingHoldId?: string | null;
  nextStep: string;
};

export type PatientProfile = {
  fullName: string;
  preferredName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  avatarInitials: string;
  profileCompletedAtUtc?: string | null;
};

export type PatientAppointment = {
  id: string;
  providerProfileId: string;
  providerName: string;
  providerTitle?: string | null;
  providerAvatarColor: string;
  slotId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  paymentStatus: string;
  canJoin: boolean;
  canModify: boolean;
};

export type PatientIntakeAnswer = {
  questionKey: string;
  prompt: string;
  answer: string;
};

export type PatientIntakeSummary = {
  submissionId?: string | null;
  status?: string | null;
  submittedAtUtc?: string | null;
  completedAtUtc?: string | null;
  answers: PatientIntakeAnswer[];
};

export type PatientConsent = {
  consentType: string;
  policyVersion: number;
  accepted: boolean;
  signedAtUtc: string;
};

export type PatientDashboardMetrics = {
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
};

export type PatientDashboard = {
  profile: PatientProfile;
  metrics: PatientDashboardMetrics;
  upcomingAppointments: PatientAppointment[];
  pastAppointments: PatientAppointment[];
  intake: PatientIntakeSummary;
  consents: PatientConsent[];
};

export type UpdatePatientProfileInput = {
  fullName: string;
  preferredName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
};

export type CompleteProfileInput = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
};

export async function getPatientOnboardingStatus(signal?: AbortSignal): Promise<PatientOnboardingStatus> {
  return apiRequest<PatientOnboardingStatus>('/api/patient/onboarding-status', { signal });
}

export async function getPatientDashboard(signal?: AbortSignal): Promise<PatientDashboard> {
  return apiRequest<PatientDashboard>('/api/patient/dashboard', { signal });
}

export async function updatePatientProfile(input: UpdatePatientProfileInput, signal?: AbortSignal): Promise<PatientProfile> {
  return apiRequest<PatientProfile>('/api/patient/profile', {
    method: 'PUT',
    body: input,
    signal,
  });
}

export async function cancelPatientAppointment(appointmentId: string, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(`/api/patient/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
    method: 'POST',
    signal,
  });
}

export async function reschedulePatientAppointment(appointmentId: string, slotId: string, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(`/api/patient/appointments/${encodeURIComponent(appointmentId)}/reschedule`, {
    method: 'POST',
    body: { slotId },
    signal,
  });
}

export async function completeIntakeProfile(submissionId: string, input: CompleteProfileInput, signal?: AbortSignal): Promise<unknown> {
  return apiRequest<unknown>(`/api/intake/submissions/${encodeURIComponent(submissionId)}/complete-profile`, {
    method: 'POST',
    body: input,
    signal,
  });
}
