import type { ReactNode } from 'react';
import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { adminTheme } from '../adminTheme';

export type AdminDataTableColumn<T> = {
  header: string;
  render: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
};

type AdminDataTableProps<T> = {
  columns: AdminDataTableColumn<T>[];
  data: T[];
  getKey: (item: T) => string;
  emptyLabel?: string;
};

export function AdminDataTable<T>({ columns, data, getKey, emptyLabel = 'No records found.' }: AdminDataTableProps<T>) {
  if (data.length === 0) {
    return (
      <Box border="1px dashed" borderColor={adminTheme.border} borderRadius="16px" p={8} textAlign="center" bg="white">
        <Text color={adminTheme.muted} fontSize="sm">
          {emptyLabel}
        </Text>
      </Box>
    );
  }

  return (
    <TableContainer border="1px solid" borderColor={adminTheme.border} borderRadius="16px" bg="white">
      <Table variant="simple" size="sm">
        <Thead bg={adminTheme.shellBg}>
          <Tr>
            {columns.map((column) => (
              <Th
                key={column.header}
                color={adminTheme.muted}
                fontSize="xs"
                letterSpacing="0"
                textTransform="none"
                textAlign={column.align}
                width={column.width}
                py={4}
              >
                {column.header}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={getKey(item)} _hover={{ bg: '#FAFBF8' }}>
              {columns.map((column) => (
                <Td key={column.header} textAlign={column.align} py={4}>
                  {column.render(item)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
