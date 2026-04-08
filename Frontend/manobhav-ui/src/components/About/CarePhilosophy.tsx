import { Heart, LockKeyhole, Palette, Sparkles } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { SectionReveal } from './SectionReveal';

const principles = [
  {
    title: 'Judgment-free and confidential',
    copy: 'People should be able to seek support without shame, fear, or the pressure to have everything figured out.',
    icon: LockKeyhole,
    tone: 'bg-[#E6EDE8] text-[#7A8C6A]',
  },
  {
    title: 'Clinical care with warmth',
    copy: 'We value evidence-based practice, but never at the cost of empathy, presence, and relational trust.',
    icon: Heart,
    tone: 'bg-[#F7E6E8] text-[#B57F8B]',
  },
  {
    title: 'Healing through expression',
    copy: 'Creative reflection can open doors that words alone sometimes cannot. That is why expressive arts matter here.',
    icon: Palette,
    tone: 'bg-[#EBF5F7] text-[#8BAAB3]',
  },
  {
    title: 'Growth beyond stigma',
    copy: 'We want to help build a culture where therapy is not hidden or feared, but embraced as an act of strength.',
    icon: Sparkles,
    tone: 'bg-[#F5F5F5] text-[#4B5563]',
  },
];

export function CarePhilosophy() {
  return (
    <section className="bg-white/45 px-6 py-24 backdrop-blur-sm">
      <SectionReveal className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <Text variant="caption" className="text-[#9CAF88]">
            Care Philosophy
          </Text>
          <Text variant="h2" className="mt-3 text-slate-800">
            What guides the way we care
          </Text>
          <Text variant="body" className="mt-5 text-lg text-gray-600">
            The old Manobhav vision statement was clear about one thing: care must be accessible, stigma-free, and
            rooted in emotional safety. These principles turn that vision into a practical standard for how the platform
            feels and how support is delivered.
          </Text>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <div
                key={principle.title}
                className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
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
      </SectionReveal>
    </section>
  );
}
