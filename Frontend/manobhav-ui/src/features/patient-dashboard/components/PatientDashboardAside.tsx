import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../../../utils/theme';
import { logout } from '../../../shared/auth/cognitoAuth';
import type { PatientConsent, PatientDashboard } from '../patientApi';
import { formatDateTime, formatConsentType, getInitials } from '../patientDashboardFormat';

type PatientDashboardAsideProps = {
  data: PatientDashboard;
};

export function PatientDashboardAside({ data }: PatientDashboardAsideProps) {
  return (
    <aside
      aria-label="Patient profile and history"
      className="min-w-0 border-t px-4 py-5 sm:px-6 lg:border-l lg:border-t-0 lg:px-5 lg:py-6"
      style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
    >
      <div className="space-y-5">
        <PatientProfileMenu profile={data.profile} />
        <PastAppointments appointments={data.pastAppointments} />
        <ConsentsSection consents={data.consents} />
      </div>
    </aside>
  );
}

function PatientProfileMenu({ profile }: { profile: PatientDashboard['profile'] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      aria-label="Patient profile"
      role="group"
      className="relative flex min-w-0 items-center justify-end gap-3"
    >
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
          {profile.fullName}
        </p>
        {profile.email && (
          <p className="truncate text-xs" style={{ color: theme.colors.grey.text }}>
            {profile.email}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Open patient account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
        onClick={() => setOpen((current) => !current)}
        style={{ backgroundColor: theme.colors.sage.DEFAULT }}
      >
        {profile.avatarInitials || getInitials(profile.fullName)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-14 z-20 w-56 rounded-xl border p-2 shadow-xl"
          style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
        >
          <PatientMenuLink to="/dashboard#dashboard-overview" icon={Settings} label="Settings" onSelect={() => setOpen(false)} />
          <PatientMenuLink to="/dashboard#dashboard-overview" icon={UserRound} label="Profile" onSelect={() => setOpen(false)} />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-[#F7E6E8] focus:bg-[#F7E6E8] focus:outline-none"
            style={{ color: theme.colors.dustyRose.dark }}
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <LogOut aria-hidden="true" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function PatientMenuLink({
  icon: Icon,
  label,
  onSelect,
  to,
}: {
  icon: typeof Settings;
  label: string;
  onSelect: () => void;
  to: string;
}) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-[#EEF4EA] focus:bg-[#EEF4EA] focus:outline-none"
      style={{ color: theme.colors.textMain }}
    >
      <Icon aria-hidden="true" size={16} />
      {label}
    </Link>
  );
}

function PastAppointments({ appointments }: { appointments: PatientDashboard['pastAppointments'] }) {
  const count = appointments.length;

  return (
    <section aria-labelledby="past-appointments-title" className="space-y-3" id="past-appointments">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold" id="past-appointments-title" style={{ color: theme.colors.textMain }}>
          Past appointments
        </h2>
        <span className="text-xs font-semibold" style={{ color: theme.colors.sage.dark }}>
          {count} {count === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      <PastAppointmentsList appointments={appointments} />
    </section>
  );
}

function PastAppointmentsList({ appointments }: { appointments: PatientDashboard['pastAppointments'] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-4"
        style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT }}
      >
        <CalendarDays aria-hidden="true" color={theme.colors.grey.text} size={20} />
        <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
          No past appointments yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => (
        <article
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border p-3 shadow-sm"
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
              <PastStatusBadge status={appointment.status} />
            </div>
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

function ConsentsSection({ consents }: { consents: PatientConsent[] }) {
  if (consents.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="consents-title" className="space-y-3" id="consents">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold" id="consents-title" style={{ color: theme.colors.textMain }}>
          Consents
        </h2>
        <ShieldCheck aria-hidden="true" color={theme.colors.sage.dark} size={20} />
      </div>

      <div className="space-y-2">
        {consents.map((consent, index) => (
          <div
            key={`${consent.consentType}-${index}`}
            className="flex items-center justify-between rounded-lg border px-3 py-2.5"
            style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: theme.colors.textMain }}>
                {formatConsentType(consent.consentType)}
              </p>
              <p className="text-xs" style={{ color: theme.colors.grey.text }}>
                v{consent.policyVersion} · {formatDateTime(consent.signedAtUtc)}
              </p>
            </div>
            <span
              className="flex-none rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: consent.accepted ? theme.colors.sage.light : theme.colors.dustyRose.light,
                color: consent.accepted ? theme.colors.sage.dark : theme.colors.dustyRose.dark,
              }}
            >
              {consent.accepted ? 'Accepted' : 'Declined'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PastStatusBadge({ status }: { status: string }) {
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
