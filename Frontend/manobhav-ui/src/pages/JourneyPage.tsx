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
  onFinish: () => void;
};

export function JourneyPage({ onBackHome, onFinish }: JourneyPageProps) {
  const questions = useMemo(() => questionsData as Question[], []);
  const [current, setCurrent] = useState(0); // includes submit step
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const lastScrollTs = useRef(0);

  const totalSteps = questions.length + 1; // final step = submit
  const atFirst = current === 0;
  const atLast = current === totalSteps - 1;

  const goPrev = () => !atFirst && setCurrent((i) => i - 1);
  const goNext = () => !atLast && setCurrent((i) => i + 1);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onChange = (val: string) => {
    if (current >= questions.length) return;
    const next = [...answers];
    next[current] = val;
    setAnswers(next);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastScrollTs.current < 320) return; // throttle to one step
    lastScrollTs.current = now;
    if (e.deltaY > 0) goNext();
    if (e.deltaY < 0) goPrev();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.changedTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndY.current = e.changedTouches[0].clientY;
    if (touchStartY.current === null || touchEndY.current === null) return;
    const delta = touchStartY.current - touchEndY.current;
    if (Math.abs(delta) > 30) {
      if (delta > 0) goNext();
      else goPrev();
    }
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
        <div className="flex items-center gap-4 mb-8 w-full justify-center">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ backgroundColor: '#9CAF88' }}
          >
            {Math.min(current, questions.length)}
          </div>
          <div className="hidden md:flex items-center gap-2 max-w-[40vw]">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`w-10 h-2 rounded-full transition-all ${idx <= current ? 'bg-[#9CAF88]' : 'bg-gray-200/70'}`}
              />
            ))}
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: '#E5E7EB', color: '#4B5563' }}
          >
            {questions.length}
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

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={goPrev}
            disabled={atFirst}
            className="p-3 rounded-full bg-white/70 backdrop-blur-xl shadow-2xl text-gray-600 disabled:opacity-30 hover:-translate-y-0.5 transition transform-gpu drop-shadow-xl border-0"
            aria-label="Previous question"
          >
            <ArrowUp size={22} />
          </button>

          <div
            className="bg-white/70 rounded-3xl shadow-2xl border border-white/30 flex items-center justify-center transition-all duration-300"
            style={{ width: '70vw', minWidth: '320px', maxWidth: '1100px', height: '50vh', minHeight: '260px', maxHeight: '620px', padding: '2.5rem 3em' }}
          >
            {current < questions.length ? (
              <div className="w-full space-y-4 transition-all duration-300">
                <Text variant="h3" className="text-left">{questions[current].text}</Text>
                <input
                  className="w-full bg-transparent border-0 border-b-2 border-b-[#9CAF88] rounded-none px-1 pb-3 text-lg outline-none focus:ring-0 focus:border-b-[#7A8C6A]"
                  value={answers[current]}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="How do you feel about that?"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (current < questions.length - 1) {
                        goNext();
                      } else {
                        setCurrent(totalSteps - 1);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <Text variant="h3" className="text-center">Ready to share?</Text>
                <Button variant="primary" onClick={onFinish}>Submit</Button>
              </div>
            )}
          </div>

          <button
            onClick={goNext}
            disabled={atLast}
            className="p-3 rounded-full bg-white/70 backdrop-blur-xl shadow-2xl text-gray-600 disabled:opacity-30 hover:translate-y-0.5 transition transform-gpu drop-shadow-xl border-0"
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
