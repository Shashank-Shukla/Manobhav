import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Text } from '../primitives/Text';

const ideas = [
  (mood: string) => `Place a hand on your chest and inhale for 4 seconds, exhale for 6. Picture that ${mood || 'feeling'} softening.`,
  (mood: string) => `Stand, stretch your arms overhead, and take 3 slow breaths. Name one thing that feels steady despite feeling ${mood || 'this way'}.`,
  (mood: string) => `Sip water, look out a window, and notice 3 colors. Tell yourself: “It’s okay to feel ${mood || 'this'}. I can take a small step.”`,
  (mood: string) => `Unclench your jaw, drop your shoulders, and breathe into your belly. Choose one gentle action you can do next, even while feeling ${mood || 'this'}.`,
];

export function MoodSearchBar() {
  const [mood, setMood] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [ideaIndex] = useState(() => Math.floor(Math.random() * ideas.length));
  const ideaText = ideas[ideaIndex];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isScrolled && isExpanded) {
      setIsExpanded(false);
    }
    if (!isScrolled && !isExpanded) {
      setIsExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrolled]);

  const getSuggestion = () => {
    if (!mood.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setSuggestion(ideaText(mood.trim()));
      setLoading(false);
    }, 450);
  };

  return (
    <div
      className={`fixed z-[100] transition-all duration-700 ease-in-out flex flex-col items-center gap-4
        ${isScrolled ? 'bottom-8 right-8 left-auto translate-x-0 w-auto' : 'bottom-12 left-1/2 -translate-x-1/2 w-full px-6 max-w-2xl'}
      `}
    >
      {suggestion && isExpanded && (
        <div className="p-6 bg-[#F7E6E8]/90 backdrop-blur-md rounded-2xl border border-[#F7E6E8] shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mb-2">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B57F8B]/60">AI Guidance</span>
            <button onClick={() => setSuggestion(null)} className="text-[#B57F8B] hover:scale-110 transition-transform">
              <X size={14} />
            </button>
          </div>
          <Text variant="body" className="text-[#B57F8B] font-medium leading-relaxed">
            {suggestion}
          </Text>
        </div>
      )}

      <div
        className={`relative flex items-center bg-white rounded-full shadow-2xl border border-gray-100 transition-all duration-500 overflow-hidden
          ${isExpanded ? 'w-full p-2' : 'w-14 h-14 p-0 justify-center cursor-pointer hover:scale-105'}
        `}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {isExpanded && (
          <>
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="How are you feeling right now?"
              className="flex-1 px-5 py-3 bg-transparent outline-none text-gray-700 text-lg placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && getSuggestion()}
              autoFocus={!isScrolled}
            />
          </>
        )}

        <button
          onClick={(e) => {
            if (!isExpanded) {
              setIsExpanded(true);
            } else {
              getSuggestion();
            }
            e.stopPropagation();
          }}
          disabled={loading || (isExpanded && !mood)}
          className={`bg-[#D6A2AD] text-white rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center
            ${isExpanded ? 'p-4 min-w-[56px] hover:bg-[#B57F8B]' : 'w-full h-full hover:bg-[#B57F8B]'}
          `}
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={isExpanded ? 24 : 28} />}
        </button>
      </div>
    </div>
  );
}

export default MoodSearchBar;
