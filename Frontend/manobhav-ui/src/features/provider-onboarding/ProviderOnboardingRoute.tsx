import { useEffect, useState } from 'react';
import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';
import {
  saveProviderSection,
  startOrResumeProviderApplication,
  submitProviderApplication,
  type ProviderApplication,
  type ProviderSectionKey,
  type SaveProviderSectionBody,
} from './providerOnboardingApi';

type Props = {
  onBack: () => void;
};

type ProviderStage = {
  key: ProviderSectionKey | 'review';
  title: string;
  helper: string;
  fields: ProviderStageField[];
};

type ProviderStageField = {
  key: string;
  label: string;
  kind?: 'text' | 'email' | 'number' | 'textarea';
  placeholder?: string;
};

type Drafts = Record<ProviderSectionKey, Record<string, string>>;

const providerStages: ProviderStage[] = [
  {
    key: 'basic-profile',
    title: 'Basic identity',
    helper: 'Legal name, professional display name, contact preferences.',
    fields: [
      { key: 'legalName', label: 'Legal name' },
      { key: 'displayName', label: 'Display name' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'location', label: 'Location' },
    ],
  },
  {
    key: 'bio',
    title: 'Bio and approach',
    helper: 'Therapeutic approach, languages, tone, short and long bio.',
    fields: [
      { key: 'shortBio', label: 'Short bio', kind: 'textarea' },
      { key: 'longBio', label: 'Long bio', kind: 'textarea' },
      { key: 'approach', label: 'Therapeutic approach', kind: 'textarea' },
      { key: 'languages', label: 'Languages', placeholder: 'English, Hindi' },
    ],
  },
  {
    key: 'specializations',
    title: 'Specializations and tags',
    helper: 'Focus areas, age groups, therapy goals, taxonomy terms.',
    fields: [
      { key: 'focusAreas', label: 'Focus areas', placeholder: 'Anxiety, Burnout' },
      { key: 'ageGroups', label: 'Age groups', placeholder: 'Adults, Teens' },
      { key: 'therapyGoals', label: 'Therapy goals', placeholder: 'Sleep, Emotional regulation' },
    ],
  },
  {
    key: 'modalities',
    title: 'Modalities',
    helper: 'Online, in-person, individual, couples, group, or hybrid care.',
    fields: [
      { key: 'modalities', label: 'Modalities', placeholder: 'Individual, Couples' },
      { key: 'deliveryModes', label: 'Delivery modes', placeholder: 'Online, In-person' },
    ],
  },
  {
    key: 'session-details',
    title: 'Session details and availability',
    helper: 'Session lengths, availability summary, and weekly capacity.',
    fields: [
      { key: 'sessionLengthsMinutes', label: 'Session lengths in minutes', placeholder: '45, 60' },
      { key: 'availabilitySummary', label: 'Availability summary', kind: 'textarea' },
      { key: 'capacityPerWeek', label: 'Capacity per week', kind: 'number' },
    ],
  },
  {
    key: 'credentials',
    title: 'Credentials and private uploads',
    helper: 'Credential metadata only. Upload pre-signing is not enabled yet.',
    fields: [
      { key: 'credentialType', label: 'Credential type' },
      { key: 'credentialTitle', label: 'Credential title' },
      { key: 'institution', label: 'Institution' },
      { key: 'licenseNumber', label: 'License number' },
      { key: 'credentialYear', label: 'Year', kind: 'number' },
    ],
  },
  {
    key: 'payout',
    title: 'Payout details',
    helper: 'Placeholder metadata only. Do not enter account numbers or tax IDs here.',
    fields: [
      { key: 'payoutMode', label: 'Payout mode' },
      { key: 'accountHolderName', label: 'Account holder name' },
      { key: 'notes', label: 'Payout notes', kind: 'textarea' },
    ],
  },
  {
    key: 'review',
    title: 'Review and submit',
    helper: 'Submit for admin approval. Publishing remains a separate admin decision.',
    fields: [],
  },
];

export function OnboardingProviderPage({ onBack }: Props) {
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [selectedStage, setSelectedStage] = useState<ProviderStage['key']>(providerStages[0].key);
  const [drafts, setDrafts] = useState<Drafts>(() => createInitialDrafts());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    startOrResumeProviderApplication(controller.signal)
      .then((response) => {
        setApplication(response);
        setSelectedStage(getKnownStageKey(response.currentStep));
        setStatus('ready');
      })
      .catch((failure: unknown) => {
        setStatus('error');
        setError(getErrorMessage(failure, 'Unable to load provider onboarding.'));
      });

    return () => controller.abort();
  }, []);

  const updateDraft = (fieldKey: string, value: string) => {
    if (selectedStage === 'review') return;
    setDrafts((current) => ({
      ...current,
      [selectedStage]: { ...current[selectedStage], [fieldKey]: value },
    }));
  };

  const saveStage = async () => {
    if (!application || selectedStage === 'review') return;
    await runSavingAction(
      async () => setApplication(await saveProviderSection({
        applicationId: application.id,
        body: buildSectionBody(selectedStage, drafts[selectedStage]),
        currentStep: selectedStage,
        sectionKey: selectedStage,
      })),
      'Unable to save provider section.',
      setError,
      setIsSaving,
    );
  };

  const submitApplication = async () => {
    if (!application) return;
    await runSavingAction(
      async () => setApplication(await submitProviderApplication(application.id)),
      'Unable to submit provider application.',
      setError,
      setIsSaving,
    );
  };

  if (status !== 'ready') {
    return <ProviderOnboardingStatus status={status} error={error} onBack={onBack} />;
  }

  return (
    <ProviderOnboardingLayout
      application={application}
      draft={selectedStage === 'review' ? {} : drafts[selectedStage]}
      error={error}
      isSaving={isSaving}
      onBack={onBack}
      onDraftChange={updateDraft}
      onSave={saveStage}
      onSelectStage={setSelectedStage}
      onSubmit={submitApplication}
      selected={getStage(selectedStage)}
      selectedStage={selectedStage}
    />
  );
}

function ProviderOnboardingLayout({
  application,
  draft,
  error,
  isSaving,
  onBack,
  onDraftChange,
  onSave,
  onSelectStage,
  onSubmit,
  selected,
  selectedStage,
}: {
  application: ProviderApplication | null;
  draft: Record<string, string>;
  error: string;
  isSaving: boolean;
  onBack: () => void;
  onDraftChange: (fieldKey: string, value: string) => void;
  onSave: () => Promise<void>;
  onSelectStage: (stageKey: ProviderStage['key']) => void;
  onSubmit: () => Promise<void>;
  selected: ProviderStage;
  selectedStage: ProviderStage['key'];
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-12">
      <ProviderOnboardingHeader application={application} onBack={onBack} />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <ProviderStageNav onSelectStage={onSelectStage} selectedStage={selectedStage} />
        <ProviderStagePanel
          application={application}
          draft={draft}
          error={error}
          isSaving={isSaving}
          onDraftChange={onDraftChange}
          onSave={onSave}
          onSubmit={onSubmit}
          selected={selected}
        />
      </div>
    </div>
  );
}

function ProviderOnboardingHeader({ application, onBack }: { application: ProviderApplication | null; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Text variant="h2">Provider Onboarding</Text>
        <p className="mt-2 text-sm text-gray-600">
          Status: {application?.status ?? 'Draft'} - Approval and public publishing are separate admin decisions.
        </p>
      </div>
      <Button variant="secondary" onClick={onBack}>Back</Button>
    </div>
  );
}

function ProviderStageNav({
  onSelectStage,
  selectedStage,
}: {
  onSelectStage: (stageKey: ProviderStage['key']) => void;
  selectedStage: ProviderStage['key'];
}) {
  return (
    <nav className="space-y-2">
      {providerStages.map((stage) => (
        <ProviderStageButton
          isSelected={selectedStage === stage.key}
          key={stage.key}
          onSelect={() => onSelectStage(stage.key)}
          stage={stage}
        />
      ))}
    </nav>
  );
}

function ProviderStageButton({
  isSelected,
  onSelect,
  stage,
}: {
  isSelected: boolean;
  onSelect: () => void;
  stage: ProviderStage;
}) {
  const className = isSelected
    ? 'border-[#9CAF88] bg-[#EEF4EA]'
    : 'border-gray-200 bg-white hover:bg-gray-50';
  return (
    <button
      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${className}`}
      onClick={onSelect}
      type="button"
    >
      <span className="font-semibold text-gray-800">{stage.title}</span>
      <span className="mt-1 block text-xs text-gray-500">{stage.helper}</span>
    </button>
  );
}

function ProviderStagePanel({
  application,
  draft,
  error,
  isSaving,
  onDraftChange,
  onSave,
  onSubmit,
  selected,
}: {
  application: ProviderApplication | null;
  draft: Record<string, string>;
  error: string;
  isSaving: boolean;
  onDraftChange: (fieldKey: string, value: string) => void;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
  selected: ProviderStage;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <Text variant="h3">{selected.title}</Text>
      <p className="mt-2 text-sm text-gray-600">{selected.helper}</p>
      <CredentialsUploadNotice selectedStage={selected.key} />
      <ProviderStageBody
        application={application}
        draft={draft}
        isSaving={isSaving}
        onDraftChange={onDraftChange}
        onSave={onSave}
        onSubmit={onSubmit}
        selected={selected}
      />
      {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
    </section>
  );
}

function CredentialsUploadNotice({ selectedStage }: { selectedStage: ProviderStage['key'] }) {
  if (selectedStage !== 'credentials') {
    return null;
  }

  return (
    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Private S3 upload pre-signing is intentionally disabled in this build. Store only metadata here until S3 is wired.
    </p>
  );
}

function ProviderStageBody({
  application,
  draft,
  isSaving,
  onDraftChange,
  onSave,
  onSubmit,
  selected,
}: {
  application: ProviderApplication | null;
  draft: Record<string, string>;
  isSaving: boolean;
  onDraftChange: (fieldKey: string, value: string) => void;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
  selected: ProviderStage;
}) {
  if (selected.key === 'review') {
    return <ReviewSubmit application={application} isSaving={isSaving} onSubmit={onSubmit} />;
  }

  return <StageForm draft={draft} fields={selected.fields} isSaving={isSaving} onDraftChange={onDraftChange} onSave={onSave} />;
}

function ProviderOnboardingStatus({ error, onBack, status }: { error: string; onBack: () => void; status: 'loading' | 'error' }) {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Text variant="h2">{status === 'loading' ? 'Loading provider onboarding' : 'Provider onboarding unavailable'}</Text>
      <p className="text-sm text-gray-600">{status === 'loading' ? 'Fetching your provider application from the API.' : error}</p>
      {status === 'error' && <Button variant="secondary" onClick={onBack}>Back</Button>}
    </div>
  );
}

function StageForm({
  draft,
  fields,
  isSaving,
  onDraftChange,
  onSave,
}: {
  draft: Record<string, string>;
  fields: ProviderStageField[];
  isSaving: boolean;
  onDraftChange: (fieldKey: string, value: string) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <StageFieldControl
            field={field}
            key={field.key}
            onChange={(value) => onDraftChange(field.key, value)}
            value={draft[field.key] ?? ''}
          />
        ))}
      </div>
      <Button variant="primary" disabled={isSaving} onClick={() => void onSave()}>
        {isSaving ? 'Saving...' : 'Save section'}
      </Button>
    </div>
  );
}

function StageFieldControl({
  field,
  onChange,
  value,
}: {
  field: ProviderStageField;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = `provider-${field.key}`;
  return (
    <label className={field.kind === 'textarea' ? 'space-y-2 md:col-span-2' : 'space-y-2'} htmlFor={id}>
      <span className="block text-sm font-semibold text-gray-700">{field.label}</span>
      <StageInput field={field} id={id} onChange={onChange} value={value} />
    </label>
  );
}

function StageInput({
  field,
  id,
  onChange,
  value,
}: {
  field: ProviderStageField;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.kind === 'textarea') {
    return (
      <textarea
        className="min-h-28 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#9CAF88]"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        value={value}
      />
    );
  }

  return (
    <input
      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#9CAF88]"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      type={field.kind ?? 'text'}
      value={value}
    />
  );
}

function ReviewSubmit({
  application,
  isSaving,
  onSubmit,
}: {
  application: ProviderApplication | null;
  isSaving: boolean;
  onSubmit: () => Promise<void>;
}) {
  const isSubmitted = application?.status === 'Submitted';
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-gray-600">
        Submit when the provider draft is ready for admin review. Profile approval does not automatically publish the public profile.
      </p>
      <Button variant="primary" disabled={isSaving || isSubmitted} onClick={() => void onSubmit()}>
        {isSubmitted ? 'Submitted' : isSaving ? 'Submitting...' : 'Submit for review'}
      </Button>
    </div>
  );
}

function getStage(stageKey: ProviderStage['key']): ProviderStage {
  return providerStages.find((stage) => stage.key === stageKey) ?? providerStages[0];
}

function getKnownStageKey(stageKey?: string | null): ProviderStage['key'] {
  return providerStages.some((stage) => stage.key === stageKey) ? (stageKey as ProviderStage['key']) : providerStages[0].key;
}

function createInitialDrafts(): Drafts {
  return providerStages
    .filter((stage): stage is ProviderStage & { key: ProviderSectionKey } => stage.key !== 'review')
    .reduce((drafts, stage) => ({ ...drafts, [stage.key]: createStageDraft(stage.fields) }), {} as Drafts);
}

function createStageDraft(fields: ProviderStageField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.key, '']));
}

function buildSectionBody(sectionKey: ProviderSectionKey, draft: Record<string, string>): SaveProviderSectionBody {
  const builders: Record<ProviderSectionKey, (draft: Record<string, string>) => SaveProviderSectionBody> = {
    'basic-profile': buildBasicIdentityBody,
    bio: buildBioBody,
    specializations: buildSpecializationsBody,
    modalities: buildModalitiesBody,
    'session-details': buildSessionDetailsBody,
    credentials: buildCredentialsBody,
    payout: buildPayoutBody,
  };
  return builders[sectionKey](draft);
}

function buildBasicIdentityBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    basicIdentity: {
      legalName: getDraftValue(draft, 'legalName'),
      displayName: getDraftValue(draft, 'displayName'),
      email: getDraftValue(draft, 'email'),
      phone: getDraftValue(draft, 'phone'),
      location: getDraftValue(draft, 'location'),
    },
  };
}

function getDraftValue(draft: Record<string, string>, key: string): string {
  return draft[key] ?? '';
}

function buildBioBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    bio: {
      shortBio: draft.shortBio ?? '',
      longBio: draft.longBio ?? '',
      approach: draft.approach ?? '',
      languages: parseCsv(draft.languages),
    },
  };
}

function buildSpecializationsBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    specializations: {
      focusAreas: parseCsv(draft.focusAreas),
      ageGroups: parseCsv(draft.ageGroups),
      therapyGoals: parseCsv(draft.therapyGoals),
    },
  };
}

function buildModalitiesBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    modalities: {
      modalities: parseCsv(draft.modalities),
      deliveryModes: parseCsv(draft.deliveryModes),
    },
  };
}

function buildSessionDetailsBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    sessionDetails: {
      sessionLengthsMinutes: parseNumberList(draft.sessionLengthsMinutes),
      availabilitySummary: draft.availabilitySummary ?? '',
      capacityPerWeek: parseNullableNumber(draft.capacityPerWeek),
    },
  };
}

function buildCredentialsBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    credentials: {
      items: [{
        credentialType: draft.credentialType ?? '',
        title: draft.credentialTitle ?? '',
        institution: draft.institution ?? '',
        licenseNumber: draft.licenseNumber ?? '',
        year: parseNullableNumber(draft.credentialYear),
      }],
    },
  };
}

function buildPayoutBody(draft: Record<string, string>): SaveProviderSectionBody {
  return {
    payout: {
      payoutMode: draft.payoutMode ?? '',
      accountHolderName: draft.accountHolderName ?? '',
      notes: draft.notes ?? '',
    },
  };
}

async function runSavingAction(
  action: () => Promise<void>,
  fallbackMessage: string,
  setError: (message: string) => void,
  setIsSaving: (isSaving: boolean) => void,
): Promise<void> {
  setIsSaving(true);
  setError('');
  try {
    await action();
  } catch (failure: unknown) {
    setError(getErrorMessage(failure, fallbackMessage));
  } finally {
    setIsSaving(false);
  }
}

function parseCsv(value = ''): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseNumberList(value = ''): number[] {
  return parseCsv(value).map(Number).filter(Number.isFinite);
}

function parseNullableNumber(value = ''): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim() ? parsed : null;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export default OnboardingProviderPage;
