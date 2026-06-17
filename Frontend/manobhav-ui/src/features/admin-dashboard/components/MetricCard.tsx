import { Box, Button, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import { adminTheme, toneStyles } from '../adminTheme';
import type { StatusTone } from '../types';

type MetricCardProps = {
  label: string;
  value: string;
  delta: string;
  helper: string;
  tone: StatusTone;
  icon: LucideIcon;
  onDeltaClick?: () => void;
};

export function MetricCard({ label, value, delta, helper, tone, icon, onDeltaClick }: MetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <Box
      border="1px solid"
      borderColor={styles.border}
      bg="white"
      borderRadius="16px"
      p={5}
      boxShadow="0 16px 42px rgba(45, 55, 72, 0.07)"
      minH="148px"
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
        <Box>
          <Text color={adminTheme.muted} fontSize="sm" fontWeight="600">
            {label}
          </Text>
          <Text mt={2} color={adminTheme.text} fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" lineHeight="1">
            {value}
          </Text>
        </Box>
        <Flex
          h="42px"
          w="42px"
          flex="0 0 auto"
          align="center"
          justify="center"
          borderRadius="12px"
          bg={styles.bg}
          color={styles.color}
        >
          <Icon as={icon} boxSize={5} />
        </Flex>
      </Flex>
      <HStack mt={5} align="flex-start" spacing={3}>
        {onDeltaClick ? (
          <Button
            size="xs"
            flex="0 0 auto"
            borderRadius="full"
            bg={styles.bg}
            color={styles.color}
            fontWeight="800"
            _hover={{ bg: styles.border }}
            onClick={onDeltaClick}
          >
            {delta}
          </Button>
        ) : (
          <Text
            flex="0 0 auto"
            borderRadius="full"
            bg={styles.bg}
            color={styles.color}
            px={3}
            py={1}
            fontSize="xs"
            fontWeight="800"
          >
            {delta}
          </Text>
        )}
        <Text color={adminTheme.muted} fontSize="sm" lineHeight="1.55">
          {helper}
        </Text>
      </HStack>
    </Box>
  );
}
