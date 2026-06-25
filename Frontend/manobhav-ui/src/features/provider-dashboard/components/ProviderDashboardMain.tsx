import { CalendarCheck, CalendarHeart, Clock, FileText, Sparkles } from 'lucide-react';
import { theme } from '../../../utils/theme';
import type { ProviderDashboard } from '../providerDashboardApi';
import { formatTime } from '../providerDashboardFormat';

type ProviderDashboardMainProps = {
  data: ProviderDashboard;
};

export function ProviderDashboardMain({ data }: ProviderDashboardMainProps) {
  return (
    <main aria-label="Provider dashboard" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-label="Dashboard activity" className="space-y-5" id="dashboard-overview">
        <ProfileStatusBanner data={data} />
        <GreetingCard data={data} />
        <WeeklyReport data={data} />
        <MyAppointments data={data} />
      </section>
    </main>
  );
}

function ProfileStatusBanner({ data }: ProviderDashboardMainProps) {
  const status = data.provider.status;
  if (status === 'Provider') {
    return null;
  }

  const message = status === 'ProviderApplicant'
    ? 'Your provider profile is under review. We will let you know as soon as it is approved.'
    : 'Your provider profile is being set up. A few details are still on the way.';

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3"
      role="status"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.dustyRose.light}, ${theme.colors.white})`,
        borderColor: theme.colors.dustyRose.DEFAULT,
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
        style={{ backgroundColor: theme.colors.dustyRose.DEFAULT, color: theme.colors.white }}
      >
        <Sparkles size={16} />
      </span>
      <p className="text-sm font-semibold" style={{ color: theme.colors.dustyRose.dark }}>
        {message}
      </p>
    </div>
  );
}

function GreetingCard({ data }: ProviderDashboardMainProps) {
  return (
    <section
      aria-labelledby="provider-greeting-title"
      className="grid gap-4 rounded-lg border p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.sage.light}, ${theme.colors.powderBlue.light})`,
        borderColor: theme.colors.sage.DEFAULT,
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.sage.dark }}>
          Provider dashboard
        </p>
        <h1
          className="mt-2 text-2xl font-bold leading-tight sm:text-3xl"
          id="provider-greeting-title"
          style={{ color: theme.colors.textMain }}
        >
          Welcome back, {data.provider.shortName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: theme.colors.grey.text }}>
          {getGreetingSummary(data)}
        </p>
      </div>

      <DoctorIllustration />
    </section>
  );
}

function getGreetingSummary(data: ProviderDashboard): string {
  const today = data.todayAppointments.length;
  if (today === 0) {
    return 'No appointments scheduled yet today. Your week is open for new care plans.';
  }

  const noun = today === 1 ? 'session' : 'sessions';
  return `You have ${today} ${noun} on the calendar today. Here is a calm look at your week.`;
}

function WeeklyReport({ data }: ProviderDashboardMainProps) {
  const cards = [
    { id: 'sessions-total', label: 'Total sessions', value: data.metrics.sessionsTotal, tone: theme.colors.sage },
    { id: 'sessions-week', label: 'This week', value: data.metrics.sessionsThisWeek, tone: theme.colors.powderBlue },
    { id: 'upcoming', label: 'Upcoming', value: data.metrics.upcomingCount, tone: theme.colors.dustyRose },
  ];

  return (
    <section aria-labelledby="weekly-report-title" className="space-y-3" id="weekly-report">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.dustyRose.dark }}>
          Weekly report
        </p>
        <h2 className="text-xl font-bold" id="weekly-report-title" style={{ color: theme.colors.textMain }}>
          Care snapshot
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

function MyAppointments({ data }: ProviderDashboardMainProps) {
  return (
    <section aria-labelledby="my-appointments-title" className="space-y-3" id="my-appointments">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="my-appointments-title" style={{ color: theme.colors.textMain }}>
          My appointments
        </h2>
        <CalendarCheck aria-hidden="true" color={theme.colors.sage.dark} size={22} />
      </div>

      <AppointmentList appointments={data.upcomingAppointments} />
    </section>
  );
}

function AppointmentList({ appointments }: { appointments: ProviderDashboard['upcomingAppointments'] }) {
  if (appointments.length === 0) {
    return <EmptyAppointments />;
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => (
        <article
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-3 shadow-sm"
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

function EmptyAppointments() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-dashed p-4"
      style={{ backgroundColor: theme.colors.powderBlue.light, borderColor: theme.colors.powderBlue.DEFAULT }}
    >
      <CalendarHeart aria-hidden="true" color={theme.colors.powderBlue.dark} size={22} />
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

function DoctorIllustration() {
  return (
    <svg
      aria-label="Flat doctor illustration"
      className="mx-auto h-44 w-44 sm:h-48 sm:w-48"
      role="img"
      viewBox="0 0 180 180"
    >
      <rect fill={theme.colors.white} height="118" rx="34" width="118" x="31" y="38" />
      <circle cx="90" cy="53" fill={theme.colors.dustyRose.light} r="28" />
      <path d="M58 76c6 21 58 21 64 0v51H58V76Z" fill={theme.colors.powderBlue.DEFAULT} />
      <path d="M68 88h44v49H68z" fill={theme.colors.white} />
      <path d="M74 101h32M74 115h32" stroke={theme.colors.grey.DEFAULT} strokeLinecap="round" strokeWidth="5" />
      <circle cx="80" cy="52" fill={theme.colors.textMain} r="3" />
      <circle cx="100" cy="52" fill={theme.colors.textMain} r="3" />
      <path d="M80 65c6 5 14 5 20 0" fill="none" stroke={theme.colors.textMain} strokeLinecap="round" strokeWidth="4" />
      <path d="M52 83c11 13 65 13 76 0" fill="none" stroke={theme.colors.sage.DEFAULT} strokeLinecap="round" strokeWidth="8" />
      <path d="M88 93v34M71 110h34" stroke={theme.colors.dustyRose.DEFAULT} strokeLinecap="round" strokeWidth="7" />
      <circle cx="46" cy="134" fill={theme.colors.sage.light} r="14" />
      <FileText aria-hidden="true" color={theme.colors.sage.dark} size={22} x="35" y="123" />
    </svg>
  );
}
