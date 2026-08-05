import { CalendarDays } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { ProviderDashboard } from '../../providerDashboardApi';
import { formatCalendarAria, formatDayOfMonth, formatWeekday } from '../../providerDashboardFormat';

type Props = {
  data: ProviderDashboard;
};

export function ProviderCalendarPage({ data }: Props) {
  const days = data.weekCalendar;

  return (
    <main aria-label="This week calendar" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="provider-calendar-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="provider-calendar-title" style={{ color: theme.colors.textMain }}>
            This week
          </h1>
          <CalendarDays aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.dustyRose.dark }}>
          Calendar
        </p>
        <WeekCalendar days={days} />
      </section>
    </main>
  );
}

function WeekCalendar({ days }: { days: ProviderDashboard['weekCalendar'] }) {
  if (days.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed px-3 py-4 text-center text-xs font-semibold"
        style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT, color: theme.colors.grey.text }}
      >
        Your week is open
      </p>
    );
  }

  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map((day) => (
        <CalendarDay key={day.dateUtc} day={day} />
      ))}
    </ol>
  );
}

function CalendarDay({ day }: { day: ProviderDashboard['weekCalendar'][number] }) {
  return (
    <li
      aria-current={day.isToday ? 'date' : undefined}
      aria-label={formatCalendarAria(day.dateUtc, day.isToday)}
      className="flex min-h-16 min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center"
      style={{
        background: day.isToday
          ? `linear-gradient(135deg, ${theme.colors.sage.DEFAULT}, ${theme.colors.sage.dark})`
          : theme.colors.grey.light,
        borderColor: day.isToday ? theme.colors.sage.dark : theme.colors.grey.DEFAULT,
        color: day.isToday ? theme.colors.white : theme.colors.grey.text,
      }}
    >
      <span className="text-[11px] font-semibold leading-none">{formatWeekday(day.dateUtc)}</span>
      <span className="mt-1 text-base font-bold leading-none">{formatDayOfMonth(day.dateUtc)}</span>
      <span className="mt-1 text-[10px] font-semibold leading-none">{day.appointmentCount}</span>
    </li>
  );
}
