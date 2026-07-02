import { lazy, Suspense } from 'react';
import { Avatar, Box, Button, Flex, HStack, Tag, Text, VStack } from '@chakra-ui/react';
import { CalendarDays, Star } from 'lucide-react';
import { theme } from '../../../utils/theme';
import { hasRemainingWindow } from '../availability';
import type { ProviderRecord } from '../types';
import type { ProviderSlot } from '../bookingFlow';

type SlotsStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

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
  availableSlots: ProviderSlot[];
  slotsStatus: SlotsStatus;
  selectedSlotId: string;
  selectedSlotLabel: string;
  onSelectSlot: (slotId: string, label: string) => void;
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
  availableSlots,
  slotsStatus,
  selectedSlotId,
  selectedSlotLabel,
  onSelectSlot,
  showCalendar,
  tempCalendarIso,
}: ProviderDetailsPanelProps) {
  if (!selected) {
    return null;
  }

  // Today is bookable only while a window is still open; once they've all ended, the calendar must
  // disable today too (mirrors the "next available" chip logic so both surfaces agree).
  const now = new Date();
  const disableToday = !hasRemainingWindow(selected.weeklyAvailability, now.getDay(), now);

  return showCalendar ? (
    <ProviderCalendarPanel
      availableDaysOfWeek={selected.availableDaysOfWeek}
      disableToday={disableToday}
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
      availableSlots={availableSlots}
      slotsStatus={slotsStatus}
      selectedSlotId={selectedSlotId}
      selectedSlotLabel={selectedSlotLabel}
      onSelectSlot={onSelectSlot}
    />
  );
}

function ProviderCalendarPanel({
  availableDaysOfWeek,
  disableToday,
  onCalendarCancel,
  onCalendarChoose,
  onTempCalendarChange,
  selectedDateIso,
  selectedDateLabel,
  tempCalendarIso,
}: {
  availableDaysOfWeek: number[];
  disableToday: boolean;
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
          disableToday={disableToday}
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
  availableSlots,
  slotsStatus,
  selectedSlotId,
  selectedSlotLabel,
  onSelectSlot,
}: {
  bookingError: string;
  isBooking: boolean;
  onBook: () => void;
  onOpenCalendar: (providerId: string) => void;
  selected: ProviderRecord;
  selectedDateLabel: string;
  availableSlots: ProviderSlot[];
  slotsStatus: SlotsStatus;
  selectedSlotId: string;
  selectedSlotLabel: string;
  onSelectSlot: (slotId: string, label: string) => void;
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

      <TimeSlotPicker
        selectedDateLabel={selectedDateLabel}
        slots={availableSlots}
        status={slotsStatus}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
      />

      <VStack align="stretch" spacing={2} pt={1}>
        <Flex gap={3} align="stretch" w="100%">
          <Box w="75%">
            <BookingButton
              isBooking={isBooking}
              onBook={onBook}
              selectedDateLabel={selectedDateLabel}
              selectedSlotLabel={selectedSlotLabel}
            />
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
  selectedSlotLabel,
}: {
  isBooking: boolean;
  onBook: () => void;
  selectedDateLabel: string;
  selectedSlotLabel: string;
}) {
  // A booking needs a concrete time slot, not just a date — enable only once a time is chosen.
  const isDisabled = !selectedSlotLabel || isBooking;
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
      {getBookingButtonLabel(isBooking, selectedDateLabel, selectedSlotLabel)}
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

function getBookingButtonLabel(isBooking: boolean, selectedDateLabel: string, selectedSlotLabel: string): string {
  if (isBooking) {
    return 'Creating hold...';
  }

  if (selectedSlotLabel) {
    return `Book appointment (${selectedDateLabel}, ${selectedSlotLabel})`;
  }

  return 'Book appointment';
}

/**
 * Lets the user pick a concrete time once a date is selected. Times are rendered in the provider's
 * IST timezone (the platform is India-only) regardless of the visitor's local clock.
 */
function TimeSlotPicker({
  selectedDateLabel,
  slots,
  status,
  selectedSlotId,
  onSelectSlot,
}: {
  selectedDateLabel: string;
  slots: ProviderSlot[];
  status: SlotsStatus;
  selectedSlotId: string;
  onSelectSlot: (slotId: string, label: string) => void;
}) {
  if (!selectedDateLabel) {
    return (
      <Text fontSize="sm" color="gray.500">
        Select a date to see available times.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
        Available times on {selectedDateLabel}
      </Text>
      {status === 'loading' && (
        <Text fontSize="sm" color="gray.500">
          Loading times…
        </Text>
      )}
      {status === 'error' && (
        <Text fontSize="sm" color="red.600">
          Couldn&apos;t load times. Try another date.
        </Text>
      )}
      {status === 'empty' && (
        <Text fontSize="sm" color="gray.500">
          No open times on this date.
        </Text>
      )}
      {status === 'ready' && (
        <Flex gap={2} wrap="wrap">
          {slots.map((slot) => {
            const label = formatSlotTime(slot.startsAtUtc);
            const isSelected = slot.id === selectedSlotId;
            return (
              <Button
                key={slot.id}
                size="sm"
                variant={isSelected ? 'solid' : 'outline'}
                bg={isSelected ? theme.colors.sage.DEFAULT : 'transparent'}
                color={isSelected ? 'white' : theme.colors.sage.dark}
                borderColor={theme.colors.sage.DEFAULT}
                _hover={{ bg: isSelected ? theme.colors.sage.dark : theme.colors.sage.light }}
                onClick={() => onSelectSlot(slot.id, label)}
              >
                {label}
              </Button>
            );
          })}
        </Flex>
      )}
    </VStack>
  );
}

function formatSlotTime(startsAtUtc: string): string {
  return new Date(startsAtUtc).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function RatingStar({ index, rating }: { index: number; rating: number }) {
  const color = getRatingStarColor(index, rating);
  return <Star size={16} color={color} fill={color} strokeWidth={1.8} />;
}

function getRatingStarColor(index: number, rating: number): string {
  return index + 1 <= Math.round(rating) ? theme.colors.dustyRose.DEFAULT : '#E5E7EB';
}
