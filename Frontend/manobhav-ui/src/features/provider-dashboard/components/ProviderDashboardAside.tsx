import { Bell, CalendarHeart, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../utils/theme';
import type { ProviderDashboard } from '../providerDashboardApi';
import { formatCalendarAria, formatDayOfMonth, formatTime, formatWeekday } from '../providerDashboardFormat';

type ProviderDashboardAsideProps = {
  data: ProviderDashboard;
};

export function ProviderDashboardAside({ data }: ProviderDashboardAsideProps) {
  return (
    <aside
      aria-label="Provider schedule"
      className="min-w-0 border-t px-4 py-5 sm:px-6 lg:border-l lg:border-t-0 lg:px-5 lg:py-6"
      style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
    >
      <div className="space-y-5">
        <TopRail data={data} />
        <DayWiseCalendar data={data} />
        <TodaysAppointments data={data} />
      </div>
    </aside>
  );
}

function TopRail({ data }: ProviderDashboardAsideProps) {
  const { unreadCount } = data.notifications;

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full border"
        role="status"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.dustyRose.light}, ${theme.colors.white})`,
          borderColor: theme.colors.dustyRose.DEFAULT,
          color: theme.colors.dustyRose.dark,
        }}
      >
        <Bell aria-hidden="true" size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-xs font-bold text-white"
            style={{ backgroundColor: theme.colors.dustyRose.DEFAULT, borderColor: theme.colors.white }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      <div
        aria-label="Provider profile"
        className="flex min-w-0 flex-1 items-center justify-end gap-3"
        role="group"
      >
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
            {data.provider.name}
          </p>
          <Link
            className="text-xs font-semibold"
            style={{ color: theme.colors.sage.dark }}
            to="/dashboard#dashboard-overview"
          >
            View profile
          </Link>
        </div>
        <div
          aria-label={`${data.provider.name} avatar`}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
          role="img"
          style={{ backgroundColor: data.provider.avatarColor || theme.colors.sage.DEFAULT }}
        >
          {data.provider.avatarInitials}
        </div>
      </div>
    </div>
  );
}

function DayWiseCalendar({ data }: ProviderDashboardAsideProps) {
  return (
    <section aria-labelledby="provider-calendar-title" className="space-y-3" id="provider-calendar">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.dustyRose.dark }}>
          Calendar
        </p>
        <h2 className="text-lg font-bold" id="provider-calendar-title" style={{ color: theme.colors.textMain }}>
          This week
        </h2>
      </div>

      <WeekCalendar days={data.weekCalendar} />
    </section>
  );
}

function WeekCalendar({ days }: { days: ProviderDashboard['weekCalendar'] }) {
  if (days.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs font-semibold"
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

function TodaysAppointments({ data }: ProviderDashboardAsideProps) {
  const appointments = data.todayAppointments;
  const count = appointments.length;

  return (
    <section aria-label="Today's appointments" className="space-y-3" id="todays-appointments">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold" style={{ color: theme.colors.textMain }}>
          Today's appointments
        </h2>
        <span className="text-xs font-semibold" style={{ color: theme.colors.sage.dark }}>
          {count} {count === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      <TodaysAppointmentsList appointments={appointments} />
    </section>
  );
}

function TodaysAppointmentsList({ appointments }: { appointments: ProviderDashboard['todayAppointments'] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-4"
        style={{ backgroundColor: theme.colors.sage.light, borderColor: theme.colors.sage.DEFAULT }}
      >
        <CalendarHeart aria-hidden="true" color={theme.colors.sage.dark} size={20} />
        <p className="text-sm font-semibold" style={{ color: theme.colors.sage.dark }}>
          No appointments scheduled yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => (
        <article
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border p-3 shadow-sm"
          key={appointment.id}
          style={{
            background: `linear-gradient(135deg, ${theme.colors.powderBlue.light}, ${theme.colors.white})`,
            borderColor: theme.colors.powderBlue.DEFAULT,
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: theme.colors.powderBlue.DEFAULT, color: theme.colors.white }}
          >
            <Clock aria-hidden="true" size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
                {appointment.patientName}
              </p>
              <p className="flex-none text-xs font-bold" style={{ color: theme.colors.dustyRose.dark }}>
                {formatTime(appointment.startsAtUtc)}
              </p>
            </div>
            <p className="mt-1 text-xs" style={{ color: theme.colors.grey.text }}>
              Session
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
