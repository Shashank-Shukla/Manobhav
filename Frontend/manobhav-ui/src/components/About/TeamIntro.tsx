import { ArrowRight, HeartHandshake, Leaf, Users } from 'lucide-react';
import { Button } from '../../shared/primitives/Button';
import { Text } from '../../shared/primitives/Text';
import { SectionReveal } from './SectionReveal';

type TeamIntroProps = {
  onExploreProviders: () => void;
};

const teamSignals = [
  {
    title: 'Founder-led and care-led',
    copy: 'The tone of Manobhav starts with clinical grounding, emotional sensitivity, and a genuine respect for each person\'s pace.',
    icon: HeartHandshake,
    tint: 'bg-[#E6EDE8] text-[#7A8C6A]',
  },
  {
    title: 'A growing network of professionals',
    copy: 'The platform is designed to grow with trained, empathetic therapists and mental health professionals who align with that standard.',
    icon: Users,
    tint: 'bg-[#EBF5F7] text-[#8BAAB3]',
  },
  {
    title: 'Built with intention, not volume',
    copy: 'The aim is not to feel like a directory. It is to feel like a carefully held ecosystem of support you can trust.',
    icon: Leaf,
    tint: 'bg-[#F7E6E8] text-[#B57F8B]',
  },
];

export function TeamIntro({ onExploreProviders }: TeamIntroProps) {
  return (
    <section className="px-6 py-24">
      <SectionReveal className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <Text variant="caption" className="text-[#9CAF88]">
              Team Intro
            </Text>
            <Text variant="h2" className="mt-3 text-slate-800">
              The people behind the care
            </Text>
            <Text variant="body" className="mt-5 text-lg text-gray-600">
              Your old Wix page had placeholders for the therapist grid, so this section is intentionally framed as an
              introduction to the kind of team Manobhav is building: trained, empathetic, and deeply human in the way
              they show up for people.
            </Text>
          </div>

          <Button variant="secondary" icon={ArrowRight} onClick={onExploreProviders}>
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
                  className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
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

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-gradient-to-br from-[#F9FAFB] to-white p-7 shadow-xl">
            <Text variant="caption" className="text-[#D6A2AD]">
              Team Promise
            </Text>
            <Text variant="h3" className="mt-4 text-slate-800">
              Every future profile should feel trustworthy before it feels impressive.
            </Text>
            <Text variant="body" className="mt-5 text-gray-600">
              That means the About page introduces the team with honesty rather than filler. As Manobhav grows, this
              section can evolve into full member profiles, but the standard stays the same: empathy, confidentiality,
              and competence first.
            </Text>
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#9CAF88]/50 bg-[#E6EDE8]/45 p-5">
              <Text variant="body" className="text-gray-700">
                Today the strongest named voice behind the platform is Guramrit Kaur. Tomorrow this section can expand
                into a richer team story without changing the values at its core.
              </Text>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
