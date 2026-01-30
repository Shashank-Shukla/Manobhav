import { useMemo, useState } from 'react';
import questionsData from '../assets/journey-questions.json';
import { Text } from '../shared/primitives/Text';
import { Button } from '../shared/primitives/Button';

type Question = { id: number; text: string };

type JourneyPageProps = {
  onBackHome: () => void;
};

export function JourneyPage({ onBackHome }: JourneyPageProps) {
  const questions = useMemo(() => questionsData as Question[], []);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));

  const atFirst = current === 0;
  const atLast = current === questions.length - 1;

  const goPrev = () => !atFirst && setCurrent((i) => i - 1);
  const goNext = () => !atLast && setCurrent((i) => i + 1);

  const onChange = (val: string) => {
    const next = [...answers];
    next[current] = val;
    setAnswers(next);
  };

  const onSubmit = () => {
    // submit placeholder
    onBackHome();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 animate-in fade-in">
      <div className="flex justify-between items-center mb-10">
        <Text variant="h2">Your Wellbeing Journey</Text>
        <Button variant="secondary" onClick={onBackHome}>Back to Home</Button>
      </div>

      <div className="flex gap-2 mb-10 justify-center">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`w-10 h-2 rounded-full transition-all ${idx === current ? 'bg-[#9CAF88]' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-100 p-10 flex flex-col items-stretch gap-8">
        <div className="flex flex-col items-center gap-8">
          <button
            onClick={goPrev}
            disabled={atFirst}
            className="text-2xl text-gray-500 disabled:text-gray-300"
            aria-label="Previous question"
          >
            ▲
          </button>

          <div className="w-full max-w-2xl">
            <Text variant="h3" className="text-center mb-4">{questions[current].text}</Text>
            <input
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg outline-none focus:border-[#9CAF88] focus:ring-2 focus:ring-[#9CAF88]/30"
              value={answers[current]}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your response..."
            />
          </div>

          <button
            onClick={goNext}
            disabled={atLast}
            className="text-2xl text-gray-500 disabled:text-gray-300"
            aria-label="Next question"
          >
            ▼
          </button>
        </div>

        {atLast && (
          <div className="flex justify-center mt-6">
            <Button variant="primary" onClick={onSubmit}>Submit</Button>
          </div>
        )}
      </div>
    </div>
  );
}
