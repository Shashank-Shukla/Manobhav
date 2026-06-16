import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Text } from '../primitives/Text';

const ideas = [
  (mood: string) => `Place a hand on your chest and inhale for 4 seconds, exhale for 6. Picture that ${mood || 'feeling'} softening.`,
  (mood: string) => `Stand, stretch your arms overhead, and take 3 slow breaths. Name one thing that feels steady despite feeling ${mood || 'this way'}.`,
  (mood: string) => `Sip water, look out a window, and notice 3 colors. Tell yourself: “It’s okay to feel ${mood || 'this'}. I can take a small step.”`,
  (mood: string) => `Unclench your jaw, drop your shoulders, and breathe into your belly. Choose one gentle action you can do next, even while feeling ${mood || 'this'}.`,
];

type Props = {
  onReachHuman?: () => void;
};

export function MoodSearchBar({ onReachHuman }: Props) {
  const [mood, setMood] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(getIsWindowScrolled);
  const [isExpanded, setIsExpanded] = useState(() => !getIsWindowScrolled());
  const [ideaIndex] = useState(() => Math.floor(Math.random() * ideas.length));
  const ideaText = ideas[ideaIndex];

  useEffect(() => {
    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 60;
      setIsScrolled(nextIsScrolled);
      setIsExpanded((currentIsExpanded) => {
        if (nextIsScrolled && currentIsExpanded) {
          return false;
        }

        if (!nextIsScrolled && !currentIsExpanded) {
          return true;
        }

        return currentIsExpanded;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getSuggestion = () => {
    if (!mood.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setSuggestion(ideaText(mood.trim()));
      setLoading(false);
    }, 450);
  };
  const containerClassName = getContainerClassName(isScrolled);
  const searchBoxClassName = getSearchBoxClassName(isExpanded);

  return (
    <div className={containerClassName}>
      <SuggestionPanel
        isExpanded={isExpanded}
        onDismiss={() => setSuggestion(null)}
        onReachHuman={onReachHuman}
        suggestion={suggestion}
      />

      <div
        className={searchBoxClassName}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <MoodInput
          isExpanded={isExpanded}
          isScrolled={isScrolled}
          mood={mood}
          onChange={setMood}
          onSubmit={getSuggestion}
        />
        <MoodSubmitButton
          isExpanded={isExpanded}
          loading={loading}
          mood={mood}
          onExpand={() => setIsExpanded(true)}
          onSubmit={getSuggestion}
        />
      </div>
    </div>
  );
}

function SuggestionPanel({
  isExpanded,
  onDismiss,
  onReachHuman,
  suggestion,
}: {
  isExpanded: boolean;
  onDismiss: () => void;
  onReachHuman?: () => void;
  suggestion: string | null;
}) {
  if (!suggestion || !isExpanded) {
    return null;
  }

  return (
    <div className="p-6 bg-[#F7E6E8]/90 backdrop-blur-md rounded-2xl border border-[#F7E6E8] shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mb-4">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#B57F8B]/60">AI Guidance</span>
        <button onClick={onDismiss} className="text-[#B57F8B] hover:scale-110 transition-transform">
          <X size={14} />
        </button>
      </div>
      <Text variant="body" className="text-[#B57F8B] font-medium leading-relaxed mb-4">
        {suggestion}
      </Text>
      <div className="flex justify-center">
        <button
          onClick={onReachHuman}
          className="px-4 py-2 rounded-full border border-[#B57F8B] text-white bg-[#B57F8B] hover:bg-[#9c7a82] transition"
        >
          Reach out to a human
        </button>
      </div>
    </div>
  );
}

function MoodInput({
  isExpanded,
  isScrolled,
  mood,
  onChange,
  onSubmit,
}: {
  isExpanded: boolean;
  isScrolled: boolean;
  mood: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!isExpanded) {
    return null;
  }

  return (
    <input
      type="text"
      value={mood}
      onChange={(event) => onChange(event.target.value)}
      placeholder="How are you feeling right now?"
      className="flex-1 px-5 py-3 bg-transparent outline-none text-gray-700 text-lg placeholder-gray-400"
      onKeyDown={(event) => handleMoodInputKeyDown(event.key, onSubmit)}
      autoFocus={!isScrolled}
    />
  );
}

function MoodSubmitButton({
  isExpanded,
  loading,
  mood,
  onExpand,
  onSubmit,
}: {
  isExpanded: boolean;
  loading: boolean;
  mood: string;
  onExpand: () => void;
  onSubmit: () => void;
}) {
  return (
    <button
      onClick={(event) => handleMoodSubmitClick(event, isExpanded, onExpand, onSubmit)}
      disabled={isMoodSubmitDisabled(loading, isExpanded, mood)}
      className={`bg-[#D6A2AD] text-white rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center ${getSubmitButtonSizeClass(isExpanded)}`}
    >
      <SubmitIcon isExpanded={isExpanded} loading={loading} />
    </button>
  );
}

function SubmitIcon({ isExpanded, loading }: { isExpanded: boolean; loading: boolean }) {
  if (loading) {
    return <Loader2 size={24} className="animate-spin" />;
  }

  return <Sparkles size={isExpanded ? 24 : 28} />;
}

function handleMoodInputKeyDown(key: string, onSubmit: () => void): void {
  if (key === 'Enter') {
    onSubmit();
  }
}

function handleMoodSubmitClick(
  event: React.MouseEvent<HTMLButtonElement>,
  isExpanded: boolean,
  onExpand: () => void,
  onSubmit: () => void,
): void {
  if (isExpanded) {
    onSubmit();
  } else {
    onExpand();
  }
  event.stopPropagation();
}

function isMoodSubmitDisabled(loading: boolean, isExpanded: boolean, mood: string): boolean {
  return loading || (isExpanded && !mood);
}

function getContainerClassName(isScrolled: boolean): string {
  const positionClass = isScrolled
    ? 'bottom-8 right-8 left-auto translate-x-0 w-auto'
    : 'bottom-12 left-1/2 -translate-x-1/2 w-full px-6 max-w-2xl';
  return `fixed z-[100] transition-all duration-700 ease-in-out flex flex-col items-center gap-4 ${positionClass}`;
}

function getIsWindowScrolled(): boolean {
  return typeof window !== 'undefined' && window.scrollY > 60;
}

function getSearchBoxClassName(isExpanded: boolean): string {
  const sizeClass = isExpanded ? 'w-full p-2' : 'w-14 h-14 p-0 justify-center cursor-pointer hover:scale-105';
  return `relative flex items-center bg-white rounded-full shadow-2xl border border-gray-100 transition-all duration-500 overflow-hidden ${sizeClass}`;
}

function getSubmitButtonSizeClass(isExpanded: boolean): string {
  return isExpanded ? 'p-4 min-w-[56px] hover:bg-[#B57F8B]' : 'w-full h-full hover:bg-[#B57F8B]';
}

export default MoodSearchBar;
