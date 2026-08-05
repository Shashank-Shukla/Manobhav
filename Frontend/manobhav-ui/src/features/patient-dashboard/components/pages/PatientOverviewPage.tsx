import { CalendarCheck, ClipboardList, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../../utils/theme';
import type { PatientDashboard } from '../../patientApi';
import { getInitials } from '../../patientDashboardFormat';

type Props = {
  data: PatientDashboard;
};

export function PatientOverviewPage({ data }: Props) {
  return (
    <main aria-label="Patient dashboard" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-label="Dashboard activity" className="space-y-5" id="dashboard-overview">
        <GreetingCard data={data} />
        <MetricsRow data={data} />
        <QuickLinks data={data} />
      </section>
    </main>
  );
}

function GreetingCard({ data }: Props) {
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

function MetricsRow({ data }: Props) {
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

function QuickLinks({ data }: Props) {
  const links = [
    {
      to: '/dashboard/patient/appointments',
      icon: CalendarCheck,
      label: 'Upcoming appointments',
      count: data.metrics.upcomingCount,
      tone: theme.colors.sage,
    },
    {
      to: '/dashboard/patient/intake',
      icon: ClipboardList,
      label: 'Intake summary',
      count: data.intake.submissionId ? 1 : 0,
      tone: theme.colors.powderBlue,
    },
    {
      to: '/dashboard/patient/consents',
      icon: ShieldCheck,
      label: 'Consents',
      count: data.consents.length,
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
