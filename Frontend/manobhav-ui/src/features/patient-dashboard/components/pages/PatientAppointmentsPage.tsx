import { useCallback, useState } from 'react';
import { CalendarCheck, Clock, Sparkles, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../../utils/theme';
import { ApiError } from '../../../../shared/api/apiClient';
import { cancelPatientAppointment, type PatientAppointment, type PatientDashboard } from '../../patientApi';
import { formatDateTime, formatTime, getInitials } from '../../patientDashboardFormat';

type Props = {
  data: PatientDashboard;
};

export function PatientAppointmentsPage({ data }: Props) {
  const appointments = data.upcomingAppointments;

  return (
    <main aria-label="Upcoming appointments" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="upcoming-appointments-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="upcoming-appointments-title" style={{ color: theme.colors.textMain }}>
            Upcoming appointments
          </h1>
          <CalendarCheck aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <p className="text-sm" style={{ color: theme.colors.grey.text }}>
          {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} scheduled
        </p>
        <AppointmentList appointments={appointments} />
      </section>
    </main>
  );
}

function AppointmentList({ appointments }: { appointments: PatientAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-6"
        style={{ backgroundColor: theme.colors.sage.light, borderColor: theme.colors.sage.DEFAULT }}
      >
        <Sparkles aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        <p className="text-sm font-semibold" style={{ color: theme.colors.sage.dark }}>
          No upcoming appointments. Browse providers to book your next session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: PatientAppointment }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    setError(null);
    try {
      await cancelPatientAppointment(appointment.id);
      window.location.reload();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setCancelling(false);
    }
  }, [appointment.id]);

  return (
    <article
      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border p-4 shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.powderBlue.light}, ${theme.colors.white})`,
        borderColor: theme.colors.powderBlue.DEFAULT,
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
          <div className="min-w-0">
            <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
              {appointment.providerName}
            </p>
            {appointment.providerTitle && (
              <p className="truncate text-xs" style={{ color: theme.colors.grey.text }}>
                {appointment.providerTitle}
              </p>
            )}
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="mt-1 text-xs" style={{ color: theme.colors.grey.text }}>
          <Clock aria-hidden="true" size={12} className="inline mr-1" />
          {formatDateTime(appointment.startsAtUtc)} – {formatTime(appointment.endsAtUtc)}
        </p>
        {error && (
          <p className="mt-2 text-xs font-semibold" style={{ color: theme.colors.dustyRose.dark }}>
            {error}
          </p>
        )}
        {appointment.canModify && (
          <div className="mt-3 flex flex-wrap gap-2">
            {appointment.canJoin && (
              <Link
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ backgroundColor: theme.colors.sage.DEFAULT }}
                to="/appointment"
              >
                <Video aria-hidden="true" size={14} />
                Join Session
              </Link>
            )}
            <button
              type="button"
              className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-sm"
              disabled={cancelling}
              onClick={handleCancel}
              style={{
                borderColor: theme.colors.dustyRose.DEFAULT,
                color: theme.colors.dustyRose.dark,
                backgroundColor: theme.colors.white,
              }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, { bg: string; text: string }> = {
    Scheduled: { bg: theme.colors.sage.light, text: theme.colors.sage.dark },
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

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
