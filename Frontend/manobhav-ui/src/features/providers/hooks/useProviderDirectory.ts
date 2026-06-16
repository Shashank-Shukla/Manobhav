import { useEffect, useMemo, useState } from 'react';
import { useBreakpointValue } from '@chakra-ui/react';
import { theme } from '../../../utils/theme';
import { getProviders } from '../../public-data';
import type { ProviderDateOption, ProviderRecord } from '../types';

export function useProviderDirectory() {
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [providerStatus, setProviderStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filter, setFilter] = useState('Any');
  const [sort, setSort] = useState('Availability');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');
  const [selectedDateIso, setSelectedDateIso] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
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

  useEffect(() => {
    const controller = new AbortController();
    getProviders(controller.signal)
      .then((items) => {
        setProviders(items);
        setProviderStatus(items.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        setProviders([]);
        setProviderStatus('error');
      });

    return () => controller.abort();
  }, []);

  const filteredProviders = useMemo(() => {
    const query = search.toLowerCase();

    return providers.filter(
      (provider) =>
        provider.name.toLowerCase().includes(query) ||
        provider.specializations.some((specialization) => specialization.toLowerCase().includes(query)),
    );
  }, [providers, search]);

  const selected = useMemo(
    () => filteredProviders.find((provider) => provider.id === selectedId) || filteredProviders[0],
    [filteredProviders, selectedId],
  );

  const summary = useMemo(() => {
    return buildProviderFilterSummary({ dateFrom, dateTo, filter, search, sort });
  }, [dateFrom, dateTo, filter, search, sort]);

  const selectProvider = (providerId: string) => {
    setSelectedId(providerId);
    if (isMobile) {
      setIsMobileDetailsOpen(true);
    }
  };

  const selectProviderDate = ({ display, iso, slotId }: ProviderDateOption) => {
    setSelectedDateLabel(display);
    setSelectedDateIso(iso);
    setSelectedSlotId(slotId ?? '');
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
    setSelectedSlotId('');
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
    providerStatus,
    search,
    selectProvider,
    selectProviderDate,
    selected,
    selectedDateIso,
    selectedDateLabel,
    selectedId,
    selectedSlotId,
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

function buildProviderFilterSummary({
  dateFrom,
  dateTo,
  filter,
  search,
  sort,
}: {
  dateFrom: string;
  dateTo: string;
  filter: string;
  search: string;
  sort: string;
}): string {
  return [
    getSearchSummary(search),
    getDateSummary(dateFrom, dateTo),
    getFilterSummary(filter),
    getSortSummary(sort),
  ].filter(Boolean).join(' | ');
}

function getSearchSummary(search: string): string {
  const cleanSearch = search.trim();
  return cleanSearch ? `Searching "${cleanSearch}"` : '';
}

function getDateSummary(dateFrom: string, dateTo: string): string {
  if (dateFrom && dateTo) {
    return `Filtered by date ranging from ${dateFrom} to ${dateTo}`;
  }

  return dateFrom ? `Filtered by date starting ${dateFrom}` : '';
}

function getFilterSummary(filter: string): string {
  return filter !== 'Any' ? `Filtered by "${filter}"` : '';
}

function getSortSummary(sort: string): string {
  return sort !== 'Availability' ? `Sorted by "${sort}"` : '';
}
