import { useEffect, useState } from 'react';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import { refreshAuthSession } from '../../shared/auth/cognitoAuth';
import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';
import {
  fetchProviderTaxonomy,
  saveProviderSection,
  startOrResumeProviderApplication,
  submitProviderApplication,
  type ProviderApplication,
  type ProviderApplicationSection,
  type ProviderSectionKey,
  type ProviderTaxonomy,
  type ProviderTaxonomyTerm,
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
  required?: boolean;
  kind?: 'text' | 'email' | 'number' | 'textarea' | 'chips' | 'single-select';
  placeholder?: string;
  taxonomyKey?: keyof ProviderTaxonomy;
  options?: ReadonlyArray<{ value: string; label: string }>;
  min?: number;
  max?: number;
};

const sessionLengthOptions: ReadonlyArray<{ value: string; label: string }> = [30, 45, 60, 75, 90, 105, 120, 150, 180].map(
  (minutes) => ({ value: String(minutes), label: String(minutes) }),
);

const ageGroupOptions: ReadonlyArray<{ value: string; label: string }> = [
  'Under 13 years',
  '13–17 years (Adolescents)',
  '18–24 years (Young Adults)',
  '25–64 years',
  '65+ years',
].map((label) => ({ value: label, label }));

type DraftValue = string | string[];
type Drafts = Record<ProviderSectionKey, Record<string, DraftValue>>;
type FieldErrors = Record<string, string>;

const taxonomyCacheKey = 'manobhav-provider-onboarding-taxonomy';
const draftStoragePrefix = 'manobhav-provider-onboarding-draft';

const backendSectionDictionaryKeys: Record<string, { payloadKey: string; sectionKey: ProviderSectionKey }> = {
  basicIdentity: { payloadKey: 'basicIdentity', sectionKey: 'basic-profile' },
  bioAndApproach: { payloadKey: 'bio', sectionKey: 'bio' },
  specializations: { payloadKey: 'specializations', sectionKey: 'specializations' },
  therapyApproaches: { payloadKey: 'modalities', sectionKey: 'modalities' },
  sessionDetails: { payloadKey: 'sessionDetails', sectionKey: 'session-details' },
  credentials: { payloadKey: 'credentials', sectionKey: 'credentials' },
  payout: { payloadKey: 'payout', sectionKey: 'payout' },
};

const emptyTaxonomy: ProviderTaxonomy = {
  specializations: [],
  therapyApproaches: [],
  languages: [],
};

const providerStages: ProviderStage[] = [
  {
    key: 'basic-profile',
    title: 'Your profile',
    helper: 'Your legal name, display name, and contact details.',
    fields: [
      { key: 'legalName', label: 'Legal name', required: true },
      { key: 'displayName', label: 'Display name', required: true },
      { key: 'email', label: 'Email', kind: 'email', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'location', label: 'Location' },
    ],
  },
  {
    key: 'bio',
    title: 'Bio and approach',
    helper: 'Your therapeutic approach, languages, and background.',
    fields: [
      { key: 'shortBio', label: 'Short bio', kind: 'textarea', required: true },
      { key: 'longBio', label: 'Long bio', kind: 'textarea' },
      { key: 'approach', label: 'Therapeutic approach', kind: 'textarea', required: true },
      { key: 'languages', label: 'Languages', kind: 'chips', required: true, taxonomyKey: 'languages' },
    ],
  },
  {
    key: 'specializations',
    title: 'Specializations',
    helper: 'Your focus areas, age groups, and therapy goals.',
    fields: [
      {
        key: 'focusAreas',
        label: 'Focus areas',
        kind: 'chips',
        required: true,
        taxonomyKey: 'specializations',
      },
      { key: 'ageGroups', label: 'Age groups', kind: 'chips', options: ageGroupOptions },
      { key: 'therapyGoals', label: 'Therapy goals', placeholder: 'Sleep, Emotional regulation' },
    ],
  },
  {
    key: 'modalities',
    title: 'How you work',
    helper: 'Online, in-person, individual, couples, group, or hybrid care.',
    fields: [
      {
        key: 'modalities',
        label: 'Therapy approaches',
        kind: 'chips',
        required: true,
        taxonomyKey: 'therapyApproaches',
      },
      { key: 'deliveryModes', label: 'Delivery modes', placeholder: 'Online, In-person', required: true },
    ],
  },
  {
    key: 'session-details',
    title: 'Session details',
    helper: 'Session lengths, availability summary, and weekly capacity.',
    fields: [
      {
        key: 'sessionLengthsMinutes',
        label: 'Session length (minutes)',
        kind: 'single-select',
        required: true,
        options: sessionLengthOptions,
      },
      { key: 'availabilitySummary', label: 'Availability summary', kind: 'textarea', required: true },
      { key: 'capacityPerWeek', label: 'Capacity per week', kind: 'number', required: true, min: 1, max: 48 },
    ],
  },
  {
    key: 'credentials',
    title: 'Your credentials',
    helper: 'Add your credentials for our review.',
    fields: [
      { key: 'credentialType', label: 'Credential type', required: true },
      { key: 'credentialTitle', label: 'Credential title', required: true },
      { key: 'institution', label: 'Institution' },
      { key: 'licenseNumber', label: 'License number' },
      { key: 'credentialYear', label: 'Year', kind: 'number' },
    ],
  },
  {
    key: 'payout',
    title: 'Payment details',
    helper: 'Your preferred payout method, set up after approval.',
    fields: [
      { key: 'payoutMode', label: 'Payout mode', required: true },
      { key: 'accountHolderName', label: 'Account holder name' },
      { key: 'notes', label: 'Payout notes', kind: 'textarea' },
    ],
  },
  {
    key: 'review',
    title: 'Review and submit',
    helper: 'Submit your application for review. Our team will be in touch once they\'ve looked it over.',
    fields: [],
  },
];

export function OnboardingProviderPage({ onBack }: Props) {
  void onBack;
  const navigate = useNavigate();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [selectedStage, setSelectedStage] = useState<ProviderStage['key']>(providerStages[0].key);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<ProviderSectionKey>>(() => new Set());
  const [drafts, setDrafts] = useState<Drafts>(() => createInitialDrafts());
  const [taxonomy, setTaxonomy] = useState<ProviderTaxonomy>(() => readTaxonomyCache() ?? emptyTaxonomy);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);

  useEffect(() => {
    purgeLegacyBrowserStorageDrafts();

    const controller = new AbortController();
    startOrResumeProviderApplication(controller.signal)
      .then(async (response) => {
        if (isSubmittedStatus(response.status)) {
          setApplication(response);
          setStatus('ready');
          // The provider-applicant role is granted server-side; refresh the cached session so the
          // role router sends the applicant to the provider dashboard rather than the patient page.
          await refreshAuthSession().catch(() => undefined);
          navigate('/dashboard', { replace: true });
          return;
        }

        const currentStage = getKnownStageKey(response.currentStep);
        const currentStageIndex = getStageIndex(currentStage);
        const cognitoEmail = getNonEmptyEmail(response.email);

        setApplication(response);
        setDrafts(applyLockedEmail(hydrateDrafts(response), cognitoEmail));
        setEmailLocked(Boolean(cognitoEmail));
        setSelectedStage(currentStage);
        setActiveStageIndex(currentStageIndex);
        setCompletedStages(inferCompletedStages(response, currentStageIndex));
        setStatus('ready');
      })
      .catch((failure: unknown) => {
        setStatus('error');
        setError(getErrorMessage(failure, 'We couldn\'t load your application. Please refresh the page.'));
      });

    return () => controller.abort();
  }, [navigate]);

  useEffect(() => {
    if (readTaxonomyCache()) {
      return undefined;
    }

    const controller = new AbortController();
    fetchProviderTaxonomy(controller.signal)
      .then((response) => {
        const normalized = normalizeTaxonomy(response);
        setTaxonomy(normalized);
        writeTaxonomyCache(normalized);
      })
      .catch(() => {
        setTaxonomy(emptyTaxonomy);
      });

    return () => controller.abort();
  }, []);

  const lockedFieldKeys = getLockedFieldKeys(selectedStage, emailLocked);

  const updateDraft = (fieldKey: string, value: DraftValue) => {
    if (selectedStage === 'review' || lockedFieldKeys.has(fieldKey)) return;
    setDrafts((current) => {
      const next = {
        ...current,
        [selectedStage]: { ...current[selectedStage], [fieldKey]: value },
      };
      return next;
    });
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  };

  const saveStage = async () => {
    if (!application || selectedStage === 'review') return;

    const selected = getStage(selectedStage);
    const validationErrors = validateStage(selected, drafts[selectedStage]);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Complete the required fields before continuing.');
      return;
    }

    const nextStage = getNextStageKey(selectedStage);
    await runSavingAction(
      async () => {
        const response = await saveProviderSection({
          applicationId: application.id,
          body: buildSectionBody(selectedStage, drafts[selectedStage]),
          currentStep: nextStage,
          sectionKey: selectedStage,
        });
        const nextActiveIndex = Math.max(activeStageIndex, getStageIndex(nextStage));
        setApplication({ ...response, currentStep: nextStage });
        setCompletedStages((current) => new Set([...current, selectedStage]));
        setActiveStageIndex(nextActiveIndex);
        setSelectedStage(nextStage);
        setFieldErrors({});
        purgeLegacyBrowserStorageDrafts();
      },
      'We couldn\'t save this section. Please check your entries and try again.',
      setError,
      setIsSaving,
    );
  };

  const submitApplication = async () => {
    if (!application) return;
    await runSavingAction(
      async () => {
        const response = await submitProviderApplication(application.id);
        setApplication(response);
        purgeLegacyBrowserStorageDrafts();
        // Submitting grants the provider-applicant role server-side; refresh the cached session so
        // /dashboard routes the applicant to the provider dashboard instead of the patient page.
        await refreshAuthSession().catch(() => undefined);
        navigate('/dashboard', { replace: true });
      },
      'We couldn\'t submit your application. Please try again.',
      setError,
      setIsSaving,
    );
  };

  if (status !== 'ready') {
    return <ProviderOnboardingStatus status={status} error={error} />;
  }

  return (
    <ProviderOnboardingLayout
      activeStageIndex={activeStageIndex}
      completedStages={completedStages}
      draft={selectedStage === 'review' ? {} : drafts[selectedStage]}
      error={error}
      fieldErrors={fieldErrors}
      isSaving={isSaving}
      lockedFieldKeys={lockedFieldKeys}
      onDraftChange={updateDraft}
      onSave={saveStage}
      onSelectStage={setSelectedStage}
      onSubmit={submitApplication}
      selected={getStage(selectedStage)}
      selectedStage={selectedStage}
      taxonomy={taxonomy}
    />
  );
}

function ProviderOnboardingLayout({
  activeStageIndex,
  completedStages,
  draft,
  error,
  fieldErrors,
  isSaving,
  lockedFieldKeys,
  onDraftChange,
  onSave,
  onSelectStage,
  onSubmit,
  selected,
  selectedStage,
  taxonomy,
}: {
  activeStageIndex: number;
  completedStages: Set<ProviderSectionKey>;
  draft: Record<string, DraftValue>;
  error: string;
  fieldErrors: FieldErrors;
  isSaving: boolean;
  lockedFieldKeys: ReadonlySet<string>;
  onDraftChange: (fieldKey: string, value: DraftValue) => void;
  onSave: () => Promise<void>;
  onSelectStage: (stageKey: ProviderStage['key']) => void;
  onSubmit: () => Promise<void>;
  selected: ProviderStage;
  selectedStage: ProviderStage['key'];
  taxonomy: ProviderTaxonomy;
}) {
  return (
    <div
      className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-6 pb-10 pt-28 sm:pt-32 lg:grid-cols-[280px_minmax(0,1fr)]"
      data-testid="provider-onboarding-layout"
    >
      <ProviderStageNav
        activeStageIndex={activeStageIndex}
        completedStages={completedStages}
        onSelectStage={onSelectStage}
        selectedStage={selectedStage}
      />
      <ProviderStagePanel
        draft={draft}
        error={error}
        fieldErrors={fieldErrors}
        isSaving={isSaving}
        lockedFieldKeys={lockedFieldKeys}
        onDraftChange={onDraftChange}
        onSave={onSave}
        onSubmit={onSubmit}
        selected={selected}
        taxonomy={taxonomy}
      />
    </div>
  );
}

function ProviderStageNav({
  activeStageIndex,
  completedStages,
  onSelectStage,
  selectedStage,
}: {
  activeStageIndex: number;
  completedStages: Set<ProviderSectionKey>;
  onSelectStage: (stageKey: ProviderStage['key']) => void;
  selectedStage: ProviderStage['key'];
}) {
  return (
    <nav className="space-y-2" aria-label="Provider onboarding sections">
      {providerStages.map((stage, index) => {
        const isCompleted = isProviderSectionKey(stage.key) && completedStages.has(stage.key);
        const isDisabled = index > activeStageIndex && !isCompleted;
        return (
          <ProviderStageButton
            isCompleted={isCompleted}
            isDisabled={isDisabled}
            isSelected={selectedStage === stage.key}
            key={stage.key}
            onSelect={() => onSelectStage(stage.key)}
            stage={stage}
          />
        );
      })}
    </nav>
  );
}

function ProviderStageButton({
  isCompleted,
  isDisabled,
  isSelected,
  onSelect,
  stage,
}: {
  isCompleted: boolean;
  isDisabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  stage: ProviderStage;
}) {
  const className = getStageButtonClassName({ isCompleted, isDisabled, isSelected });
  return (
    <button
      aria-current={isSelected ? 'step' : undefined}
      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${className}`}
      disabled={isDisabled}
      onClick={onSelect}
      type="button"
    >
      <span className={isDisabled ? 'font-semibold text-gray-400' : 'font-semibold text-gray-800'}>{stage.title}</span>
      <span className={isDisabled ? 'mt-1 block text-xs text-gray-400' : 'mt-1 block text-xs text-gray-500'}>
        {stage.helper}
      </span>
    </button>
  );
}

function getStageButtonClassName({
  isCompleted,
  isDisabled,
  isSelected,
}: {
  isCompleted: boolean;
  isDisabled: boolean;
  isSelected: boolean;
}): string {
  if (isDisabled) {
    return 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-80';
  }

  if (isCompleted) {
    return 'border-[#9CAF88] bg-[#EEF4EA] hover:bg-[#E3EDD9]';
  }

  if (isSelected) {
    return 'border-[#9CAF88] bg-white shadow-sm';
  }

  return 'border-gray-200 bg-white hover:bg-gray-50';
}

function ProviderStagePanel({
  draft,
  error,
  fieldErrors,
  isSaving,
  lockedFieldKeys,
  onDraftChange,
  onSave,
  onSubmit,
  selected,
  taxonomy,
}: {
  draft: Record<string, DraftValue>;
  error: string;
  fieldErrors: FieldErrors;
  isSaving: boolean;
  lockedFieldKeys: ReadonlySet<string>;
  onDraftChange: (fieldKey: string, value: DraftValue) => void;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
  selected: ProviderStage;
  taxonomy: ProviderTaxonomy;
}) {
  return (
    <section className="self-start rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="provider-onboarding-panel">
      <Text variant="h3">{selected.title}</Text>
      <p className="mt-2 text-sm text-gray-600">{selected.helper}</p>
      <ProviderStageBody
        draft={draft}
        fieldErrors={fieldErrors}
        isSaving={isSaving}
        lockedFieldKeys={lockedFieldKeys}
        onDraftChange={onDraftChange}
        onSave={onSave}
        onSubmit={onSubmit}
        selected={selected}
        taxonomy={taxonomy}
      />
      {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
    </section>
  );
}

function ProviderStageBody({
  draft,
  fieldErrors,
  isSaving,
  lockedFieldKeys,
  onDraftChange,
  onSave,
  onSubmit,
  selected,
  taxonomy,
}: {
  draft: Record<string, DraftValue>;
  fieldErrors: FieldErrors;
  isSaving: boolean;
  lockedFieldKeys: ReadonlySet<string>;
  onDraftChange: (fieldKey: string, value: DraftValue) => void;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
  selected: ProviderStage;
  taxonomy: ProviderTaxonomy;
}) {
  if (selected.key === 'review') {
    return <ReviewSubmit isSaving={isSaving} onSubmit={onSubmit} />;
  }

  return (
    <StageForm
      draft={draft}
      fieldErrors={fieldErrors}
      fields={selected.fields}
      isSaving={isSaving}
      lockedFieldKeys={lockedFieldKeys}
      onDraftChange={onDraftChange}
      onSave={onSave}
      taxonomy={taxonomy}
    />
  );
}

function ProviderOnboardingStatus({ error, status }: { error: string; status: 'loading' | 'error' }) {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Text variant="h2">{status === 'loading' ? 'Setting up your application' : 'We ran into an issue'}</Text>
      <p className="text-sm text-gray-600">{status === 'loading' ? 'Just a moment — we\'re getting things ready.' : error}</p>
    </div>
  );
}

function StageForm({
  draft,
  fieldErrors,
  fields,
  isSaving,
  lockedFieldKeys,
  onDraftChange,
  onSave,
  taxonomy,
}: {
  draft: Record<string, DraftValue>;
  fieldErrors: FieldErrors;
  fields: ProviderStageField[];
  isSaving: boolean;
  lockedFieldKeys: ReadonlySet<string>;
  onDraftChange: (fieldKey: string, value: DraftValue) => void;
  onSave: () => Promise<void>;
  taxonomy: ProviderTaxonomy;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <StageFieldControl
            draft={draft}
            error={fieldErrors[field.key]}
            field={field}
            key={field.key}
            onChange={(value) => onDraftChange(field.key, value)}
            readOnly={lockedFieldKeys.has(field.key)}
            taxonomy={taxonomy}
          />
        ))}
      </div>
      <Button variant="primary" disabled={isSaving} onClick={() => void onSave()}>
        {isSaving ? 'Saving...' : 'Save and continue'}
      </Button>
    </div>
  );
}

function StageFieldControl({
  draft,
  error,
  field,
  onChange,
  readOnly = false,
  taxonomy,
}: {
  draft: Record<string, DraftValue>;
  error?: string;
  field: ProviderStageField;
  onChange: (value: DraftValue) => void;
  readOnly?: boolean;
  taxonomy: ProviderTaxonomy;
}) {
  if (field.kind === 'chips') {
    return (
      <ChipFieldControl
        error={error}
        field={field}
        onChange={onChange}
        selectedValues={getDraftList(draft, field.key)}
        taxonomy={taxonomy}
      />
    );
  }

  if (field.kind === 'single-select') {
    return (
      <SingleSelectChipControl
        error={error}
        field={field}
        onChange={onChange}
        selectedValue={getDraftString(draft, field.key)}
      />
    );
  }

  const isTextarea = field.kind === 'textarea';
  const id = `provider-${field.key}`;
  const inputType = isTextarea ? undefined : field.kind === 'email' ? 'email' : field.kind === 'number' ? 'number' : 'text';

  return (
    <div className={isTextarea ? 'md:col-span-2' : ''}>
      <TextField
        error={Boolean(error)}
        fullWidth
        helperText={error}
        id={id}
        label={field.label}
        multiline={isTextarea}
        minRows={isTextarea ? 3 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        required={Boolean(field.required)}
        type={inputType}
        value={getDraftString(draft, field.key)}
        variant="outlined"
        slotProps={getFieldSlotProps(field, readOnly)}
        sx={getFieldSx(readOnly)}
      />
    </div>
  );
}

function getFieldSlotProps(field: ProviderStageField, readOnly: boolean) {
  return {
    input: readOnly ? { readOnly: true } : undefined,
    htmlInput: field.kind === 'number'
      ? { min: field.min ?? 1, max: field.max, step: 1 }
      : undefined,
  };
}

function getFieldSx(readOnly: boolean) {
  return {
    '& .MuiFormLabel-asterisk': { color: '#e11d48' },
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      backgroundColor: readOnly ? '#F3F4F6' : undefined,
      '&.Mui-focused fieldset': { borderColor: '#9CAF88' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#7A8C6A' },
  };
}

function ChipFieldControl({
  error,
  field,
  onChange,
  selectedValues,
  taxonomy,
}: {
  error?: string;
  field: ProviderStageField;
  onChange: (value: DraftValue) => void;
  selectedValues: string[];
  taxonomy: ProviderTaxonomy;
}) {
  const id = `provider-${field.key}`;
  const errorId = `${id}-error`;
  const terms = getTermsForField(field, taxonomy, selectedValues);

  return (
    <div
      aria-describedby={error ? errorId : undefined}
      aria-labelledby={`${id}-label`}
      className="space-y-2 md:col-span-2"
      role="group"
    >
      <span id={`${id}-label`} className="block text-sm font-semibold text-gray-700">
        {field.label}
        {field.required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <div className={error ? 'rounded-lg border border-rose-400 p-3' : 'rounded-lg border border-gray-200 p-3'}>
        <div className="flex flex-wrap gap-2">
          {terms.map((term) => {
            const selected = isTermSelected(selectedValues, term);
            return (
              <Chip
                aria-pressed={selected}
                clickable
                key={term.key}
                label={term.label}
                onClick={() => onChange(toggleTerm(selectedValues, term))}
                onDelete={selected ? () => onChange(removeTerm(selectedValues, term)) : undefined}
                sx={getChipSx(selected)}
                variant={selected ? 'filled' : 'outlined'}
              />
            );
          })}
          {terms.length === 0 && <span className="text-sm text-gray-500">Options unavailable. Try again later.</span>}
        </div>
      </div>
      {error && <p id={errorId} className="text-sm font-medium text-rose-700">{error}</p>}
    </div>
  );
}

function getChipSx(selected: boolean) {
  if (!selected) {
    return {
      borderColor: '#CBD5E1',
      color: '#374151',
      '&:hover': { backgroundColor: '#F3F7EF' },
    };
  }

  return {
    backgroundColor: '#9CAF88',
    color: '#FFFFFF',
    '&:hover': { backgroundColor: '#7A8C6A' },
    '& .MuiChip-deleteIcon': { color: '#FFFFFF' },
  };
}

function SingleSelectChipControl({
  error,
  field,
  onChange,
  selectedValue,
}: {
  error?: string;
  field: ProviderStageField;
  onChange: (value: DraftValue) => void;
  selectedValue: string;
}) {
  const id = `provider-${field.key}`;
  const errorId = `${id}-error`;
  const options = field.options ?? [];

  return (
    <div
      aria-describedby={error ? errorId : undefined}
      aria-labelledby={`${id}-label`}
      className="space-y-2 md:col-span-2"
      role="radiogroup"
    >
      <span id={`${id}-label`} className="block text-sm font-semibold text-gray-700">
        {field.label}
        {field.required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <div className={error ? 'rounded-lg border border-rose-400 p-3' : 'rounded-lg border border-gray-200 p-3'}>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <Chip
                aria-checked={selected}
                clickable
                key={option.value}
                label={option.label}
                onClick={() => onChange(option.value)}
                role="radio"
                sx={getChipSx(selected)}
                variant={selected ? 'filled' : 'outlined'}
              />
            );
          })}
          {options.length === 0 && <span className="text-sm text-gray-500">Options unavailable. Try again later.</span>}
        </div>
      </div>
      {error && <p id={errorId} className="text-sm font-medium text-rose-700">{error}</p>}
    </div>
  );
}

function ReviewSubmit({
  isSaving,
  onSubmit,
}: {
  isSaving: boolean;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-gray-600">
        When you're ready, submit your application for review. Our team will approve your profile before it goes live.
      </p>
      <Button variant="primary" disabled={isSaving} onClick={() => void onSubmit()}>
        {isSaving ? 'Sending...' : 'Send for admin review'}
      </Button>
    </div>
  );
}

function isSubmittedStatus(status: string | null | undefined): boolean {
  return typeof status === 'string' && status.toLowerCase() === 'submitted';
}

function getNonEmptyEmail(email: string | null | undefined): string {
  return typeof email === 'string' ? email.trim() : '';
}

function applyLockedEmail(drafts: Drafts, email: string): Drafts {
  if (!email) {
    return drafts;
  }

  return {
    ...drafts,
    'basic-profile': { ...drafts['basic-profile'], email },
  };
}

function getLockedFieldKeys(selectedStage: ProviderStage['key'], emailLocked: boolean): ReadonlySet<string> {
  return emailLocked && selectedStage === 'basic-profile' ? new Set(['email']) : new Set();
}

function getStage(stageKey: ProviderStage['key']): ProviderStage {
  return providerStages.find((stage) => stage.key === stageKey) ?? providerStages[0];
}

function getStageIndex(stageKey: ProviderStage['key']): number {
  return Math.max(providerStages.findIndex((stage) => stage.key === stageKey), 0);
}

function getKnownStageKey(stageKey?: string | null): ProviderStage['key'] {
  return providerStages.some((stage) => stage.key === stageKey) ? (stageKey as ProviderStage['key']) : providerStages[0].key;
}

function getNextStageKey(stageKey: ProviderSectionKey): ProviderStage['key'] {
  const nextStage = providerStages[getStageIndex(stageKey) + 1];
  return nextStage?.key ?? 'review';
}

function createInitialDrafts(): Drafts {
  return providerStages
    .filter((stage): stage is ProviderStage & { key: ProviderSectionKey } => stage.key !== 'review')
    .reduce((drafts, stage) => ({ ...drafts, [stage.key]: createStageDraft(stage.fields) }), {} as Drafts);
}

function createStageDraft(fields: ProviderStageField[]): Record<string, DraftValue> {
  return Object.fromEntries(fields.map((field) => [field.key, field.kind === 'chips' ? [] : '']));
}

function validateStage(stage: ProviderStage, draft: Record<string, DraftValue>): FieldErrors {
  return stage.fields.reduce((errors, field) => {
    const value = draft[field.key];

    if (field.required && isMissingValue(value)) {
      return { ...errors, [field.key]: `${field.label} is required.` };
    }

    if (typeof value === 'string' && value.trim()) {
      if (field.kind === 'email' && !isValidEmail(value.trim())) {
        return { ...errors, [field.key]: 'Please enter a valid email address.' };
      }
      if (field.kind === 'number') {
        const numberError = validateNumberField(field, value.trim());
        if (numberError) {
          return { ...errors, [field.key]: numberError };
        }
      }
    }

    return errors;
  }, {} as FieldErrors);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateNumberField(field: ProviderStageField, value: string): string | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return `${field.label} must be a whole number.`;
  }

  const min = field.min ?? 1;
  const max = field.max;
  if (typeof max === 'number') {
    return parsed >= min && parsed <= max ? null : `${field.label} must be between ${min} and ${max}.`;
  }

  return parsed >= min ? null : `${field.label} must be ${min} or greater.`;
}

function isMissingValue(value: DraftValue | undefined): boolean {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return !value?.trim();
}

function buildSectionBody(sectionKey: ProviderSectionKey, draft: Record<string, DraftValue>): SaveProviderSectionBody {
  const builders: Record<ProviderSectionKey, (draft: Record<string, DraftValue>) => SaveProviderSectionBody> = {
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

function buildBasicIdentityBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    basicIdentity: {
      legalName: getDraftString(draft, 'legalName'),
      displayName: getDraftString(draft, 'displayName'),
      email: getDraftString(draft, 'email'),
      phone: getDraftString(draft, 'phone'),
      location: getDraftString(draft, 'location'),
    },
  };
}

function buildBioBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    bio: {
      shortBio: getDraftString(draft, 'shortBio'),
      longBio: getDraftString(draft, 'longBio'),
      approach: getDraftString(draft, 'approach'),
      languages: getDraftList(draft, 'languages'),
    },
  };
}

function buildSpecializationsBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    specializations: {
      focusAreas: getDraftList(draft, 'focusAreas'),
      ageGroups: getDraftList(draft, 'ageGroups'),
      therapyGoals: parseCsv(getDraftString(draft, 'therapyGoals')),
    },
  };
}

function buildModalitiesBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    modalities: {
      modalities: getDraftList(draft, 'modalities'),
      deliveryModes: parseCsv(getDraftString(draft, 'deliveryModes')),
    },
  };
}

function buildSessionDetailsBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    sessionDetails: {
      sessionLengthsMinutes: parseNumberList(getDraftString(draft, 'sessionLengthsMinutes')),
      availabilitySummary: getDraftString(draft, 'availabilitySummary'),
      capacityPerWeek: parseNullableNumber(getDraftString(draft, 'capacityPerWeek')),
    },
  };
}

function buildCredentialsBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    credentials: {
      items: [{
        credentialType: getDraftString(draft, 'credentialType'),
        title: getDraftString(draft, 'credentialTitle'),
        institution: getDraftString(draft, 'institution'),
        licenseNumber: getDraftString(draft, 'licenseNumber'),
        year: parseNullableNumber(getDraftString(draft, 'credentialYear')),
      }],
    },
  };
}

function buildPayoutBody(draft: Record<string, DraftValue>): SaveProviderSectionBody {
  return {
    payout: {
      payoutMode: getDraftString(draft, 'payoutMode'),
      accountHolderName: getDraftString(draft, 'accountHolderName'),
      notes: getDraftString(draft, 'notes'),
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

function hydrateDrafts(application: ProviderApplication): Drafts {
  const drafts = createInitialDrafts();
  for (const section of normalizeApplicationSections(application.sections)) {
    applySectionToDrafts(drafts, section);
  }
  return drafts;
}

function normalizeApplicationSections(sections: ProviderApplication['sections']): ProviderApplicationSection[] {
  if (!sections) {
    return [];
  }

  if (Array.isArray(sections)) {
    return sections.filter(isRecord) as ProviderApplicationSection[];
  }

  if (!isRecord(sections)) {
    return [];
  }

  return Object.entries(sections).map(([sectionKey, value]) => {
    const dictionaryMapping = backendSectionDictionaryKeys[sectionKey];
    if (dictionaryMapping && isRecord(value)) {
      return {
        sectionKey: dictionaryMapping.sectionKey,
        [dictionaryMapping.payloadKey]: value,
      } as ProviderApplicationSection;
    }

    if (isRecord(value)) {
      return { sectionKey, ...value } as ProviderApplicationSection;
    }

    return { sectionKey } as ProviderApplicationSection;
  });
}

function applySectionToDrafts(drafts: Drafts, section: ProviderApplicationSection): void {
  const sectionKey = getSectionKey(section);
  if (!sectionKey) {
    return;
  }

  switch (sectionKey) {
    case 'basic-profile': {
      const payload = getPayload(section, 'basicIdentity');
      drafts['basic-profile'] = {
        ...drafts['basic-profile'],
        legalName: getRecordString(payload, 'legalName'),
        displayName: getRecordString(payload, 'displayName'),
        email: getRecordString(payload, 'email'),
        phone: getRecordString(payload, 'phone'),
        location: getRecordString(payload, 'location'),
      };
      break;
    }
    case 'bio': {
      const payload = getPayload(section, 'bio');
      drafts.bio = {
        ...drafts.bio,
        shortBio: getRecordString(payload, 'shortBio'),
        longBio: getRecordString(payload, 'longBio'),
        approach: getRecordString(payload, 'approach'),
        languages: getRecordStringList(payload, 'languages'),
      };
      break;
    }
    case 'specializations': {
      const payload = getPayload(section, 'specializations');
      drafts.specializations = {
        ...drafts.specializations,
        focusAreas: getRecordStringList(payload, 'focusAreas'),
        ageGroups: getRecordStringList(payload, 'ageGroups'),
        therapyGoals: getRecordStringList(payload, 'therapyGoals').join(', '),
      };
      break;
    }
    case 'modalities': {
      const payload = getPayload(section, 'modalities');
      drafts.modalities = {
        ...drafts.modalities,
        modalities: getRecordStringList(payload, 'modalities'),
        deliveryModes: getRecordStringList(payload, 'deliveryModes').join(', '),
      };
      break;
    }
    case 'session-details': {
      const payload = getPayload(section, 'sessionDetails');
      drafts['session-details'] = {
        ...drafts['session-details'],
        sessionLengthsMinutes: getRecordStringList(payload, 'sessionLengthsMinutes').join(', '),
        availabilitySummary: getRecordString(payload, 'availabilitySummary'),
        capacityPerWeek: getRecordString(payload, 'capacityPerWeek'),
      };
      break;
    }
    case 'credentials': {
      const payload = getPayload(section, 'credentials');
      const firstCredential = getFirstCredential(payload);
      drafts.credentials = {
        ...drafts.credentials,
        credentialType: getRecordString(firstCredential, 'credentialType'),
        credentialTitle: getRecordString(firstCredential, 'title'),
        institution: getRecordString(firstCredential, 'institution'),
        licenseNumber: getRecordString(firstCredential, 'licenseNumber'),
        credentialYear: getRecordString(firstCredential, 'year'),
      };
      break;
    }
    case 'payout': {
      const payload = getPayload(section, 'payout');
      drafts.payout = {
        ...drafts.payout,
        payoutMode: getRecordString(payload, 'payoutMode'),
        accountHolderName: getRecordString(payload, 'accountHolderName'),
        notes: getRecordString(payload, 'notes'),
      };
      break;
    }
  }
}

function getSectionKey(section: ProviderApplicationSection): ProviderSectionKey | null {
  const rawKey = section.sectionKey ?? section.key;
  if (isProviderSectionKey(rawKey)) {
    return rawKey;
  }

  if (getPayload(section, 'basicIdentity')) return 'basic-profile';
  if (getPayload(section, 'bio')) return 'bio';
  if (getPayload(section, 'specializations')) return 'specializations';
  if (getPayload(section, 'modalities')) return 'modalities';
  if (getPayload(section, 'sessionDetails')) return 'session-details';
  if (getPayload(section, 'credentials')) return 'credentials';
  if (getPayload(section, 'payout')) return 'payout';
  return null;
}

function getPayload(section: ProviderApplicationSection, payloadKey: string): Record<string, unknown> | undefined {
  const sectionRecord = section as Record<string, unknown>;
  const direct = sectionRecord[payloadKey];
  if (isRecord(direct)) {
    return direct;
  }

  const data = section.data as Record<string, unknown> | null | undefined;
  if (isRecord(data)) {
    const nested = data[payloadKey];
    if (isRecord(nested)) {
      return nested;
    }
  }

  return undefined;
}

function inferCompletedStages(application: ProviderApplication, currentStageIndex: number): Set<ProviderSectionKey> {
  const completed = new Set<ProviderSectionKey>();
  providerStages.slice(0, currentStageIndex).forEach((stage) => {
    if (isProviderSectionKey(stage.key)) {
      completed.add(stage.key);
    }
  });

  normalizeApplicationSections(application.sections).forEach((section) => {
    const sectionKey = getSectionKey(section);
    if (sectionKey) {
      completed.add(sectionKey);
    }
  });

  return completed;
}

function purgeLegacyBrowserStorageDrafts(): void {
  purgeLegacyDraftsFromStorage(window.localStorage);
  purgeLegacyDraftsFromStorage(window.sessionStorage);
}

function purgeLegacyDraftsFromStorage(storage: Storage): void {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && isProviderDraftStorageKey(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch {
    // Legacy draft cleanup should not block provider onboarding.
  }
}

function isProviderDraftStorageKey(key: string): boolean {
  return key === draftStoragePrefix || key.startsWith(`${draftStoragePrefix}:`);
}

function readTaxonomyCache(): ProviderTaxonomy | null {
  try {
    const cached = window.localStorage.getItem(taxonomyCacheKey);
    return cached ? normalizeTaxonomy(JSON.parse(cached)) : null;
  } catch {
    return null;
  }
}

function writeTaxonomyCache(taxonomy: ProviderTaxonomy): void {
  try {
    window.localStorage.setItem(taxonomyCacheKey, JSON.stringify(taxonomy));
  } catch {
    // Taxonomy cache is an optimization only.
  }
}

function normalizeTaxonomy(value: unknown): ProviderTaxonomy {
  if (!isRecord(value)) {
    return emptyTaxonomy;
  }

  return {
    specializations: normalizeTerms(value.specializations),
    therapyApproaches: normalizeTerms(value.therapyApproaches),
    languages: normalizeTerms(value.languages),
  };
}

function normalizeTerms(value: unknown): ProviderTaxonomyTerm[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      key: getRecordString(item, 'key'),
      label: getRecordString(item, 'label'),
    }))
    .filter((item) => item.key && item.label);
}

function getTermsForField(
  field: ProviderStageField,
  taxonomy: ProviderTaxonomy,
  selectedValues: string[],
): ProviderTaxonomyTerm[] {
  const terms = field.taxonomyKey
    ? [...taxonomy[field.taxonomyKey]]
    : (field.options ?? []).map((option) => ({ key: option.value, label: option.label }));
  for (const value of selectedValues) {
    if (!terms.some((term) => doesTermMatchValue(term, value))) {
      terms.push({ key: value, label: humanizeValue(value) });
    }
  }
  return terms;
}

function toggleTerm(selectedValues: string[], term: ProviderTaxonomyTerm): string[] {
  return isTermSelected(selectedValues, term) ? removeTerm(selectedValues, term) : [...selectedValues, term.key];
}

function removeTerm(selectedValues: string[], term: ProviderTaxonomyTerm): string[] {
  return selectedValues.filter((value) => !doesTermMatchValue(term, value));
}

function isTermSelected(selectedValues: string[], term: ProviderTaxonomyTerm): boolean {
  return selectedValues.some((value) => doesTermMatchValue(term, value));
}

function doesTermMatchValue(term: ProviderTaxonomyTerm, value: string): boolean {
  return normalizeTermValue(value) === normalizeTermValue(term.key) || normalizeTermValue(value) === normalizeTermValue(term.label);
}

function normalizeTermValue(value: string): string {
  return value.trim().toLowerCase();
}

function getDraftString(draft: Record<string, DraftValue>, key: string): string {
  const value = draft[key];
  return Array.isArray(value) ? value.join(', ') : value ?? '';
}

function getDraftList(draft: Record<string, DraftValue>, key: string): string[] {
  const value = draft[key];
  return Array.isArray(value) ? value : parseCsv(value);
}

function getRecordString(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  if (Array.isArray(value)) {
    return value.map(String).join(', ');
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function getRecordStringList(record: Record<string, unknown> | undefined, key: string): string[] {
  const value = record?.[key];
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return parseCsv(value);
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [String(value)];
}

function getFirstCredential(record: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const items = record?.items;
  return Array.isArray(items) && isRecord(items[0]) ? items[0] : undefined;
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

function humanizeValue(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function isProviderSectionKey(value: unknown): value is ProviderSectionKey {
  return typeof value === 'string' && getProviderSectionStages().some((stage) => stage.key === value);
}

function getProviderSectionStages(): Array<ProviderStage & { key: ProviderSectionKey }> {
  return providerStages.filter((stage): stage is ProviderStage & { key: ProviderSectionKey } => stage.key !== 'review');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('csrf') || msg.includes('token validation')) {
      return 'Your session may have expired. Please refresh the page and try again.';
    }
    return error.message;
  }
  return fallbackMessage;
}

export default OnboardingProviderPage;
