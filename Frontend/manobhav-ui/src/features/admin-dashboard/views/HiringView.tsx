import { useMemo } from 'react';
import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { hiringCandidates } from '../data';
import { adminTheme, toneStyles } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { HiringCandidate } from '../types';
import { SectionCard } from './shared';
import { includesSearch } from './viewUtils';

type SearchableViewProps = {
  search: string;
};

export function HiringView({ search }: SearchableViewProps) {
  const filteredCandidates = useMemo(
    () =>
      hiringCandidates.filter((candidate) =>
        includesSearch(
          [candidate.name, candidate.role, candidate.stage, candidate.credentialStatus, candidate.nextStep],
          search,
        ),
      ),
    [search],
  );
  const stages = ['Application screen', 'Credential review', 'Interview', 'Offer'];
  const columns: AdminDataTableColumn<HiringCandidate>[] = [
    {
      header: 'Candidate',
      render: (candidate) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {candidate.name}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            {candidate.role}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Stage',
      render: (candidate) => <StatusBadge label={candidate.stage} tone={candidate.tone} />,
    },
    {
      header: 'Credential',
      render: (candidate) => (
        <Text color={adminTheme.muted} fontSize="sm">
          {candidate.credentialStatus}
        </Text>
      ),
    },
    {
      header: 'Next step',
      render: (candidate) => (
        <Text color={adminTheme.text} fontSize="sm" fontWeight="700">
          {candidate.nextStep}
        </Text>
      ),
    },
    {
      header: 'Fit score',
      align: 'right',
      render: (candidate) => `${candidate.score}%`,
    },
  ];

  return (
    <Stack spacing={5}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {stages.map((stage) => {
          const stageCandidates = hiringCandidates.filter((candidate) => candidate.stage === stage);
          return (
            <SectionCard key={stage} title={stage} helper={`${stageCandidates.length} candidate${stageCandidates.length === 1 ? '' : 's'}`}>
              <Stack spacing={3}>
                {stageCandidates.map((candidate) => (
                  <Box key={candidate.id} border="1px solid" borderColor={toneStyles[candidate.tone].border} bg="white" borderRadius="12px" p={4}>
                    <Text color={adminTheme.text} fontWeight="900">
                      {candidate.name}
                    </Text>
                    <Text color={adminTheme.muted} fontSize="sm">
                      {candidate.nextStep}
                    </Text>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          );
        })}
      </SimpleGrid>
      <SectionCard title="Hiring pipeline table" helper="Credentials, interviews, and offer readiness">
        <AdminDataTable columns={columns} data={filteredCandidates} getKey={(candidate) => candidate.id} emptyLabel="No hiring candidates match this search." />
      </SectionCard>
    </Stack>
  );
}
