import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import type { WheelEvent } from 'react';
import questionsData from '../assets/journey-questions.json';
import { Text } from '../shared/primitives/Text';
import { Button } from '../shared/primitives/Button';
import { Logo } from '../shared/Logo';

type Question = { id: number; text: string };

type JourneyPageProps = {
  onBackHome: () => void;
};

export function JourneyPage({ onBackHome }: JourneyPageProps) {
  const questions = useMemo(() => questionsData as Question[], []);
  const [current, setCurrent] = useState(0); // includes final submit step
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));

  const totalSteps = questions.length + 1; // last step is submit card
  const atFirst = current === 0;
  const atLast = current === totalSteps - 1;

  const goPrev = () => !atFirst && setCurrent((i) => i - 1);
  const goNext = () => !atLast && setCurrent((i) => i + 1);

  const onChange = (val: string) => {
    const next = [...answers];
    if (current < questions.length) {
      next[current] = val;
    }
    setAnswers(next);
  };

  const onSubmit = () => {
    // submit placeholder
    onBackHome();
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 0) {
      goNext();
    } else if (e.deltaY < 0) {
      goPrev();
    }
  };

  const floatingLeaves = [
    { top: '12%', left: '8%', delay: '0s', duration: '8s' },
    { top: '28%', right: '6%', delay: '1s', duration: '10s' },
    { bottom: '18%', left: '20%', delay: '2s', duration: '9s' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-gradient)] text-[color:var(--text-color)]" onWheel={handleWheel}>
      {/* floating leaves */}
      {floatingLeaves.map((pos, idx) => (
        <svg
          key={idx}
          viewBox="0 0 80 120"
          className="absolute w-12 h-12 opacity-50 animate-float-sway"
          style={{
            ...pos,
            animationDuration: pos.duration,
            animationDelay: pos.delay,
          }}
        >
          <path
            d="M40 5c10 20 25 40 30 60s-2 40-20 45-40-8-45-28 7-48 35-77Z"
            fill="#9CAF88"
          />
        </svg>
      ))}

      <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in">
        <div className="flex items-center gap-3 mb-10">
          <Logo onClick={onBackHome} />
        </div>

        <div className="flex gap-2 mb-10 justify-center">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`w-10 h-2 rounded-full transition-all ${idx === current ? 'bg-[#9CAF88]' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={goPrev}
            disabled={atFirst}
            className="p-3 rounded-full bg-white/80 border border-gray-200 shadow-sm text-gray-600 disabled:opacity-50 hover:-translate-y-0.5 transition"
            aria-label="Previous question"
          >
            <ArrowUp size={18} />
          </button>

          <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-100 p-10 min-h-[220px] flex items-center justify-center">
            {current < questions.length ? (
              <div className="w-full space-y-4">
                <Text variant="h3" className="text-center">{questions[current].text}</Text>
                <input
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg outline-none focus:border-[#9CAF88] focus:ring-2 focus:ring-[#9CAF88]/30"
                  value={answers[current]}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Type your response..."
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <Text variant="h3" className="text-center">Ready to share?</Text>
                <Button variant="primary" onClick={onSubmit}>Submit</Button>
              </div>
            )}
          </div>

          <button
            onClick={goNext}
            disabled={atLast}
            className="p-3 rounded-full bg-white/80 border border-gray-200 shadow-sm text-gray-600 disabled:opacity-50 hover:translate-y-0.5 transition"
            aria-label="Next question"
          >
            <ArrowDown size={18} />
          </button>
        </div>

        <div className="flex justify-end mt-10">
          <Button variant="secondary" onClick={onBackHome} className="flex items-center gap-2">
            <ArrowLeft size={18} />
            Back to Home
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes float-sway {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-12px) translateX(6px); }
          100% { transform: translateY(0) translateX(0); }
        }
        .animate-float-sway {
          animation: float-sway var(--dur, 9s) ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
