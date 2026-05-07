import { useMemo, useState } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import { clinicalRecords } from '../data';
import { adminTheme } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { RecordDrawer } from '../components/RecordDrawer';
import { StatusBadge } from '../components/StatusBadge';
import type { ClinicalRecord } from '../types';
import { ClinicalRecordPanel, SectionCard } from './shared';
import { includesSearch } from './viewUtils';

type SearchableViewProps = {
  search: string;
};

export function ClinicalRecordsView({ search }: SearchableViewProps) {
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null);
  const filteredRecords = useMemo(
    () =>
      clinicalRecords.filter((record) =>
        includesSearch(
          [record.patientName, record.riskLevel, record.intakeSummary, record.carePlan, record.lastUpdated],
          search,
        ),
      ),
    [search],
  );
  const columns: AdminDataTableColumn<ClinicalRecord>[] = [
    {
      header: 'Patient',
      render: (record) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {record.patientName}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            Updated {record.lastUpdated}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Risk',
      render: (record) => <StatusBadge label={record.riskLevel} tone={record.tone} />,
    },
    {
      header: 'Care plan',
      render: (record) => (
        <Text color={adminTheme.muted} fontSize="sm" noOfLines={2}>
          {record.carePlan}
        </Text>
      ),
    },
    {
      header: 'Notes',
      align: 'right',
      render: (record) => record.sessionNotes.length,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (record) => (
        <Button size="sm" borderRadius="10px" onClick={() => setSelectedRecord(record)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <>
      <SectionCard title="Clinical records" helper="Full clinical access is contained in this dedicated admin surface">
        <AdminDataTable columns={columns} data={filteredRecords} getKey={(record) => record.id} emptyLabel="No clinical records match this search." />
      </SectionCard>

      {selectedRecord && (
        <RecordDrawer
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={selectedRecord.patientName}
          subtitle={`Clinical record - ${selectedRecord.riskLevel} risk`}
        >
          <ClinicalRecordPanel record={selectedRecord} />
        </RecordDrawer>
      )}
    </>
  );
}
