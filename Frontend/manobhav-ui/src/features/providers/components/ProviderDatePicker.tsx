import { Box, Button, HStack } from '@chakra-ui/react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { theme } from '../../../utils/theme';
import { muiCalendarTheme } from '../providerCalendarTheme';

type ProviderDatePickerProps = {
  onCancel: () => void;
  onChoose: (iso: string, label: string) => void;
  onTempDateChange: (iso: string) => void;
  selectedDateIso: string;
  selectedDateLabel: string;
  tempCalendarIso: string;
};

export function ProviderDatePicker({
  onCancel,
  onChoose,
  onTempDateChange,
  selectedDateIso,
  selectedDateLabel,
  tempCalendarIso,
}: ProviderDatePickerProps) {
  const activeIso = tempCalendarIso || selectedDateIso || dayjs().format('YYYY-MM-DD');

  return (
    <MUIThemeProvider theme={muiCalendarTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box margin="0.75rem auto" width="100%" maxW="34rem" className="flex items-start justify-center">
          <StaticDatePicker
            displayStaticWrapperAs="mobile"
            disablePast
            value={dayjs(activeIso)}
            onChange={(value: Dayjs | null) => {
              if (value) {
                onTempDateChange(value.format('YYYY-MM-DD'));
              }
            }}
            slots={{ day: PickersDay }}
            slotProps={{
              actionBar: { actions: [] },
              day: {
                sx: {
                  borderRadius: '50%',
                },
              },
            }}
            sx={{
              width: '100%',
              maxWidth: '36rem',
              minHeight: '26rem',
              '.MuiPickersToolbar-root': {
                color: '#ffffff',
                borderRadius: '0.9rem',
                border: '1px solid rgba(255,255,255,0.35)',
                backgroundColor: theme.colors.sage.DEFAULT,
                minHeight: '60px',
                padding: '0.75rem 1rem',
              },
              '.MuiPickersLayout-root': {
                padding: '0.35rem 0.75rem 0.75rem',
              },
              '.MuiDateCalendar-root': {
                width: '100%',
                fontSize: '1.05rem',
              },
              '.MuiDayCalendar-weekDayLabel': {
                fontSize: '1.1rem',
                fontWeight: 700,
                color: theme.colors.sage.dark,
                textTransform: 'uppercase',
                padding: '0.2rem 0',
                minWidth: '2.5rem',
                textAlign: 'center',
                margin: '0 0.2rem',
              },
              '.MuiPickersCalendarHeader-label': {
                fontSize: '1.05rem',
                fontWeight: 700,
              },
              '.MuiPickersCalendarHeader-root': {
                padding: '0 0.75rem',
              },
              '.MuiDayCalendar-header': {
                justifyContent: 'space-around',
              },
              '.MuiPickersLayout-contentWrapper': {
                padding: '0.25rem 0.25rem 0.75rem',
              },
              '.MuiPickersSlideTransition-root': {
                minHeight: '18rem',
              },
              '.MuiDayCalendar-weekContainer': {
                justifyContent: 'space-around',
              },
              '.MuiPickersDay-root': {
                '&.Mui-selected': {
                  backgroundColor: theme.colors.sage.DEFAULT,
                  color: '#ffffff',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: theme.colors.sage.dark,
                },
                '&:hover': {
                  backgroundColor: theme.colors.sage.light,
                },
              },
            }}
          />
        </Box>
        <HStack spacing={3} justify="center" pt={2} flexWrap="wrap">
          <Button
            px="1.25em"
            py="0.5em"
            borderRadius="8px"
            bg={theme.colors.sage.DEFAULT}
            _hover={{ bg: theme.colors.sage.dark }}
            color="white"
            onClick={() => onChoose(activeIso, dayjs(activeIso).format('MMM D, YYYY'))}
          >
            Choose {tempCalendarIso ? dayjs(tempCalendarIso).format('MMM D, YYYY') : selectedDateLabel || dayjs(activeIso).format('MMM D, YYYY')}
          </Button>
          <Button px="1.25em" py="0.5em" borderRadius="8px" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </HStack>
      </LocalizationProvider>
    </MUIThemeProvider>
  );
}

export default ProviderDatePicker;
