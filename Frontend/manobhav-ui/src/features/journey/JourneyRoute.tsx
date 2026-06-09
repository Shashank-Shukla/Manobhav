import { useEffect, useRef, useState } from 'react';
import type { WheelEvent, CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';
import { Logo } from '../../shared/Logo';
import { getVisitorFlow, type VisitorFlowQuestion } from '../public-data';
import { recordVisitorEvent } from '../visitor-analytics';

type JourneyPageProps = {
  onBackHome: () => void;
  onFinish: () => void;
};

type FlowStatus = 'loading' | 'ready' | 'empty' | 'error';

export function JourneyPage({ onBackHome, onFinish }: JourneyPageProps) {
  const [questions, setQuestions] = useState<VisitorFlowQuestion[]>([]);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('loading');
  const [current, setCurrent] = useState(0); // includes submit step
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [isSavingStep, setIsSavingStep] = useState(false);
  const currentStartedAtRef = useRef(0);
  const lastScrollTs = useRef(0);

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
      await recordVisitorEvent({
        eventType: 'journey.submitted',
        route: '/journey',
        targetKey: 'submit',
        properties: {
          questionCount: questions.length,
          answeredCount: questions.filter((question) => answers[question.id]?.trim()).length,
        },
      });
      onFinish();
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Unable to submit journey metrics.');
    }
  };

  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onChange = (val: string) => {
    if (!isQuestionStep(current, questions.length)) return;
    const question = questions[current];
    setAnswers((items) => ({ ...items, [question.id]: val }));
  };

  useEffect(() => {
    const controller = new AbortController();
    getVisitorFlow(controller.signal)
      .then((flow) => {
        setQuestions(flow.questions);
        setFlowStatus(flow.questions.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        setQuestions([]);
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

  const saveQuestionAnswer = async (action: string): Promise<boolean> => {
    const question = getCurrentQuestion(questions, current);
    if (!question) return true;

    setIsSavingStep(true);
    setSaveError('');
    const result = await tryRecordQuestionAnswer(question, answers[question.id] ?? '', action, currentStartedAtRef.current);
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
          onSubmit={submitJourney}
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
  onSubmit,
  questions,
  saveError,
  totalSteps,
}: {
  answers: Record<string, string>;
  atFirst: boolean;
  atLast: boolean;
  current: number;
  flowStatus: FlowStatus;
  isSavingStep: boolean;
  onChange: (value: string) => void;
  onNext: () => Promise<void>;
  onPrevious: () => void;
  onSubmit: () => Promise<void>;
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
          onSubmit={onSubmit}
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
  onSubmit,
  questions,
  saveError,
}: {
  answers: Record<string, string>;
  current: number;
  isSavingStep: boolean;
  onChange: (value: string) => void;
  onNext: () => Promise<void>;
  onSubmit: () => Promise<void>;
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
        onSubmit={onSubmit}
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
  onSubmit,
  questions,
  saveError,
}: {
  answers: Record<string, string>;
  current: number;
  isSavingStep: boolean;
  onChange: (value: string) => void;
  onNext: () => Promise<void>;
  onSubmit: () => Promise<void>;
  questions: VisitorFlowQuestion[];
  saveError: string;
}) {
  const question = getCurrentQuestion(questions, current);
  if (!question) {
    return <SubmitStep isSavingStep={isSavingStep} onSubmit={onSubmit} saveError={saveError} />;
  }

  return (
    <QuestionStep
      answer={answers[question.id] ?? ''}
      onChange={onChange}
      onNext={onNext}
      question={question}
      saveError={saveError}
    />
  );
}

function QuestionStep({
  answer,
  onChange,
  onNext,
  question,
  saveError,
}: {
  answer: string;
  onChange: (value: string) => void;
  onNext: () => Promise<void>;
  question: VisitorFlowQuestion;
  saveError: string;
}) {
  return (
    <div key={question.id} className="w-full space-y-4 animate-fade-slide">
      <Text variant="h3" className="text-left">{question.text}</Text>
      <input
        className="w-full bg-transparent border-0 border-b-2 border-b-[#9CAF88] rounded-none px-1 pb-3 text-lg outline-none focus:ring-0 focus:border-b-[#7A8C6A]"
        value={answer}
        onChange={(event) => onChange(event.target.value)}
        placeholder="How do you feel about that?"
        autoFocus
        onKeyDown={(event) => handleQuestionInputKeyDown(event, onNext)}
      />
      <SaveErrorMessage message={saveError} />
    </div>
  );
}

function SubmitStep({
  isSavingStep,
  onSubmit,
  saveError,
}: {
  isSavingStep: boolean;
  onSubmit: () => Promise<void>;
  saveError: string;
}) {
  return (
    <div className="w-full flex flex-col items-center gap-4">
      <Text variant="h3" className="text-center">Ready to share?</Text>
      <SaveErrorMessage message={saveError} />
      <Button variant="primary" onClick={() => void onSubmit()}>
        {isSavingStep ? 'Saving...' : 'Submit'}
      </Button>
    </div>
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
  question: VisitorFlowQuestion,
  response: string,
  action: string,
  startedAtMs: number,
): Promise<{ saved: boolean; errorMessage: string }> {
  try {
    await recordVisitorEvent({
      eventType: 'journey.question.answered',
      route: '/journey',
      targetKey: question.id,
      properties: {
        questionId: question.id,
        stepOrder: question.stepOrder,
        response,
        responseLength: response.length,
        timeToAnswerMs: getNowMs() - startedAtMs,
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
