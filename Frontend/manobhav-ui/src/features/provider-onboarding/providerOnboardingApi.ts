import { ApiError, apiRequest } from '../../shared/api/apiClient';

export type ProviderApplication = {
  id: string;
  userId: string;
  status: string;
  currentStep?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  submittedAtUtc?: string | null;
  sections?: ProviderApplicationSection[] | Record<string, unknown> | null;
  email?: string | null;
};

export type ProviderSectionKey =
  | 'basic-profile'
  | 'bio'
  | 'specializations'
  | 'modalities'
  | 'session-details'
  | 'credentials'
  | 'payout';

export type ProviderBasicIdentitySection = {
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  location: string;
};

export type ProviderBioSection = {
  shortBio: string;
  longBio: string;
  approach: string;
  languages: string[];
};

export type ProviderSpecializationsSection = {
  focusAreas: string[];
  ageGroups: string[];
  therapyGoals: string[];
};

export type ProviderModalitiesSection = {
  modalities: string[];
  deliveryModes: string[];
};

export type ProviderSessionDetailsSection = {
  sessionLengthsMinutes: number[];
  availabilitySummary: string;
  capacityPerWeek: number | null;
};

export type ProviderCredentialsSection = {
  items: Array<{
    credentialType: string;
    title: string;
    institution: string;
    licenseNumber: string;
    year: number | null;
  }>;
};

export type ProviderPayoutSection = {
  payoutMode: string;
  accountHolderName: string;
  notes: string;
};

export type ProviderSectionPayload = {
  basicIdentity: ProviderBasicIdentitySection;
  bio: ProviderBioSection;
  specializations: ProviderSpecializationsSection;
  modalities: ProviderModalitiesSection;
  sessionDetails: ProviderSessionDetailsSection;
  credentials: ProviderCredentialsSection;
  payout: ProviderPayoutSection;
};

export type ProviderApplicationSection = {
  sectionKey?: string | null;
  key?: string | null;
  data?: Partial<ProviderSectionPayload> | null;
} & Partial<ProviderSectionPayload>;

export type SaveProviderSectionBody = {
  currentStep?: string | null;
} & (
  | { basicIdentity: ProviderBasicIdentitySection }
  | { bio: ProviderBioSection }
  | { specializations: ProviderSpecializationsSection }
  | { modalities: ProviderModalitiesSection }
  | { sessionDetails: ProviderSessionDetailsSection }
  | { credentials: ProviderCredentialsSection }
  | { payout: ProviderPayoutSection }
);

export type ProviderTaxonomyTerm = {
  key: string;
  label: string;
};

export type ProviderTaxonomy = {
  specializations: ProviderTaxonomyTerm[];
  therapyApproaches: ProviderTaxonomyTerm[];
  languages: ProviderTaxonomyTerm[];
};

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

export async function fetchProviderTaxonomy(signal?: AbortSignal): Promise<ProviderTaxonomy> {
  return apiRequest<ProviderTaxonomy>('/api/provider-onboarding/taxonomy', { signal });
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
