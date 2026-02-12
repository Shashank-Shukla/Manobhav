import { Text } from '../../shared/primitives/Text';

export function DashboardProviderPage() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-6 space-y-6">
      <Text variant="h2">Provider Dashboard</Text>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Active patients</Text>
          <p className="text-gray-600 text-sm">List of active and past/archived patients (to be implemented).</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Patient details</Text>
          <p className="text-gray-600 text-sm">Select a patient to view records and medical summary.</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Medical records</Text>
          <p className="text-gray-600 text-sm">Future module: secure storage and viewing of summaries.</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">
          <Text variant="h3">Appointments</Text>
          <p className="text-gray-600 text-sm">Upcoming and past appointments per patient.</p>
        </div>
      </div>
    </div>
  );
}

