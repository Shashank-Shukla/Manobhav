import { Bell, Clock, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../utils/theme';
import type { ProviderDashboardData } from '../providerDashboardData';

type ProviderDashboardAsideProps = {
  data: ProviderDashboardData;
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
  return (
    <div className="flex items-center justify-between gap-3">
      <div
        aria-label={`Notifications, ${data.notifications.unreadCount} unread`}
        className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full border bg-white"
        role="status"
        style={{ borderColor: theme.colors.grey.DEFAULT, color: theme.colors.dustyRose.dark }}
      >
        <Bell aria-hidden="true" size={20} />
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-xs font-bold text-white"
          style={{ backgroundColor: theme.colors.dustyRose.DEFAULT, borderColor: theme.colors.white }}
        >
          {data.notifications.unreadCount}
        </span>
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
          <Link className="text-xs font-semibold" style={{ color: theme.colors.sage.dark }} to={data.provider.profileHref}>
            View profile
          </Link>
        </div>
        <div
          aria-label={`${data.provider.name} avatar`}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
          role="img"
          style={{ backgroundColor: theme.colors.sage.DEFAULT }}
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
        <p className="text-xs font-semibold uppercase" style={{ color: theme.colors.dustyRose.dark }}>
          Calendar
        </p>
        <h2 className="text-lg font-bold" id="provider-calendar-title" style={{ color: theme.colors.textMain }}>
          This week
        </h2>
      </div>

      <ol className="grid grid-cols-7 gap-2">
        {data.calendarDays.map((day) => {
          const isToday = Boolean(day.isToday);

          return (
            <li
              aria-current={isToday ? 'date' : undefined}
              aria-label={day.ariaLabel}
              className="flex min-h-16 min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center"
              key={day.id}
              style={{
                backgroundColor: isToday ? theme.colors.sage.DEFAULT : theme.colors.grey.light,
                borderColor: isToday ? theme.colors.sage.dark : theme.colors.grey.DEFAULT,
                color: isToday ? theme.colors.white : theme.colors.grey.text,
              }}
            >
              <span className="text-[11px] font-semibold leading-none">{day.dayName}</span>
              <span className="mt-1 text-base font-bold leading-none">{day.dateLabel}</span>
              <span className="mt-1 text-[10px] font-semibold leading-none">{day.appointmentCount}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TodaysAppointments({ data }: ProviderDashboardAsideProps) {
  return (
    <section aria-label="Today's appointments" className="space-y-3" id="todays-appointments">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold" style={{ color: theme.colors.textMain }}>
          Today's appointments
        </h2>
        <span className="text-xs font-semibold" style={{ color: theme.colors.sage.dark }}>
          {data.todayAppointments.length} sessions
        </span>
      </div>

      <div className="space-y-2">
        {data.todayAppointments.map((appointment) => (
          <article
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border p-3"
            key={appointment.id}
            style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.colors.powderBlue.light, color: theme.colors.powderBlue.dark }}
            >
              {appointment.mode.toLowerCase().includes('video') ? <Video aria-hidden="true" size={17} /> : <Clock aria-hidden="true" size={17} />}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
                  {appointment.patientName}
                </p>
                <p className="flex-none text-xs font-bold" style={{ color: theme.colors.dustyRose.dark }}>
                  {appointment.time}
                </p>
              </div>
              <p className="mt-1 text-xs" style={{ color: theme.colors.grey.text }}>
                {appointment.mode} - {appointment.focus}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
