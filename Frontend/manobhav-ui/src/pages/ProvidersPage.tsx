import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  Stack,
  Tag,
  Text,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react';
import { CalendarRange, Filter, Search, SortDesc } from 'lucide-react';
import { theme } from '../utils/theme';
import providersData from '../assets/providers.json';
import { StarIcon } from '@chakra-ui/icons';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs, { Dayjs } from 'dayjs';
import { muiCalendarTheme } from '../utils/theme';

type ProvidersPageProps = {
  onBackHome: () => void;
  onBook: () => void;
};

type Provider = {
  id: string;
  name: string;
  summary: string;
  specializations: string[];
  avatarColor: string;
  nextDates: { display: string; iso: string }[];
  longDescription: string;
  shortDescription: string;
  sessions: number;
  rating: number;
};

const defaultThemeColors = [theme.colors.sage.DEFAULT, theme.colors.powderBlue.DEFAULT, theme.colors.dustyRose.DEFAULT];

export function ProvidersPage({ onBackHome: _onBackHome, onBook }: ProvidersPageProps) {
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
  const [search, setSearch] = useState('');
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filter, setFilter] = useState('Any');
  const [sort, setSort] = useState('Availability');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState<string>('');
  const [selectedDateIso, setSelectedDateIso] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempCalendarIso, setTempCalendarIso] = useState<string>('');
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
  void _onBackHome;

  const providers = useMemo<Provider[]>(() => {
    return (providersData as {
      id: string;
      name: string;
      shortDescription: string;
      longDescription: string;
      specialities: string[];
      availabilities: string[];
      avatarUrl: string;
    }[]).map((p, idx) => {
      const nextDates = (p.availabilities as string[]).map((d: string) => ({
        display: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        iso: new Date(d).toISOString().split('T')[0],
      }));
      return {
        id: p.id,
        name: p.name,
        summary: p.shortDescription,
        longDescription: p.longDescription,
        specializations: p.specialities,
        avatarColor: defaultThemeColors[idx % defaultThemeColors.length],
        nextDates,
        sessions: 10 + idx * 2,
        rating: 4.2 + (idx % 3) * 0.2, // 4.2, 4.4, 4.6
      } as Provider;
    });
  }, []);

  const filteredProviders = useMemo(
    () =>
      providers.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.specializations.some((s) => s.toLowerCase().includes(search.toLowerCase())),
      ),
    [providers, search],
  );

  const selected = useMemo(
    () => filteredProviders.find((p) => p.id === selectedId) || filteredProviders[0],
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
  }, [search, dateFrom, dateTo, filter, sort]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedId(providerId);
    if (isMobile) {
      setIsMobileDetailsOpen(true);
    }
  };

  const detailsContent = selected ? (
    <MUIThemeProvider theme={muiCalendarTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {!showCalendar && (
          <VStack align="stretch" spacing={3} className="h-full transition-all duration-700 ease-in-out">
            <Flex justify="center">
              <Avatar name={selected.name} bg={selected.avatarColor} color="white" boxSize="7rem" />
            </Flex>
            <Box h="1rem" />
            <Text
              fontSize="md"
              color="gray.700"
              overflowY={{ base: 'visible', lg: 'auto' }}
              maxH={{ base: 'none', lg: '8rem' }}
            >
              {selected.longDescription}
            </Text>
            <Box h="3px" />
            <HStack spacing={2} flexWrap="wrap">
              {selected.specializations.map((spec) => (
                <Tag key={spec} colorScheme="green" variant="subtle">
                  {spec}
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
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  color={i + 1 <= Math.round(selected.rating) ? theme.colors.dustyRose.DEFAULT : '#E5E7EB'}
                />
              ))}
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
        )}
        {showCalendar && (
          <VStack align="stretch" spacing={3} className="transition-all duration-700 ease-in-out items-center">
            <Text fontSize="lg" fontWeight="bold" color={theme.colors.textMain} textAlign="center">
              Choose a date
            </Text>
            <Box
              margin="0.75rem auto"
              width="100%"
              maxW="34rem"
              className="flex items-start justify-center"
            >
              <StaticDatePicker
                displayStaticWrapperAs="mobile"
                disablePast
                value={tempCalendarIso ? dayjs(tempCalendarIso) : selectedDateIso ? dayjs(selectedDateIso) : dayjs()}
                onChange={(value: Dayjs | null) => {
                  if (value) {
                    const isoVal = value.format('YYYY-MM-DD');
                    setTempCalendarIso(isoVal);
                  }
                }}
                slots={{ day: PickersDay }}
                slotProps={{
                  actionBar: { actions: [] },
                  day: {
                    sx: {
                      borderRadius: '50%',
                    },
                  },
                }}
                sx={{
                  width: '100%',
                  maxWidth: '36rem',
                  minHeight: '26rem',
                  '.MuiPickersToolbar-root': {
                    color: '#ffffff',
                    borderRadius: '0.9rem',
                    border: '1px solid rgba(255,255,255,0.35)',
                    backgroundColor: theme.colors.sage.DEFAULT,
                    minHeight: '60px',
                    padding: '0.75rem 1rem',
                  },
                  '.MuiPickersLayout-root': {
                    padding: '0.35rem 0.75rem 0.75rem',
                  },
                  '.MuiDateCalendar-root': {
                    width: '100%',
                    fontSize: '1.05rem',
                  },
                  '.MuiDayCalendar-weekDayLabel': {
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: theme.colors.sage.dark,
                    textTransform: 'uppercase',
                    padding: '0.2rem 0',
                    minWidth: '2.5rem',
                    textAlign: 'center',
                    margin: '0 0.2rem',
                  },
                  '.MuiPickersCalendarHeader-label': {
                    fontSize: '1.05rem',
                    fontWeight: 700,
                  },
                  '.MuiPickersCalendarHeader-root': {
                    padding: '0 0.75rem',
                  },
                  '.MuiDayCalendar-header': {
                    justifyContent: 'space-around',
                  },
                  '.MuiPickersLayout-contentWrapper': {
                    padding: '0.25rem 0.25rem 0.75rem',
                  },
                  '.MuiPickersSlideTransition-root': {
                    minHeight: '18rem',
                  },
                  '.MuiDayCalendar-weekContainer': {
                    justifyContent: 'space-around',
                  },
                  '.MuiPickersDay-root': {
                    '&.Mui-selected': {
                      backgroundColor: theme.colors.sage.DEFAULT,
                      color: '#ffffff',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: theme.colors.sage.dark,
                    },
                    '&:hover': {
                      backgroundColor: theme.colors.sage.light,
                    },
                  },
                }}
              />
            </Box>
            <HStack spacing={3} justify="center" pt={2} flexWrap="wrap">
              <Button
                px="1.25em"
                py="0.5em"
                borderRadius="8px"
                bg={theme.colors.sage.DEFAULT}
                _hover={{ bg: theme.colors.sage.dark }}
                color="white"
                onClick={() => {
                  const isoToSet = tempCalendarIso || selectedDateIso || dayjs().format('YYYY-MM-DD');
                  setSelectedDateIso(isoToSet);
                  setSelectedDateLabel(dayjs(isoToSet).format('MMM D, YYYY'));
                  setDateFrom(isoToSet);
                  setDateTo(isoToSet);
                  setShowCalendar(false);
                  setTempCalendarIso('');
                }}
                isDisabled={!(tempCalendarIso || selectedDateIso)}
              >
                Choose {tempCalendarIso ? dayjs(tempCalendarIso).format('MMM D, YYYY') : selectedDateLabel || ''}
              </Button>
              <Button
                px="1.25em"
                py="0.5em"
                borderRadius="8px"
                variant="outline"
                onClick={() => { setShowCalendar(false); setTempCalendarIso(''); }}
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        )}
      </LocalizationProvider>
    </MUIThemeProvider>
  ) : null;

  return (
    <div
      className="flex flex-col text-[color:var(--text-color)] overflow-hidden h-screen"
      style={{ height: 'calc(100vh - 4.5rem)' }}
    >
      {/* Query container */}
      <div className="pb-4 px-0 w-full relative z-20 flex-none bg-[#F9FAFB]">
        <div
          className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/60 px-6 py-5 space-y-4"
        >
          <Flex align="center" gap={3} wrap="wrap">
            <InputGroup
              flex={{ base: '1 1 100%', md: 1 }}
              maxW={{ base: '100%', md: '70%' }}
              boxShadow="sm"
              border="1px solid rgba(0,0,0,0.05)"
              rounded="md"
            >
              <InputLeftElement pointerEvents="none">
                <Search size={16} color="#9CA3AF" />
              </InputLeftElement>
              <Input
                variant="outline"
                placeholder="Search providers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bg="white"
              />
            </InputGroup>

            <Popover placement="bottom-start">
              <PopoverTrigger>
                <IconButton aria-label="Date range" icon={<CalendarRange size={18} />} variant="outline" />
              </PopoverTrigger>
              <PopoverContent width="280px">
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader fontWeight="bold">Select range</PopoverHeader>
                <PopoverBody>
                  <Stack spacing={3}>
                    <div className="flex flex-col gap-1">
                      <Text fontSize="sm">From</Text>
                      <Input
                        type="date"
                        min={todayIso}
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Text fontSize="sm">To</Text>
                      <Input
                        type="date"
                        min={dateFrom || todayIso}
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </Stack>
                </PopoverBody>
                <PopoverFooter>
                  <Button size="sm" variant="ghost" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                    Clear
                  </Button>
                </PopoverFooter>
              </PopoverContent>
            </Popover>

            <Menu>
              <MenuButton as={IconButton} aria-label="Filter" icon={<Filter size={18} />} variant="outline" />
              <MenuList>
                {['Any', 'Online', 'In-person', 'Female provider', 'Offers evenings'].map((f) => (
                  <MenuItem key={f} onClick={() => setFilter(f)}>
                    {f}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>

            <Menu>
              <MenuButton as={IconButton} aria-label="Sort" icon={<SortDesc size={18} />} variant="outline" />
              <MenuList>
                {['Availability', 'Experience', 'Hours', 'Date'].map((s) => (
                  <MenuItem key={s} onClick={() => setSort(s)}>
                    {s}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Flex>

          {summary && (
            <Text fontSize="sm" color="gray.600">
              {summary}
            </Text>
          )}
        </div>
      </div>

      {/* Populate container */}
      <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto bg-[#F9FAFB] px-0 pb-4 lg:mt-8 lg:flex-row lg:gap-6 lg:overflow-hidden">
        {/* background blobs */}
        {blobs.map((b, idx) => (
          <div
            key={idx}
            className="absolute rounded-full opacity-80 blur-[3em]"
            style={{
              top: b.top,
              left: b.left,
              width: b.size,
              height: b.size,
              background: b.color,
            }}
          />
        ))}

        <Box
          width={{ base: '100%', lg: '60vw' }}
          overflowY={{ base: 'visible', lg: 'auto' }}
          className="min-h-0 px-4 backdrop-blur-[8px] md:px-6 lg:h-full"
          sx={{ scrollbarWidth: 'thin' }}
        >
          {/* Providers List */} 
          <VStack align="stretch" spacing={4}>
            {filteredProviders.map((p) => (
              <Card
                key={p.id}
                variant="outline"
                borderColor={selected?.id === p.id ? '#9CAF88' : 'gray.100'}
                boxShadow="xl"
                bg="white"
                cursor="pointer"
                onClick={() => handleProviderSelect(p.id)}
              >
                <CardBody>
                  <Flex gap={4} align="stretch" direction={{ base: 'column', md: 'row' }}>
                    <Flex gap={4} flex={1} align="flex-start">
                      <Flex align="center" justify="center" minW="72px">
                        <Avatar name={p.name} bg={p.avatarColor} color="white" size="lg" />
                      </Flex>

                      <Flex direction="column" flex={1} gap={2}>
                        <CardHeader padding={0}>
                          <Text fontSize="lg" fontWeight="bold" color="gray.800">
                            {p.name}
                          </Text>
                        </CardHeader>
                        <Text fontSize="sm" color="gray.600">
                          {p.summary}
                        </Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {p.specializations.map((spec) => (
                            <Tag key={spec} colorScheme="green" variant="subtle">
                              {spec}
                            </Tag>
                          ))}
                        </HStack>
                      </Flex>
                    </Flex>

                    <VStack align="flex-start" spacing={2} minW={{ base: '100%', md: '150px' }}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                        Next available
                      </Text>
                      <Flex gap={2} wrap="wrap">
                        {p.nextDates.slice(0, 10).map((d) => (
                          <Button
                            key={d.iso}
                            size="xs"
                            variant="outline"
                            colorScheme="green"
                            onClick={() => {
                              setSelectedDateLabel(d.display);
                              setSelectedDateIso(d.iso);
                              setShowCalendar(false);
                            }}
                          >
                            {d.display}
                          </Button>
                        ))}
                      </Flex>
                      <Flex justify={{ base: 'flex-start', md: 'flex-end' }} w="100%">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setShowCalendar(true)}
                          className="transition-all duration-300 ease-in-out"
                        >
                          More dates
                        </Button>
                      </Flex>
                    </VStack>
                  </Flex>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        <Box
          flex={1}
          minH="18rem"
          display={{ base: 'none', lg: 'block' }}
          overflowY={{ base: 'visible', lg: 'auto' }}
          className="mx-4 min-h-0 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-[8px] transition-all duration-700 ease-in-out md:mx-6 lg:mx-0 lg:mr-6 lg:h-full"
          style={{ padding: '1.5rem' }}
        >
          {detailsContent}
        </Box>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity duration-300 lg:hidden ${
          isMobileDetailsOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileDetailsOpen(false)}
      >
        <div
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[1.75rem] border border-white/60 bg-white px-5 pb-6 pt-4 shadow-2xl transition-transform duration-300 ${
            isMobileDetailsOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Flex align="center" justify="space-between" mb={4}>
            <Box className="mx-auto h-1.5 w-14 rounded-full bg-gray-300" />
            <Button
              size="sm"
              variant="ghost"
              className="!absolute right-3 top-3"
              onClick={() => setIsMobileDetailsOpen(false)}
            >
              Close
            </Button>
          </Flex>
          {detailsContent}
        </div>
      </div>

      {/* Footer */}
      <div
        className="h-8 flex items-center justify-center text-sm text-white"
        style={{ backgroundColor: theme.colors.sage.DEFAULT }}
      >
        Manobhav © {new Date().getFullYear()}
      </div>
    </div>
  );
}

export default ProvidersPage;
