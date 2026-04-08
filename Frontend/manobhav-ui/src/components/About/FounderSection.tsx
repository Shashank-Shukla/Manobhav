import { Quote } from 'lucide-react';
import { RollingSectionWave } from '../../shared/interactive/AboutVectors';
import { Text } from '../../shared/primitives/Text';
import { SectionReveal } from './SectionReveal';

export function FounderSection() {
  return (
    <section className="relative overflow-hidden bg-[#f7f1e6] px-6 py-24 md:py-28">
      <RollingSectionWave className="absolute left-0 top-0 h-24 w-full md:h-32" fill="#f7f1e6" />
      <RollingSectionWave className="absolute bottom-0 left-0 h-24 w-full rotate-180 md:h-32" fill="#f7f1e6" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-36 h-32 w-32 rounded-full bg-[#f0e3c0]/55 blur-3xl" />
        <div className="absolute bottom-24 right-[10%] h-40 w-40 rounded-full bg-[#dce8ee]/55 blur-3xl" />
      </div>

      <SectionReveal className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 rounded-[2.5rem] border border-[#efe4cf] bg-[#f9f2e6]/88 p-8 shadow-[0_24px_60px_rgba(61,72,92,0.08)] backdrop-blur-sm lg:grid-cols-[0.72fr_1.28fr] lg:p-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#e8dcc8] bg-[#ecdfc5]/72 p-8">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/25 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div>
                <Text variant="caption" className="text-[#7d8f8a]">
                  Founder
                </Text>
                <div className="my-6 flex justify-center lg:justify-start">
                  <div className="about-founder-blob">
                    <div className="about-founder-blob__image">
                      <img
                        src="https://static.wixstatic.com/media/f7ec8a_798f707ce00f4932997fec9f1c6210cc~mv2.jpg/v1/fill/w_565,h_435,fp_0.50_0.51,lg_1,q_80,enc_avif,quality_auto/image.jpg"
                        alt="Portrait of Guramrit Kaur"
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
                <Text variant="h2" className="mt-3 text-[#243b6b]">
                  Guramrit Kaur
                </Text>
                <Text variant="body" className="mt-4 text-gray-700">
                  Founder and therapist behind Manobhav
                </Text>
              </div>

              <div className="shine-shake-card space-y-3 rounded-[1.5rem] border border-[#e6dbc8] bg-[#f8efdf]/78 p-5">
                <Text variant="body" className="font-medium text-slate-800">
                  Training
                </Text>
                <Text variant="body" className="text-gray-600">
                  Master&apos;s in Clinical Psychology
                </Text>
                <Text variant="body" className="text-gray-600">
                  Diploma in Expressive Arts Therapy, licensed by UNESCO CID
                </Text>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-[2rem] border border-[#efe4cf] bg-[#fbf4e9]/82 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f1d8d1] p-3 text-[#b57f8b]">
                <Quote size={22} />
              </div>
              <Text variant="caption" className="text-[#7d8f8a]">
                Founder&apos;s Note
              </Text>
            </div>

            <Text variant="body" className="text-lg text-gray-700">
              &quot;Manobhav was born from a deeply personal understanding of what it feels like to need empathy before
              answers. I wanted to build the kind of space that I once needed myself, a space where people can arrive as
              they are, speak honestly, and begin healing without fear of judgment.&quot;
            </Text>

            <Text variant="body" className="text-lg text-gray-700">
              &quot;My work in clinical psychology and expressive arts therapy showed me that healing is not one-size-fits-all.
              Some people need structure, some need reflection, some need creativity, and most need care that feels
              genuinely human. Manobhav exists to hold all of that with sensitivity and integrity.&quot;
            </Text>

            <div className="rounded-[1.5rem] border border-[#e8dcc8] bg-[#efe3cf]/72 p-5">
              <Text variant="body" className="text-gray-700">
                The goal is not only to make therapy available, but to make it feel accessible in the truest sense:
                emotionally safe, clinically grounded, and rooted in compassion.
              </Text>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
