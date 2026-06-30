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
      className="group flex items-center justify-between gap-6 border-b border-slate-200 py-6 transition-colors hover:border-[#243b6b] md:py-8"
    >
      <span className="flex items-center gap-4 md:gap-6">
        <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#EBF5F7] p-3 text-[#243b6b] transition-colors group-hover:bg-[#243b6b] group-hover:text-white">
          <Icon size={24} />
        </span>
        <span className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8BAAB3]">{label}</span>
          <span className="text-xl font-medium text-slate-800 underline-offset-4 group-hover:underline md:text-3xl">
            {value}
          </span>
        </span>
      </span>
      <ArrowUpRight
        size={28}
        className="shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#243b6b]"
      />
    </a>
  );
}
