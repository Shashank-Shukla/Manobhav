import { ClipboardList } from 'lucide-react';
import { theme } from '../../../../utils/theme';
import type { PatientDashboard, PatientIntakeSummary } from '../../patientApi';
import { formatDateTime } from '../../patientDashboardFormat';

type Props = {
  data: PatientDashboard;
};

export function PatientIntakePage({ data }: Props) {
  const intake = data.intake;

  return (
    <main aria-label="Intake summary" className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <section aria-labelledby="intake-summary-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" id="intake-summary-title" style={{ color: theme.colors.textMain }}>
            Intake summary
          </h1>
          <ClipboardList aria-hidden="true" color={theme.colors.sage.dark} size={24} />
        </div>
        <IntakeContent intake={intake} />
      </section>
    </main>
  );
}

function IntakeContent({ intake }: { intake: PatientIntakeSummary }) {
  if (!intake.submissionId) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-dashed p-6"
        style={{ backgroundColor: theme.colors.grey.light, borderColor: theme.colors.grey.DEFAULT }}
      >
        <p className="text-sm font-semibold" style={{ color: theme.colors.grey.text }}>
          No intake form submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-lg border p-5 shadow-sm"
      style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
    >
      <div className="flex items-center gap-2">
        <StatusBadge status={intake.status ?? 'Unknown'} />
        {intake.submittedAtUtc && (
          <p className="text-xs" style={{ color: theme.colors.grey.text }}>
            Submitted {formatDateTime(intake.submittedAtUtc)}
          </p>
        )}
        {intake.completedAtUtc && (
          <p className="text-xs" style={{ color: theme.colors.grey.text }}>
            · Completed {formatDateTime(intake.completedAtUtc)}
          </p>
        )}
      </div>
      {intake.answers.length > 0 ? (
        <dl className="space-y-3">
          {intake.answers.map((answer) => (
            <div
              key={answer.questionKey}
              className="border-b pb-3 last:border-0"
              style={{ borderColor: theme.colors.grey.light }}
            >
              <dt className="text-xs" style={{ color: theme.colors.grey.text }}>
                {answer.prompt}
              </dt>
              <dd className="mt-1 text-sm font-semibold" style={{ color: theme.colors.textMain }}>
                {answer.answer}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm" style={{ color: theme.colors.grey.text }}>
          No answers recorded.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, { bg: string; text: string }> = {
    Draft: { bg: theme.colors.grey.light, text: theme.colors.grey.text },
    Partial: { bg: '#FFFDE7', text: '#F57F17' },
    Submitted: { bg: theme.colors.powderBlue.light, text: theme.colors.powderBlue.dark },
    Completed: { bg: theme.colors.sage.light, text: theme.colors.sage.dark },
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
