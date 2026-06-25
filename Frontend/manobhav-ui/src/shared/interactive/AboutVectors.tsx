type BaseVectorProps = {
  className?: string;
};

export function HeroLeafVector({
  className,
  color,
}: BaseVectorProps & {
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 120 200"
      className={className ?? ''}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M60 195V25" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M60 48C28 36 18 14 14 0C46 4 66 16 72 44C76 64 68 78 60 88C50 76 42 62 60 48Z"
        fill={color}
        opacity="0.82"
      />
      <path
        d="M60 94C24 84 8 58 0 40C38 42 62 52 70 84C76 108 70 126 60 138C48 124 40 110 60 94Z"
        fill={color}
        opacity="0.72"
      />
      <path
        d="M60 140C28 128 14 104 8 84C44 88 66 100 72 132C76 152 70 170 60 182C48 168 40 156 60 140Z"
        fill={color}
        opacity="0.62"
      />
      <path d="M60 58C82 44 96 26 106 10C104 42 92 60 60 74" fill={color} opacity="0.58" />
      <path d="M60 106C86 90 102 72 112 56C112 92 98 112 60 124" fill={color} opacity="0.48" />
    </svg>
  );
}

export function AboutBottomWave({ className, fill = '#FCF2F5' }: BaseVectorProps & { fill?: string }) {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className={className ?? ''}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 164C121 131 235 135 341 166C451 199 565 219 687 191C805 165 906 95 1023 80C1150 64 1288 106 1440 57V220H0V164Z"
        fill={fill}
      />
    </svg>
  );
}

export function ScrollArrowIcon({ className }: BaseVectorProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? ''}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 14L12 19L17 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RollingSectionWave({
  className,
  fill = '#FCF2F5',
}: BaseVectorProps & {
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="none"
      className={className ?? ''}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 130C115 91 231 87 346 120C453 150 559 206 687 190C820 173 899 106 1020 84C1150 61 1285 90 1440 54V240H0V130Z"
        fill={fill}
      />
    </svg>
  );
}

export function OrganicBlob({
  className,
  color,
}: BaseVectorProps & {
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={className ?? ''}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M48.6,-73.6C63.9,-66.8,77.8,-54,84.2,-38.7C90.6,-23.3,89.4,-5.5,84.7,11.1C80,27.7,71.8,43.2,60.2,55.7C48.6,68.3,33.7,77.9,17.4,82.7C1.1,87.5,-16.6,87.5,-31.7,81.7C-46.8,75.9,-59.2,64.3,-68,50.2C-76.9,36.1,-82.3,19.5,-83.3,2.5C-84.3,-14.4,-80.9,-31.8,-72.3,-45.8C-63.7,-59.8,-49.8,-70.5,-35.1,-77.2C-20.4,-83.9,-4.8,-86.5,10.3,-84.1C25.4,-81.7,33.3,-80.4,48.6,-73.6Z"
        fill={color}
        opacity="0.7"
      />
    </svg>
  );
}

export function StoryTopWave({ className, fill = '#FBF1F4' }: BaseVectorProps & { fill?: string }) {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className={className ?? ''}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 138C113 103 240 96 365 126C473 152 580 205 694 196C817 187 917 117 1030 89C1159 58 1297 83 1440 46V220H0V138Z"
        fill={fill}
      />
    </svg>
  );
}

export function ChildVectorIllustration({ className }: BaseVectorProps) {
  return (
    <svg viewBox="0 0 220 220" className={className ?? ''} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="112" cy="198" rx="62" ry="14" fill="#dfe8ef" />
      <circle cx="110" cy="74" r="26" fill="#f3c8b5" />
      <path d="M86 69C86 45 99 34 113 34C132 34 142 50 141 70C126 63 115 64 96 73C92 75 89 72 86 69Z" fill="#243b6b" />
      <path d="M92 72C101 61 123 57 136 66C136 51 126 42 113 42C101 42 91 52 92 72Z" fill="#314a7a" />
      <rect x="80" y="102" width="60" height="58" rx="22" fill="#ef9f93" />
      <path d="M96 102H124V127C124 135 118 142 110 142C102 142 96 135 96 127V102Z" fill="#FDF4F6" />
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

export function AdultWomanVectorIllustration({ className }: BaseVectorProps) {
  return (
    <svg viewBox="0 0 260 260" className={className ?? ''} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="132" cy="232" rx="74" ry="16" fill="#dfe8ef" />
      <circle cx="132" cy="82" r="30" fill="#f1c4b1" />
      <path
        d="M104 82C100 52 116 34 136 34C159 34 175 52 172 86C160 74 145 70 132 70C120 70 111 75 104 82Z"
        fill="#243b6b"
      />
      <path d="M108 86C110 61 124 48 140 48C156 48 167 62 165 85C156 77 145 74 133 74C122 74 114 78 108 86Z" fill="#314a7a" />
      <rect x="92" y="118" width="82" height="86" rx="30" fill="#bcd4df" />
      <path d="M115 118H151V152C151 162 143 170 133 170C123 170 115 162 115 152V118Z" fill="#FDF4F6" />
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

export function WavyThreadIllustration({ className }: BaseVectorProps) {
  return (
    <svg
      viewBox="0 0 1200 520"
      className={className ?? ''}
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
