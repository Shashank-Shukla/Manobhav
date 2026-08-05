import { useCallback, useState } from 'react';
import { CalendarCheck, Clock, ClipboardList, Sparkles, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../utils/theme';
import { ApiError } from '../../../shared/api/apiClient';
import { cancelPatientAppointment, type PatientAppointment, type PatientDashboard, type PatientIntakeSummary } from '../patientApi';
import { formatDateTime, formatTime, getInitials } from '../patientDashboardFormat';

type PatientDashboardMainProps = {
  data: PatientDashboard;
};

export function PatientDashboardMain({ data }: PatientDashboardMainProps) {
  return (
    <main aria-label="Patient dashboard" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-label="Dashboard activity" className="space-y-5" id="dashboard-overview">
        <GreetingCard data={data} />
        <MetricsRow data={data} />
        <UpcomingAppointments data={data} />
        <IntakeSummarySection intake={data.intake} />
      </section>
    </main>
  );
}

function GreetingCard({ data }: PatientDashboardMainProps) {
  const name = data.profile.preferredName || data.profile.fullName;

  return (
    <section
      aria-labelledby="patient-greeting-title"
      className="grid gap-4 rounded-lg border p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.sage.light}, ${theme.colors.powderBlue.light})`,
        borderColor: theme.colors.sage.DEFAULT,
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.sage.dark }}>
          Patient dashboard
        </p>
        <h1
          className="mt-2 text-2xl font-bold leading-tight sm:text-3xl"
          id="patient-greeting-title"
          style={{ color: theme.colors.textMain }}
        >
          Welcome, {name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: theme.colors.grey.text }}>
          {getGreetingSummary(data)}
        </p>
      </div>

      <ProfileAvatar profile={data.profile} />
    </section>
  );
}

function getGreetingSummary(data: PatientDashboard): string {
  const upcoming = data.metrics.upcomingCount;
  if (upcoming === 0) {
    return 'No upcoming appointments. Browse providers to book your next session.';
  }
  const noun = upcoming === 1 ? 'appointment' : 'appointments';
  return `You have ${upcoming} upcoming ${noun}. Your care journey continues here.`;
}

function ProfileAvatar({ profile }: { profile: PatientDashboard['profile'] }) {
  return (
    <div className="hidden justify-center sm:flex">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
        style={{ backgroundColor: theme.colors.sage.DEFAULT }}
      >
        {profile.avatarInitials || getInitials(profile.fullName)}
      </div>
    </div>
  );
}

function MetricsRow({ data }: PatientDashboardMainProps) {
  const cards = [
    { id: 'upcoming', label: 'Upcoming', value: data.metrics.upcomingCount, tone: theme.colors.sage },
    { id: 'completed', label: 'Completed', value: data.metrics.completedCount, tone: theme.colors.powderBlue },
    { id: 'cancelled', label: 'Cancelled', value: data.metrics.cancelledCount, tone: theme.colors.dustyRose },
  ];

  return (
    <section aria-labelledby="metrics-title" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.dustyRose.dark }}>
          Care snapshot
        </p>
        <h2 className="text-xl font-bold" id="metrics-title" style={{ color: theme.colors.textMain }}>
          Your activity
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <MetricCard key={card.id} label={card.label} tone={card.tone} value={card.value} />
        ))}
      </div>
    </section>
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

function UpcomingAppointments({ data }: PatientDashboardMainProps) {
  const appointments = data.upcomingAppointments;

  return (
    <section aria-labelledby="upcoming-appointments-title" className="space-y-3" id="upcoming-appointments">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="upcoming-appointments-title" style={{ color: theme.colors.textMain }}>
          Upcoming appointments
        </h2>
        <CalendarCheck aria-hidden="true" color={theme.colors.sage.dark} size={22} />
      </div>

      <AppointmentList appointments={appointments} />
    </section>
  );
}

function AppointmentList({ appointments }: { appointments: PatientAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-4"
        style={{ backgroundColor: theme.colors.sage.light, borderColor: theme.colors.sage.DEFAULT }}
      >
        <Sparkles aria-hidden="true" color={theme.colors.sage.dark} size={20} />
        <p className="text-sm font-semibold" style={{ color: theme.colors.sage.dark }}>
          No upcoming appointments. Browse providers to book your next session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border p-3 shadow-sm"
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
                to={`/appointment`}
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

function IntakeSummarySection({ intake }: { intake: PatientIntakeSummary }) {
  if (!intake.submissionId) {
    return (
      <section aria-labelledby="intake-summary-title" className="space-y-3" id="intake-summary">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold" id="intake-summary-title" style={{ color: theme.colors.textMain }}>
            Intake summary
          </h2>
          <ClipboardList aria-hidden="true" color={theme.colors.sage.dark} size={22} />
        </div>
        <div
          className="flex items-center gap-3 rounded-lg border border-dashed p-4"
          style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT }}
        >
          <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
            No intake form submitted yet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="intake-summary-title" className="space-y-3" id="intake-summary">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="intake-summary-title" style={{ color: theme.colors.textMain }}>
          Intake summary
        </h2>
        <ClipboardList aria-hidden="true" color={theme.colors.sage.dark} size={22} />
      </div>

      <div
        className="space-y-3 rounded-lg border p-4 shadow-sm"
        style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={intake.status ?? 'Unknown'} />
          {intake.submittedAtUtc && (
            <p className="text-xs" style={{ color: theme.colors.grey.text }}>
              Submitted {formatDateTime(intake.submittedAtUtc)}
            </p>
          )}
        </div>
        {intake.answers.length > 0 && (
          <dl className="space-y-2">
            {intake.answers.map((answer) => (
              <div
                key={answer.questionKey}
                className="border-b pb-2 last:border-0"
                style={{ borderColor: theme.colors.grey.light }}
              >
                <dt className="text-xs" style={{ color: theme.colors.grey.text }}>
                  {answer.prompt}
                </dt>
                <dd className="text-sm font-semibold" style={{ color: theme.colors.textMain }}>
                  {answer.answer}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, { bg: string; text: string }> = {
    Scheduled: { bg: theme.colors.sage.light, text: theme.colors.sage.dark },
    Completed: { bg: theme.colors.powderBlue.light, text: theme.colors.powderBlue.dark },
    Cancelled: { bg: theme.colors.dustyRose.light, text: theme.colors.dustyRose.dark },
    NoShow: { bg: '#FFF3E0', text: '#E65100' },
    Draft: { bg: theme.colors.grey.light, text: theme.colors.grey.text },
    Partial: { bg: '#FFFDE7', text: '#F57F17' },
    Submitted: { bg: theme.colors.powderBlue.light, text: theme.colors.powderBlue.dark },
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
