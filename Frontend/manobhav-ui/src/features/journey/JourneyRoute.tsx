import { useEffect, useRef, useState } from 'react';
import type { WheelEvent, CSSProperties } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';
import { Logo } from '../../shared/Logo';
import { ConsentDialog } from './ConsentDialog';
import {
  createIntakeSubmission,
  getVisitorFlow,
  saveIntakeAnswer,
  signIntakeConsent,
  submitPartialIntake,
  type IntakeConsentSection,
  type IntakeAnswerValue,
  type VisitorFlowQuestion,
} from '../public-data';
import { recordVisitorEvent } from '../visitor-analytics';

type JourneyPageProps = {
  onBackHome: () => void;
  onFinish: () => void;
};

type FlowStatus = 'loading' | 'ready' | 'empty' | 'error';
type JourneyAnswer = IntakeAnswerValue;

export function JourneyPage({ onBackHome, onFinish }: JourneyPageProps) {
  const [questions, setQuestions] = useState<VisitorFlowQuestion[]>([]);
  const [consentSections, setConsentSections] = useState<IntakeConsentSection[]>([]);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('loading');
  const [current, setCurrent] = useState(0); // includes submit step
  const [answers, setAnswers] = useState<Record<string, JourneyAnswer>>({});
  const [saveError, setSaveError] = useState('');
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [consentPolicyVersion, setConsentPolicyVersion] = useState(1);
  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);
  const currentStartedAtRef = useRef(0);
  const lastScrollTs = useRef(0);
  const savingStepRef = useRef(false);
  const savedStepSignaturesRef = useRef(new Set<string>());

  const totalSteps = questions.length + 1; // final step = submit
  const atFirst = current === 0;
  const atLast = current === totalSteps - 1;

  const goPrev = () => {
    if (!atFirst) {
      setSaveError('');
      currentStartedAtRef.current = getNowMs();
      setCurrent((i) => i - 1);
    }
  };

  const goNext = async () => {
    if (!canAdvanceJourney(atLast, isSavingStep)) return;
    if (isQuestionStep(current, questions.length)) {
      const saved = await saveQuestionAnswer('next');
      if (!saved) return;
    }

    currentStartedAtRef.current = getNowMs();
    setCurrent((i) => i + 1);
  };

  const submitJourney = async () => {
    if (isSavingStep) return;
    const saved = await saveQuestionAnswer('submit');
    if (!saved) return;

    try {
      await submitPartialIntake({ submissionId, policyAcknowledged });
      await recordVisitorEvent({
        eventType: 'journey.submitted',
        route: '/journey',
        targetKey: 'submit',
        properties: {
          questionCount: questions.length,
          answeredCount: questions.filter((question) => hasJourneyAnswer(answers[question.id], question.responseType)).length,
        },
      });
      onFinish();
    } catch {
      setSaveError('We could not submit your intake just now. Please try again.');
    }
  };

  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onChange = (val: JourneyAnswer) => {
    if (!isQuestionStep(current, questions.length)) return;
    const question = questions[current];
    setAnswers((items) => ({ ...items, [question.id]: val }));
  };

  const onSingleChoiceSelect = async (val: JourneyAnswer) => {
    if (!isQuestionStep(current, questions.length)) return;
    const question = questions[current];
    setAnswers((items) => ({ ...items, [question.id]: val }));

    const saved = await saveQuestionAnswer('single-choice', val);
    if (!saved) return;

    currentStartedAtRef.current = getNowMs();
    setCurrent((i) => i + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadVisitorFlowSession(controller.signal)
      .then((flowSession) => {
        setQuestions(flowSession.questions);
        setConsentSections(flowSession.consentSections);
        setSubmissionId(flowSession.submissionId);
        setConsentPolicyVersion(flowSession.policyVersion);
        setFlowStatus(flowSession.questions.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        setQuestions([]);
        setConsentSections([]);
        setSubmissionId('');
        setConsentPolicyVersion(1);
        setFlowStatus('error');
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (flowStatus !== 'ready' || current >= questions.length) {
      return;
    }

    const question = questions[current];
    currentStartedAtRef.current = getNowMs();
    void recordVisitorEvent({
      eventType: 'journey.step.viewed',
      route: '/journey',
      targetKey: question.id,
      properties: {
        questionId: question.id,
        stepOrder: question.stepOrder,
      },
    }).catch(() => {
      // The answered event is the blocking write; viewed metrics should not trap the visitor on a step.
    });
  }, [current, flowStatus, questions]);

  const saveQuestionAnswer = async (action: string, selectedAnswer?: JourneyAnswer): Promise<boolean> => {
    const question = getCurrentQuestion(questions, current);
    if (!question) return true;
    if (savingStepRef.current) return false;
    if (!submissionId) {
      setSaveError('Unable to store journey response because the intake session is not ready.');
      return false;
    }
    const answer = selectedAnswer ?? getAnswerForSave(answers, question);
    if (question.isRequired && !hasJourneyAnswer(answer, question.responseType)) {
      setSaveError('Please answer this question before continuing.');
      return false;
    }

    const saveSignature = getAnswerSaveSignature(submissionId, question, answer);
    if (savedStepSignaturesRef.current.has(saveSignature)) {
      return true;
    }

    savingStepRef.current = true;
    setIsSavingStep(true);
    setSaveError('');
    const result = await tryRecordQuestionAnswer(
      submissionId,
      question,
      answer,
      action,
      currentStartedAtRef.current,
    );
    if (result.saved) {
      savedStepSignaturesRef.current.add(saveSignature);
    }
    savingStepRef.current = false;
    setIsSavingStep(false);
    setSaveError(result.errorMessage);
    return result.saved;
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    const now = getNowMs();
    if (isScrollThrottled(now, lastScrollTs.current)) return;
    lastScrollTs.current = now;
    moveJourneyByDelta(e.deltaY, goNext, goPrev);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.changedTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndY.current = e.changedTouches[0].clientY;
    const delta = getTouchDelta(touchStartY.current, touchEndY.current);
    if (delta !== null && Math.abs(delta) > 30) moveJourneyByDelta(delta, goNext, goPrev);
    touchStartY.current = null;
    touchEndY.current = null;
  };

  const [floatingLeaves] = useState(() => {
    const randomLeaves = () => {
      const count = Math.floor(Math.random() * 5) + 3; // 3-7 leaves
      return Array.from({ length: count }).map(() => ({
        top: `${10 + Math.random() * 70}%`,
        left: `${5 + Math.random() * 80}%`,
        duration: `${10 + Math.random() * 6}s`,
        delay: `${Math.random() * 2}s`,
        driftX: Math.random() * 16 - 8,
        driftY: Math.random() * 16 - 8,
        size: 72 + Math.random() * 28,
        color: Math.random() > 0.5 ? '#E6EDE8' : '#B0CED6',
      }));
    };
    return randomLeaves();
  });

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[var(--bg-gradient)] text-[color:var(--text-color)]"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* sage tint wash */}
      <div className="pointer-events-none absolute bottom-0 right-0 w-1/2 h-1/2 opacity-20"
        style={{
          background: 'radial-gradient(120% 120% at 100% 100%, rgba(156,175,136,0.7), rgba(156,175,136,0))',
        }}
      />

      {/* floating blobs */}
      {floatingLeaves.map((leaf, idx) => (
        <div
          key={idx}
          className="absolute rounded-full opacity-50 animate-float-sway"
          style={{
            top: leaf.top,
            left: leaf.left,
            width: leaf.size,
            height: leaf.size,
            background: leaf.color,
            animationDuration: leaf.duration,
            animationDelay: leaf.delay,
            '--drift-x': `${leaf.driftX}px`,
            '--drift-y': `${leaf.driftY}px`,
          } as CSSProperties}
        />
      ))}

      <div className="absolute top-6 left-6 z-20">
        <Logo onClick={onBackHome} />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 animate-in fade-in">
        <JourneyContent
          answers={answers}
          atFirst={atFirst}
          atLast={atLast}
          current={current}
          flowStatus={flowStatus}
          isSavingStep={isSavingStep}
          onChange={onChange}
          onNext={goNext}
          onPrevious={goPrev}
          onPolicyChange={setPolicyAcknowledged}
          onSingleChoiceSelect={onSingleChoiceSelect}
          onSubmit={submitJourney}
          policyAcknowledged={policyAcknowledged}
          policyVersion={consentPolicyVersion}
          submissionId={submissionId}
          consentSections={consentSections}
          questions={questions}
          saveError={saveError}
          totalSteps={totalSteps}
        />
      </div>

      <div className="absolute bottom-6 right-6">
        <Button variant="secondary" onClick={onBackHome} className="flex items-center gap-2">
          <ArrowLeft size={18} />
          Back to Home
        </Button>
      </div>

      <style>{`
        @keyframes float-sway {
          0% { transform: translateY(0) translateX(0) rotate(0deg); }
          50% { transform: translateY(var(--drift-y, -14px)) translateX(var(--drift-x, 10px)) rotate(2deg); }
          100% { transform: translateY(0) translateX(0) rotate(0deg); }
        }
        .animate-float-sway {
          animation: float-sway var(--dur, 11s) ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function JourneyContent({
  answers,
  atFirst,
  atLast,
  current,
  flowStatus,
  isSavingStep,
  onChange,
  onNext,
  onPrevious,
  onPolicyChange,
  onSingleChoiceSelect,
  onSubmit,
  policyAcknowledged,
  policyVersion,
  submissionId,
  consentSections,
  questions,
  saveError,
  totalSteps,
}: {
  answers: Record<string, JourneyAnswer>;
  atFirst: boolean;
  atLast: boolean;
  current: number;
  flowStatus: FlowStatus;
  isSavingStep: boolean;
  onChange: (value: JourneyAnswer) => void;
  onNext: () => Promise<void>;
  onPrevious: () => void;
  onPolicyChange: (checked: boolean) => void;
  onSingleChoiceSelect: (value: JourneyAnswer) => Promise<void>;
  onSubmit: () => Promise<void>;
  policyAcknowledged: boolean;
  policyVersion: number;
  submissionId: string;
  consentSections: IntakeConsentSection[];
  questions: VisitorFlowQuestion[];
  saveError: string;
  totalSteps: number;
}) {
  if (flowStatus !== 'ready') {
    return <FlowStatusMessage status={flowStatus} />;
  }

  return (
    <>
      <JourneyProgress current={current} questionCount={questions.length} totalSteps={totalSteps} />
      <JourneyStepControls atFirst={atFirst} atLast={atLast} isSavingStep={isSavingStep} onNext={onNext} onPrevious={onPrevious}>
        <JourneyStepCard
          answers={answers}
          current={current}
          isSavingStep={isSavingStep}
          onChange={onChange}
          onNext={onNext}
          onPolicyChange={onPolicyChange}
          onSingleChoiceSelect={onSingleChoiceSelect}
          onSubmit={onSubmit}
          policyAcknowledged={policyAcknowledged}
          policyVersion={policyVersion}
          submissionId={submissionId}
          consentSections={consentSections}
          questions={questions}
          saveError={saveError}
        />
      </JourneyStepControls>
    </>
  );
}

function FlowStatusMessage({ status }: { status: Exclude<FlowStatus, 'ready'> }) {
  const message = getFlowStatusMessage(status);
  const className = getFlowStatusClassName(status);
  return <div className={className}>{message}</div>;
}

function JourneyProgress({ current, questionCount, totalSteps }: { current: number; questionCount: number; totalSteps: number }) {
  return (
    <>
      <div className="flex items-center gap-4 mb-8 w-full justify-center">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
          style={{ backgroundColor: '#9CAF88' }}
        >
          {Math.min(current, questionCount)}
        </div>
        <div className="hidden md:flex items-center gap-2 max-w-[40vw]">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <ProgressSegment current={current} index={idx} key={idx} />
          ))}
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ backgroundColor: '#E5E7EB', color: '#4B5563' }}
        >
          {questionCount}
        </div>
      </div>

      <div className="md:hidden w-full px-6 mb-4 sticky top-0">
        <div className="h-2 w-full bg-gray-200/70 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#9CAF88] transition-all duration-300"
            style={{ width: `${((current + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

function ProgressSegment({ current, index }: { current: number; index: number }) {
  const className = index <= current ? 'bg-[#9CAF88]' : 'bg-gray-200/70';
  return <div className={`w-10 h-2 rounded-full transition-all ${className}`} />;
}

function JourneyStepControls({
  atFirst,
  atLast,
  children,
  isSavingStep,
  onNext,
  onPrevious,
}: {
  atFirst: boolean;
  atLast: boolean;
  children: React.ReactNode;
  isSavingStep: boolean;
  onNext: () => Promise<void>;
  onPrevious: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={onPrevious}
        disabled={atFirst}
        className="p-3 rounded-full bg-white/70 backdrop-blur-xl shadow-2xl text-gray-600 disabled:opacity-30 hover:-translate-y-0.5 transition transform-gpu drop-shadow-xl border-0"
        aria-label="Previous question"
      >
        <ArrowUp size={22} />
      </button>
      {children}
      <button
        onClick={() => void onNext()}
        disabled={!canAdvanceJourney(atLast, isSavingStep)}
        className="p-3 rounded-full bg-white/70 backdrop-blur-xl shadow-2xl text-gray-600 disabled:opacity-30 hover:translate-y-0.5 transition transform-gpu drop-shadow-xl border-0"
        aria-label="Next question"
      >
        <ArrowDown size={22} />
      </button>
    </div>
  );
}

function JourneyStepCard({
  answers,
  current,
  isSavingStep,
  onChange,
  onNext,
  onPolicyChange,
  onSingleChoiceSelect,
  onSubmit,
  policyAcknowledged,
  policyVersion,
  submissionId,
  consentSections,
  questions,
  saveError,
}: {
  answers: Record<string, JourneyAnswer>;
  current: number;
  isSavingStep: boolean;
  onChange: (value: JourneyAnswer) => void;
  onNext: () => Promise<void>;
  onPolicyChange: (checked: boolean) => void;
  onSingleChoiceSelect: (value: JourneyAnswer) => Promise<void>;
  onSubmit: () => Promise<void>;
  policyAcknowledged: boolean;
  policyVersion: number;
  submissionId: string;
  consentSections: IntakeConsentSection[];
  questions: VisitorFlowQuestion[];
  saveError: string;
}) {
  return (
    <div
      className="bg-white/70 rounded-3xl shadow-2xl border border-white/30 flex items-center justify-center transition-all duration-300"
      style={{ width: '70vw', minWidth: '320px', maxWidth: '1100px', height: '50vh', minHeight: '260px', maxHeight: '620px', padding: '2.5rem 3em' }}
    >
      <JourneyStepCardBody
        answers={answers}
        current={current}
        isSavingStep={isSavingStep}
        onChange={onChange}
        onNext={onNext}
        onPolicyChange={onPolicyChange}
        onSingleChoiceSelect={onSingleChoiceSelect}
        onSubmit={onSubmit}
        policyAcknowledged={policyAcknowledged}
        policyVersion={policyVersion}
        submissionId={submissionId}
        consentSections={consentSections}
        questions={questions}
        saveError={saveError}
      />
    </div>
  );
}

function JourneyStepCardBody({
  answers,
  current,
  isSavingStep,
  onChange,
  onNext,
  onPolicyChange,
  onSingleChoiceSelect,
  onSubmit,
  policyAcknowledged,
  policyVersion,
  submissionId,
  consentSections,
  questions,
  saveError,
}: {
  answers: Record<string, JourneyAnswer>;
  current: number;
  isSavingStep: boolean;
  onChange: (value: JourneyAnswer) => void;
  onNext: () => Promise<void>;
  onPolicyChange: (checked: boolean) => void;
  onSingleChoiceSelect: (value: JourneyAnswer) => Promise<void>;
  onSubmit: () => Promise<void>;
  policyAcknowledged: boolean;
  policyVersion: number;
  submissionId: string;
  consentSections: IntakeConsentSection[];
  questions: VisitorFlowQuestion[];
  saveError: string;
}) {
  const question = getCurrentQuestion(questions, current);
  if (!question) {
    return (
      <SubmitStep
        isSavingStep={isSavingStep}
        onConsentComplete={onPolicyChange}
        consentSections={consentSections}
        onSubmit={onSubmit}
        policyAcknowledged={policyAcknowledged}
        policyVersion={policyVersion}
        saveError={saveError}
        submissionId={submissionId}
      />
    );
  }

  return (
    <QuestionStep
      answer={getAnswerForSave(answers, question)}
      onChange={onChange}
      onNext={onNext}
      onSingleChoiceSelect={onSingleChoiceSelect}
      question={question}
      saveError={saveError}
    />
  );
}

function QuestionStep({
  answer,
  onChange,
  onNext,
  onSingleChoiceSelect,
  question,
  saveError,
}: {
  answer: JourneyAnswer;
  onChange: (value: JourneyAnswer) => void;
  onNext: () => Promise<void>;
  onSingleChoiceSelect: (value: JourneyAnswer) => Promise<void>;
  question: VisitorFlowQuestion;
  saveError: string;
}) {
  return (
    <div key={question.id} className="w-full space-y-4 animate-fade-slide">
      <Text variant="h3" className="text-left">
        <span>{question.text}</span>
        {question.isRequired && <span aria-hidden="true" className="text-red-600"> *</span>}
      </Text>
      <QuestionInput
        answer={answer}
        onChange={onChange}
        onNext={onNext}
        onSingleChoiceSelect={onSingleChoiceSelect}
        question={question}
      />
      <SaveErrorMessage message={saveError} />
    </div>
  );
}

type QuestionInputProps = {
  answer: JourneyAnswer;
  onChange: (value: JourneyAnswer) => void;
  onNext: () => Promise<void>;
  onSingleChoiceSelect: (value: JourneyAnswer) => Promise<void>;
  question: VisitorFlowQuestion;
};

const questionInputRenderers: Record<string, (props: QuestionInputProps) => ReturnType<typeof renderTextInput>> = {
  acknowledgement: renderAcknowledgementInput,
  multichoice: renderMultiChoiceInput,
  scale: renderScaleInput,
  singlechoice: renderSingleChoiceInput,
  text: renderTextInput,
  textarea: renderTextareaInput,
};

function QuestionInput(props: QuestionInputProps) {
  const renderInput = questionInputRenderers[normalizeInputType(props.question.responseType)] ?? renderTextInput;
  return renderInput(props);
}

function renderTextInput({ answer, onChange, onNext, question }: QuestionInputProps) {
  return (
    <input
      aria-label={question.text}
      autoFocus
      className={getTextInputClassName()}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => handleQuestionInputKeyDown(event, onNext)}
      placeholder="How do you feel about that?"
      value={toTextAnswer(answer)}
    />
  );
}

function renderTextareaInput({ answer, onChange, question }: QuestionInputProps) {
  return (
    <textarea
      aria-label={question.text}
      autoFocus
      className={`${getTextInputClassName()} min-h-28 resize-none`}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Share what feels relevant."
      value={toTextAnswer(answer)}
    />
  );
}

function renderSingleChoiceInput({ answer, onSingleChoiceSelect, question }: QuestionInputProps) {
  return (
    <div aria-label={question.text} className="grid gap-3 sm:grid-cols-2" role="radiogroup">
      {question.options.map((option) => (
        <label className={getChoiceCardClassName(answer === option.value)} key={option.value}>
          <input
            checked={answer === option.value}
            className="sr-only"
            name={question.id}
            onChange={() => void onSingleChoiceSelect(option.value)}
            type="radio"
          />
          <ChoiceMarker selected={answer === option.value} type="radio" />
          <span className="min-w-0 flex-1">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function renderMultiChoiceInput({ answer, onChange, question }: QuestionInputProps) {
  const selectedValues = toMultiChoiceAnswer(answer);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options.map((option) => (
        <label className={getChoiceCardClassName(selectedValues.includes(option.value))} key={option.value}>
          <input
            checked={selectedValues.includes(option.value)}
            className="sr-only"
            onChange={() => onChange(toggleMultiChoiceAnswer(answer, option.value))}
            type="checkbox"
          />
          <ChoiceMarker selected={selectedValues.includes(option.value)} type="checkbox" />
          <span className="min-w-0 flex-1">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function renderScaleInput({ answer, onChange, question }: QuestionInputProps) {
  const value = toScaleAnswer(answer);
  return (
    <div className="space-y-3">
      <input
        aria-label={question.text}
        className="w-full accent-[#9CAF88]"
        max={5}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
      <div className="text-sm font-medium text-gray-700">{value}</div>
    </div>
  );
}

function renderAcknowledgementInput({ answer, onChange }: QuestionInputProps) {
  return (
    <label className={getChoiceCardClassName(answer === true)}>
      <input
        checked={answer === true}
        className="sr-only"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <ChoiceMarker selected={answer === true} type="checkbox" />
      <span className="min-w-0 flex-1">I acknowledge and consent to the terms and conditions.</span>
    </label>
  );
}

function ChoiceMarker({ selected, type }: { selected: boolean; type: 'checkbox' | 'radio' }) {
  const shape = type === 'radio' ? 'rounded-full' : 'rounded-md';
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center border transition ${shape} ${
        selected ? 'border-[#7A8C6A] bg-[#9CAF88] shadow-sm' : 'border-slate-300 bg-white'
      }`}
    >
      <span className={`h-2 w-2 ${type === 'radio' ? 'rounded-full' : 'rounded-[2px]'} bg-white transition ${selected ? 'opacity-100' : 'opacity-0'}`} />
    </span>
  );
}

function SubmitStep({
  consentSections,
  isSavingStep,
  onConsentComplete,
  onSubmit,
  policyAcknowledged,
  policyVersion,
  saveError,
  submissionId,
}: {
  consentSections: IntakeConsentSection[];
  isSavingStep: boolean;
  onConsentComplete: (checked: boolean) => void;
  onSubmit: () => Promise<void>;
  policyAcknowledged: boolean;
  policyVersion: number;
  saveError: string;
  submissionId: string;
}) {
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentError, setConsentError] = useState('');

  const handleConsentComplete = async (typedName: string) => {
    if (!submissionId) {
      throw new Error('Intake session unavailable.');
    }

    await signIntakeConsent({
      submissionId,
      consentType: 'PatientIntake',
      policyVersion: policyVersion || 1,
      accepted: true,
      typedName,
    });
    setConsentError('');
    onConsentComplete(true);
    setConsentDialogOpen(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <Text variant="h3" className="text-center">Ready to share?</Text>
      <p className="max-w-xl text-center text-sm leading-6 text-gray-700">
        Please read the consent terms before submitting your intake.
      </p>
      <button
        className="border-0 bg-transparent p-0 text-sm font-semibold text-[#6F805F] underline underline-offset-4 hover:text-[#4F6144]"
        onClick={() => setConsentDialogOpen(true)}
        type="button"
      >
        Read terms and consent
      </button>
      {policyAcknowledged && <p className="text-sm font-medium text-[#4F6144]">Consent completed.</p>}
      {consentDialogOpen && (
        <ConsentDialog
          onClose={() => setConsentDialogOpen(false)}
          onComplete={async (typedName) => {
            try {
              await handleConsentComplete(typedName);
            } catch {
              setConsentError('We could not save your consent just now. Please try again.');
              throw new Error('Consent save failed.');
            }
          }}
          open={consentDialogOpen}
          sections={consentSections}
        />
      )}
      <SaveErrorMessage message={consentError} />
      <SaveErrorMessage message={saveError} />
      <SubmitButton
        isSavingStep={isSavingStep}
        onSubmit={onSubmit}
        policyAcknowledged={policyAcknowledged}
      />
    </div>
  );
}

function SubmitButton({
  isSavingStep,
  onSubmit,
  policyAcknowledged,
}: {
  isSavingStep: boolean;
  onSubmit: () => Promise<void>;
  policyAcknowledged: boolean;
}) {
  const isConsentIncomplete = !policyAcknowledged;
  const isDisabled = isConsentIncomplete || isSavingStep;
  const wrapperClassName = isConsentIncomplete ? 'inline-flex cursor-not-allowed' : 'inline-flex';
  const buttonClassName = isDisabled
    ? 'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100'
    : '';
  const buttonStyle = isDisabled
    ? { backgroundColor: '#D1D5DB', color: '#4B5563' }
    : undefined;

  return (
    <Tooltip
      arrow
      enterDelay={0}
      placement="bottom"
      title={isConsentIncomplete ? 'Please read and agree to the terms above to continue.' : ''}
    >
      <span className={wrapperClassName} data-testid={isConsentIncomplete ? 'disabled-consent-submit' : undefined}>
        <Button
          className={buttonClassName}
          disabled={isDisabled}
          onClick={() => void onSubmit()}
          style={buttonStyle}
          variant="primary"
        >
          {isSavingStep ? 'Saving...' : 'Submit'}
        </Button>
      </span>
    </Tooltip>
  );
}

function SaveErrorMessage({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm font-medium text-rose-700">{message}</p>;
}

function getFlowStatusMessage(status: Exclude<FlowStatus, 'ready'>): string {
  const messages: Record<Exclude<FlowStatus, 'ready'>, string> = {
    empty: 'No visitor flow questions are configured yet.',
    error: 'Unable to load visitor flow from the API.',
    loading: 'Loading visitor flow from the API...',
  };
  return messages[status];
}

function getFlowStatusClassName(status: Exclude<FlowStatus, 'ready'>): string {
  const statusClass = status === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : status === 'empty'
      ? 'border-gray-200 bg-white text-gray-700'
      : 'border-white/30 bg-white/70 text-gray-600';
  return `rounded-3xl border px-8 py-6 text-sm font-medium shadow-2xl ${statusClass}`;
}

function canAdvanceJourney(atLast: boolean, isSavingStep: boolean): boolean {
  return !atLast && !isSavingStep;
}

function isQuestionStep(current: number, questionCount: number): boolean {
  return current < questionCount;
}

function getCurrentQuestion(questions: VisitorFlowQuestion[], current: number): VisitorFlowQuestion | null {
  return questions[current] ?? null;
}

function isScrollThrottled(now: number, lastScrollTs: number): boolean {
  return now - lastScrollTs < 320;
}

function moveJourneyByDelta(delta: number, goNext: () => Promise<void>, goPrev: () => void): void {
  if (delta > 0) void goNext();
  if (delta < 0) goPrev();
}

function getTouchDelta(touchStartY: number | null, touchEndY: number | null): number | null {
  if (touchStartY === null || touchEndY === null) {
    return null;
  }

  return touchStartY - touchEndY;
}

function handleQuestionInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>, onNext: () => Promise<void>): void {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  void onNext();
}

async function tryRecordQuestionAnswer(
  submissionId: string,
  question: VisitorFlowQuestion,
  response: JourneyAnswer,
  action: string,
  startedAtMs: number,
): Promise<{ saved: boolean; errorMessage: string }> {
  try {
    const timeToAnswerMs = getNowMs() - startedAtMs;
    await saveIntakeAnswer({
      submissionId,
      questionKey: question.questionKey,
      stepId: question.id,
      answer: response,
      currentStep: question.id,
      isAdvancing: true,
      timeToAnswerMs,
    });
    await recordVisitorEvent({
      eventType: 'journey.question.answered',
      route: '/journey',
      targetKey: question.id,
      properties: {
        stepId: question.id,
        questionId: question.id,
        stepOrder: question.stepOrder,
        answered: hasJourneyAnswer(response, question.responseType),
        timeToAnswerMs,
        action,
      },
    });
    return { saved: true, errorMessage: '' };
  } catch (error: unknown) {
    return { saved: false, errorMessage: getJourneySaveErrorMessage(error) };
  }
}

function getJourneySaveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to store journey response.';
}

function getNowMs(): number {
  return Date.now();
}

function getAnswerSaveSignature(submissionId: string, question: VisitorFlowQuestion, answer: JourneyAnswer): string {
  return `${submissionId}:${question.id}:${stableAnswerKey(answer)}`;
}

function stableAnswerKey(answer: JourneyAnswer): string {
  return JSON.stringify(Array.isArray(answer) ? [...answer].sort() : answer);
}

function getConsentPolicyVersion(formVersion: number): number {
  return Number.isFinite(formVersion) && formVersion > 0 ? Math.trunc(formVersion) : 1;
}

async function loadVisitorFlowSession(signal: AbortSignal): Promise<{
  consentSections: IntakeConsentSection[];
  policyVersion: number;
  questions: VisitorFlowQuestion[];
  submissionId: string;
}> {
  const flow = await getVisitorFlow(signal);
  if (flow.questions.length === 0) {
    return { consentSections: flow.consentSections, policyVersion: getConsentPolicyVersion(flow.formVersion), questions: [], submissionId: '' };
  }

  const submission = await createIntakeSubmission({
    submissionKind: 'PatientIntake',
    formDefinitionId: flow.formDefinitionId,
    currentStep: flow.questions[0]?.questionKey ?? null,
    signal,
  });
  rememberActiveIntakeSubmission(submission.id);

  return {
    consentSections: flow.consentSections,
    policyVersion: getConsentPolicyVersion(flow.formVersion),
    questions: flow.questions,
    submissionId: submission.id,
  };
}

const defaultAnswerByType: Record<string, JourneyAnswer> = {
  acknowledgement: false,
  multichoice: [],
  scale: 3,
  singlechoice: '',
  text: '',
  textarea: '',
};

const answerPresenceByType: Record<string, (answer: JourneyAnswer | undefined) => boolean> = {
  acknowledgement: (answer) => answer === true,
  multichoice: (answer) => Array.isArray(answer) && answer.length > 0,
  scale: (answer) => typeof answer === 'number' && Number.isFinite(answer),
  singlechoice: hasAnyJourneyAnswer,
  text: hasAnyJourneyAnswer,
  textarea: hasAnyJourneyAnswer,
};

function getAnswerForSave(answers: Record<string, JourneyAnswer>, question: VisitorFlowQuestion): JourneyAnswer {
  return answers[question.id] ?? getDefaultAnswer(question);
}

function getDefaultAnswer(question: VisitorFlowQuestion): JourneyAnswer {
  return defaultAnswerByType[normalizeInputType(question.responseType)] ?? '';
}

function hasJourneyAnswer(answer: JourneyAnswer | undefined, responseType: string): boolean {
  const hasAnswer = answerPresenceByType[normalizeInputType(responseType)] ?? hasAnyJourneyAnswer;
  return hasAnswer(answer);
}

function hasAnyJourneyAnswer(answer: JourneyAnswer | undefined): boolean {
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === 'string') return answer.trim().length > 0;
  return typeof answer === 'number' || answer === true;
}

function toTextAnswer(answer: JourneyAnswer): string {
  return typeof answer === 'string' ? answer : '';
}

function toMultiChoiceAnswer(answer: JourneyAnswer): string[] {
  return Array.isArray(answer) ? answer : [];
}

function toggleMultiChoiceAnswer(answer: JourneyAnswer, value: string): string[] {
  const values = toMultiChoiceAnswer(answer);
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toScaleAnswer(answer: JourneyAnswer): number {
  return typeof answer === 'number' ? answer : 3;
}

function normalizeInputType(inputType: string): string {
  return inputType.replace(/[-_\s]/g, '').toLowerCase();
}

function getTextInputClassName(): string {
  return 'w-full bg-transparent border-0 border-b-2 border-b-[#9CAF88] rounded-none px-1 pb-3 text-lg outline-none focus:ring-0 focus:border-b-[#7A8C6A]';
}

function getChoiceCardClassName(selected: boolean): string {
  const selectedClassName = 'border-[#9CAF88] bg-[#F1F6EE] text-slate-800 shadow-[0_12px_28px_rgba(156,175,136,0.22)] ring-2 ring-[#9CAF88]/25';
  const idleClassName = 'border-slate-200/80 bg-white/70 text-slate-700 shadow-sm hover:border-[#B0CED6] hover:bg-white hover:shadow-md';
  return `group flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#9CAF88] ${selected ? selectedClassName : idleClassName}`;
}

function rememberActiveIntakeSubmission(submissionId: string): void {
  window.sessionStorage.setItem('manobhav-active-intake-submission-id', submissionId);
}
