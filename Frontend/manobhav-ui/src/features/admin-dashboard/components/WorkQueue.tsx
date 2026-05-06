import { Box, Button, Flex, HStack, Stack, Text } from '@chakra-ui/react';
import { ArrowUpRight } from 'lucide-react';
import { adminTheme, toneStyles } from '../adminTheme';
import type { QueueItem } from '../types';
import { StatusBadge } from './StatusBadge';

type WorkQueueProps = {
  title: string;
  subtitle?: string;
  items: QueueItem[];
  actionLabel?: string;
};

export function WorkQueue({ title, subtitle, items, actionLabel = 'Open' }: WorkQueueProps) {
  return (
    <Box
      border="1px solid"
      borderColor={adminTheme.border}
      bg={adminTheme.softPanel}
      borderRadius="16px"
      p={5}
      minH="100%"
      boxShadow="0 16px 40px rgba(45, 55, 72, 0.06)"
    >
      <Flex justify="space-between" align="flex-start" gap={4} mb={4}>
        <Box>
          <Text color={adminTheme.text} fontSize="lg" fontWeight="800">
            {title}
          </Text>
          {subtitle && (
            <Text color={adminTheme.muted} fontSize="sm" mt={1}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Flex>
      <Stack spacing={3}>
        {items.map((item) => {
          const styles = toneStyles[item.tone];

          return (
            <Flex
              key={item.id}
              align={{ base: 'stretch', sm: 'center' }}
              direction={{ base: 'column', sm: 'row' }}
              justify="space-between"
              gap={3}
              border="1px solid"
              borderColor={styles.border}
              bg="white"
              borderRadius="12px"
              p={4}
            >
              <HStack spacing={3} align="flex-start">
                <Box mt={1} h={3} w={3} flex="0 0 auto" borderRadius="full" bg={styles.accent} />
                <Box>
                  <Text color={adminTheme.text} fontSize="sm" fontWeight="800">
                    {item.title}
                  </Text>
                  <Text color={adminTheme.muted} fontSize="sm" mt={1}>
                    {item.meta}
                  </Text>
                </Box>
              </HStack>
              <HStack justify={{ base: 'space-between', sm: 'flex-end' }}>
                <StatusBadge label={item.status} tone={item.tone} />
                <Button
                  size="sm"
                  variant="ghost"
                  rightIcon={<ArrowUpRight size={14} />}
                  color={adminTheme.text}
                  borderRadius="10px"
                >
                  {actionLabel}
                </Button>
              </HStack>
            </Flex>
          );
        })}
      </Stack>
    </Box>
  );
}
