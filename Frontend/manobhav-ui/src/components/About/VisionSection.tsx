import { SectionReveal } from './SectionReveal';

function RollingWave({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="none"
      className={`absolute left-0 h-28 w-full md:h-36 ${flip ? 'bottom-0 rotate-180' : 'top-0'}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 130C115 91 231 87 346 120C453 150 559 206 687 190C820 173 899 106 1020 84C1150 61 1285 90 1440 54V240H0V130Z"
        fill="#fbf6eb"
      />
    </svg>
  );
}

function SoftBlob({ className, color }: { className?: string; color: string }) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={`absolute ${className ?? ''}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M48.6,-73.6C63.9,-66.8,77.8,-54,84.2,-38.7C90.6,-23.3,89.4,-5.5,84.7,11.1C80,27.7,71.8,43.2,60.2,55.7C48.6,68.3,33.7,77.9,17.4,82.7C1.1,87.5,-16.6,87.5,-31.7,81.7C-46.8,75.9,-59.2,64.3,-68,50.2C-76.9,36.1,-82.3,19.5,-83.3,2.5C-84.3,-14.4,-80.9,-31.8,-72.3,-45.8C-63.7,-59.8,-49.8,-70.5,-35.1,-77.2C-20.4,-83.9,-4.8,-86.5,10.3,-84.1C25.4,-81.7,33.3,-80.4,48.6,-73.6Z"
        fill={color}
        opacity="0.7"
      />
    </svg>
  );
}

function VectorMotion() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] animate-float-soft">
      <SoftBlob className="-left-8 top-8 h-32 w-32" color="#f6d8cf" />
      <SoftBlob className="-right-6 bottom-10 h-24 w-24" color="#d7ebe2" />
      <div className="relative z-10 rounded-[2.5rem] bg-white/70 p-6 shadow-[0_28px_60px_rgba(50,63,92,0.10)] backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#f9f1dd] px-6 py-8">
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
              className="rounded-full bg-[#f6f3ea] px-3 py-2 text-xs font-medium tracking-[0.08em] text-[#5f6770]"
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
    <section id="vision-section" className="relative overflow-hidden bg-[#fbf6eb] px-6 pb-28 pt-24 md:pb-32 md:pt-28">
      <RollingWave />
      <RollingWave flip />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-40 h-32 w-32 rounded-full bg-[#fff3de] blur-3xl" />
        <div className="absolute bottom-32 right-[10%] h-36 w-36 rounded-full bg-[#e0eef4] blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
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
