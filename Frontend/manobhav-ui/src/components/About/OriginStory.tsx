import { BookOpen, HeartHandshake, Lightbulb, School } from 'lucide-react';
import { SectionReveal } from './SectionReveal';

const storyPoints = [
  {
    title: 'It started in school',
    copy:
      "While dealing with anxiety in school, Guramrit Kaur experienced how much the right support can matter at the right time.",
    icon: School,
    accent: '#dcecf1',
  },
  {
    title: 'A teacher changed the direction',
    copy:
      'In 11th grade, a psychology teacher offered empathy, clarity, and encouragement, turning a difficult phase into the beginning of a calling.',
    icon: HeartHandshake,
    accent: '#f6d8cf',
  },
  {
    title: 'Training gave the work depth',
    copy:
      'That experience led to formal study in Clinical Psychology and Expressive Arts Therapy, shaping a way of healing that is both grounded and creative.',
    icon: BookOpen,
    accent: '#dce7d6',
  },
  {
    title: 'Manobhav came from a real gap',
    copy:
      'Over time, one truth became clear: many people need help, but struggle to find trained, empathetic professionals who feel safe to open up to. Manobhav was created in response to that gap.',
    icon: Lightbulb,
    accent: '#f2e4b8',
  },
];

function StoryWave() {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className="absolute left-0 top-0 h-24 w-full md:h-32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 138C113 103 240 96 365 126C473 152 580 205 694 196C817 187 917 117 1030 89C1159 58 1297 83 1440 46V220H0V138Z"
        fill="#f5efe3"
      />
    </svg>
  );
}

function ChildVector() {
  return (
    <svg viewBox="0 0 220 220" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="112" cy="198" rx="62" ry="14" fill="#dfe8ef" />
      <circle cx="110" cy="74" r="26" fill="#f3c8b5" />
      <path d="M86 69C86 45 99 34 113 34C132 34 142 50 141 70C126 63 115 64 96 73C92 75 89 72 86 69Z" fill="#243b6b" />
      <path d="M92 72C101 61 123 57 136 66C136 51 126 42 113 42C101 42 91 52 92 72Z" fill="#314a7a" />
      <rect x="80" y="102" width="60" height="58" rx="22" fill="#ef9f93" />
      <path d="M96 102H124V127C124 135 118 142 110 142C102 142 96 135 96 127V102Z" fill="#fffaf4" />
      <path d="M88 118C75 124 71 139 74 157" stroke="#f3c8b5" strokeWidth="8" strokeLinecap="round" />
      <path d="M132 118C145 126 149 140 146 156" stroke="#f3c8b5" strokeWidth="8" strokeLinecap="round" />
      <path d="M101 160L97 191" stroke="#243b6b" strokeWidth="8" strokeLinecap="round" />
      <path d="M121 160L126 191" stroke="#243b6b" strokeWidth="8" strokeLinecap="round" />
      <path d="M90 193H105" stroke="#243b6b" strokeWidth="8" strokeLinecap="round" />
      <path d="M117 193H132" stroke="#243b6b" strokeWidth="8" strokeLinecap="round" />
      <circle cx="101" cy="76" r="2.8" fill="#243b6b" />
      <circle cx="120" cy="76" r="2.8" fill="#243b6b" />
      <path d="M103 88C107 92 114 92 118 88" stroke="#d27f75" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AdultWomanVector() {
  return (
    <svg viewBox="0 0 260 260" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="132" cy="232" rx="74" ry="16" fill="#dfe8ef" />
      <circle cx="132" cy="82" r="30" fill="#f1c4b1" />
      <path
        d="M104 82C100 52 116 34 136 34C159 34 175 52 172 86C160 74 145 70 132 70C120 70 111 75 104 82Z"
        fill="#243b6b"
      />
      <path d="M108 86C110 61 124 48 140 48C156 48 167 62 165 85C156 77 145 74 133 74C122 74 114 78 108 86Z" fill="#314a7a" />
      <rect x="92" y="118" width="82" height="86" rx="30" fill="#bcd4df" />
      <path d="M115 118H151V152C151 162 143 170 133 170C123 170 115 162 115 152V118Z" fill="#fffaf4" />
      <path d="M100 136C82 146 77 165 80 186" stroke="#f1c4b1" strokeWidth="10" strokeLinecap="round" />
      <path d="M165 138C183 149 188 165 184 186" stroke="#f1c4b1" strokeWidth="10" strokeLinecap="round" />
      <path d="M119 202L112 228" stroke="#243b6b" strokeWidth="10" strokeLinecap="round" />
      <path d="M149 202L156 228" stroke="#243b6b" strokeWidth="10" strokeLinecap="round" />
      <path d="M103 230H120" stroke="#243b6b" strokeWidth="10" strokeLinecap="round" />
      <path d="M147 230H164" stroke="#243b6b" strokeWidth="10" strokeLinecap="round" />
      <circle cx="121" cy="84" r="3" fill="#243b6b" />
      <circle cx="143" cy="84" r="3" fill="#243b6b" />
      <path d="M123 98C128 103 137 103 142 98" stroke="#d27f75" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function WavyThread() {
  return (
    <svg
      viewBox="0 0 1200 520"
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M162 132C245 158 275 222 353 245C441 271 521 209 610 230C713 254 748 336 843 359C930 380 1001 340 1052 306"
        fill="none"
        stroke="#d9a69b"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="8 10"
        opacity="0.95"
      />
      <path
        d="M176 126C260 151 288 213 366 237C454 264 533 202 622 224C723 249 758 328 853 351C939 372 1008 334 1064 296"
        fill="none"
        stroke="#9ebfc8"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function StoryIllustrationBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <WavyThread />
      <div className="absolute left-[2%] top-16 hidden h-44 w-44 opacity-75 lg:block xl:h-52 xl:w-52">
        <ChildVector />
      </div>
      <div className="absolute bottom-10 right-[2%] hidden h-52 w-52 opacity-75 lg:block xl:h-60 xl:w-60">
        <AdultWomanVector />
      </div>
    </div>
  );
}

export function OriginStory() {
  return (
    <section className="relative overflow-hidden bg-[#f5efe3] px-6 pb-28 pt-24 md:pb-32 md:pt-28">
      <StoryWave />
      <StoryIllustrationBackground />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-44 h-28 w-28 rounded-full bg-white/35 blur-3xl" />
        <div className="absolute right-[12%] bottom-24 h-36 w-36 rounded-full bg-[#e4edf1] blur-3xl" />
      </div>

      <SectionReveal className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
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
            {storyPoints.map((point) => {
              const Icon = point.icon;

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
