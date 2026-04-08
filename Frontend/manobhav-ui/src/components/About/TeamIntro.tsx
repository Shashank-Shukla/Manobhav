import { ArrowRight, HeartHandshake, Leaf, Users } from 'lucide-react';
import { RollingSectionWave } from '../../shared/interactive/AboutVectors';
import { Button } from '../../shared/primitives/Button';
import { Text } from '../../shared/primitives/Text';
import { SectionReveal } from './SectionReveal';

type TeamIntroProps = {
  onExploreProviders: () => void;
};

const teamSignals = [
  {
    title: 'Founder-led and care-led',
    copy: "The tone of Manobhav starts with clinical grounding, emotional sensitivity, and respect for each person's pace.",
    icon: HeartHandshake,
    surface: 'bg-[#edf4ee] border-[#dce7de]',
    tint: 'bg-[#dce7de] text-[#7A8C6A]',
  },
  {
    title: 'A growing network of professionals',
    copy: 'The platform is built to grow with trained, empathetic therapists and mental health professionals who align with that standard.',
    icon: Users,
    surface: 'bg-[#ebf3f5] border-[#d6e5ea]',
    tint: 'bg-[#d6e5ea] text-[#8BAAB3]',
  },
  {
    title: 'Built with intention, not volume',
    copy: 'The aim is not to feel like a directory. It is to feel like a carefully held ecosystem of support you can trust.',
    icon: Leaf,
    surface: 'bg-[#f7ebe7] border-[#ecd9d4]',
    tint: 'bg-[#ecd9d4] text-[#B57F8B]',
  },
];

export function TeamIntro({ onExploreProviders }: TeamIntroProps) {
  return (
    <section className="relative overflow-hidden bg-[#f5efe3] px-6 py-24 md:py-28">
      <RollingSectionWave className="absolute left-0 top-0 h-24 w-full md:h-32" fill="#f5efe3" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[9%] top-36 h-28 w-28 rounded-full bg-[#efe0c5]/50 blur-3xl" />
        <div className="absolute bottom-20 right-[10%] h-36 w-36 rounded-full bg-[#dde9ef]/50 blur-3xl" />
      </div>

      <SectionReveal className="relative mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <Text variant="caption" className="text-[#7d8f8a]">
              Team Intro
            </Text>
            <Text variant="h2" className="mt-3 text-[#243b6b]">
              The people behind the care
            </Text>
            <Text variant="body" className="mt-5 text-lg text-gray-600">
              Manobhav is being shaped as a human-first network of care, grounded in empathy, confidentiality, and
              thoughtful professional support.
            </Text>
          </div>

          <Button
            variant="secondary"
            icon={ArrowRight}
            onClick={onExploreProviders}
            className="border-[#e4d6c8] bg-[#efe3cf] text-[#243b6b] hover:bg-[#e8d8c4]"
          >
            Browse Providers
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6 md:grid-cols-3">
            {teamSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div
                  key={signal.title}
                  className={`rounded-[2rem] border p-6 shadow-[0_18px_40px_rgba(36,59,107,0.06)] ${signal.surface}`}
                >
                  <div className={`mb-5 inline-flex rounded-2xl p-3 ${signal.tint}`}>
                    <Icon size={22} />
                  </div>
                  <Text variant="h3" className="mb-3 text-slate-800">
                    {signal.title}
                  </Text>
                  <Text variant="body" className="text-gray-600">
                    {signal.copy}
                  </Text>
                </div>
              );
            })}
          </div>

          <div className="rounded-[2rem] border border-[#e5d9c7] bg-[#f8efdf]/84 p-7 shadow-[0_20px_45px_rgba(36,59,107,0.06)]">
            <Text variant="caption" className="text-[#7d8f8a]">
              Team Promise
            </Text>
            <Text variant="h3" className="mt-4 text-slate-800">
              Every future profile should feel trustworthy before it feels impressive.
            </Text>
            <Text variant="body" className="mt-5 text-gray-600">
              As Manobhav grows, this section can expand into fuller therapist profiles, but the standard remains the
              same: empathy, confidentiality, and competence first.
            </Text>
            <div className="mt-6 rounded-[1.5rem] border border-[#ddd0bc] bg-[#ece1cf]/72 p-5">
              <Text variant="body" className="text-gray-700">
                Today, the clearest named voice behind the platform is Guramrit Kaur. Over time, that story can expand
                into a wider team without changing the values at its core.
              </Text>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
