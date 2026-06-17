import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/apiClient';
import {
  createIntakeSubmission,
  getActiveIntakeForm,
  getVisitorFlow,
  saveIntakeAnswer,
  signIntakeConsent,
} from './publicContentApi';

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe('public intake API contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes the backend intake DTO shape for the journey client', async () => {
    const fetchMock = vi.fn<FetchHandler>(async () => Response.json(createBackendIntakeForm()));
    vi.stubGlobal('fetch', fetchMock);

    const form = await getActiveIntakeForm('PatientIntake');
    const flow = await getVisitorFlow();

    expect(form.kind).toBe('PatientIntake');
    expect(form.title).toBe('Patient Intake');
    expect(form.sections[1].description).toBe('API section description');
    expect(form.sections[0].questions[0].responseType).toBe('Text');
    expect(form.sections[0].questions[0].options[0].value).toBe('sleep_yes');
    expect(flow.flowKey).toBe('PatientIntake');
    expect(flow.consentSections).toEqual([
      {
        sectionNumber: 5,
        title: 'Consent, Policies & Confidentiality',
        items: ['API consent line one.', 'API consent line two.'],
      },
      {
        sectionNumber: 6,
        title: 'Crisis and Emergency Support',
        items: ['API crisis line one.', 'API crisis line two.'],
      },
      {
        sectionNumber: 7,
        title: 'Consent to Therapy',
        items: ['API therapy consent line.'],
      },
    ]);
    expect(flow.questions[0]).toEqual(
      expect.objectContaining({
        questionKey: 'sleep_quality',
        responseType: 'Text',
        text: 'How has your sleep been?',
      }),
    );
  });

  it('saves answers through the encoded backend intake answer contract', async () => {
    const fetchMock = vi.fn<FetchHandler>(async () => Response.json(createBackendSubmission()));
    vi.stubGlobal('fetch', fetchMock);

    await saveIntakeAnswer({
      submissionId: 'submission/1',
      questionKey: 'sleep quality?',
      answer: 'Sleeping better',
      currentStep: 'sleep_quality',
      timeToAnswerMs: 12.6,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/intake/submissions/submission%2F1/answers/sleep%20quality%3F');
    expect(init).toMatchObject({ method: 'PUT', credentials: 'include' });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      answer: 'Sleeping better',
      currentStep: 'sleep_quality',
      timeToAnswerMs: 13,
    });
  });

  it('does not send browser-supplied visitor IDs for patient intake creation', async () => {
    const fetchMock = vi.fn<FetchHandler>(async () =>
      Response.json(createBackendSubmission(), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createIntakeSubmission({
      submissionKind: 'PatientIntake',
      formDefinitionId: 'form-1',
      visitorSessionId: 'browser-controlled-id',
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('visitorSessionId');
  });

  it('can mark answer saves as advancing for required backend validation', async () => {
    const fetchMock = vi.fn<FetchHandler>(async () => Response.json(createBackendSubmission()));
    vi.stubGlobal('fetch', fetchMock);

    await saveIntakeAnswer({
      submissionId: 'submission-1',
      questionKey: 'sleep_quality',
      answer: ['sleep_yes'],
      currentStep: 'sleep_quality',
      isAdvancing: true,
      timeToAnswerMs: 1250,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      answer: ['sleep_yes'],
      currentStep: 'sleep_quality',
      isAdvancing: true,
      timeToAnswerMs: 1250,
    });
  });

  it('signs consent through the backend consent endpoint with typed name', async () => {
    const fetchMock = vi.fn<FetchHandler>(async () => Response.json(createBackendSubmission()));
    vi.stubGlobal('fetch', fetchMock);

    await signIntakeConsent({
      submissionId: 'submission/1',
      consentType: 'PatientIntake',
      policyVersion: 1,
      accepted: true,
      typedName: 'Asha Mehta',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/intake/submissions/submission%2F1/consent');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      consentType: 'PatientIntake',
      policyVersion: 1,
      accepted: true,
      typedName: 'Asha Mehta',
    });
  });

  it('surfaces API failures when the active intake form is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ title: 'Unavailable' }, { status: 503 })));

    let failure: unknown;
    try {
      await getActiveIntakeForm('PatientIntake');
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 503 });
  });
});

function createBackendIntakeForm() {
  return {
    id: 'form-1',
    submissionKind: 'PatientIntake',
    name: 'Patient Intake',
    version: 2,
    sections: [
      {
        id: 'section-1',
        sectionKey: 'sleep',
        title: 'Sleep',
        description: null,
        displayOrder: 1,
        isRequired: true,
        questions: [
          {
            id: 'question-1',
            questionKey: 'sleep_quality',
            prompt: 'How has your sleep been?',
            helpText: null,
            inputType: 'Text',
            displayOrder: 1,
            isRequired: true,
            sensitivity: 'Personal',
            options: [
              {
                id: 'option-1',
                optionKey: 'sleep_yes',
                label: 'Sleeping well',
                displayOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: 'section-2',
        sectionKey: 'support',
        title: 'Support',
        description: 'API section description',
        displayOrder: 2,
        isRequired: false,
        questions: [],
      },
      {
        id: 'section-5',
        sectionKey: 'consent_policies_confidentiality',
        title: 'Consent, Policies & Confidentiality',
        description: 'API consent line one.\nAPI consent line two.',
        displayOrder: 5,
        isRequired: true,
        questions: [],
      },
      {
        id: 'section-6',
        sectionKey: 'emergency_disclaimer',
        title: 'Crisis and Emergency Support',
        description: 'API crisis line one.\nAPI crisis line two.',
        displayOrder: 6,
        isRequired: true,
        questions: [],
      },
      {
        id: 'section-7',
        sectionKey: 'consent_to_therapy',
        title: 'Consent to Therapy',
        description: 'API therapy consent line.',
        displayOrder: 7,
        isRequired: true,
        questions: [],
      },
    ],
  };
}

function createBackendSubmission() {
  return {
    id: 'submission-1',
    submissionKind: 'PatientIntake',
    status: 'Draft',
    currentStep: 'sleep_quality',
    formDefinitionId: 'form-1',
    formVersion: 2,
    visitorSessionId: null,
    userId: null,
  };
}
