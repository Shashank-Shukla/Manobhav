import { useMemo, useState } from 'react';
import { useBreakpointValue } from '@chakra-ui/react';
import { theme } from '../../../utils/theme';
import { providerDirectory } from '../data/providerDirectory';
import type { ProviderDateOption } from '../types';

export function useProviderDirectory() {
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filter, setFilter] = useState('Any');
  const [sort, setSort] = useState('Availability');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');
  const [selectedDateIso, setSelectedDateIso] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempCalendarIso, setTempCalendarIso] = useState('');
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
  const [blobs] = useState(() => {
    const darkPalette = [
      theme.colors.sage.dark,
      theme.colors.dustyRose.dark,
      theme.colors.powderBlue.dark,
      theme.colors.grey.dark,
    ];
    const count = Math.floor(Math.random() * 10);

    return Array.from({ length: count }).map(() => ({
      top: `${10 + Math.random() * 70}%`,
      left: `${5 + Math.random() * 80}%`,
      size: `${4 + Math.random() * 4}em`,
      color: darkPalette[Math.floor(Math.random() * darkPalette.length)],
    }));
  });

  const filteredProviders = useMemo(() => {
    const query = search.toLowerCase();

    return providerDirectory.filter(
      (provider) =>
        provider.name.toLowerCase().includes(query) ||
        provider.specializations.some((specialization) => specialization.toLowerCase().includes(query)),
    );
  }, [search]);

  const selected = useMemo(
    () => filteredProviders.find((provider) => provider.id === selectedId) || filteredProviders[0],
    [filteredProviders, selectedId],
  );

  const summary = useMemo(() => {
    const parts: string[] = [];
    const cleanSearch = search.trim();

    if (cleanSearch) parts.push(`Searching "${cleanSearch}"`);
    if (dateFrom && dateTo) parts.push(`Filtered by date ranging from ${dateFrom} to ${dateTo}`);
    else if (dateFrom) parts.push(`Filtered by date starting ${dateFrom}`);
    if (filter !== 'Any') parts.push(`Filtered by "${filter}"`);
    if (sort !== 'Availability') parts.push(`Sorted by "${sort}"`);

    return parts.join(' | ');
  }, [dateFrom, dateTo, filter, search, sort]);

  const selectProvider = (providerId: string) => {
    setSelectedId(providerId);
    if (isMobile) {
      setIsMobileDetailsOpen(true);
    }
  };

  const selectProviderDate = ({ display, iso }: ProviderDateOption) => {
    setSelectedDateLabel(display);
    setSelectedDateIso(iso);
    setShowCalendar(false);
  };

  const openCalendar = (providerId: string) => {
    setSelectedId(providerId);
    setTempCalendarIso(selectedDateIso || todayIso);
    setShowCalendar(true);
    if (isMobile) {
      setIsMobileDetailsOpen(true);
    }
  };

  const chooseCalendarDate = (iso: string, label: string) => {
    setSelectedDateIso(iso);
    setSelectedDateLabel(label);
    setDateFrom(iso);
    setDateTo(iso);
    setShowCalendar(false);
    setTempCalendarIso('');
  };

  const cancelCalendar = () => {
    setShowCalendar(false);
    setTempCalendarIso('');
  };

  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
  };

  return {
    blobs,
    cancelCalendar,
    chooseCalendarDate,
    clearDateRange,
    dateFrom,
    dateTo,
    filter,
    filteredProviders,
    isMobileDetailsOpen,
    openCalendar,
    search,
    selectProvider,
    selectProviderDate,
    selected,
    selectedDateIso,
    selectedDateLabel,
    selectedId,
    setDateFrom,
    setDateTo,
    setFilter,
    setIsMobileDetailsOpen,
    setSearch,
    setSort,
    setTempCalendarIso,
    showCalendar,
    sort,
    summary,
    tempCalendarIso,
    todayIso,
  };
}
