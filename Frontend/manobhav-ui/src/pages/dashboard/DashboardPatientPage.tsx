import { Text } from '../../shared/primitives/Text';

export function DashboardPatientPage() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-6 space-y-6">
      <Text variant="h2">Patient Dashboard</Text>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Upcoming appointment</Text>
          <p className="text-gray-600 text-sm">Shows next session and provider assigned.</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Current provider</Text>
          <p className="text-gray-600 text-sm">Provider details and contact options.</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Past appointments</Text>
          <p className="text-gray-600 text-sm">History and notes of previous sessions.</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Resources & follow-ups</Text>
          <p className="text-gray-600 text-sm">Follow-up tasks and shared resources.</p>
        </div>
      </div>
    </div>
  );
}

