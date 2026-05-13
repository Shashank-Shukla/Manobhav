import { Avatar, Box, Button, Card, CardBody, CardHeader, Flex, HStack, Tag, Text, VStack } from '@chakra-ui/react';
import type { ProviderDateOption, ProviderRecord } from '../types';

type ProviderListProps = {
  onOpenCalendar: (providerId: string) => void;
  onSelectDate: (date: ProviderDateOption) => void;
  onSelectProvider: (providerId: string) => void;
  providers: ProviderRecord[];
  selectedId?: string;
};

export function ProviderList({
  onOpenCalendar,
  onSelectDate,
  onSelectProvider,
  providers,
  selectedId,
}: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="white" p={6} textAlign="center">
        <Text fontWeight="semibold" color="gray.700">
          No providers match this search.
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      {providers.map((provider) => (
        <Card
          key={provider.id}
          variant="outline"
          borderColor={selectedId === provider.id ? '#9CAF88' : 'gray.100'}
          boxShadow="xl"
          bg="white"
          cursor="pointer"
          onClick={() => onSelectProvider(provider.id)}
        >
          <CardBody>
            <Flex gap={4} align="stretch" direction={{ base: 'column', md: 'row' }}>
              <Flex gap={4} flex={1} align="flex-start">
                <Flex align="center" justify="center" minW="72px">
                  <Avatar name={provider.name} bg={provider.avatarColor} color="white" size="lg" />
                </Flex>

                <Flex direction="column" flex={1} gap={2}>
                  <CardHeader padding={0}>
                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                      {provider.name}
                    </Text>
                  </CardHeader>
                  <Text fontSize="sm" color="gray.600">
                    {provider.summary}
                  </Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {provider.specializations.map((specialization) => (
                      <Tag key={specialization} colorScheme="green" variant="subtle">
                        {specialization}
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
                  {provider.nextDates.slice(0, 10).map((date) => (
                    <Button
                      key={date.iso}
                      size="xs"
                      variant="outline"
                      colorScheme="green"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectDate(date);
                      }}
                    >
                      {date.display}
                    </Button>
                  ))}
                </Flex>
                <Flex justify={{ base: 'flex-start', md: 'flex-end' }} w="100%">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenCalendar(provider.id);
                    }}
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
  );
}
