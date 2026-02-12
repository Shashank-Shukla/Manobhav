import { Text } from '../../shared/primitives/Text';

export function DashboardAdminPage() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-6 space-y-6">
      <Text variant="h2">Admin Dashboard</Text>
      <p className="text-gray-600 text-sm">
        Future scope: admin controls for platform oversight, user management, and reporting.
      </p>
      <div className="p-4 rounded-2xl border border-dashed border-gray-300 bg-white/50 text-center text-gray-500">
        Coming soon.
      </div>
    </div>
  );
}

export default DashboardAdminPage;
