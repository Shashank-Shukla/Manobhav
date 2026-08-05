import { FileText } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { ProviderDashboard } from '../../providerDashboardApi';

type Props = {
  data: ProviderDashboard;
};

export function ProviderWeeklyReportPage({ data }: Props) {
  const cards = [
    { id: 'sessions-total', label: 'Total sessions', value: data.metrics.sessionsTotal, tone: theme.colors.sage },
    { id: 'sessions-week', label: 'This week', value: data.metrics.sessionsThisWeek, tone: theme.colors.powderBlue },
    { id: 'upcoming', label: 'Upcoming', value: data.metrics.upcomingCount, tone: theme.colors.dustyRose },
  ];

  return (
    <main aria-label="Weekly report" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="weekly-report-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="weekly-report-title" style={{ color: theme.colors.textMain }}>
            Care snapshot
          </h1>
          <FileText aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.dustyRose.dark }}>
          Weekly report
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <MetricCard key={card.id} label={card.label} tone={card.tone} value={card.value} />
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: { light: string; DEFAULT: string; dark: string };
  value: number;
}) {
  return (
    <article
      className="rounded-lg border p-4 shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${tone.light}, ${theme.colors.white})`,
        borderColor: tone.DEFAULT,
      }}
    >
      <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold" style={{ color: tone.dark }}>
        {value}
      </p>
    </article>
  );
}
