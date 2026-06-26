import { useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import { isValidIfsc, lookupBankByIfsc } from './ifscLookup';
import { useScreenGuard } from './useScreenGuard';

export interface BankDetailsValue {
  accountNumber: string;
  confirmAccountNumber: string;
  bankName: string;
  ifscCode: string;
}

type BankDetailsField = keyof BankDetailsValue;

// 'matched' = lookup auto-filled the bank (read-only); 'unmatched' = fall back to manual entry.
type LookupStatus = 'idle' | 'pending' | 'matched' | 'unmatched';

interface BankDetailsSectionProps {
  value: BankDetailsValue;
  onChange: (next: BankDetailsValue) => void;
  errors?: Partial<Record<BankDetailsField, string>>;
}

const COULD_NOT_DETECT_HINT = "Couldn't auto-detect — enter your bank name.";
const LOOKING_UP_HINT = 'Looking up bank…';
const MISMATCH_HINT = 'Account numbers do not match.';

export function BankDetailsSection({ value, onChange, errors }: BankDetailsSectionProps) {
  // Screen guard is active while this payment screen is mounted (UX deterrent only).
  useScreenGuard(true);

  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  // Keep the latest props reachable from the async lookup resolution without re-subscribing it.
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  // Abort any in-flight lookup when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = (field: BankDetailsField, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const runLookup = (ifsc: string) => {
    if (!isValidIfsc(ifsc)) {
      // Invalid/incomplete IFSC: keep Bank Name editable and stop any pending lookup.
      abortRef.current?.abort();
      abortRef.current = null;
      setLookupStatus('idle');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLookupStatus('pending');

    void lookupBankByIfsc(ifsc, controller.signal).then((result) => {
      // Only honour the latest lookup; ignore superseded/aborted ones.
      if (controller.signal.aborted || abortRef.current !== controller) {
        return;
      }
      if (result) {
        setLookupStatus('matched');
        onChangeRef.current({ ...valueRef.current, bankName: result.bank });
      } else {
        setLookupStatus('unmatched');
      }
    });
  };

  const handleIfscChange = (raw: string) => {
    const ifsc = raw.toUpperCase();
    onChange({ ...value, ifscCode: ifsc });
    runLookup(ifsc);
  };

  const isLookingUp = lookupStatus === 'pending';
  const bankNameReadOnly = lookupStatus === 'matched';
  const showFallbackHint = lookupStatus === 'unmatched';
  const localMismatch =
    value.accountNumber.length > 0 &&
    value.confirmAccountNumber.length > 0 &&
    value.accountNumber !== value.confirmAccountNumber;

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="bank-details-section">
      <AccountNumberField
        label="Account Number"
        field="accountNumber"
        value={value.accountNumber}
        error={errors?.accountNumber}
        onDigits={(digits) => patch('accountNumber', digits)}
      />
      <AccountNumberField
        label="Confirm Account Number"
        field="confirmAccountNumber"
        value={value.confirmAccountNumber}
        error={errors?.confirmAccountNumber ?? (localMismatch ? MISMATCH_HINT : undefined)}
        onDigits={(digits) => patch('confirmAccountNumber', digits)}
      />
      <TextField
        id="bank-ifscCode"
        label="IFSC Code"
        fullWidth
        required
        variant="outlined"
        value={value.ifscCode}
        error={Boolean(errors?.ifscCode)}
        helperText={errors?.ifscCode}
        onChange={(event) => handleIfscChange(event.target.value)}
        onBlur={(event) => runLookup(event.target.value.toUpperCase())}
        slotProps={{ htmlInput: { autoCapitalize: 'characters', spellCheck: false } }}
        sx={getFieldSx(false)}
      />
      <TextField
        id="bank-bankName"
        label="Bank Name"
        fullWidth
        required
        variant="outlined"
        value={value.bankName}
        error={Boolean(errors?.bankName)}
        helperText={getBankNameHelperText({
          error: errors?.bankName,
          isLookingUp,
          showFallbackHint,
        })}
        onChange={(event) => patch('bankName', event.target.value)}
        slotProps={{ input: bankNameReadOnly ? { readOnly: true } : undefined }}
        sx={getFieldSx(bankNameReadOnly)}
      />
    </div>
  );
}

function AccountNumberField({
  label,
  field,
  value,
  error,
  onDigits,
}: {
  label: string;
  field: BankDetailsField;
  value: string;
  error?: string;
  onDigits: (digits: string) => void;
}) {
  return (
    <TextField
      id={`bank-${field}`}
      label={label}
      fullWidth
      required
      variant="outlined"
      value={value}
      error={Boolean(error)}
      helperText={error}
      inputMode="numeric"
      onChange={(event) => onDigits(stripNonDigits(event.target.value))}
      onPaste={preventClipboard}
      onCopy={preventClipboard}
      onCut={preventClipboard}
      sx={getFieldSx(false)}
    />
  );
}

function getBankNameHelperText({
  error,
  isLookingUp,
  showFallbackHint,
}: {
  error?: string;
  isLookingUp: boolean;
  showFallbackHint: boolean;
}): string | undefined {
  if (error) {
    return error;
  }
  if (isLookingUp) {
    return LOOKING_UP_HINT;
  }
  if (showFallbackHint) {
    return COULD_NOT_DETECT_HINT;
  }
  return undefined;
}

function stripNonDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

function preventClipboard(event: React.ClipboardEvent<HTMLDivElement>): void {
  event.preventDefault();
}

// Mirrors the onboarding TextField styling from ProviderOnboardingRoute's `getFieldSx`.
function getFieldSx(readOnly: boolean) {
  return {
    '& .MuiFormLabel-asterisk': { color: '#e11d48' },
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      backgroundColor: readOnly ? '#F3F4F6' : undefined,
      '&.Mui-focused fieldset': { borderColor: '#9CAF88' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#7A8C6A' },
  };
}
