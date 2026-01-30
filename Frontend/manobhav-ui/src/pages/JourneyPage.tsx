import { useMemo, useRef, useState } from 'react';
import type { WheelEvent, CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
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
  const [current, setCurrent] = useState(0); // includes submit step
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const lastScrollTs = useRef(0);

  const totalSteps = questions.length + 1; // final step = submit
  const atFirst = current === 0;
  const atLast = current === totalSteps - 1;

  const goPrev = () => !atFirst && setCurrent((i) => i - 1);
  const goNext = () => !atLast && setCurrent((i) => i + 1);

  const onChange = (val: string) => {
    if (current >= questions.length) return;
    const next = [...answers];
    next[current] = val;
    setAnswers(next);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastScrollTs.current < 320) return; // throttle to one step
    lastScrollTs.current = now;
    if (e.deltaY > 0) goNext();
    if (e.deltaY < 0) goPrev();
  };

  const floatingLeaves = useMemo(() => {
    const count = Math.floor(Math.random() * 5) + 3; // 3-7 leaves
    return Array.from({ length: count }).map(() => ({
      top: `${10 + Math.random() * 70}%`,
      left: `${5 + Math.random() * 80}%`,
      duration: `${10 + Math.random() * 6}s`,
      delay: `${Math.random() * 2}s`,
      driftX: Math.random() * 16 - 8,
      driftY: Math.random() * 16 - 8,
      size: 64 + Math.random() * 24,
    }));
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[var(--bg-gradient)] text-[color:var(--text-color)]"
      onWheel={handleWheel}
    >
      {/* floating leaves */}
      {floatingLeaves.map((leaf, idx) => (
        <svg
          key={idx}
          viewBox="0 0 80 120"
          className="absolute opacity-55 animate-float-sway"
          style={{
            top: leaf.top,
            left: leaf.left,
            width: leaf.size,
            height: leaf.size,
            animationDuration: leaf.duration,
            animationDelay: leaf.delay,
            '--drift-x': `${leaf.driftX}px`,
            '--drift-y': `${leaf.driftY}px`,
          } as CSSProperties}
        >
          <path
            d="M40 5c10 20 25 40 30 60s-2 40-20 45-40-8-45-28 7-48 35-77Z"
            fill="#9CAF88"
          />
        </svg>
      ))}

      <div className="absolute top-6 left-6 z-20">
        <Logo onClick={onBackHome} />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 animate-in fade-in">
        <div className="flex gap-2 mb-8 justify-center">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`w-10 h-2 rounded-full transition-all ${idx === current ? 'bg-[#9CAF88]' : 'bg-gray-200/70'}`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={goPrev}
            disabled={atFirst}
            className="p-3 rounded-full bg-white/70 backdrop-blur-xl shadow-2xl text-gray-600 disabled:opacity-30 hover:-translate-y-0.5 transition transform-gpu drop-shadow-xl"
            aria-label="Previous question"
          >
            <ArrowUp size={22} />
          </button>

          <div className="w-full max-w-2xl bg-white/92 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 p-10 min-h-[240px] flex items-center justify-center">
            {current < questions.length ? (
              <div className="w-full space-y-4">
                <Text variant="h3" className="text-center">{questions[current].text}</Text>
                <input
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg outline-none focus:border-[#9CAF88] focus:ring-2 focus:ring-[#9CAF88]/30 bg-white/85"
                  value={answers[current]}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Type your response..."
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <Text variant="h3" className="text-center">Ready to share?</Text>
                <Button variant="primary" onClick={onBackHome}>Submit</Button>
              </div>
            )}
          </div>

          <button
            onClick={goNext}
            disabled={atLast}
            className="p-3 rounded-full bg-white/70 backdrop-blur-xl shadow-2xl text-gray-600 disabled:opacity-30 hover:translate-y-0.5 transition transform-gpu drop-shadow-xl"
            aria-label="Next question"
          >
            <ArrowDown size={22} />
          </button>
        </div>
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
