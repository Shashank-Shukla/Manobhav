import { lazy, Suspense } from 'react';
import { Avatar, Box, Button, Flex, HStack, Tag, Text, VStack } from '@chakra-ui/react';
import { Star } from 'lucide-react';
import { theme } from '../../../utils/theme';
import type { ProviderRecord } from '../types';

const ProviderDatePicker = lazy(() => import('./ProviderDatePicker'));

type ProviderDetailsPanelProps = {
  onBook: () => void;
  onCalendarCancel: () => void;
  onCalendarChoose: (iso: string, label: string) => void;
  onTempCalendarChange: (iso: string) => void;
  selected?: ProviderRecord;
  selectedDateIso: string;
  selectedDateLabel: string;
  showCalendar: boolean;
  tempCalendarIso: string;
};

export function ProviderDetailsPanel({
  onBook,
  onCalendarCancel,
  onCalendarChoose,
  onTempCalendarChange,
  selected,
  selectedDateIso,
  selectedDateLabel,
  showCalendar,
  tempCalendarIso,
}: ProviderDetailsPanelProps) {
  if (!selected) {
    return null;
  }

  if (showCalendar) {
    return (
      <VStack align="stretch" spacing={3} className="items-center transition-all duration-700 ease-in-out">
        <Text fontSize="lg" fontWeight="bold" color={theme.colors.textMain} textAlign="center">
          Choose a date
        </Text>
        <Suspense fallback={<Text color="gray.600">Loading calendar...</Text>}>
          <ProviderDatePicker
            onCancel={onCalendarCancel}
            onChoose={onCalendarChoose}
            onTempDateChange={onTempCalendarChange}
            selectedDateIso={selectedDateIso}
            selectedDateLabel={selectedDateLabel}
            tempCalendarIso={tempCalendarIso}
          />
        </Suspense>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={3} className="h-full transition-all duration-700 ease-in-out">
      <Flex justify="center">
        <Avatar name={selected.name} bg={selected.avatarColor} color="white" boxSize="7rem" />
      </Flex>
      <Box h="1rem" />
      <Text fontSize="md" color="gray.700" overflowY={{ base: 'visible', lg: 'auto' }} maxH={{ base: 'none', lg: '8rem' }}>
        {selected.longDescription}
      </Text>
      <Box h="3px" />
      <HStack spacing={2} flexWrap="wrap">
        {selected.specializations.map((specialization) => (
          <Tag key={specialization} colorScheme="green" variant="subtle">
            {specialization}
          </Tag>
        ))}
      </HStack>
      <Box h="0.8rem" />
      <Text fontWeight="semibold" color="gray.800">
        No. of sessions taken: {selected.sessions}
      </Text>
      <Box h="0.8rem" />
      <HStack spacing={1} align="center">
        <Text fontWeight="semibold" color="gray.800">
          Rating:
        </Text>
        {Array.from({ length: 5 }).map((_, index) => {
          const color = index + 1 <= Math.round(selected.rating) ? theme.colors.dustyRose.DEFAULT : '#E5E7EB';
          return <Star key={index} size={16} color={color} fill={color} strokeWidth={1.8} />;
        })}
        <Text fontSize="sm" color="gray.600">
          {selected.rating.toFixed(1)}
        </Text>
      </HStack>
      <Box h="0.8rem" />
      <Button
        px="1.25em"
        py="0.5em"
        borderRadius="8px"
        bg={theme.colors.sage.DEFAULT}
        _hover={{ bg: theme.colors.sage.dark }}
        color="white"
        onClick={onBook}
        isDisabled={!selectedDateLabel}
        opacity={selectedDateLabel ? 1 : 0.6}
        cursor={selectedDateLabel ? 'pointer' : 'not-allowed'}
        _disabled={{
          bg: theme.colors.grey.DEFAULT,
          color: '#FFFFFF',
          borderColor: theme.colors.grey.dark,
        }}
      >
        Book appointment {selectedDateLabel ? `(${selectedDateLabel})` : ''}
      </Button>
    </VStack>
  );
}
