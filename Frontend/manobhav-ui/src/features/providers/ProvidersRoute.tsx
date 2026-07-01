import { Box, ChakraProvider } from '@chakra-ui/react';
import { useState } from 'react';
import { createBookingHoldForProvider } from './bookingFlow';
import { ProviderDetailsPanel } from './components/ProviderDetailsPanel';
import { ProviderList } from './components/ProviderList';
import { ProviderMobileDetailsDrawer } from './components/ProviderMobileDetailsDrawer';
import { ProviderSearchToolbar } from './components/ProviderSearchToolbar';
import { useProviderDirectory } from './hooks/useProviderDirectory';
import type { ProvidersRouteProps } from './types';

export function ProvidersPage(props: ProvidersRouteProps) {
  return (
    <ChakraProvider>
      <ProvidersDirectory {...props} />
    </ChakraProvider>
  );
}

function ProvidersDirectory({ onBackHome: _onBackHome, onBook }: ProvidersRouteProps) {
  const directory = useProviderDirectory();
  const [bookingError, setBookingError] = useState('');
  const [isCreatingHold, setIsCreatingHold] = useState(false);
  void _onBackHome;

  const bookSelectedProvider = async () => {
    if (!directory.selected) {
      return;
    }

    setBookingError('');
    setIsCreatingHold(true);
    try {
      await createBookingHoldForProvider({
        providerId: directory.selected.id,
        selectedDateIso: directory.selectedDateIso,
        selectedSlotId: directory.selectedSlotId,
      });
      onBook();
    } catch (error: unknown) {
      setBookingError(error instanceof Error ? error.message : 'Unable to create booking hold.');
    } finally {
      setIsCreatingHold(false);
    }
  };

  const directoryState = (() => {
    if (directory.providerStatus === 'loading') {
      return (
        <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="white" p={6} textAlign="center">
          <div className="mx-auto h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </Box>
      );
    }

    if (directory.providerStatus === 'error') {
      return (
        <Box rounded="xl" border="1px solid" borderColor="red.200" bg="red.50" p={6} textAlign="center" color="red.800">
          Unable to load providers from the API.
        </Box>
      );
    }

    if (directory.providerStatus === 'empty') {
      return (
        <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="white" p={6} textAlign="center" color="gray.700">
          No providers are configured yet.
        </Box>
      );
    }

    return null;
  })();

  const details = (
    <ProviderDetailsPanel
      bookingError={bookingError}
      isBooking={isCreatingHold}
      onBook={() => void bookSelectedProvider()}
      onCalendarCancel={directory.cancelCalendar}
      onCalendarChoose={directory.chooseCalendarDate}
      onOpenCalendar={directory.openCalendar}
      onTempCalendarChange={directory.setTempCalendarIso}
      selected={directory.selected}
      selectedDateIso={directory.selectedDateIso}
      selectedDateLabel={directory.selectedDateLabel}
      availableSlots={directory.availableSlots}
      slotsStatus={directory.slotsStatus}
      selectedSlotId={directory.selectedSlotId}
      selectedSlotLabel={directory.selectedSlotLabel}
      onSelectSlot={directory.selectSlot}
      showCalendar={directory.showCalendar}
      tempCalendarIso={directory.tempCalendarIso}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[color:var(--text-color)]">
      <ProviderSearchToolbar
        dateFrom={directory.dateFrom}
        dateTo={directory.dateTo}
        onClearDateRange={directory.clearDateRange}
        onDateFromChange={directory.setDateFrom}
        onDateToChange={directory.setDateTo}
        onFilterChange={directory.setFilter}
        onSearchChange={directory.setSearch}
        onSortChange={directory.setSort}
        search={directory.search}
        summary={directory.summary}
        todayIso={directory.todayIso}
      />

      <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-[#F9FAFB] px-0 pb-4 lg:mt-8 lg:flex-row lg:gap-6">
        {directory.blobs.map((blob, index) => (
          <div
            key={`${blob.top}-${blob.left}-${index}`}
            className="absolute rounded-full opacity-80 blur-[3em]"
            style={{
              top: blob.top,
              left: blob.left,
              width: blob.size,
              height: blob.size,
              background: blob.color,
            }}
          />
        ))}

        <Box
          width={{ base: '100%', lg: '60vw' }}
          overflowY="auto"
          className="min-h-0 px-4 backdrop-blur-[8px] md:pl-6 md:pr-0 lg:h-full"
          sx={{ scrollbarWidth: 'thin' }}
        >
          {directoryState ?? (
            <ProviderList
              onOpenCalendar={directory.openCalendar}
              onSelectDate={directory.selectProviderDate}
              onSelectProvider={directory.selectProvider}
              providers={directory.filteredProviders}
              selectedId={directory.selected?.id ?? directory.selectedId ?? undefined}
              selectedDateIso={directory.selectedDateIso}
            />
          )}
        </Box>

        <Box
          flex={1}
          minH="18rem"
          display={{ base: 'none', lg: 'block' }}
          overflowY={{ base: 'visible', lg: 'auto' }}
          className="mx-4 min-h-0 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-[8px] transition-all duration-700 ease-in-out md:mx-6 lg:mx-0 lg:mr-6 lg:h-full"
          style={{ padding: '1.5rem' }}
        >
          {details}
        </Box>
      </div>

      <ProviderMobileDetailsDrawer
        isOpen={directory.isMobileDetailsOpen}
        onClose={() => directory.setIsMobileDetailsOpen(false)}
      >
        {details}
      </ProviderMobileDetailsDrawer>
    </div>
  );
}

export default ProvidersPage;
