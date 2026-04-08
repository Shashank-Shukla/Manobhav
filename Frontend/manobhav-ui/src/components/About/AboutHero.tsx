type AboutHeroProps = {
  onScrollToVision: () => void;
};

function SpeechBubble({
  className,
  tone = 'blue',
  tailSide = 'left',
}: {
  className?: string;
  tone?: 'blue' | 'mint';
  tailSide?: 'left' | 'right';
}) {
  const bubbleTone =
    tone === 'blue'
      ? 'bg-[#b7d3e8] text-white shadow-[0_18px_35px_rgba(90,122,149,0.18)]'
      : 'bg-[#c6decd] text-[#6c8a70] shadow-[0_18px_35px_rgba(108,138,112,0.12)]';

  return (
    <div
      className={`absolute hidden rounded-[1.8rem] px-6 py-5 md:block ${bubbleTone} ${className ?? ''}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
      </div>
      <span
        className={`absolute -bottom-1 h-5 w-5 rotate-45 ${tailSide === 'left' ? 'left-8' : 'right-8'} ${
          tone === 'blue' ? 'bg-[#b7d3e8]' : 'bg-[#c6decd]'
        }`}
      />
    </div>
  );
}

function LeafVector({
  className,
  color,
}: {
  className?: string;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 120 200"
      className={`absolute ${className ?? ''}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M60 195V25" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M60 48C28 36 18 14 14 0C46 4 66 16 72 44C76 64 68 78 60 88C50 76 42 62 60 48Z"
        fill={color}
        opacity="0.82"
      />
      <path
        d="M60 94C24 84 8 58 0 40C38 42 62 52 70 84C76 108 70 126 60 138C48 124 40 110 60 94Z"
        fill={color}
        opacity="0.72"
      />
      <path
        d="M60 140C28 128 14 104 8 84C44 88 66 100 72 132C76 152 70 170 60 182C48 168 40 156 60 140Z"
        fill={color}
        opacity="0.62"
      />
      <path d="M60 58C82 44 96 26 106 10C104 42 92 60 60 74" fill={color} opacity="0.58" />
      <path d="M60 106C86 90 102 72 112 56C112 92 98 112 60 124" fill={color} opacity="0.48" />
    </svg>
  );
}

function BottomWave() {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className="absolute bottom-0 left-0 h-24 w-full md:h-32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 164C121 131 235 135 341 166C451 199 565 219 687 191C805 165 906 95 1023 80C1150 64 1288 106 1440 57V220H0V164Z"
        fill="#fbf6eb"
      />
    </svg>
  );
}

function ScrollIndicator({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-[#243b6b] transition-opacity duration-300 hover:opacity-80"
      aria-label="Scroll to vision and mission"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#6f7e7b]">Scroll</span>
      <span className="flex h-14 w-9 items-start justify-center rounded-full border-2 border-[#243b6b]/45 p-2">
        <span className="h-3 w-1.5 rounded-full bg-[#243b6b] animate-scroll-dot" />
      </span>
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 animate-scroll-bob"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M12 5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 14L12 19L17 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function AboutHero({ onScrollToVision }: AboutHeroProps) {
  return (
    <section
      className="relative overflow-hidden px-6 pb-28 pt-28 md:pb-36 md:pt-36"
      style={{ backgroundColor: 'rgb(241, 229, 191)' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-28 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute right-12 top-24 h-32 w-32 rounded-full bg-[#f3d1c8]/30 blur-3xl" />
        <div className="absolute bottom-28 right-1/3 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
        <LeafVector className="bottom-28 left-0 hidden h-40 w-24 md:block lg:left-10 lg:h-48 lg:w-28" color="#92c29c" />
        <LeafVector className="bottom-24 right-6 hidden h-36 w-20 md:block lg:right-20 lg:h-44 lg:w-24" color="#9acdb4" />
        <SpeechBubble className="left-[10%] top-32" tone="blue" tailSide="left" />
        <SpeechBubble className="top-28 right-[24%]" tone="mint" tailSide="right" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-11rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="relative order-2 flex justify-center lg:order-1 lg:justify-start">
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-x-12 bottom-2 h-12 rounded-full bg-[#d7e5ef] opacity-80 blur-md" />
            <img
              src="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
              alt="Illustration representing a calm, supportive conversation"
              className="relative z-10 w-full object-contain"
              loading="eager"
            />
          </div>
        </div>

        <div className="order-1 max-w-xl justify-self-end text-center lg:order-2 lg:text-left">
          <h1 className="mt-4 text-5xl font-extrabold uppercase leading-[0.88] text-[#243b6b] sm:text-6xl md:text-7xl">
            <span className="block">About</span>
            <span className="block text-[#dc8f83]">Manobhav</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#6a6f74] lg:mx-0">
            Manobhav creates a calm, human space for therapy and emotional support, with care that feels warm, clear,
            and accessible.
          </p>
        </div>
      </div>

      <ScrollIndicator onClick={onScrollToVision} />
      <BottomWave />
    </section>
  );
}
