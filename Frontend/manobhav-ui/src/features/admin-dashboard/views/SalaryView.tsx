import { useMemo, useState } from 'react';
import { Box, Button, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { AlertCircle, CheckCircle2, ClipboardList, IndianRupee } from 'lucide-react';
import { compensationRecords } from '../data';
import { adminTheme, formatCurrency } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { MetricCard } from '../components/MetricCard';
import { RecordDrawer } from '../components/RecordDrawer';
import { StatusBadge } from '../components/StatusBadge';
import type { CompensationRecord } from '../types';
import { DetailRow, SectionCard } from './shared';
import { includesSearch } from './viewUtils';

type SearchableViewProps = {
  search: string;
};

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
