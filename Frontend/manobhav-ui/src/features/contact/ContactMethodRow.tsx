import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

type ContactMethodRowProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

export function ContactMethodRow({ icon: Icon, label, value, href, external = false }: ContactMethodRowProps) {
  const externalProps = external ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <a
      href={href}
      {...externalProps}
      className="group flex items-center justify-between gap-6 border-b border-[#E8DDD8] py-6 transition-colors hover:border-[#84956E] md:py-8"
    >
      <span className="flex items-center gap-4 md:gap-6">
        <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#9CAF88] p-3 text-white transition-colors group-hover:bg-[#7A8C6A]">
          <Icon size={24} />
        </span>
        <span className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#84956E]">{label}</span>
          <span className="text-xl font-medium text-[#4E453C] underline-offset-4 group-hover:underline md:text-3xl">
            {value}
          </span>
        </span>
      </span>
      <ArrowUpRight
        size={28}
        className="shrink-0 text-[#B1B0AA] transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#84956E]"
      />
    </a>
  );
}
