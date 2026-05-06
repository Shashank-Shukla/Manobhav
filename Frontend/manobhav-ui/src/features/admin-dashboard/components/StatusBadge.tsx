import { Badge } from '@chakra-ui/react';
import { toneStyles } from '../adminTheme';
import type { StatusTone } from '../types';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = 'grey' }: StatusBadgeProps) {
  const styles = toneStyles[tone];

  return (
    <Badge
      borderRadius="full"
      border="1px solid"
      borderColor={styles.border}
      bg={styles.bg}
      color={styles.color}
      px={3}
      py={1}
      textTransform="none"
      fontWeight="700"
      letterSpacing="0"
      whiteSpace="nowrap"
    >
      {label}
    </Badge>
  );
}
