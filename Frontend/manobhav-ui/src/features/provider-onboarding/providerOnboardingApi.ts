import { ApiError, apiRequest } from '../../shared/api/apiClient';

export type ProviderApplication = {
  id: string;
  userId: string;
  status: string;
  currentStep?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  submittedAtUtc?: string | null;
};

export type ProviderSectionKey =
  | 'basic-profile'
  | 'bio'
  | 'specializations'
  | 'modalities'
  | 'session-details'
  | 'credentials'
  | 'payout';

export type SaveProviderSectionBody = {
  currentStep?: string | null;
} & (
  | { basicIdentity: { legalName: string; displayName: string; email: string; phone: string; location: string } }
  | { bio: { shortBio: string; longBio: string; approach: string; languages: string[] } }
  | { specializations: { focusAreas: string[]; ageGroups: string[]; therapyGoals: string[] } }
  | { modalities: { modalities: string[]; deliveryModes: string[] } }
  | { sessionDetails: { sessionLengthsMinutes: number[]; availabilitySummary: string; capacityPerWeek: number | null } }
  | { credentials: { items: Array<{ credentialType: string; title: string; institution: string; licenseNumber: string; year: number | null }> } }
  | { payout: { payoutMode: string; accountHolderName: string; notes: string } }
);

export async function startOrResumeProviderApplication(signal?: AbortSignal): Promise<ProviderApplication> {
  try {
    const application = await apiRequest<ProviderApplication>('/api/provider-onboarding/applications/me', {
      signal,
    });
    if (application.status !== 'Rejected') {
      return application;
    }
  } catch (error: unknown) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  return createProviderApplication(signal);
}

function createProviderApplication(signal?: AbortSignal): Promise<ProviderApplication> {
  return apiRequest<ProviderApplication>('/api/provider-onboarding/applications', {
    method: 'POST',
    signal,
  });
}

export async function saveProviderSection(input: {
  applicationId: string;
  body: SaveProviderSectionBody;
  sectionKey: ProviderSectionKey;
  currentStep?: string | null;
  signal?: AbortSignal;
}): Promise<ProviderApplication> {
  return apiRequest<ProviderApplication>(
    `/api/provider-onboarding/applications/${encodeURIComponent(input.applicationId)}/sections/${encodeURIComponent(input.sectionKey)}`,
    {
      method: 'PUT',
      body: { ...input.body, currentStep: input.currentStep },
      signal: input.signal,
    },
  );
}

export async function submitProviderApplication(applicationId: string, signal?: AbortSignal): Promise<ProviderApplication> {
  return apiRequest<ProviderApplication>(`/api/provider-onboarding/applications/${encodeURIComponent(applicationId)}/submit`, {
    method: 'POST',
    signal,
  });
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
