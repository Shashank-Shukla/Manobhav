import { Box, Flex, Grid, GridItem, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { LineChart } from 'lucide-react';
import { bookings, insightMetrics, opsQueues, providers, quickActions } from '../data';
import { adminTheme, toneStyles } from '../adminTheme';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { WorkQueue } from '../components/WorkQueue';
import { MiniProgress, SectionCard } from './shared';
import { metricIcons } from './viewUtils';

export function TodayOpsView() {
  return (
    <Stack spacing={6}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {insightMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            helper={metric.helper}
            tone={metric.tone}
            icon={metricIcons[metric.id as keyof typeof metricIcons] ?? LineChart}
          />
        ))}
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: '1.4fr 0.9fr' }} gap={5}>
        <GridItem>
          <WorkQueue title="Urgent work queue" subtitle="Items that need admin attention today" items={opsQueues} />
        </GridItem>
        <GridItem>
          <WorkQueue title="Quick actions" subtitle="Common operations from the command center" items={quickActions} actionLabel="Start" />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <SectionCard title="Provider capacity" helper="Live view of workload and next openings">
          <Stack spacing={4}>
            {providers.map((provider) => (
              <Box key={provider.id} border="1px solid" borderColor={toneStyles[provider.tone].border} bg="white" borderRadius="14px" p={4}>
                <Flex justify="space-between" gap={4} mb={3}>
                  <Box>
                    <Text color={adminTheme.text} fontWeight="900">
                      {provider.name}
                    </Text>
                    <Text color={adminTheme.muted} fontSize="sm">
                      {provider.role} - next slot {provider.nextOpenSlot}
                    </Text>
                  </Box>
                  <StatusBadge label={provider.status} tone={provider.tone} />
                </Flex>
                <MiniProgress value={provider.load} tone={provider.tone} />
                <Text color={adminTheme.muted} fontSize="xs" mt={2}>
                  {provider.load}% booked capacity this week
                </Text>
              </Box>
            ))}
          </Stack>
        </SectionCard>

        <SectionCard title="Upcoming bookings" helper="Session flow for the next operational window">
          <Stack spacing={3}>
            {bookings.map((booking) => (
              <Flex
                key={booking.id}
                justify="space-between"
                align={{ base: 'stretch', sm: 'center' }}
                direction={{ base: 'column', sm: 'row' }}
                gap={3}
                border="1px solid"
                borderColor={toneStyles[booking.tone].border}
                bg="white"
                borderRadius="14px"
                p={4}
              >
                <Box>
                  <Text color={adminTheme.text} fontWeight="900">
                    {booking.patientName}
                  </Text>
                  <Text color={adminTheme.muted} fontSize="sm">
                    {booking.date}, {booking.time} with {booking.providerName}
                  </Text>
                </Box>
                <StatusBadge label={booking.status} tone={booking.tone} />
              </Flex>
            ))}
          </Stack>
        </SectionCard>
      </Grid>
    </Stack>
  );
}
