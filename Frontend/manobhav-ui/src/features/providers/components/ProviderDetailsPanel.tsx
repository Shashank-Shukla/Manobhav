import { lazy, Suspense } from 'react';
import { Avatar, Box, Button, Flex, HStack, Tag, Text, VStack } from '@chakra-ui/react';
import { CalendarDays, Star } from 'lucide-react';
import { theme } from '../../../utils/theme';
import type { ProviderRecord } from '../types';

const ProviderDatePicker = lazy(() => import('./ProviderDatePicker'));

type ProviderDetailsPanelProps = {
  bookingError: string;
  isBooking: boolean;
  onBook: () => void;
  onCalendarCancel: () => void;
  onCalendarChoose: (iso: string, label: string) => void;
  onOpenCalendar: (providerId: string) => void;
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
  onOpenCalendar,
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
      availableDaysOfWeek={selected.availableDaysOfWeek}
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
      onOpenCalendar={onOpenCalendar}
      selected={selected}
      selectedDateLabel={selectedDateLabel}
    />
  );
}

function ProviderCalendarPanel({
  availableDaysOfWeek,
  onCalendarCancel,
  onCalendarChoose,
  onTempCalendarChange,
  selectedDateIso,
  selectedDateLabel,
  tempCalendarIso,
}: {
  availableDaysOfWeek: number[];
  onCalendarCancel: () => void;
  onCalendarChoose: (iso: string, label: string) => void;
  onTempCalendarChange: (iso: string) => void;
  selectedDateIso: string;
  selectedDateLabel: string;
  tempCalendarIso: string;
}) {
  return (
    <VStack align="stretch" spacing={3} className="items-center transition-all duration-700 ease-in-out">
      <Text fontSize="lg" fontWeight="bold" color={theme.colors.textMain} textAlign="center">
        Choose a date
      </Text>
      <Suspense fallback={<Text color="gray.600">Loading calendar...</Text>}>
        <ProviderDatePicker
          availableDaysOfWeek={availableDaysOfWeek}
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
  onOpenCalendar,
  selected,
  selectedDateLabel,
}: {
  bookingError: string;
  isBooking: boolean;
  onBook: () => void;
  onOpenCalendar: (providerId: string) => void;
  selected: ProviderRecord;
  selectedDateLabel: string;
}) {
  const hasAvailability = selected.availableDaysOfWeek.length > 0;

  return (
    <VStack align="stretch" spacing={3} className="h-full transition-all duration-700 ease-in-out">
      <Flex justify="center">
        <Avatar name={selected.name} src={selected.photoUrl} bg={selected.avatarColor} color="white" boxSize="7rem" />
      </Flex>
      <Text fontSize="xl" fontWeight="bold" color="gray.800" textAlign="center">
        {selected.name}
      </Text>

      <Box fontSize="md" color="gray.700" minH="10vh">
        {selected.longDescription || 'This provider has not added a bio yet.'}
      </Box>

      {selected.specializations.length > 0 && (
        <HStack
          spacing={2}
          align="center"
          overflowX="auto"
          overflowY="hidden"
          flexWrap="nowrap"
          pt={1}
          pb={2}
          sx={{ scrollbarWidth: 'thin' }}
        >
          {selected.specializations.map((specialization) => (
            <Tag key={specialization} colorScheme="green" variant="subtle" flexShrink={0} whiteSpace="nowrap">
              {specialization}
            </Tag>
          ))}
        </HStack>
      )}

      <Text fontWeight="semibold" color="gray.800">
        No. of sessions taken: {selected.sessions}
      </Text>

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

      <VStack align="stretch" spacing={2} pt={1}>
        <Flex gap={3} align="stretch" w="100%">
          <Box w="75%">
            <BookingButton isBooking={isBooking} onBook={onBook} selectedDateLabel={selectedDateLabel} />
          </Box>
          <Box w="25%">
            <Button
              width="100%"
              variant="outline"
              leftIcon={<CalendarDays size={16} aria-hidden="true" />}
              borderColor={theme.colors.sage.DEFAULT}
              color={theme.colors.sage.dark}
              _hover={{ bg: theme.colors.sage.light }}
              isDisabled={!hasAvailability}
              onClick={() => onOpenCalendar(selected.id)}
            >
              More dates
            </Button>
          </Box>
        </Flex>
        <BookingErrorMessage message={bookingError} />
      </VStack>
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
      width="100%"
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
    <Text color="red.700" fontSize="sm" fontWeight="semibold" textAlign="center">
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
