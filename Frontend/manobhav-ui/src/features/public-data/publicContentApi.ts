import { apiRequest } from '../../shared/api/apiClient';
import type { ProviderRecord } from '../providers';

export type FeaturedExpert = {
  id: string;
  name: string;
  role: string;
  availability: string;
};

export type LandingContent = {
  featuredExperts: FeaturedExpert[];
};

export type VisitorFlowQuestion = {
  id: string;
  questionKey: string;
  stepOrder: number;
  text: string;
  responseType: string;
  isRequired: boolean;
  sensitivity: string;
  options: IntakeQuestionOption[];
};

export type VisitorFlow = {
  flowKey: string;
  formDefinitionId: string;
  formVersion: number;
  questions: VisitorFlowQuestion[];
};

export type IntakeQuestionOption = {
  id: string;
  value: string;
  label: string;
  displayOrder: number;
};

export type IntakeQuestion = {
  id: string;
  questionKey: string;
  prompt: string;
  helpText?: string | null;
  responseType: string;
  isRequired: boolean;
  sensitivity: string;
  displayOrder: number;
  options: IntakeQuestionOption[];
};

export type IntakeSection = {
  id: string;
  sectionKey: string;
  title: string;
  displayOrder: number;
  questions: IntakeQuestion[];
};

export type IntakeForm = {
  id: string;
  kind: string;
  version: number;
  title: string;
  sections: IntakeSection[];
};

type IntakeQuestionOptionApiResponse = {
  id: string;
  value?: string;
  optionKey?: string;
  label: string;
  displayOrder: number;
};

type IntakeQuestionApiResponse = {
  id: string;
  questionKey: string;
  prompt: string;
  helpText?: string | null;
  responseType?: string;
  inputType?: string;
  isRequired: boolean;
  sensitivity: string;
  displayOrder: number;
  options?: IntakeQuestionOptionApiResponse[];
};

type IntakeSectionApiResponse = {
  id: string;
  sectionKey: string;
  title: string;
  displayOrder: number;
  questions: IntakeQuestionApiResponse[];
};

type IntakeFormApiResponse = {
  id: string;
  kind?: string;
  submissionKind?: string;
  version: number;
  title?: string;
  name?: string;
  sections: IntakeSectionApiResponse[];
};

export type IntakeSubmission = {
  id: string;
  submissionKind: string;
  status: string;
  currentStep?: string | null;
  formDefinitionId: string;
  formVersion: number;
  visitorSessionId?: string | null;
  userId?: string | null;
};

export type IntakeAnswerValue = string | string[] | number | boolean;

export async function getLandingContent(signal?: AbortSignal): Promise<LandingContent> {
  return apiRequest<LandingContent>('/api/public/landing', { signal });
}

export async function getVisitorFlow(signal?: AbortSignal): Promise<VisitorFlow> {
  const form = await getActiveIntakeForm('PatientIntake', signal);
  return mapIntakeFormToVisitorFlow(form);
}

export async function getProviders(signal?: AbortSignal): Promise<ProviderRecord[]> {
  return apiRequest<ProviderRecord[]>('/api/public/providers', { signal });
}

export async function getActiveIntakeForm(kind: 'PatientIntake' | 'ProviderOnboarding', signal?: AbortSignal): Promise<IntakeForm> {
  const response = await apiRequest<IntakeFormApiResponse>(`/api/public/intake-forms/active?kind=${encodeURIComponent(kind)}`, {
    signal,
  });
  return normalizeIntakeForm(response);
}

export async function createIntakeSubmission(input: {
  submissionKind: 'PatientIntake' | 'ProviderOnboarding';
  formDefinitionId: string;
  visitorSessionId?: string | null;
  currentStep?: string | null;
  signal?: AbortSignal;
}): Promise<IntakeSubmission> {
  return apiRequest<IntakeSubmission>('/api/intake/submissions', {
    method: 'POST',
    body: buildCreateSubmissionBody(input),
    signal: input.signal,
  });
}

export async function saveIntakeAnswer(input: {
  submissionId: string;
  questionKey: string;
  answer: IntakeAnswerValue;
  currentStep: string;
  isAdvancing?: boolean;
  timeToAnswerMs: number;
  signal?: AbortSignal;
}): Promise<IntakeSubmission> {
  return apiRequest<IntakeSubmission>(
    `/api/intake/submissions/${encodeURIComponent(input.submissionId)}/answers/${encodeURIComponent(input.questionKey)}`,
    {
      method: 'PUT',
      body: {
        answer: input.answer,
        currentStep: input.currentStep,
        ...(input.isAdvancing === undefined ? {} : { isAdvancing: input.isAdvancing }),
        timeToAnswerMs: Math.max(0, Math.round(input.timeToAnswerMs)),
      },
      signal: input.signal,
    },
  );
}

export async function submitPartialIntake(input: {
  submissionId: string;
  policyAcknowledged: boolean;
  signal?: AbortSignal;
}): Promise<IntakeSubmission> {
  return apiRequest<IntakeSubmission>(`/api/intake/submissions/${encodeURIComponent(input.submissionId)}/submit-partial`, {
    method: 'POST',
    body: { policyAcknowledged: input.policyAcknowledged },
    signal: input.signal,
  });
}

function buildCreateSubmissionBody(input: {
  submissionKind: 'PatientIntake' | 'ProviderOnboarding';
  formDefinitionId: string;
  visitorSessionId?: string | null;
  currentStep?: string | null;
}): Record<string, string | null | undefined> {
  return {
    submissionKind: input.submissionKind,
    formDefinitionId: input.formDefinitionId,
    currentStep: input.currentStep,
    ...(input.submissionKind === 'PatientIntake' ? {} : { visitorSessionId: input.visitorSessionId }),
  };
}

function mapIntakeFormToVisitorFlow(form: IntakeForm): VisitorFlow {
  return {
    flowKey: form.kind,
    formDefinitionId: form.id,
    formVersion: form.version,
    questions: flattenQuestions(form),
  };
}

function normalizeIntakeForm(form: IntakeFormApiResponse): IntakeForm {
  return {
    id: form.id,
    kind: form.kind ?? form.submissionKind ?? '',
    version: form.version,
    title: form.title ?? form.name ?? '',
    sections: form.sections.map(normalizeIntakeSection),
  };
}

function normalizeIntakeSection(section: IntakeSectionApiResponse): IntakeSection {
  return {
    id: section.id,
    sectionKey: section.sectionKey,
    title: section.title,
    displayOrder: section.displayOrder,
    questions: section.questions.map(normalizeIntakeQuestion),
  };
}

function normalizeIntakeQuestion(question: IntakeQuestionApiResponse): IntakeQuestion {
  return {
    id: question.id,
    questionKey: question.questionKey,
    prompt: question.prompt,
    helpText: question.helpText,
    responseType: question.responseType ?? question.inputType ?? 'Text',
    isRequired: question.isRequired,
    sensitivity: question.sensitivity,
    displayOrder: question.displayOrder,
    options: (question.options ?? []).map(normalizeIntakeQuestionOption),
  };
}

function normalizeIntakeQuestionOption(option: IntakeQuestionOptionApiResponse): IntakeQuestionOption {
  return {
    id: option.id,
    value: option.value ?? option.optionKey ?? '',
    label: option.label,
    displayOrder: option.displayOrder,
  };
}

function flattenQuestions(form: IntakeForm): VisitorFlowQuestion[] {
  return form.sections
    .flatMap((section) => section.questions)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((question, index) => ({
      id: question.id,
      questionKey: question.questionKey,
      stepOrder: index + 1,
      text: question.prompt,
      responseType: question.responseType,
      isRequired: question.isRequired,
      sensitivity: question.sensitivity,
      options: question.options,
    }));
}
