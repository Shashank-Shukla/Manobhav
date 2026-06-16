import { useMemo, useState } from 'react';
import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react';
import { adminTheme } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { RecordDrawer } from '../components/RecordDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { WorkQueue } from '../components/WorkQueue';
import type { ProviderRecord } from '../types';
import { DetailRow, MiniProgress, SectionCard } from './shared';
import { includesSearch } from './viewUtils';

type SearchableViewProps = {
  providers: ProviderRecord[];
  search: string;
};

export function ProvidersView({ providers, search }: SearchableViewProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderRecord | null>(null);
  const filteredProviders = useMemo(
    () =>
      providers.filter((provider) =>
        includesSearch(
          [
            provider.name,
            provider.role,
            provider.status,
            provider.salaryBand,
            provider.specialities.join(' '),
          ],
          search,
        ),
      ),
    [providers, search],
  );
  const columns: AdminDataTableColumn<ProviderRecord>[] = [
    {
      header: 'Provider',
      render: (provider) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {provider.name}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            {provider.role}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Status',
      render: (provider) => <StatusBadge label={provider.status} tone={provider.tone} />,
    },
    {
      header: 'Load',
      render: (provider) => (
        <Box minW="150px">
          <MiniProgress value={provider.load} tone={provider.tone} />
          <Text color={adminTheme.muted} fontSize="xs" mt={2}>
            {provider.load}% booked
          </Text>
        </Box>
      ),
    },
    {
      header: 'Next opening',
      render: (provider) => (
        <Text color={adminTheme.muted} fontSize="sm">
          {provider.nextOpenSlot}
        </Text>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (provider) => (
        <Button size="sm" borderRadius="10px" onClick={() => setSelectedProvider(provider)}>
          Manage
        </Button>
      ),
    },
  ];

  return (
    <>
      <SectionCard title="Provider roster" helper="Capacity, availability, specialties, and compensation context">
        <AdminDataTable columns={columns} data={filteredProviders} getKey={(provider) => provider.id} emptyLabel="No providers match this search." />
      </SectionCard>

      {selectedProvider && (
        <RecordDrawer
          isOpen={Boolean(selectedProvider)}
          onClose={() => setSelectedProvider(null)}
          title={selectedProvider.name}
          subtitle={selectedProvider.role}
        >
          <Stack spacing={6}>
            <Box bg="white" borderRadius="14px" border="1px solid" borderColor={adminTheme.border} p={5}>
              <HStack flexWrap="wrap" spacing={2} mb={4}>
                {selectedProvider.specialities.map((speciality) => (
                  <StatusBadge key={speciality} label={speciality} tone="blue" />
                ))}
              </HStack>
              <DetailRow label="Current status" value={<StatusBadge label={selectedProvider.status} tone={selectedProvider.tone} />} />
              <DetailRow label="Sessions this month" value={selectedProvider.sessionsThisMonth} />
              <DetailRow label="Rating" value={selectedProvider.rating.toFixed(1)} />
              <DetailRow label="Salary band" value={selectedProvider.salaryBand} />
              <DetailRow label="Utilization" value={`${selectedProvider.utilization}%`} />
              <Box mt={4}>
                <MiniProgress value={selectedProvider.utilization} tone={selectedProvider.tone} />
              </Box>
            </Box>
            <WorkQueue
              title="Provider admin actions"
              items={[
                {
                  id: 'calendar-review',
                  title: 'Review calendar',
                  meta: `Next open slot is ${selectedProvider.nextOpenSlot}`,
                  status: 'Slots',
                  tone: 'blue',
                },
                {
                  id: 'salary-review',
                  title: 'Review compensation',
                  meta: `Current band: ${selectedProvider.salaryBand}`,
                  status: 'Salary',
                  tone: 'rose',
                },
              ]}
            />
          </Stack>
        </RecordDrawer>
      )}
    </>
  );
}
