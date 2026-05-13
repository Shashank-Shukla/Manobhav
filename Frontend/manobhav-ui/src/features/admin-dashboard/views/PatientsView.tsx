import { useMemo, useState } from 'react';
import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react';
import { ArrowUpRight } from 'lucide-react';
import { clinicalRecords, patients } from '../data';
import { adminTheme } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { RecordDrawer } from '../components/RecordDrawer';
import { StatusBadge } from '../components/StatusBadge';
import type { PatientRecord } from '../types';
import { ClinicalRecordPanel, DetailRow, SectionCard } from './shared';
import { includesSearch } from './viewUtils';

type SearchableViewProps = {
  search: string;
};

export function PatientsView({ search }: SearchableViewProps) {
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const selectedClinicalRecord = selectedPatient
    ? clinicalRecords.find((record) => record.id === selectedPatient.clinicalRecordId)
    : undefined;
  const filteredPatients = useMemo(
    () =>
      patients.filter((patient) =>
        includesSearch(
          [
            patient.name,
            patient.status,
            patient.assignedProvider,
            patient.concern,
            patient.riskLevel,
            patient.paymentStatus,
          ],
          search,
        ),
      ),
    [search],
  );
  const columns: AdminDataTableColumn<PatientRecord>[] = [
    {
      header: 'Patient',
      render: (patient) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {patient.name}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            Age {patient.age} - {patient.concern}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Care status',
      render: (patient) => <StatusBadge label={patient.status} tone={patient.tone} />,
    },
    {
      header: 'Provider',
      render: (patient) => (
        <Text color={adminTheme.text} fontWeight="700">
          {patient.assignedProvider}
        </Text>
      ),
    },
    {
      header: 'Next session',
      render: (patient) => (
        <Text color={adminTheme.muted} fontSize="sm">
          {patient.nextSession}
        </Text>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (patient) => (
        <Button size="sm" borderRadius="10px" rightIcon={<ArrowUpRight size={14} />} onClick={() => setSelectedPatient(patient)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <SectionCard title="Patient management" helper="Care, booking, payment, and clinical access for active patients">
        <AdminDataTable columns={columns} data={filteredPatients} getKey={(patient) => patient.id} emptyLabel="No patient records match this search." />
      </SectionCard>

      {selectedPatient && (
        <RecordDrawer
          isOpen={Boolean(selectedPatient)}
          onClose={() => setSelectedPatient(null)}
          title={selectedPatient.name}
          subtitle={`${selectedPatient.status} - ${selectedPatient.assignedProvider}`}
        >
          <Stack spacing={6}>
            <Box bg="white" borderRadius="14px" border="1px solid" borderColor={adminTheme.border} p={5}>
              <HStack justify="space-between" mb={2}>
                <StatusBadge label={`Risk: ${selectedPatient.riskLevel}`} tone={selectedPatient.tone} />
                <StatusBadge label={selectedPatient.paymentStatus} tone={selectedPatient.paymentStatus.includes('Pending') ? 'amber' : 'sage'} />
              </HStack>
              <DetailRow label="Intake" value={selectedPatient.intakeStatus} />
              <DetailRow label="Sessions completed" value={selectedPatient.sessionsCompleted} />
              <DetailRow label="Last contact" value={selectedPatient.lastContact} />
              <DetailRow label="Next session" value={selectedPatient.nextSession} />
            </Box>

            <Box>
              <Text color={adminTheme.text} fontSize="lg" fontWeight="900" mb={3}>
                Booking history
              </Text>
              <Stack spacing={3}>
                {selectedPatient.bookingHistory.map((booking) => (
                  <Box key={`${booking.date}-${booking.status}`} bg="white" borderRadius="12px" border="1px solid" borderColor={adminTheme.border} p={4}>
                    <Text color={adminTheme.text} fontWeight="800">
                      {booking.date} - {booking.status}
                    </Text>
                    <Text color={adminTheme.muted} fontSize="sm">
                      {booking.provider} - {booking.payment}
                    </Text>
                  </Box>
                ))}
              </Stack>
            </Box>

            {selectedClinicalRecord && <ClinicalRecordPanel record={selectedClinicalRecord} />}
          </Stack>
        </RecordDrawer>
      )}
    </>
  );
}
