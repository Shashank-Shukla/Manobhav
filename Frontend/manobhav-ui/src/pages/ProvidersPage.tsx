import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
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
  VStack,
} from '@chakra-ui/react';
import { CalendarRange, Filter, Search, SortDesc } from 'lucide-react';
import { theme } from '../utils/theme';
import providersData from '../assets/providers.json';
import { StarIcon } from '@chakra-ui/icons';

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
  nextDates: string[];
  longDescription: string;
  shortDescription: string;
  sessions: number;
  rating: number;
};

const colors = [theme.colors.sage.DEFAULT, theme.colors.powderBlue.DEFAULT, theme.colors.dustyRose.DEFAULT];

export function ProvidersPage({ onBackHome: _onBackHome, onBook }: ProvidersPageProps) {
  const [search, setSearch] = useState('');
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filter, setFilter] = useState('Any');
  const [sort, setSort] = useState('Availability');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blobs] = useState(() => {
    const count = Math.floor(Math.random() * 3) + 2; // 2-4 blobs
    return Array.from({ length: count }).map(() => ({
      top: `${10 + Math.random() * 70}%`,
      left: `${5 + Math.random() * 80}%`,
      size: `${4 + Math.random() * 4}em`,
      color: Math.random() > 0.5 ? theme.colors.sage.light : theme.colors.powderBlue.light,
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
      const nextDates = (p.availabilities as string[]).map((d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      );
      return {
        id: p.id,
        name: p.name,
        summary: p.shortDescription,
        longDescription: p.longDescription,
        specializations: p.specialities,
        avatarColor: colors[idx % colors.length],
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

  return (
    <div className="h-screen bg-[var(--bg-gradient)] text-[color:var(--text-color)] flex flex-col overflow-hidden">
      {/* Query container */}
      <div className="pt-24 pb-4 px-0 w-full relative z-20">
        <div
          className="bg-white/85 backdrop-blur-xl shadow-xl border-t border-b border-white/40 px-6 py-5 space-y-4"
          style={{ backgroundColor: '#E6EDE8' }}
        >
          <Flex align="center" gap={3} wrap="wrap">
            <InputGroup flex={1} maxW="70%">
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
      <div className="relative flex flex-1 gap-6 mt-8 px-0 overflow-hidden pb-4 z-10">
        {/* background blobs */}
        {blobs.map((b, idx) => (
          <div
            key={idx}
            className="absolute rounded-full opacity-60 blur-3xl"
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
          width="60vw"
          className="overflow-auto px-6 backdrop-blur-[60px] bg-white/60"
          sx={{ scrollbarWidth: 'thin' }}
        >
          <VStack align="stretch" spacing={4}>
            {filteredProviders.map((p) => (
              <Card
                key={p.id}
                variant="outline"
                borderColor={selected?.id === p.id ? '#9CAF88' : 'gray.100'}
                boxShadow="xl"
                bg="white"
                cursor="pointer"
                onClick={() => setSelectedId(p.id)}
              >
                <CardBody>
                  <Flex gap={4} align="stretch">
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

                    <Divider orientation="vertical" />

                      <VStack align="flex-start" spacing={2} minW="150px">
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                          Next available
                        </Text>
                        <Flex gap={2} wrap="wrap">
                          {p.nextDates.slice(0, 10).map((d) => (
                            <Button key={d} size="xs" variant="outline" colorScheme="green">
                              {d}
                            </Button>
                          ))}
                        </Flex>
                        <Divider />
                        <Button size="xs" variant="outline" isDisabled>
                          More dates
                        </Button>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
          </VStack>
        </Box>

        <Box
          flex={1}
          minH="300px"
          className="mr-6 bg-white/80 border border-gray-200 rounded-2xl backdrop-blur-[60px]"
          style={{ padding: '1.5rem' }}
        >
          {selected && (
            <VStack align="stretch" spacing={3} className="h-full">
              <Flex justify="center">
                <Avatar name={selected.name} bg={selected.avatarColor} color="white" boxSize="7rem" />
              </Flex>
              <Box h="1rem" />
              <Text fontSize="md" color="gray.700" className="overflow-auto" style={{ maxHeight: '8rem' }}>
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
                bg={theme.colors.sage.DEFAULT}
                _hover={{ bg: theme.colors.sage.dark }}
                color="white"
                onClick={onBook}
              >
                Book appointment
              </Button>
            </VStack>
          )}
        </Box>
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
