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
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react';
import { CalendarRange, Filter, Search, SortDesc, ArrowLeft } from 'lucide-react';
import { theme } from '../utils/theme';
import { Button as SoftButton } from '../shared/primitives/Button';

type ProvidersPageProps = {
  onBackHome: () => void;
};

type Provider = {
  id: string;
  name: string;
  summary: string;
  specializations: string[];
  avatarColor: string;
  nextDates: string[];
};

const sampleProviders: Provider[] = [
  {
    id: 'p1',
    name: 'Dr. Ananya Rao',
    summary: 'Clinical psychologist focusing on anxiety and burnout with calm, skills-first care.',
    specializations: ['Anxiety', 'CBT', 'Work Stress'],
    avatarColor: theme.colors.sage.DEFAULT,
    nextDates: Array.from({ length: 10 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
  },
  {
    id: 'p2',
    name: 'Sarah Jenkins',
    summary: 'Wellness coach blending mindfulness with gentle habit-building for sustainable change.',
    specializations: ['Mindfulness', 'Habits', 'Sleep'],
    avatarColor: theme.colors.powderBlue.DEFAULT,
    nextDates: Array.from({ length: 10 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 2);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
  },
  {
    id: 'p3',
    name: 'Dr. David Chen',
    summary: 'Psychiatrist with a balanced approach to meds and talk therapy for mood stability.',
    specializations: ['Mood', 'Medication Mgmt', 'Telehealth'],
    avatarColor: theme.colors.dustyRose.DEFAULT,
    nextDates: Array.from({ length: 10 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 3);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
  },
];

export function ProvidersPage({ onBackHome }: ProvidersPageProps) {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<'Any' | 'Next 7 days' | 'Next 30 days'>('Any');
  const [filter, setFilter] = useState('Any');
  const [sort, setSort] = useState('Availability');

  const filteredProviders = useMemo(
    () =>
      sampleProviders.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.specializations.some((s) => s.toLowerCase().includes(search.toLowerCase())),
      ),
    [search],
  );

  return (
    <div className="min-h-screen pt-24 pb-10 px-6 bg-[var(--bg-gradient)] text-[color:var(--text-color)]">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-6 space-y-4">
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

            <IconButton
              aria-label="Date range"
              icon={<CalendarRange size={18} />}
              variant="outline"
              onClick={() => setDateRange(dateRange === 'Any' ? 'Next 7 days' : 'Any')}
            />

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

          <Text fontSize="sm" color="gray.600">
            "{search || 'Any'}" from {dateRange} | {filter}. Sorting by: {sort}.
          </Text>
        </div>

        <div className="flex gap-6">
          <Box width="60vw">
            <VStack align="stretch" spacing={4}>
              {filteredProviders.map((p) => (
                <Card key={p.id} variant="outline" borderColor="gray.100" boxShadow="xl" bg="white">
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
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </Box>

          <Box flex={1} minH="300px" className="bg-white/60 border border-dashed border-gray-200 rounded-2xl" />
        </div>
      </div>

      <div className="mt-12 h-8 flex items-center justify-between text-sm text-gray-600 border-top border-gray-200 pt-3">
        <span>Manobhav © {new Date().getFullYear()}</span>
        <SoftButton variant="secondary" onClick={onBackHome} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Back home
        </SoftButton>
      </div>
    </div>
  );
}

