import { CalendarDays, Clock } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { PatientDashboard } from '../../patientApi';
import { formatDateTime, getInitials } from '../../patientDashboardFormat';

type Props = {
  data: PatientDashboard;
};

export function PatientPastAppointmentsPage({ data }: Props) {
  const appointments = data.pastAppointments;
  const count = appointments.length;

  return (
    <main aria-label="Past appointments" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="past-appointments-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="past-appointments-title" style={{ color: theme.colors.textMain }}>
            Past appointments
          </h1>
          <CalendarDays aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <p className="text-sm" style={{ color: theme.colors.grey.text }}>
          {count} {count === 1 ? 'session' : 'sessions'} completed
        </p>
        <PastAppointmentsList appointments={appointments} />
      </section>
    </main>
  );
}

function PastAppointmentsList({ appointments }: { appointments: PatientDashboard['pastAppointments'] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-6"
        style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT }}
      >
        <CalendarDays aria-hidden="true" color={theme.colors.grey.text} size={24} />
        <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
          No past appointments yet.
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
            background: theme.colors.grey.light,
            borderColor: theme.colors.grey.DEFAULT,
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: appointment.providerAvatarColor || theme.colors.sage.DEFAULT }}
          >
            {getInitials(appointment.providerName)}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
                {appointment.providerName}
              </p>
              <StatusBadge status={appointment.status} />
            </div>
            {appointment.providerTitle && (
              <p className="truncate text-xs" style={{ color: theme.colors.grey.text }}>
                {appointment.providerTitle}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: theme.colors.grey.text }}>
              <Clock aria-hidden="true" size={12} className="inline mr-1" />
              {formatDateTime(appointment.startsAtUtc)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, { bg: string; text: string }> = {
    Completed: { bg: theme.colors.powderBlue.light, text: theme.colors.powderBlue.dark },
    Cancelled: { bg: theme.colors.dustyRose.light, text: theme.colors.dustyRose.dark },
    NoShow: { bg: '#FFF3E0', text: '#E65100' },
  };
  const tone = toneMap[status] ?? { bg: theme.colors.grey.light, text: theme.colors.grey.text };

  return (
    <span
      className="flex-none rounded-full px-3 py-0.5 text-xs font-bold"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      {status}
    </span>
  );
}
