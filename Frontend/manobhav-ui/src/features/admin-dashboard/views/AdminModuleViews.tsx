import { useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  LineChart,
  SearchX,
  Users,
} from 'lucide-react';
import {
  bookings,
  careSignals,
  clinicalRecords,
  compensationRecords,
  hiringCandidates,
  insightMetrics,
  opsQueues,
  patients,
  providers,
  quickActions,
  slots,
} from '../adminData';
import { adminTheme, formatCurrency, toneStyles } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { MetricCard } from '../components/MetricCard';
import { RecordDrawer } from '../components/RecordDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { WorkQueue } from '../components/WorkQueue';
import type {
  BookingRecord,
  ClinicalRecord,
  CompensationRecord,
  HiringCandidate,
  PatientRecord,
  ProviderRecord,
  SlotRecord,
  StatusTone,
} from '../types';

type SearchableViewProps = {
  search: string;
};

const metricIcons = {
  'sessions-today': CalendarCheck,
  'provider-utilization': Users,
  'care-followups': ClipboardList,
  'pending-payouts': IndianRupee,
};

function includesSearch(values: Array<string | number>, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return values.some((value) => String(value).toLowerCase().includes(query));
}

function SectionCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <Box
      border="1px solid"
      borderColor={adminTheme.border}
      bg={adminTheme.softPanel}
      borderRadius="16px"
      p={5}
      boxShadow="0 16px 40px rgba(45, 55, 72, 0.06)"
    >
      <Box mb={4}>
        <Text color={adminTheme.text} fontSize="lg" fontWeight="900">
          {title}
        </Text>
        {helper && (
          <Text mt={1} color={adminTheme.muted} fontSize="sm">
            {helper}
          </Text>
        )}
      </Box>
      {children}
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex justify="space-between" gap={4} py={3} borderBottom="1px solid" borderColor="rgba(156, 175, 136, 0.16)">
      <Text color={adminTheme.muted} fontSize="sm" fontWeight="700">
        {label}
      </Text>
      <Box color={adminTheme.text} fontSize="sm" fontWeight="700" textAlign="right">
        {value}
      </Box>
    </Flex>
  );
}

function MiniProgress({ value, tone }: { value: number; tone: StatusTone }) {
  const styles = toneStyles[tone];

  return (
    <Box h="9px" borderRadius="full" bg={adminTheme.grey.light} overflow="hidden">
      <Box h="100%" w={`${Math.min(value, 100)}%`} bg={styles.accent} borderRadius="full" />
    </Box>
  );
}

export function TodayOpsView() {
  return (
    <Stack spacing={6}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {insightMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            helper={metric.helper}
            tone={metric.tone}
            icon={metricIcons[metric.id as keyof typeof metricIcons] ?? LineChart}
          />
        ))}
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: '1.4fr 0.9fr' }} gap={5}>
        <GridItem>
          <WorkQueue title="Urgent work queue" subtitle="Items that need admin attention today" items={opsQueues} />
        </GridItem>
        <GridItem>
          <WorkQueue title="Quick actions" subtitle="Common operations from the command center" items={quickActions} actionLabel="Start" />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <SectionCard title="Provider capacity" helper="Live view of workload and next openings">
          <Stack spacing={4}>
            {providers.map((provider) => (
              <Box key={provider.id} border="1px solid" borderColor={toneStyles[provider.tone].border} bg="white" borderRadius="14px" p={4}>
                <Flex justify="space-between" gap={4} mb={3}>
                  <Box>
                    <Text color={adminTheme.text} fontWeight="900">
                      {provider.name}
                    </Text>
                    <Text color={adminTheme.muted} fontSize="sm">
                      {provider.role} - next slot {provider.nextOpenSlot}
                    </Text>
                  </Box>
                  <StatusBadge label={provider.status} tone={provider.tone} />
                </Flex>
                <MiniProgress value={provider.load} tone={provider.tone} />
                <Text color={adminTheme.muted} fontSize="xs" mt={2}>
                  {provider.load}% booked capacity this week
                </Text>
              </Box>
            ))}
          </Stack>
        </SectionCard>

        <SectionCard title="Upcoming bookings" helper="Session flow for the next operational window">
          <Stack spacing={3}>
            {bookings.map((booking) => (
              <Flex
                key={booking.id}
                justify="space-between"
                align={{ base: 'stretch', sm: 'center' }}
                direction={{ base: 'column', sm: 'row' }}
                gap={3}
                border="1px solid"
                borderColor={toneStyles[booking.tone].border}
                bg="white"
                borderRadius="14px"
                p={4}
              >
                <Box>
                  <Text color={adminTheme.text} fontWeight="900">
                    {booking.patientName}
                  </Text>
                  <Text color={adminTheme.muted} fontSize="sm">
                    {booking.date}, {booking.time} with {booking.providerName}
                  </Text>
                </Box>
                <StatusBadge label={booking.status} tone={booking.tone} />
              </Flex>
            ))}
          </Stack>
        </SectionCard>
      </Grid>
    </Stack>
  );
}

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

export function ProvidersView({ search }: SearchableViewProps) {
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
    [search],
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

export function BookingsView({ search }: SearchableViewProps) {
  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        includesSearch(
          [booking.patientName, booking.providerName, booking.status, booking.type, booking.payment, booking.date],
          search,
        ),
      ),
    [search],
  );
  const columns: AdminDataTableColumn<BookingRecord>[] = [
    {
      header: 'Booking',
      render: (booking) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {booking.patientName}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            {booking.date}, {booking.time}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Provider',
      render: (booking) => (
        <Text color={adminTheme.text} fontWeight="700">
          {booking.providerName}
        </Text>
      ),
    },
    {
      header: 'Status',
      render: (booking) => <StatusBadge label={booking.status} tone={booking.tone} />,
    },
    {
      header: 'Payment',
      render: (booking) => (
        <Text color={adminTheme.muted} fontSize="sm">
          {booking.payment}
        </Text>
      ),
    },
    {
      header: 'Reschedules',
      align: 'right',
      render: (booking) => booking.reschedules,
    },
  ];

  return (
    <Grid templateColumns={{ base: '1fr', xl: '0.8fr 1.2fr' }} gap={5}>
      <GridItem>
        <SectionCard title="Slot availability" helper="Calendar-style capacity view by provider">
          <Stack spacing={4}>
            {slots.map((slot) => (
              <SlotCapacityCard key={slot.id} slot={slot} />
            ))}
          </Stack>
        </SectionCard>
      </GridItem>
      <GridItem>
        <SectionCard title="Bookings and reschedules" helper="Sessions, payments, cancellations, and reschedule pressure">
          <AdminDataTable columns={columns} data={filteredBookings} getKey={(booking) => booking.id} emptyLabel="No bookings match this search." />
        </SectionCard>
      </GridItem>
    </Grid>
  );
}

function SlotCapacityCard({ slot }: { slot: SlotRecord }) {
  const total = slot.open + slot.booked + slot.blocked;
  const bookedPercent = total ? Math.round((slot.booked / total) * 100) : 0;

  return (
    <Box border="1px solid" borderColor={adminTheme.border} bg="white" borderRadius="14px" p={4}>
      <Flex justify="space-between" gap={4} mb={3}>
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {slot.providerName}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            {slot.day}
          </Text>
        </Box>
        <StatusBadge label={`${slot.open} open`} tone={slot.open <= 1 ? 'amber' : 'sage'} />
      </Flex>
      <MiniProgress value={bookedPercent} tone={slot.open <= 1 ? 'amber' : 'blue'} />
      <HStack mt={3} spacing={3} color={adminTheme.muted} fontSize="sm" flexWrap="wrap">
        <Text>{slot.booked} booked</Text>
        <Text>{slot.open} open</Text>
        <Text>{slot.blocked} blocked</Text>
      </HStack>
    </Box>
  );
}

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

export function SalaryView({ search }: SearchableViewProps) {
  const [selectedCompensation, setSelectedCompensation] = useState<CompensationRecord | null>(null);
  const filteredCompensation = useMemo(
    () =>
      compensationRecords.filter((record) =>
        includesSearch([record.providerName, record.status, record.fixedSalary, record.netPayout], search),
      ),
    [search],
  );
  const totals = compensationRecords.reduce(
    (acc, record) => ({
      fixed: acc.fixed + record.fixedSalary,
      incentive: acc.incentive + record.incentive,
      deductions: acc.deductions + record.deductions,
      net: acc.net + record.netPayout,
    }),
    { fixed: 0, incentive: 0, deductions: 0, net: 0 },
  );
  const columns: AdminDataTableColumn<CompensationRecord>[] = [
    {
      header: 'Provider',
      render: (record) => (
        <Text color={adminTheme.text} fontWeight="900">
          {record.providerName}
        </Text>
      ),
    },
    {
      header: 'Fixed salary',
      render: (record) => formatCurrency(record.fixedSalary),
    },
    {
      header: 'Sessions',
      align: 'right',
      render: (record) => record.completedSessions,
    },
    {
      header: 'Incentive',
      render: (record) => formatCurrency(record.incentive),
    },
    {
      header: 'Net payout',
      render: (record) => (
        <Text color={adminTheme.text} fontWeight="900">
          {formatCurrency(record.netPayout)}
        </Text>
      ),
    },
    {
      header: 'Status',
      render: (record) => <StatusBadge label={record.status} tone={record.tone} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (record) => (
        <Button size="sm" borderRadius="10px" onClick={() => setSelectedCompensation(record)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <>
      <Stack spacing={5}>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
          <MetricCard label="Fixed salary" value={formatCurrency(totals.fixed)} delta="Monthly base" helper="Committed base compensation" tone="blue" icon={IndianRupee} />
          <MetricCard label="Session incentives" value={formatCurrency(totals.incentive)} delta="+ session linked" helper="Completed sessions and bonuses" tone="sage" icon={CheckCircle2} />
          <MetricCard label="Deductions" value={formatCurrency(totals.deductions)} delta="Needs review" helper="Attendance and adjustment items" tone="amber" icon={AlertCircle} />
          <MetricCard label="Net payout" value={formatCurrency(totals.net)} delta="4 providers" helper="Total payable this cycle" tone="rose" icon={ClipboardList} />
        </SimpleGrid>
        <SectionCard title="Hybrid compensation" helper="Fixed salary, session incentives, deductions, and approval status">
          <AdminDataTable columns={columns} data={filteredCompensation} getKey={(record) => record.id} emptyLabel="No salary records match this search." />
        </SectionCard>
      </Stack>

      {selectedCompensation && (
        <RecordDrawer
          isOpen={Boolean(selectedCompensation)}
          onClose={() => setSelectedCompensation(null)}
          title={selectedCompensation.providerName}
          subtitle="Hybrid compensation detail"
        >
          <Box bg="white" borderRadius="14px" border="1px solid" borderColor={adminTheme.border} p={5}>
            <DetailRow label="Fixed salary" value={formatCurrency(selectedCompensation.fixedSalary)} />
            <DetailRow label="Completed sessions" value={selectedCompensation.completedSessions} />
            <DetailRow label="Session incentive" value={formatCurrency(selectedCompensation.incentive)} />
            <DetailRow label="Deductions" value={formatCurrency(selectedCompensation.deductions)} />
            <DetailRow label="Net payout" value={formatCurrency(selectedCompensation.netPayout)} />
            <DetailRow label="Status" value={<StatusBadge label={selectedCompensation.status} tone={selectedCompensation.tone} />} />
            <HStack mt={5} spacing={3}>
              <Button bg={adminTheme.sage.DEFAULT} color="white" _hover={{ bg: adminTheme.sage.dark }}>
                Approve payout
              </Button>
              <Button variant="outline" borderColor={adminTheme.border}>
                Request change
              </Button>
            </HStack>
          </Box>
        </RecordDrawer>
      )}
    </>
  );
}

export function InsightsView() {
  return (
    <Stack spacing={5}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {insightMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            helper={metric.helper}
            tone={metric.tone}
            icon={metricIcons[metric.id as keyof typeof metricIcons] ?? LineChart}
          />
        ))}
      </SimpleGrid>
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <SectionCard title="Care quality signals" helper="Follow-up, completion, and load-balance health">
          <Stack spacing={5}>
            {careSignals.map((signal) => (
              <Box key={signal.label}>
                <Flex justify="space-between" mb={2}>
                  <HStack>
                    <Icon as={signal.icon} color={adminTheme.sage.dark} boxSize={4} />
                    <Text color={adminTheme.text} fontWeight="800">
                      {signal.label}
                    </Text>
                  </HStack>
                  <Text color={adminTheme.muted} fontWeight="800">
                    {signal.value}%
                  </Text>
                </Flex>
                <MiniProgress value={signal.value} tone={signal.value >= 80 ? 'sage' : 'amber'} />
              </Box>
            ))}
          </Stack>
        </SectionCard>

        <SectionCard title="Balanced operations snapshot" helper="Business health without losing care context">
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            {[
              ['Patient growth', '+18%', 'rose'],
              ['Cancellation rate', '7.4%', 'amber'],
              ['Revenue health', 'Rs. 4.8L', 'sage'],
              ['Avg. provider load', '80%', 'blue'],
            ].map(([label, value, tone]) => (
              <Box key={label} bg="white" border="1px solid" borderColor={toneStyles[tone as StatusTone].border} borderRadius="14px" p={4}>
                <Text color={adminTheme.muted} fontSize="sm" fontWeight="700">
                  {label}
                </Text>
                <Text mt={2} color={adminTheme.text} fontSize="2xl" fontWeight="900">
                  {value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </SectionCard>
      </Grid>
    </Stack>
  );
}

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

function ClinicalRecordPanel({ record }: { record: ClinicalRecord }) {
  return (
    <Stack spacing={5}>
      <Box bg="white" borderRadius="14px" border="1px solid" borderColor={adminTheme.border} p={5}>
        <HStack justify="space-between" mb={4}>
          <StatusBadge label={`Risk: ${record.riskLevel}`} tone={record.tone} />
          <Text color={adminTheme.muted} fontSize="sm" fontWeight="700">
            {record.lastUpdated}
          </Text>
        </HStack>
        <DetailRow label="Intake summary" value={<Text maxW="290px">{record.intakeSummary}</Text>} />
        <DetailRow label="Care plan" value={<Text maxW="290px">{record.carePlan}</Text>} />
        <DetailRow label="Medication notes" value={<Text maxW="290px">{record.medicationNotes}</Text>} />
      </Box>

      <Box>
        <Text color={adminTheme.text} fontSize="lg" fontWeight="900" mb={3}>
          Session notes
        </Text>
        <VStack align="stretch" spacing={3}>
          {record.sessionNotes.map((note) => (
            <Box key={`${note.date}-${note.provider}`} bg="white" borderRadius="14px" border="1px solid" borderColor={adminTheme.border} p={4}>
              <HStack justify="space-between" mb={2}>
                <Text color={adminTheme.text} fontWeight="900">
                  {note.date}
                </Text>
                <Text color={adminTheme.muted} fontSize="sm">
                  {note.provider}
                </Text>
              </HStack>
              <Divider borderColor={adminTheme.border} mb={3} />
              <Text color={adminTheme.muted} fontSize="sm" lineHeight="1.7">
                {note.note}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>
    </Stack>
  );
}

export function UnknownModuleView() {
  return (
    <Flex minH="50vh" align="center" justify="center">
      <Box bg="white" border="1px solid" borderColor={adminTheme.border} borderRadius="16px" p={8} textAlign="center" maxW="420px">
        <Icon as={SearchX} color={adminTheme.sage.dark} boxSize={8} />
        <Text mt={4} color={adminTheme.text} fontSize="xl" fontWeight="900">
          Admin module not found
        </Text>
        <Text mt={2} color={adminTheme.muted} fontSize="sm">
          Use the sidebar to open one of the available admin workspaces.
        </Text>
      </Box>
    </Flex>
  );
}
