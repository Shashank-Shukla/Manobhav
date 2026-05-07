import { useMemo } from 'react';
import { Box, Grid, GridItem, Stack, Text } from '@chakra-ui/react';
import { bookings, slots } from '../data';
import { adminTheme } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { BookingRecord } from '../types';
import { SectionCard, SlotCapacityCard } from './shared';
import { includesSearch } from './viewUtils';

type SearchableViewProps = {
  search: string;
};

export function BookingsView({ search }: SearchableViewProps) {
  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        includesSearch(
          [booking.patientName, booking.providerName, booking.status, booking.type, booking.payment, booking.date],
          search,
        ),
      ),
    [search],
  );
  const columns: AdminDataTableColumn<BookingRecord>[] = [
    {
      header: 'Booking',
      render: (booking) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {booking.patientName}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            {booking.date}, {booking.time}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Provider',
      render: (booking) => (
        <Text color={adminTheme.text} fontWeight="700">
          {booking.providerName}
        </Text>
      ),
    },
    {
      header: 'Status',
      render: (booking) => <StatusBadge label={booking.status} tone={booking.tone} />,
    },
    {
      header: 'Payment',
      render: (booking) => (
        <Text color={adminTheme.muted} fontSize="sm">
          {booking.payment}
        </Text>
      ),
    },
    {
      header: 'Reschedules',
      align: 'right',
      render: (booking) => booking.reschedules,
    },
  ];

  return (
    <Grid templateColumns={{ base: '1fr', xl: '0.8fr 1.2fr' }} gap={5}>
      <GridItem>
        <SectionCard title="Slot availability" helper="Calendar-style capacity view by provider">
          <Stack spacing={4}>
            {slots.map((slot) => (
              <SlotCapacityCard key={slot.id} slot={slot} />
            ))}
          </Stack>
        </SectionCard>
      </GridItem>
      <GridItem>
        <SectionCard title="Bookings and reschedules" helper="Sessions, payments, cancellations, and reschedule pressure">
          <AdminDataTable columns={columns} data={filteredBookings} getKey={(booking) => booking.id} emptyLabel="No bookings match this search." />
        </SectionCard>
      </GridItem>
    </Grid>
  );
}
