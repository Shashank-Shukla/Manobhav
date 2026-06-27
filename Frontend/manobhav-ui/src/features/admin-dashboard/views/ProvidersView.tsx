import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { getAdminProviders } from '../adminDashboardApi';
import {
  RosterChip,
  RosterPrimary,
  RosterSecondary,
  RosterTable,
  type RosterColumn,
} from '../components/RosterTable';
import { useRosterPage } from '../components/useRosterPage';
import type { AdminProviderRosterRecord } from '../types';
import { SectionCard } from './shared';

type ProvidersViewProps = {
  search: string;
};

const columns: RosterColumn<AdminProviderRosterRecord>[] = [
  {
    key: 'provider',
    header: 'Provider',
    render: (provider) => (
      <Box>
        <RosterPrimary>{provider.name}</RosterPrimary>
        <RosterSecondary>{provider.title || 'Provider'}</RosterSecondary>
      </Box>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (provider) => <RosterChip label={provider.status} tone={provider.tone} />,
  },
  {
    key: 'specialities',
    header: 'Specialities',
    render: (provider) =>
      provider.specialities.length > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ maxWidth: 320 }}>
          {provider.specialities.slice(0, 4).map((speciality) => (
            <RosterChip key={speciality} label={speciality} tone="blue" />
          ))}
        </Stack>
      ) : (
        <RosterSecondary>Not provided</RosterSecondary>
      ),
  },
  {
    key: 'sessions',
    header: 'Sessions',
    align: 'right',
    render: (provider) => <RosterPrimary>{provider.sessions}</RosterPrimary>,
  },
  {
    key: 'rating',
    header: 'Rating',
    align: 'right',
    render: (provider) => <RosterSecondary>{provider.rating > 0 ? provider.rating.toFixed(1) : '—'}</RosterSecondary>,
  },
];

export function ProvidersView({ search }: ProvidersViewProps) {
  const { page, setPage, data, status } = useRosterPage(getAdminProviders, search);

  return (
    <SectionCard title="Provider roster" helper="Every onboarded provider">
      <RosterTable
        columns={columns}
        rows={data.items}
        getRowKey={(provider) => provider.id}
        total={data.total}
        page={page}
        pageSize={data.pageSize}
        onPageChange={setPage}
        status={status}
        emptyLabel="No providers match this search."
        errorLabel="Unable to load providers."
      />
    </SectionCard>
  );
}
