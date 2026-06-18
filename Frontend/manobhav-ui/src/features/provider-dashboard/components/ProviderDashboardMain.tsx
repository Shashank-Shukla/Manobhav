import { CalendarCheck, Clock, FileText } from 'lucide-react';
import { theme } from '../../../utils/theme';
import type { ProviderDashboardData } from '../providerDashboardData';

type ProviderDashboardMainProps = {
  data: ProviderDashboardData;
};

export function ProviderDashboardMain({ data }: ProviderDashboardMainProps) {
  return (
    <main aria-label="Provider dashboard" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-label="Dashboard activity" className="space-y-5" id="dashboard-overview">
        <GreetingCard data={data} />
        <WeeklyReport data={data} />
        <MyAppointments data={data} />
      </section>
    </main>
  );
}

function GreetingCard({ data }: ProviderDashboardMainProps) {
  return (
    <section
      aria-labelledby="provider-greeting-title"
      className="grid gap-4 rounded-lg border p-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.powderBlue.light}, ${theme.colors.white})`,
        borderColor: theme.colors.powderBlue.DEFAULT,
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase" style={{ color: theme.colors.sage.dark }}>
          Provider dashboard
        </p>
        <h1
          className="mt-2 text-2xl font-bold leading-tight sm:text-3xl"
          id="provider-greeting-title"
          style={{ color: theme.colors.textMain }}
        >
          Good morning, {data.provider.shortName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: theme.colors.grey.text }}>
          Your day has {data.todayAppointments.length} appointments, {data.weeklyMetrics[1].value} note completion, and a calm window after the afternoon check-in.
        </p>
      </div>

      <DoctorIllustration />
    </section>
  );
}

function WeeklyReport({ data }: ProviderDashboardMainProps) {
  return (
    <section aria-labelledby="weekly-report-title" className="space-y-3" id="weekly-report">
      <div>
        <p className="text-xs font-semibold uppercase" style={{ color: theme.colors.dustyRose.dark }}>
          Weekly report
        </p>
        <h2 className="text-xl font-bold" id="weekly-report-title" style={{ color: theme.colors.textMain }}>
          Care snapshot
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {data.weeklyMetrics.map((metric) => (
          <article
            className="rounded-lg border bg-white p-4"
            key={metric.id}
            style={{ borderColor: theme.colors.grey.DEFAULT }}
          >
            <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: theme.colors.textMain }}>
              {metric.value}
            </p>
            <p className="mt-1 text-xs font-medium" style={{ color: theme.colors.sage.dark }}>
              {metric.helper}
            </p>
          </article>
        ))}
      </div>
    </section>
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

      <div className="space-y-2">
        {data.myAppointments.map((appointment) => (
          <article
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border bg-white p-3"
            key={appointment.id}
            style={{ borderColor: theme.colors.grey.DEFAULT }}
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
                {appointment.time} - {appointment.type}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
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
