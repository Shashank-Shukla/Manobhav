import { AboutBottomWave, HeroLeafVector } from '../../../shared/interactive/AboutVectors';

function SpeechBubble({
  className,
  tone = 'blue',
  tailSide = 'left',
}: {
  className?: string;
  tone?: 'blue' | 'mint';
  tailSide?: 'left' | 'right';
}) {
  return (
    <div
      className={`absolute hidden rounded-[1.8rem] px-6 py-5 lg:block ${getBubbleTone(tone)} ${className ?? ''}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
      </div>
      <span
        className={`absolute -bottom-1 h-5 w-5 rotate-45 ${getBubbleTailSide(tailSide)} ${getBubbleTailTone(tone)}`}
      />
    </div>
  );
}

function getBubbleTone(tone: 'blue' | 'mint'): string {
  return tone === 'blue'
    ? 'bg-[#b7d3e8] text-white shadow-[0_18px_35px_rgba(90,122,149,0.18)]'
    : 'bg-[#c6decd] text-[#6c8a70] shadow-[0_18px_35px_rgba(108,138,112,0.12)]';
}

function getBubbleTailSide(tailSide: 'left' | 'right'): string {
  return tailSide === 'left' ? 'left-8' : 'right-8';
}

function getBubbleTailTone(tone: 'blue' | 'mint'): string {
  return tone === 'blue' ? 'bg-[#b7d3e8]' : 'bg-[#c6decd]';
}

export function AboutHero() {
  return (
    <section
      className="relative w-full px-4 pb-20 pt-28 sm:px-6 sm:pt-32 md:pb-28 md:pt-36"
      style={{ backgroundColor: '#FCF5F6' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-x-hidden">
        <div className="absolute left-10 top-28 hidden h-24 w-24 rounded-full bg-[#F7E6E8]/40 blur-2xl lg:block" />
        <div className="absolute right-12 top-24 hidden h-32 w-32 rounded-full bg-[#D6A2AD]/30 blur-3xl lg:block" />
        <div className="absolute bottom-28 right-1/3 hidden h-28 w-28 rounded-full bg-[#F7E6E8]/40 blur-2xl lg:block" />
        <HeroLeafVector className="absolute bottom-28 left-0 hidden h-40 w-24 lg:left-10 lg:block lg:h-48 lg:w-28" color="#92c29c" />
        <HeroLeafVector className="absolute bottom-24 right-6 hidden h-36 w-20 lg:right-20 lg:block lg:h-44 lg:w-24" color="#9acdb4" />
        <SpeechBubble className="left-[10%] top-32" tone="blue" tailSide="left" />
        <SpeechBubble className="top-28 right-[24%]" tone="mint" tailSide="right" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="relative order-2 flex justify-center lg:order-1 lg:justify-start">
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-x-12 bottom-2 h-12 rounded-full bg-[#d7e5ef] opacity-80 blur-md" />
            <img
              src="/homepage-picture.png"
              alt="Illustration representing a calm, supportive conversation"
              className="relative z-10 w-full object-contain"
              loading="eager"
            />
          </div>
        </div>

        <div className="order-1 max-w-xl justify-self-end text-center lg:order-2 lg:text-left">
          <h1 className="mt-4 text-3xl font-extrabold uppercase leading-[0.88] text-[#243b6b] sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block">About</span>
            <span className="block text-[#dc8f83]">Manobhav</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#6a6f74] lg:mx-0">
            Manobhav creates a calm, human space for therapy and emotional support, with care that feels warm, clear,
            and accessible.
          </p>
        </div>
      </div>

      {/* Single clean transition into the Vision section: flat edge flush at its top, wavy crest rising
          into the hero, mirrored horizontally and filled in the next section's colour. */}
      <AboutBottomWave className="absolute bottom-0 left-0 h-24 w-full -scale-x-100 md:h-32" fill="#F9EEF0" />
    </section>
  );
}
