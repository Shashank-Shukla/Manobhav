import Box from '@mui/material/Box';
import { getAdminPatients } from '../adminDashboardApi';
import {
  RosterChip,
  RosterPrimary,
  RosterSecondary,
  RosterTable,
  type RosterColumn,
} from '../components/RosterTable';
import { useRosterPage } from '../components/useRosterPage';
import type { AdminPatientRosterRecord, StatusTone } from '../types';
import { SectionCard } from './shared';

type PatientsViewProps = {
  search: string;
};

function statusTone(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'sage';
  if (normalized === 'suspended' || normalized === 'blocked') return 'red';
  if (normalized === 'pending') return 'amber';
  return 'grey';
}

const columns: RosterColumn<AdminPatientRosterRecord>[] = [
  {
    key: 'patient',
    header: 'Patient',
    render: (patient) => (
      <Box>
        <RosterPrimary>{patient.name}</RosterPrimary>
        <RosterSecondary>{patient.email}</RosterSecondary>
      </Box>
    ),
  },
  {
    key: 'status',
    header: 'Account status',
    render: (patient) => <RosterChip label={patient.status} tone={statusTone(patient.status)} />,
  },
  {
    key: 'joined',
    header: 'Joined',
    render: (patient) => <RosterSecondary>{patient.joinedAt}</RosterSecondary>,
  },
  {
    key: 'sessions',
    header: 'Sessions',
    align: 'right',
    render: (patient) => <RosterPrimary>{patient.sessionsCompleted}</RosterPrimary>,
  },
];

export function PatientsView({ search }: PatientsViewProps) {
  const { page, setPage, data, status } = useRosterPage(getAdminPatients, search);

  return (
    <SectionCard title="Patient management" helper="Registered care-seekers">
      <RosterTable
        columns={columns}
        rows={data.items}
        getRowKey={(patient) => patient.id}
        total={data.total}
        page={page}
        pageSize={data.pageSize}
        onPageChange={setPage}
        status={status}
        emptyLabel="No patient records match this search."
        errorLabel="Unable to load patients."
      />
    </SectionCard>
  );
}
