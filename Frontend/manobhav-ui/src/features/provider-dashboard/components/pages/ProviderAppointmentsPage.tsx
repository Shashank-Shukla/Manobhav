import { CalendarCheck, CalendarHeart, Clock } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { ProviderDashboard } from '../../providerDashboardApi';
import { formatTime } from '../../providerDashboardFormat';

type Props = {
  data: ProviderDashboard;
};

export function ProviderAppointmentsPage({ data }: Props) {
  const appointments = data.upcomingAppointments;

  return (
    <main aria-label="My appointments" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="my-appointments-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="my-appointments-title" style={{ color: theme.colors.textMain }}>
            My appointments
          </h1>
          <CalendarCheck aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <p className="text-sm" style={{ color: theme.colors.grey.text }}>
          {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} upcoming
        </p>
        <AppointmentList appointments={appointments} />
      </section>
    </main>
  );
}

function AppointmentList({ appointments }: { appointments: ProviderDashboard['upcomingAppointments'] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-6"
        style={{ backgroundColor: theme.colors.powderBlue.light, borderColor: theme.colors.powderBlue.DEFAULT }}
      >
        <CalendarHeart aria-hidden="true" color={theme.colors.powderBlue.dark} size={24} />
        <div>
          <p className="text-sm font-bold" style={{ color: theme.colors.textMain }}>
            Your week is open
          </p>
          <p className="mt-1 text-xs" style={{ color: theme.colors.grey.text }}>
            New appointments will appear here as patients book with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <article
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-4 shadow-sm"
          key={appointment.id}
          style={{ borderColor: theme.colors.sage.light }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: theme.colors.sage.light, color: theme.colors.sage.dark }}
          >
            <Clock aria-hidden="true" size={17} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
              {appointment.patientName}
            </p>
            <p className="mt-1 text-xs" style={{ color: theme.colors.grey.text }}>
              {formatTime(appointment.startsAtUtc)} - Session
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
