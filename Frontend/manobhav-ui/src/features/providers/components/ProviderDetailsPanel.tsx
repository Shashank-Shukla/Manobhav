import { lazy, Suspense } from 'react';
import { Avatar, Box, Button, Flex, HStack, Tag, Text, VStack } from '@chakra-ui/react';
import { Star } from 'lucide-react';
import { theme } from '../../../utils/theme';
import type { ProviderRecord } from '../types';

const ProviderDatePicker = lazy(() => import('./ProviderDatePicker'));

type ProviderDetailsPanelProps = {
  bookingError: string;
  isBooking: boolean;
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
  bookingError,
  isBooking,
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

  return showCalendar ? (
    <ProviderCalendarPanel
      onCalendarCancel={onCalendarCancel}
      onCalendarChoose={onCalendarChoose}
      onTempCalendarChange={onTempCalendarChange}
      selectedDateIso={selectedDateIso}
      selectedDateLabel={selectedDateLabel}
      tempCalendarIso={tempCalendarIso}
    />
  ) : (
    <ProviderProfilePanel
      bookingError={bookingError}
      isBooking={isBooking}
      onBook={onBook}
      selected={selected}
      selectedDateLabel={selectedDateLabel}
    />
  );
}

function ProviderCalendarPanel({
  onCalendarCancel,
  onCalendarChoose,
  onTempCalendarChange,
  selectedDateIso,
  selectedDateLabel,
  tempCalendarIso,
}: Pick<
  ProviderDetailsPanelProps,
  | 'onCalendarCancel'
  | 'onCalendarChoose'
  | 'onTempCalendarChange'
  | 'selectedDateIso'
  | 'selectedDateLabel'
  | 'tempCalendarIso'
>) {
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

function ProviderProfilePanel({
  bookingError,
  isBooking,
  onBook,
  selected,
  selectedDateLabel,
}: {
  bookingError: string;
  isBooking: boolean;
  onBook: () => void;
  selected: ProviderRecord;
  selectedDateLabel: string;
}) {
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
        {Array.from({ length: 5 }).map((_, index) => (
          <RatingStar key={index} index={index} rating={selected.rating} />
        ))}
        <Text fontSize="sm" color="gray.600">
          {selected.rating.toFixed(1)}
        </Text>
      </HStack>
      <Box h="0.8rem" />
      <BookingButton isBooking={isBooking} onBook={onBook} selectedDateLabel={selectedDateLabel} />
      <BookingErrorMessage message={bookingError} />
    </VStack>
  );
}

function BookingButton({
  isBooking,
  onBook,
  selectedDateLabel,
}: {
  isBooking: boolean;
  onBook: () => void;
  selectedDateLabel: string;
}) {
  const isDisabled = !selectedDateLabel || isBooking;
  return (
    <Button
      px="1.25em"
      py="0.5em"
      borderRadius="8px"
      bg={theme.colors.sage.DEFAULT}
      _hover={{ bg: theme.colors.sage.dark }}
      color="white"
      onClick={onBook}
      isDisabled={isDisabled}
      opacity={isDisabled ? 0.6 : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      _disabled={{
        bg: theme.colors.grey.DEFAULT,
        color: '#FFFFFF',
        borderColor: theme.colors.grey.dark,
      }}
    >
      {getBookingButtonLabel(isBooking, selectedDateLabel)}
    </Button>
  );
}

function BookingErrorMessage({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <Text color="red.700" fontSize="sm" fontWeight="semibold">
      {message}
    </Text>
  );
}

function getBookingButtonLabel(isBooking: boolean, selectedDateLabel: string): string {
  if (isBooking) {
    return 'Creating hold...';
  }

  return selectedDateLabel ? `Book appointment (${selectedDateLabel})` : 'Book appointment';
}

function RatingStar({ index, rating }: { index: number; rating: number }) {
  const color = getRatingStarColor(index, rating);
  return <Star size={16} color={color} fill={color} strokeWidth={1.8} />;
}

function getRatingStarColor(index: number, rating: number): string {
  return index + 1 <= Math.round(rating) ? theme.colors.dustyRose.DEFAULT : '#E5E7EB';
}
