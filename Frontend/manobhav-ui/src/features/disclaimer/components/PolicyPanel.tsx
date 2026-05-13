import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, X } from 'lucide-react';
import { Text } from '../../../shared/primitives/Text';

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyContent = {
  label: string;
  title: string;
  summary: string;
  sections: PolicySection[];
};

type PolicyPanelProps = {
  icon: LucideIcon;
  accent: string;
  content: PolicyContent;
  className?: string;
  mode?: 'card' | 'modal';
  onOpen?: () => void;
  onClose?: () => void;
};

const glassSurfaceStyle: CSSProperties = {
  backdropFilter: 'blur(1.4rem)',
  WebkitBackdropFilter: 'blur(1.4rem)',
  boxShadow: 'inset 0 0 0 0.3125rem rgba(255,251,247,0.72), 0 1.4rem 2.8rem rgba(62,54,80,0.14)',
};

export function PolicyPanel({
  icon: Icon,
  accent,
  content,
  className = '',
  mode = 'card',
  onOpen,
  onClose,
}: PolicyPanelProps) {
  const [openIndex, setOpenIndex] = useState(0);

  if (mode === 'card') {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${content.title}`}
        style={glassSurfaceStyle}
        className={`group relative flex h-full min-h-[18rem] flex-col items-start justify-between overflow-hidden rounded-[1rem] border border-white/35 bg-[linear-gradient(160deg,rgba(255,250,245,0.42),rgba(255,255,255,0.18))] p-6 text-left transition-all duration-500 ease-in-out hover:-translate-y-[0.35rem] hover:shadow-[inset_0_0_0_0.3125rem_rgba(255,251,247,0.78),0_1.8rem_3.2rem_rgba(62,54,80,0.16)] ${className}`}
      >
        <div
          className="absolute inset-x-0 top-0 h-[38%] rounded-t-[1rem] opacity-80"
          style={{ background: `linear-gradient(160deg, ${accent}, rgba(255,255,255,0))` }}
        />

        <div className="relative z-10 flex w-full items-start justify-between gap-4">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/65 shadow-[0_1rem_1.8rem_rgba(36,59,107,0.08)]"
            style={{ backgroundColor: accent }}
          >
            <Icon size={24} className="text-[#243b6b]" />
          </div>
          <span className="rounded-full border border-white/55 bg-white/38 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#6f827d]">
            {content.label}
          </span>
        </div>

        <div className="relative z-10 mt-6">
          <Text variant="h3" className="text-[#243b6b]">
            {content.title}
          </Text>
          <Text variant="body" className="mt-3 text-sm text-[#5a6470]">
            {content.summary}
          </Text>
        </div>

        <div className="relative z-10 mt-6 flex w-full items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {content.sections.slice(0, 2).map((section) => (
              <span
                key={section.title}
                className="rounded-full border border-white/55 bg-white/34 px-3 py-1 text-[0.76rem] text-[#5d6672]"
              >
                {section.title}
              </span>
            ))}
          </div>
          <span className="rounded-full bg-white/44 px-3 py-2 text-[0.82rem] font-medium text-[#243b6b] transition-transform duration-500 ease-in-out group-hover:translate-x-[0.2rem]">
            Open
          </span>
        </div>
      </button>
    );
  }

  return (
    <article
      aria-label={`${content.title} policy`}
      style={glassSurfaceStyle}
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1rem] border border-white/38 bg-[linear-gradient(160deg,rgba(255,248,243,0.58),rgba(255,255,255,0.22))] ${className}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-[28%] opacity-75"
        style={{ background: `linear-gradient(180deg, ${accent}, rgba(255,255,255,0))` }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4 px-6 pb-4 pt-6">
        <div className="flex items-start gap-4">
          <div
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/65 shadow-[0_1rem_1.8rem_rgba(36,59,107,0.08)]"
            style={{ backgroundColor: accent }}
          >
            <Icon size={24} className="text-[#243b6b]" />
          </div>
          <div>
            <span className="inline-flex rounded-full border border-white/55 bg-white/34 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#6f827d]">
              {content.label}
            </span>
            <Text variant="h3" className="mt-4 text-[#243b6b]">
              {content.title}
            </Text>
            <Text variant="body" className="mt-2 max-w-2xl text-sm text-[#596473]">
              {content.summary}
            </Text>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${content.title}`}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/65 bg-white/54 text-[#243b6b] shadow-[0_0.9rem_1.8rem_rgba(36,59,107,0.08)] transition-all duration-500 ease-in-out hover:-translate-y-[0.12rem] hover:bg-white/72"
        >
          <X size={22} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-4">
          {content.sections.map((section, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={section.title}
                className="overflow-hidden rounded-[1rem] border border-white/42 bg-[linear-gradient(160deg,rgba(255,253,249,0.56),rgba(255,255,255,0.22))] shadow-[0_0.8rem_1.8rem_rgba(36,59,107,0.05)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <Text variant="body" className="font-medium text-[#243b6b]">
                    {section.title}
                  </Text>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-[#243b6b] transition-transform duration-500 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-white/38 px-5 py-4">
                      {section.paragraphs?.map((paragraph) => (
                        <Text key={paragraph} variant="body" className="text-sm text-[#596473] not-first:mt-3">
                          {paragraph}
                        </Text>
                      ))}

                      {section.bullets && (
                        <ul className="space-y-3">
                          {section.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-[#596473]">
                              <span
                                className="mt-[0.6rem] h-[0.55rem] w-[0.55rem] shrink-0 rounded-full"
                                style={{ backgroundColor: accent }}
                              />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
