import { OrganicBlob, RollingSectionWave } from '../../../shared/interactive/AboutVectors';
import { SectionReveal } from './SectionReveal';

function VectorMotion() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] animate-float-soft">
      <OrganicBlob className="absolute -left-8 top-8 h-32 w-32" color="#f6d8cf" />
      <OrganicBlob className="absolute -right-6 bottom-10 h-24 w-24" color="#d7ebe2" />
      <div className="relative z-10 rounded-[2.5rem] bg-white/70 p-6 shadow-[0_28px_60px_rgba(50,63,92,0.10)] backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#FBEEF2] px-6 py-8">
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dce8ee] opacity-80 animate-spin-slow" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f3d5cf] opacity-60 animate-spin-slower" />
          <img
            src="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
            alt="Animated vector illustration for Manobhav vision"
            className="relative z-10 mx-auto w-full max-w-[280px] object-contain animate-float-gentle"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

function SquishyCard({
  title,
  copy,
  accent,
  className,
  delay = '0s',
  points,
}: {
  title: string;
  copy: string;
  accent: string;
  className?: string;
  delay?: string;
  points?: string[];
}) {
  return (
    <div
      className={`animate-squish rounded-[2rem] border border-white/60 bg-white/75 p-7 shadow-[0_24px_50px_rgba(36,59,107,0.08)] backdrop-blur-sm ${className ?? ''}`}
      style={{ animationDelay: delay }}
    >
      <span className="mb-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]" style={{ backgroundColor: accent, color: '#243b6b' }}>
        {title}
      </span>
      <p className="text-base leading-7 text-[#5f6770]">{copy}</p>
      {points && points.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {points.map((point) => (
            <span
              key={point}
              className="rounded-full bg-[#FBF1F4] px-3 py-2 text-xs font-medium tracking-[0.08em] text-[#5f6770]"
            >
              {point}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function VisionSection() {
  return (
    <section id="vision-section" className="relative h-full overflow-hidden bg-[#FCF2F5] px-6 py-16 md:py-20">
      <RollingSectionWave className="absolute left-0 top-0 h-28 w-full md:h-36" />
      <RollingSectionWave className="absolute bottom-0 left-0 h-28 w-full rotate-180 md:h-36" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-40 h-32 w-32 rounded-full bg-[#FBEEF2] blur-3xl" />
        <div className="absolute bottom-32 right-[10%] h-36 w-36 rounded-full bg-[#e0eef4] blur-3xl" />
      </div>

      <div className="relative mx-auto grid h-full max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <SectionReveal className="lg:pr-4">
          <div className="space-y-6">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7d8f8a]">Vision and Mission</p>
              <h2 className="mt-4 text-4xl font-extrabold uppercase leading-[0.95] text-[#243b6b] md:text-5xl">
                Built for care that feels softer, clearer, and closer.
              </h2>
            </div>
            <div className="grid gap-5">
              <SquishyCard
                title="Vision"
                accent="#dcecf1"
                copy="To help build a more emotionally aware and less stigmatized community where people feel seen, supported, and understood."
                points={['Seen and understood', 'Support without stigma', 'Emotionally aware community']}
              />
              <SquishyCard
                title="Mission"
                accent="#f6d8cf"
                delay="1.4s"
                copy="To make therapy accessible, confidential, judgment-free, and stigma-free, while combining clinical psychology with creative expression in a way that feels genuinely human."
                points={['Accessible care', 'Confidential and judgment-free', 'Clinical plus creative healing']}
              />
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="lg:pl-6">
          <VectorMotion />
        </SectionReveal>
      </div>
    </section>
  );
}
