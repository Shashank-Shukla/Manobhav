import { ShieldCheck } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { PatientConsent, PatientDashboard } from '../../patientApi';
import { formatDateTime, formatConsentType } from '../../patientDashboardFormat';

type Props = {
  data: PatientDashboard;
};

export function PatientConsentsPage({ data }: Props) {
  const consents = data.consents;

  return (
    <main aria-label="Consents" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="consents-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="consents-title" style={{ color: theme.colors.textMain }}>
            Consents
          </h1>
          <ShieldCheck aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <p className="text-sm" style={{ color: theme.colors.grey.text }}>
          {consents.length} {consents.length === 1 ? 'consent record' : 'consent records'}
        </p>
        <ConsentsList consents={consents} />
      </section>
    </main>
  );
}

function ConsentsList({ consents }: { consents: PatientConsent[] }) {
  if (consents.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-6"
        style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT }}
      >
        <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
          No consent records on file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {consents.map((consent, index) => (
        <article
          key={`${consent.consentType}-${index}`}
          className="flex items-center justify-between rounded-lg border p-4 shadow-sm"
          style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold" style={{ color: theme.colors.textMain }}>
              {formatConsentType(consent.consentType)}
            </p>
            <p className="text-xs" style={{ color: theme.colors.grey.text }}>
              v{consent.policyVersion} · Signed {formatDateTime(consent.signedAtUtc)}
            </p>
          </div>
          <span
            className="flex-none rounded-full px-3 py-1 text-xs font-bold"
            style={{
              backgroundColor: consent.accepted ? theme.colors.sage.light : theme.colors.dustyRose.light,
              color: consent.accepted ? theme.colors.sage.dark : theme.colors.dustyRose.dark,
            }}
          >
            {consent.accepted ? 'Accepted' : 'Declined'}
          </span>
        </article>
      ))}
    </div>
  );
}
