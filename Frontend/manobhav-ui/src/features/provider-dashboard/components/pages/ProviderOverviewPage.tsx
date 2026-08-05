import { CalendarCheck, Clock, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../../utils/theme';
import type { ProviderDashboard } from '../../providerDashboardApi';

type Props = {
  data: ProviderDashboard;
};

export function ProviderOverviewPage({ data }: Props) {
  return (
    <main aria-label="Provider dashboard" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-label="Dashboard activity" className="space-y-5" id="dashboard-overview">
        <ProfileStatusBanner data={data} />
        <GreetingCard data={data} />
        <QuickLinks data={data} />
      </section>
    </main>
  );
}

function ProfileStatusBanner({ data }: Props) {
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

function GreetingCard({ data }: Props) {
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

function QuickLinks({ data }: Props) {
  const links = [
    {
      to: '/dashboard/provider/weekly-report',
      icon: FileText,
      label: 'Weekly report',
      count: data.metrics.sessionsThisWeek,
      tone: theme.colors.sage,
    },
    {
      to: '/dashboard/provider/appointments',
      icon: CalendarCheck,
      label: 'My appointments',
      count: data.metrics.upcomingCount,
      tone: theme.colors.powderBlue,
    },
    {
      to: '/dashboard/provider/today',
      icon: Clock,
      label: "Today's appointments",
      count: data.todayAppointments.length,
      tone: theme.colors.dustyRose,
    },
  ];

  return (
    <section aria-labelledby="quick-links-title" className="space-y-3">
      <h2 className="text-xl font-bold" id="quick-links-title" style={{ color: theme.colors.textMain }}>
        Quick links
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{
              background: `linear-gradient(135deg, ${link.tone.light}, ${theme.colors.white})`,
              borderColor: link.tone.DEFAULT,
            }}
          >
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
              style={{ backgroundColor: link.tone.DEFAULT, color: theme.colors.white }}
            >
              <link.icon aria-hidden="true" size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
                {link.label}
              </p>
              <p className="text-xs" style={{ color: theme.colors.grey.text }}>
                {link.count} {link.count === 1 ? 'item' : 'items'}
              </p>
            </div>
          </Link>
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
