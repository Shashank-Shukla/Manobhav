import { type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { adminTheme, toneStyles } from '../adminTheme';
import { muiAdminTheme } from '../muiAdminTheme';
import type { StatusTone } from '../types';
import type { RosterStatus } from './useRosterPage';

export type RosterColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  render: (row: T) => ReactNode;
};

const headerCellSx = {
  backgroundColor: adminTheme.sage.light,
  color: adminTheme.sage.dark,
  fontWeight: 800,
  fontSize: '0.76rem',
  letterSpacing: '0.01em',
  borderBottom: `1px solid ${adminTheme.border}`,
  whiteSpace: 'nowrap' as const,
};

const bodyCellSx = {
  color: adminTheme.text,
  fontSize: '0.86rem',
  borderBottom: '1px solid rgba(156, 175, 136, 0.16)',
  verticalAlign: 'top' as const,
};

/** Bold primary line inside a roster cell. MUI-native so the table subtree stays free of Chakra. */
export function RosterPrimary({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ color: adminTheme.text, fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.3 }}>
      {children}
    </Typography>
  );
}

/** Muted secondary line inside a roster cell. */
export function RosterSecondary({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ color: adminTheme.muted, fontSize: '0.8rem', lineHeight: 1.4 }}>{children}</Typography>
  );
}

/** Themed status pill (MUI Chip) matching the admin tone palette. */
export function RosterChip({ label, tone }: { label: string; tone: StatusTone }) {
  const styles = toneStyles[tone];
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        fontWeight: 700,
        fontSize: '0.72rem',
        height: '22px',
      }}
    />
  );
}

type RosterTableProps<T> = {
  columns: RosterColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  status: RosterStatus;
  emptyLabel: string;
  errorLabel: string;
  /** When provided (together with `onRowClick`), rows become selectable and gain selected styling. */
  selectedIds?: Set<string>;
  onRowClick?: (id: string, event: MouseEvent) => void;
};

export function RosterTable<T>({
  columns,
  rows,
  getRowKey,
  total,
  page,
  pageSize,
  onPageChange,
  status,
  emptyLabel,
  errorLabel,
  selectedIds,
  onRowClick,
}: RosterTableProps<T>) {
  const showPlaceholder = status !== 'ready' || rows.length === 0;
  const placeholder = status === 'loading' ? 'Loading…' : status === 'error' ? errorLabel : emptyLabel;
  const selectable = Boolean(onRowClick);

  return (
    <MuiThemeProvider theme={muiAdminTheme}>
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${adminTheme.border}`,
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small" aria-label="Admin roster">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align ?? 'left'} sx={{ ...headerCellSx, width: column.width }}>
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {status === 'ready' &&
                rows.map((row) => {
                  const rowId = getRowKey(row);
                  const isSelected = selectable && (selectedIds?.has(rowId) ?? false);

                  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
                    if (!onRowClick) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      // KeyboardEvent carries the same modifier flags MouseEvent does.
                      onRowClick(rowId, event as unknown as MouseEvent);
                    }
                  };

                  return (
                    <TableRow
                      hover={!selectable}
                      key={rowId}
                      selected={isSelected}
                      aria-selected={selectable ? isSelected : undefined}
                      tabIndex={selectable ? 0 : undefined}
                      onClick={onRowClick ? (event) => onRowClick(rowId, event) : undefined}
                      onKeyDown={selectable ? handleKeyDown : undefined}
                      sx={{
                        ...(selectable
                          ? {
                              cursor: 'pointer',
                              userSelect: 'none',
                            }
                          : {}),
                        ...(isSelected
                          ? {
                              backgroundColor: adminTheme.sage.light,
                              boxShadow: `inset 3px 0 0 0 ${adminTheme.sage.DEFAULT}`,
                              '&.Mui-selected': { backgroundColor: adminTheme.sage.light },
                              '&.Mui-selected:hover': { backgroundColor: adminTheme.sage.light },
                            }
                          : { '&:hover': { backgroundColor: '#FAFBF8' } }),
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.key} align={column.align ?? 'left'} sx={bodyCellSx}>
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              {showPlaceholder && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    sx={{ ...bodyCellSx, textAlign: 'center', py: 6, color: adminTheme.muted, fontWeight: 600 }}
                  >
                    {placeholder}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={total === 0 ? 0 : page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          onPageChange={(_event, nextPage) => onPageChange(nextPage)}
          sx={{ borderTop: `1px solid ${adminTheme.border}` }}
        />
      </Paper>
    </MuiThemeProvider>
  );
}
