import { Quote } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { SectionReveal } from './SectionReveal';

export function FounderSection() {
  return (
    <section className="px-6 py-24">
      <SectionReveal className="mx-auto max-w-7xl">
        <div className="grid gap-8 rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white/85 via-[#F9FAFB]/90 to-[#E6EDE8]/60 p-8 shadow-2xl backdrop-blur-sm lg:grid-cols-[0.72fr_1.28fr] lg:p-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#E6EDE8] p-8">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/40 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div>
                <Text variant="caption" className="text-[#7A8C6A]">
                  Founder
                </Text>
                <Text variant="h2" className="mt-3 text-slate-800">
                  Guramrit Kaur
                </Text>
                <Text variant="body" className="mt-4 text-gray-700">
                  Founder and therapist behind Manobhav
                </Text>
              </div>

              <div className="space-y-3 rounded-[1.5rem] border border-white/70 bg-white/75 p-5 shadow-md backdrop-blur-sm">
                <Text variant="body" className="font-medium text-slate-800">
                  Training
                </Text>
                <Text variant="body" className="text-gray-600">
                  Master's in Clinical Psychology
                </Text>
                <Text variant="body" className="text-gray-600">
                  Diploma in Expressive Arts Therapy (licensed by UNESCO CID)
                </Text>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-[2rem] bg-white/70 p-6 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#F7E6E8] p-3 text-[#B57F8B]">
                <Quote size={22} />
              </div>
              <Text variant="caption" className="text-[#D6A2AD]">
                Founder's Note
              </Text>
            </div>

            <Text variant="body" className="text-lg text-gray-700">
              "Manobhav was born from a deeply personal understanding of what it feels like to need empathy before
              answers. I wanted to build the kind of space that I once needed myself - a space where people can arrive
              as they are, feel safe enough to speak honestly, and begin healing without fear of judgment."
            </Text>

            <Text variant="body" className="text-lg text-gray-700">
              "My work in clinical psychology and expressive arts therapy showed me that healing is not one-size-fits-all.
              Some people need structure, some need reflection, some need creativity, and most need care that feels
              genuinely human. Manobhav exists to hold all of that with sensitivity and integrity."
            </Text>

            <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <Text variant="body" className="text-gray-600">
                The goal is not just to make therapy available, but to make it feel accessible in the truest sense:
                emotionally safe, clinically grounded, and rooted in compassion.
              </Text>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
