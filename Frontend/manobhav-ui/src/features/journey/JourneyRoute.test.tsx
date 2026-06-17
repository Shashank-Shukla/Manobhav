import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JourneyPage } from './JourneyRoute';

const apiJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type CapturedBodies = {
  answerBodies: Array<Record<string, unknown>>;
  analyticsBodies: Array<Record<string, unknown>>;
};

type ApiRoute = {
  matches: (url: string) => boolean;
  response: (init: RequestInit | undefined, captures: CapturedBodies) => Response;
};

const apiRoutes: ApiRoute[] = [
  {
    matches: (url) => url.includes('/api/public/intake-forms/active'),
    response: () => apiJson(createBackendIntakeForm()),
  },
  {
    matches: (url) => url.endsWith('/api/intake/submissions'),
    response: () => apiJson(createBackendSubmission(), 201),
  },
  {
    matches: (url) => url.includes('/api/intake/submissions/submission-1/answers/'),
    response: (init, captures) => {
      captures.answerBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return apiJson(createBackendSubmission());
    },
  },
  {
    matches: (url) => url.endsWith('/api/visitors/session'),
    response: () => apiJson({ visitorId: 'visitor-1', fullCaptureEnabled: true, retentionDays: 90 }, 201),
  },
  {
    matches: (url) => url.endsWith('/api/visitors/events'),
    response: (init, captures) => {
      captures.analyticsBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(null, { status: 202 });
    },
  },
];

describe('patient journey intake inputs', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders supported backend input types and keeps raw answers out of analytics', async () => {
    const user = userEvent.setup();
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        getApiResponse(String(input), init, answerBodies, analyticsBodies)),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    expect(await screen.findByText(/short check-in/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/short check-in/i), 'Feeling steady');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/share more context/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/share more context/i), 'Sleeping better this week');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/choose one support area/i)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /sleep/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/choose helpful practices/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /journaling/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/rate distress/i)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: /rate distress/i }), { target: { value: '4' } });
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/acknowledge policy/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /i acknowledge/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => expect(answerBodies).toHaveLength(6));
    expect(answerBodies.map((body) => body.answer)).toEqual([
      'Feeling steady',
      'Sleeping better this week',
      'sleep',
      ['journaling'],
      4,
      true,
    ]);
    expect(answerBodies.every((body) => body.isAdvancing === true)).toBe(true);
    expect(window.sessionStorage.getItem('manobhav-active-intake-submission-id')).toBe('submission-1');
    expect(JSON.stringify(analyticsBodies)).not.toContain('Feeling steady');
    expect(JSON.stringify(analyticsBodies)).not.toContain('Sleeping better this week');
  });

  it('marks required visitor questions with a red star and leaves optional questions unmarked', async () => {
    const user = userEvent.setup();
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        getApiResponse(String(input), init, answerBodies, analyticsBodies)),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    const requiredHeading = await screen.findByRole('heading', { name: /short check-in/i });
    const requiredMarker = within(requiredHeading).getByText('*');
    expect(requiredMarker).toHaveClass('text-red-600');

    await user.type(screen.getByLabelText(/short check-in/i), 'Feeling steady');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    const optionalHeading = await screen.findByRole('heading', { name: /share more context/i });
    expect(within(optionalHeading).queryByText('*')).not.toBeInTheDocument();
  });

  it('saves a clicked radio value and advances to the next question without a separate next click', async () => {
    const user = userEvent.setup();
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        getApiResponse(String(input), init, answerBodies, analyticsBodies)),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    expect(await screen.findByText(/short check-in/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/short check-in/i), 'Feeling steady');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(await screen.findByText(/share more context/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/choose one support area/i)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /sleep/i }));

    expect(await screen.findByText(/choose helpful practices/i)).toBeInTheDocument();
    expect(answerBodies.map((body) => body.answer)).toContain('sleep');
  });

  it('requires completing each consent section before enabling submit', async () => {
    const user = userEvent.setup();
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        getApiResponse(String(input), init, answerBodies, analyticsBodies)),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    await completeJourneyQuestions(user);

    expect(await screen.findByRole('heading', { name: /ready to share/i })).toBeInTheDocument();
    expect(screen.queryByText(/I acknowledge the intake policies/i)).not.toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /read terms and consent/i }));
    expect(await screen.findByRole('dialog', { name: /consent, policies & confidentiality/i })).toBeInTheDocument();
    expect(screen.getByText(/API-provided confidentiality copy/i)).toBeInTheDocument();
    expect(screen.queryByText(/50-minute sessions are standard/i)).not.toBeInTheDocument();

    let continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /section 5 complete/i }));
    expect(continueButton).toBeEnabled();
    await user.click(continueButton);

    expect(await screen.findByRole('heading', { name: /crisis and emergency support/i })).toBeInTheDocument();
    expect(screen.getByText(/API-provided crisis hotline copy/i)).toBeInTheDocument();
    continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /section 6 complete/i }));
    await user.click(continueButton);

    expect(await screen.findByRole('heading', { name: /consent to therapy/i })).toBeInTheDocument();
    expect(screen.getByText(/API-provided therapy consent copy/i)).toBeInTheDocument();
    const finishButton = screen.getByRole('button', { name: /finish consent/i });
    expect(finishButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /section 7 complete/i }));
    expect(finishButton).toBeEnabled();
    await user.click(finishButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(submitButton).toBeEnabled();
  });

  it('keeps submit unavailable when API consent sections are incomplete', async () => {
    const user = userEvent.setup();
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/public/intake-forms/active')) {
          return apiJson(createBackendIntakeForm({ consentSectionNumbers: [5, 7] }));
        }

        return getApiResponse(url, init, answerBodies, analyticsBodies);
      }),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    await completeJourneyQuestions(user);

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /read terms and consent/i }));

    expect(await screen.findByRole('dialog', { name: /consent terms unavailable/i })).toBeInTheDocument();
    expect(screen.getByText(/consent terms are temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/50-minute sessions are standard/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /section 5 complete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finish consent/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(submitButton).toBeDisabled();
  });

  it('continues after a required answer save when optional visitor analytics fails', async () => {
    const user = userEvent.setup();
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/visitors/events')) {
          analyticsBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
          return apiJson({ title: 'Full visitor event capture is not enabled.' }, 400);
        }

        return getApiResponse(url, init, answerBodies, analyticsBodies);
      }),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    expect(await screen.findByText(/short check-in/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/short check-in/i), 'Feeling steady');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    expect(await screen.findByText(/share more context/i)).toBeInTheDocument();
    expect(screen.queryByText(/visitor event failed/i)).not.toBeInTheDocument();
    expect(answerBodies).toHaveLength(1);
  });

  it('deduplicates repeated saves for the same journey step and includes a stable step id', async () => {
    const answerBodies: Array<Record<string, unknown>> = [];
    const analyticsBodies: Array<Record<string, unknown>> = [];
    const pendingAnswerResponses: Array<() => void> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/intake/submissions/submission-1/answers/')) {
          answerBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
          return new Promise<Response>((resolve) => {
            pendingAnswerResponses.push(() => resolve(apiJson(createBackendSubmission())));
          });
        }

        return getApiResponse(url, init, answerBodies, analyticsBodies);
      }),
    );

    render(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    expect(await screen.findByText(/short check-in/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/short check-in/i), { target: { value: 'Feeling steady' } });
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => expect(answerBodies).toHaveLength(1));
    expect(answerBodies[0]).toEqual(expect.objectContaining({ stepId: 'q-1' }));

    pendingAnswerResponses.forEach((resolve) => resolve());
    expect(await screen.findByText(/share more context/i)).toBeInTheDocument();
  });
});

async function completeJourneyQuestions(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByText(/short check-in/i)).toBeInTheDocument();
  await user.type(screen.getByLabelText(/short check-in/i), 'Feeling steady');
  await user.click(screen.getByRole('button', { name: /next question/i }));

  expect(await screen.findByText(/share more context/i)).toBeInTheDocument();
  await user.type(screen.getByLabelText(/share more context/i), 'Sleeping better this week');
  await user.click(screen.getByRole('button', { name: /next question/i }));

  expect(await screen.findByText(/choose one support area/i)).toBeInTheDocument();
  await user.click(screen.getByRole('radio', { name: /sleep/i }));

  expect(await screen.findByText(/choose helpful practices/i)).toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: /journaling/i }));
  await user.click(screen.getByRole('button', { name: /next question/i }));

  expect(await screen.findByText(/rate distress/i)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('slider', { name: /rate distress/i }), { target: { value: '4' } });
  await user.click(screen.getByRole('button', { name: /next question/i }));

  expect(await screen.findByText(/acknowledge policy/i)).toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: /i acknowledge/i }));
  await user.click(screen.getByRole('button', { name: /next question/i }));
}

function getApiResponse(
  url: string,
  init: RequestInit | undefined,
  answerBodies: Array<Record<string, unknown>>,
  analyticsBodies: Array<Record<string, unknown>>,
): Response {
  const captures = { answerBodies, analyticsBodies };
  return apiRoutes.find((route) => route.matches(url))?.response(init, captures) ?? apiJson({ title: 'Not found' }, 404);
}

function createBackendSubmission() {
  return {
    id: 'submission-1',
    submissionKind: 'PatientIntake',
    status: 'Draft',
    currentStep: 'short_check_in',
    formDefinitionId: 'form-1',
    formVersion: 1,
    visitorSessionId: 'visitor-1',
    userId: null,
  };
}

function createBackendIntakeForm(options: { consentSectionNumbers?: number[] } = {}) {
  const consentSectionNumbers = new Set(options.consentSectionNumbers ?? [5, 6, 7]);
  return {
    id: 'form-1',
    submissionKind: 'PatientIntake',
    name: 'Patient Intake',
    version: 1,
    sections: [
      {
        id: 'section-1',
        sectionKey: 'patient-flow',
        title: 'Patient flow',
        displayOrder: 1,
        isRequired: true,
        questions: [
          createQuestion('q-1', 'short_check_in', 'Short check-in', 'Text'),
          createQuestion('q-2', 'context', 'Share more context', 'Textarea', [], false),
          createQuestion('q-3', 'support_area', 'Choose one support area', 'SingleChoice', [
            ['sleep', 'Sleep'],
            ['stress', 'Stress'],
          ]),
          createQuestion('q-4', 'practices', 'Choose helpful practices', 'MultiChoice', [
            ['journaling', 'Journaling'],
            ['breathing', 'Breathing'],
          ]),
          createQuestion('q-5', 'distress', 'Rate distress', 'Scale'),
          createQuestion('q-6', 'policy', 'Acknowledge policy', 'Acknowledgement'),
        ],
      },
      ...(consentSectionNumbers.has(5) ? [{
        id: 'section-5',
        sectionKey: 'consent_policies_confidentiality',
        title: 'Consent, Policies & Confidentiality',
        description: 'API-provided confidentiality copy.\nAPI-provided appointment policy copy.',
        displayOrder: 5,
        isRequired: true,
        questions: [],
      }] : []),
      ...(consentSectionNumbers.has(6) ? [{
        id: 'section-6',
        sectionKey: 'emergency_disclaimer',
        title: 'Crisis and Emergency Support',
        description: 'API-provided crisis hotline copy.',
        displayOrder: 6,
        isRequired: true,
        questions: [],
      }] : []),
      ...(consentSectionNumbers.has(7) ? [{
        id: 'section-7',
        sectionKey: 'consent_to_therapy',
        title: 'Consent to Therapy',
        description: 'API-provided therapy consent copy.',
        displayOrder: 7,
        isRequired: true,
        questions: [],
      }] : []),
    ],
  };
}

function createQuestion(
  id: string,
  questionKey: string,
  prompt: string,
  inputType: string,
  options: string[][] = [],
  isRequired = true,
) {
  return {
    id,
    questionKey,
    prompt,
    helpText: null,
    inputType,
    displayOrder: Number(id.replace('q-', '')),
    isRequired,
    sensitivity: 'Personal',
    options: options.map(([optionKey, label], index) => ({
      id: `${id}-option-${index}`,
      optionKey,
      label,
      displayOrder: index + 1,
    })),
  };
}
