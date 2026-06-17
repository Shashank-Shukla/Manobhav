import type { ReactNode } from 'react';
import { Box, Divider, Flex, HStack, Stack, Text, VStack } from '@chakra-ui/react';
import { SearchX } from 'lucide-react';
import { adminTheme, toneStyles } from '../adminTheme';
import { StatusBadge } from '../components/StatusBadge';
import type { ClinicalRecord, SlotRecord, StatusTone } from '../types';

export function SectionCard({
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
        <Text as="h2" color={adminTheme.text} fontSize="lg" fontWeight="900">
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

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
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

export function MiniProgress({ value, tone }: { value: number; tone: StatusTone }) {
  const styles = toneStyles[tone];

  return (
    <Box h="9px" borderRadius="full" bg={adminTheme.grey.light} overflow="hidden">
      <Box h="100%" w={`${Math.min(value, 100)}%`} bg={styles.accent} borderRadius="full" />
    </Box>
  );
}

export function SlotCapacityCard({ slot }: { slot: SlotRecord }) {
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

export function ClinicalRecordPanel({ record }: { record: ClinicalRecord }) {
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
        <SearchX color={adminTheme.sage.dark} size={32} />
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
