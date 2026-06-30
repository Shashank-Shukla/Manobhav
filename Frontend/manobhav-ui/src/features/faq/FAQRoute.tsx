import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MessageCircleHeart } from 'lucide-react';
import faqSections from '../../assets/faqSections.json';
import { RollingSectionWave } from '../../shared/interactive/AboutVectors';
import { Button } from '../../shared/primitives/Button';
import { Text } from '../../shared/primitives/Text';

type FAQItem = {
  question: string;
  answer: string;
};

type FAQSection = {
  title: string;
  items: FAQItem[];
};

function FAQIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute -left-6 top-10 h-28 w-28 rounded-full bg-[#CFE6EC]/70 blur-3xl" />
      <div className="absolute -right-3 bottom-10 h-32 w-32 rounded-full bg-[#B0CED6]/75 blur-3xl" />
      <div className="relative rounded-[2.4rem] border border-[#D3E6EB] bg-[#F4FAFB]/86 p-6 shadow-[0_24px_60px_rgba(36,59,107,0.08)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#E1EFF3] p-8">
          <div className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-[#243b6b]/18 to-transparent" />
          <div className="absolute inset-x-8 bottom-8 h-px bg-gradient-to-r from-transparent via-[#243b6b]/18 to-transparent" />
          <div className="grid gap-4">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="animate-fade-slide rounded-[1.4rem] border border-[#D3E6EB] bg-[#FFFFFF]/95 p-4 shadow-[0_10px_30px_rgba(36,59,107,0.04)]"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="h-3 w-3 rounded-full bg-[#8BAAB3]" />
                  <span className="h-2 w-16 rounded-full bg-[#B0CED6]" />
                </div>
                <div className="h-3 w-3/4 rounded-full bg-[#243b6b]/10" />
                <div className="mt-2 h-3 w-1/2 rounded-full bg-[#243b6b]/8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQAccordion({
  section,
  sectionIndex,
}: {
  section: FAQSection;
  sectionIndex: number;
}) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="rounded-[2.2rem] border border-[#D3E6EB] bg-[#FFFFFF]/88 p-6 shadow-[0_18px_44px_rgba(36,59,107,0.05)]">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex rounded-full bg-[#D7EAEE] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#243b6b]">
          {section.title}
        </span>
      </div>

      <div className="space-y-3">
        {section.items.map((item, itemIndex) => {
          const isOpen = openIndex === itemIndex;
          return (
            <div
              key={item.question}
              className="overflow-hidden rounded-[1.6rem] border border-[#D3E6EB] bg-[#EBF5F7]/86"
              style={{ animationDelay: `${sectionIndex * 120 + itemIndex * 50}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : itemIndex)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <Text variant="body" className="font-medium text-slate-800">
                  {item.question}
                </Text>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-[#243b6b] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-[#D3E6EB] px-5 py-4">
                    <Text variant="body" className="text-gray-600">
                      {item.answer}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FAQPage() {
  const navigate = useNavigate();
  const sections = useMemo(() => faqSections as FAQSection[], []);

  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative overflow-hidden bg-[#EBF5F7] px-6 pb-20 pt-32 md:pb-24 md:pt-36">
        <RollingSectionWave className="absolute left-0 top-0 h-24 w-full md:h-32" fill="#EBF5F7" />
        <RollingSectionWave className="absolute bottom-0 left-0 h-24 w-full rotate-180 md:h-32" fill="#EBF5F7" />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[10%] top-36 h-36 w-36 rounded-full bg-[#CFE6EC]/55 blur-3xl" />
          <div className="absolute right-[12%] top-28 h-32 w-32 rounded-full bg-[#B0CED6]/60 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-xl space-y-6">
            <Text variant="caption" className="text-[#8BAAB3]">
              FAQ
            </Text>
            <Text variant="h1" className="text-[#243b6b]">
              Frequently Asked Questions
            </Text>
            <Text variant="body" className="text-lg text-gray-600">
              Common questions about starting therapy, sessions, privacy, and how care at Manobhav is intended to feel.
            </Text>
            <div className="inline-flex rounded-full border border-[#B0CED6] bg-[#F4FAFB] px-5 py-3 text-sm font-medium text-[#5f6770]">
              Calm answers, practical guidance, no jargon.
            </div>
          </div>

          <FAQIllustration />
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#E1EFF3] px-6 py-20 md:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-24 h-32 w-32 rounded-full bg-[#CFE6EC]/35 blur-3xl" />
          <div className="absolute bottom-24 right-[10%] h-36 w-36 rounded-full bg-[#B0CED6]/40 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8">
          {sections.map((section, index) => (
            <FAQAccordion key={section.title} section={section} sectionIndex={index} />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#EBF5F7] px-6 pb-20 pt-10 md:pb-24">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-[#D3E6EB] bg-[#F4FAFB]/88 p-8 text-center shadow-[0_22px_52px_rgba(36,59,107,0.06)] md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-2xl bg-[#D7EAEE] p-4 text-[#243b6b]">
            <MessageCircleHeart size={26} />
          </div>
          <Text variant="h2" className="text-[#243b6b]">
            Still have a question?
          </Text>
          <Text variant="body" className="mx-auto mt-4 max-w-2xl text-gray-600">
            If something still feels unclear, the next step does not have to be complicated. Explore providers or reach out when you feel ready.
          </Text>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              variant="primary"
              onClick={() => navigate('/providers')}
              className="bg-gradient-to-r from-[#9CAF88] to-[#bcd0a6] text-white shadow-sm hover:from-[#7A8C6A] hover:to-[#9CAF88] hover:shadow-md"
            >
              Browse Providers
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-[#8BAAB3] text-[#5b7d86] hover:bg-[#B0CED6] hover:text-white"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FAQPage;
