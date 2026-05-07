import type { LucideIcon } from 'lucide-react';
import { Heart, LockKeyhole, Palette, Sparkles } from 'lucide-react';
import principles from '../../../assets/carePhilosophyPrinciples.json';
import { RollingSectionWave } from '../../../shared/interactive/AboutVectors';
import { Text } from '../../../shared/primitives/Text';
import { SectionReveal } from './SectionReveal';

const iconMap = {
  lockKeyhole: LockKeyhole,
  heart: Heart,
  palette: Palette,
  sparkles: Sparkles,
} satisfies Record<string, LucideIcon>;

type Principle = {
  title: string;
  copy: string;
  icon: keyof typeof iconMap;
  surface: string;
  tone: string;
};

const typedPrinciples = principles as Principle[];

export function CarePhilosophy() {
  return (
    <section className="relative h-full overflow-hidden bg-[#fbf6eb] px-6 py-16 md:py-20">
      <RollingSectionWave className="absolute left-0 top-0 h-24 w-full md:h-32" fill="#fbf6eb" />
      <RollingSectionWave className="absolute bottom-0 left-0 h-24 w-full rotate-180 md:h-32" fill="#fbf6eb" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-40 h-32 w-32 rounded-full bg-[#f0e3c0]/45 blur-3xl" />
        <div className="absolute bottom-28 right-[12%] h-36 w-36 rounded-full bg-[#e0edf2]/45 blur-3xl" />
      </div>

      <SectionReveal className="relative mx-auto flex h-full max-w-7xl items-center">
        <div className="w-full">
        <div className="mb-10 max-w-3xl">
          <Text variant="caption" className="text-[#7d8f8a]">
            Care Philosophy
          </Text>
          <Text variant="h2" className="mt-3 text-[#243b6b]">
            What guides the way we care
          </Text>
          <Text variant="body" className="mt-5 text-lg text-gray-600">
            The philosophy behind Manobhav is simple: therapy should feel accessible, emotionally safe, and deeply human.
            These principles shape how support is offered and how the platform is meant to feel.
          </Text>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {typedPrinciples.map((principle) => {
            const Icon = iconMap[principle.icon];
            return (
              <div
                key={principle.title}
                className={`shine-shake-card rounded-[2rem] border p-6 shadow-[0_18px_40px_rgba(36,59,107,0.06)] ${principle.surface}`}
              >
                <div className={`mb-5 inline-flex rounded-2xl p-3 ${principle.tone}`}>
                  <Icon size={22} />
                </div>
                <Text variant="h3" className="mb-3 text-slate-800">
                  {principle.title}
                </Text>
                <Text variant="body" className="text-gray-600">
                  {principle.copy}
                </Text>
              </div>
            );
          })}
        </div>
        </div>
      </SectionReveal>
    </section>
  );
}
