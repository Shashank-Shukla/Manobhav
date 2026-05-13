import { Box, Flex, Grid, HStack, Icon, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { LineChart } from 'lucide-react';
import { careSignals, insightMetrics } from '../data';
import { adminTheme, toneStyles } from '../adminTheme';
import { MetricCard } from '../components/MetricCard';
import type { StatusTone } from '../types';
import { MiniProgress, SectionCard } from './shared';
import { metricIcons } from './viewUtils';

export function InsightsView() {
  return (
    <Stack spacing={5}>
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
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <SectionCard title="Care quality signals" helper="Follow-up, completion, and load-balance health">
          <Stack spacing={5}>
            {careSignals.map((signal) => (
              <Box key={signal.label}>
                <Flex justify="space-between" mb={2}>
                  <HStack>
                    <Icon as={signal.icon} color={adminTheme.sage.dark} boxSize={4} />
                    <Text color={adminTheme.text} fontWeight="800">
                      {signal.label}
                    </Text>
                  </HStack>
                  <Text color={adminTheme.muted} fontWeight="800">
                    {signal.value}%
                  </Text>
                </Flex>
                <MiniProgress value={signal.value} tone={signal.value >= 80 ? 'sage' : 'amber'} />
              </Box>
            ))}
          </Stack>
        </SectionCard>

        <SectionCard title="Balanced operations snapshot" helper="Business health without losing care context">
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            {[
              ['Patient growth', '+18%', 'rose'],
              ['Cancellation rate', '7.4%', 'amber'],
              ['Revenue health', 'Rs. 4.8L', 'sage'],
              ['Avg. provider load', '80%', 'blue'],
            ].map(([label, value, tone]) => (
              <Box key={label} bg="white" border="1px solid" borderColor={toneStyles[tone as StatusTone].border} borderRadius="14px" p={4}>
                <Text color={adminTheme.muted} fontSize="sm" fontWeight="700">
                  {label}
                </Text>
                <Text mt={2} color={adminTheme.text} fontSize="2xl" fontWeight="900">
                  {value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </SectionCard>
      </Grid>
    </Stack>
  );
}
