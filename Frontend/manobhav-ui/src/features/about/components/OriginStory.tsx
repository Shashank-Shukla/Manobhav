import type { LucideIcon } from 'lucide-react';
import { BookOpen, HeartHandshake, Lightbulb, School } from 'lucide-react';
import storyPoints from '../../../assets/originStoryPoints.json';
import {
  AdultWomanVectorIllustration,
  ChildVectorIllustration,
  StoryTopWave,
  WavyThreadIllustration,
} from '../../../shared/interactive/AboutVectors';
import { SectionReveal } from './SectionReveal';

const iconMap = {
  school: School,
  heartHandshake: HeartHandshake,
  bookOpen: BookOpen,
  lightbulb: Lightbulb,
} satisfies Record<string, LucideIcon>;

type StoryPoint = {
  title: string;
  copy: string;
  icon: keyof typeof iconMap;
  accent: string;
};

const typedStoryPoints = storyPoints as StoryPoint[];

function StoryIllustrationBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <WavyThreadIllustration className="absolute inset-0 h-full w-full" />
      <ChildVectorIllustration className="absolute left-[2%] top-16 hidden h-44 w-44 opacity-75 lg:block xl:h-52 xl:w-52" />
      <AdultWomanVectorIllustration className="absolute bottom-10 right-[2%] hidden h-52 w-52 opacity-75 lg:block xl:h-60 xl:w-60" />
    </div>
  );
}

export function OriginStory() {
  return (
    <section className="relative h-full overflow-hidden bg-[#FBF1F4] px-6 py-16 md:py-20">
      <StoryTopWave className="absolute left-0 top-0 h-24 w-full md:h-32" />
      <StoryIllustrationBackground />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-44 h-28 w-28 rounded-full bg-white/35 blur-3xl" />
        <div className="absolute right-[12%] bottom-24 h-36 w-36 rounded-full bg-[#e4edf1] blur-3xl" />
      </div>

      <SectionReveal className="relative mx-auto flex h-full max-w-7xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="max-w-xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7d8f8a]">Origin Story</p>
            <h2 className="text-4xl font-extrabold uppercase leading-[0.95] text-[#243b6b] md:text-5xl">
              Why Manobhav was created.
            </h2>
            <p className="text-base leading-7 text-[#5f6770]">
              Manobhav begins with Guramrit Kaur&apos;s own experience of anxiety in school and the kind of support that
              made healing feel possible.
            </p>
            <p className="text-base leading-7 text-[#5f6770]">
              What started as a personal turning point later became professional training, clinical practice, and a
              simple conviction: people should not have to struggle to find skilled, empathetic care.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {typedStoryPoints.map((point) => {
              const Icon = iconMap[point.icon];

              return (
                <div
                  key={point.title}
                  className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_22px_48px_rgba(36,59,107,0.08)] backdrop-blur-sm"
                >
                  <div
                    className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem]"
                    style={{ backgroundColor: point.accent, color: '#243b6b' }}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-[#243b6b]">{point.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#5f6770]">{point.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
