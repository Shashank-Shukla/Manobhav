import {
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Stack,
  Text,
} from '@chakra-ui/react';
import SearchIcon from '@mui/icons-material/Search';
import { CalendarRange, Filter, SortDesc } from 'lucide-react';

type ProviderSearchToolbarProps = {
  dateFrom: string;
  dateTo: string;
  onClearDateRange: () => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  search: string;
  summary: string;
  todayIso: string;
};

export function ProviderSearchToolbar({
  dateFrom,
  dateTo,
  onClearDateRange,
  onDateFromChange,
  onDateToChange,
  onFilterChange,
  onSearchChange,
  onSortChange,
  search,
  summary,
  todayIso,
}: ProviderSearchToolbarProps) {
  return (
    <div className="relative z-20 w-full flex-none bg-[#F9FAFB] px-0 pb-4">
      <div className="space-y-4 border border-white/60 bg-white/90 px-6 py-5 shadow-xl backdrop-blur-xl">
        <Flex align="center" gap={3} wrap="wrap">
          <InputGroup
            flex={{ base: '1 1 100%', md: 1 }}
            maxW={{ base: '100%', md: '70%' }}
            boxShadow="sm"
            border="1px solid rgba(0,0,0,0.05)"
            rounded="md"
          >
            <InputRightElement pointerEvents="none">
              <SearchIcon style={{ fontSize: 16, color: '#9CA3AF' }} />
            </InputRightElement>
            <Input
              variant="outline"
              placeholder="Search providers..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
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
                      onChange={(event) => onDateFromChange(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Text fontSize="sm">To</Text>
                    <Input
                      type="date"
                      min={dateFrom || todayIso}
                      value={dateTo}
                      onChange={(event) => onDateToChange(event.target.value)}
                    />
                  </div>
                </Stack>
              </PopoverBody>
              <PopoverFooter>
                <Button size="sm" variant="ghost" onClick={onClearDateRange}>
                  Clear
                </Button>
              </PopoverFooter>
            </PopoverContent>
          </Popover>

          <Menu>
            <MenuButton as={IconButton} aria-label="Filter" icon={<Filter size={18} />} variant="outline" />
            <MenuList>
              {['Any', 'Online', 'In-person', 'Female provider', 'Offers evenings'].map((filter) => (
                <MenuItem key={filter} onClick={() => onFilterChange(filter)}>
                  {filter}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton as={IconButton} aria-label="Sort" icon={<SortDesc size={18} />} variant="outline" />
            <MenuList>
              {['Availability', 'Experience', 'Hours', 'Date'].map((sort) => (
                <MenuItem key={sort} onClick={() => onSortChange(sort)}>
                  {sort}
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
  );
}
