import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { Ban, BookUser, UserMinus } from 'lucide-react';
import { adminTheme, toneStyles } from '../adminTheme';

export type RosterAction = 'view-details' | 'ban' | 'suspend';

type RosterActionToolbarProps = {
  count: number;
  onAction: (action: RosterAction) => void;
  onClear: () => void;
};

/**
 * Contextual bulk-action bar for the roster tables. Renders only when at least one row is
 * selected; the parent view supplies `count`, an `onAction` dispatcher, and `onClear`.
 * Action wiring (backend effects) is owned by the view — this component only emits intent.
 */
export function RosterActionToolbar({ count, onAction, onClear }: RosterActionToolbarProps) {
  if (count < 1) return null;

  return (
    <HStack
      role="toolbar"
      aria-label="Bulk actions for selected rows"
      spacing={2}
      mb={3}
      px={3}
      py={2}
      flexWrap="wrap"
      border="1px solid"
      borderColor={adminTheme.border}
      borderRadius="12px"
      bg={adminTheme.sage.light}
    >
      <Text color={adminTheme.sage.dark} fontSize="sm" fontWeight="800" whiteSpace="nowrap">
        {count} selected
      </Text>

      <Box flex="1 1 auto" />

      <Button
        size="sm"
        variant="outline"
        aria-label="View details for selected rows"
        leftIcon={<BookUser size={16} />}
        onClick={() => onAction('view-details')}
        color={adminTheme.sage.dark}
        borderColor={toneStyles.sage.border}
        bg="white"
        fontWeight="700"
        _hover={{ bg: adminTheme.sage.light }}
      >
        View details
      </Button>

      <Button
        size="sm"
        variant="outline"
        aria-label="Ban selected rows"
        leftIcon={<Ban size={16} />}
        onClick={() => onAction('ban')}
        color={toneStyles.red.color}
        borderColor={toneStyles.red.border}
        bg={toneStyles.red.bg}
        fontWeight="700"
        _hover={{ bg: '#F8D9D9' }}
      >
        Ban
      </Button>

      <Button
        size="sm"
        variant="outline"
        aria-label="Suspend selected rows"
        leftIcon={<UserMinus size={16} />}
        onClick={() => onAction('suspend')}
        color={toneStyles.amber.color}
        borderColor={toneStyles.amber.border}
        bg={toneStyles.amber.bg}
        fontWeight="700"
        _hover={{ bg: '#F3E8C4' }}
      >
        Suspend
      </Button>

      <Button
        size="sm"
        variant="ghost"
        aria-label="Clear selection"
        onClick={onClear}
        color={adminTheme.muted}
        fontWeight="700"
        _hover={{ bg: 'white' }}
      >
        Clear
      </Button>
    </HStack>
  );
}
