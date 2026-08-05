import { CalendarHeart, Clock } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { ProviderDashboard } from '../../providerDashboardApi';
import { formatTime } from '../../providerDashboardFormat';

type Props = {
  data: ProviderDashboard;
};

export function ProviderTodayPage({ data }: Props) {
  const appointments = data.todayAppointments;
  const count = appointments.length;

  return (
    <main aria-label="Today's appointments" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="todays-appointments-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="todays-appointments-title" style={{ color: theme.colors.textMain }}>
            Today's appointments
          </h1>
          <span className="text-xs font-semibold" style={{ color: theme.colors.sage.dark }}>
            {count} {count === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        <TodaysAppointmentsList appointments={appointments} />
      </section>
    </main>
  );
}

function TodaysAppointmentsList({ appointments }: { appointments: ProviderDashboard['todayAppointments'] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-6"
        style={{ backgroundColor: theme.colors.sage.light, borderColor: theme.colors.sage.DEFAULT }}
      >
        <CalendarHeart aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        <p className="text-sm font-semibold" style={{ color: theme.colors.sage.dark }}>
          No appointments scheduled yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <article
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border p-4 shadow-sm"
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
