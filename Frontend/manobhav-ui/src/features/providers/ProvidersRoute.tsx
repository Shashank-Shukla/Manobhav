import { Box, ChakraProvider } from '@chakra-ui/react';
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
  void _onBackHome;

  const details = (
    <ProviderDetailsPanel
      onBook={onBook}
      onCalendarCancel={directory.cancelCalendar}
      onCalendarChoose={directory.chooseCalendarDate}
      onTempCalendarChange={directory.setTempCalendarIso}
      selected={directory.selected}
      selectedDateIso={directory.selectedDateIso}
      selectedDateLabel={directory.selectedDateLabel}
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
          className="min-h-0 px-4 backdrop-blur-[8px] md:px-6 lg:h-full"
          sx={{ scrollbarWidth: 'thin' }}
        >
          <ProviderList
            onOpenCalendar={directory.openCalendar}
            onSelectDate={directory.selectProviderDate}
            onSelectProvider={directory.selectProvider}
            providers={directory.filteredProviders}
            selectedId={directory.selected?.id ?? directory.selectedId ?? undefined}
          />
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
