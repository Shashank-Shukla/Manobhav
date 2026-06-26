import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BankDetailsSection, type BankDetailsValue } from './BankDetailsSection';

const emptyValue: BankDetailsValue = {
  accountNumber: '',
  confirmAccountNumber: '',
  bankName: '',
  ifscCode: '',
};

function ControlledHost({
  initial = emptyValue,
  errors,
}: {
  initial?: BankDetailsValue;
  errors?: Partial<Record<keyof BankDetailsValue, string>>;
}) {
  const [value, setValue] = useState<BankDetailsValue>(initial);
  return <BankDetailsSection value={value} onChange={setValue} errors={errors} />;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const VALID_IFSC = 'HDFC0001234';

function mockFetchOnce(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('BankDetailsSection', () => {
  it('auto-fills Bank Name and makes it read-only after a successful IFSC lookup', async () => {
    mockFetchOnce(Response.json({ BANK: 'HDFC Bank', BRANCH: 'Koramangala' }));
    const user = userEvent.setup();

    render(<ControlledHost />);

    await user.type(screen.getByLabelText(/IFSC Code/i), VALID_IFSC);

    const bankNameInput = screen.getByLabelText(/Bank Name/i) as HTMLInputElement;
    await waitFor(() => expect(bankNameInput.value).toBe('HDFC Bank'));
    expect(bankNameInput).toHaveAttribute('readonly');
  });

  it('leaves Bank Name editable when the lookup fails', async () => {
    mockFetchOnce(Response.json({ error: 'Not found' }, { status: 404 }));
    const user = userEvent.setup();

    render(<ControlledHost />);

    await user.type(screen.getByLabelText(/IFSC Code/i), VALID_IFSC);

    const bankNameInput = screen.getByLabelText(/Bank Name/i) as HTMLInputElement;
    await waitFor(() => expect(screen.getByText(/Couldn't auto-detect/i)).toBeInTheDocument());
    expect(bankNameInput).not.toHaveAttribute('readonly');

    await user.type(bankNameInput, 'My Bank');
    expect(bankNameInput.value).toBe('My Bank');
  });

  it('blocks pasting into Account Number', async () => {
    mockFetchOnce(Response.json({}));
    const user = userEvent.setup();

    render(<ControlledHost />);

    const accountInput = screen.getByLabelText(/^Account Number/i) as HTMLInputElement;
    accountInput.focus();
    await user.paste('1234567890');

    expect(accountInput.value).toBe('');
  });

  it('strips non-digits typed into Account Number', async () => {
    mockFetchOnce(Response.json({}));
    const user = userEvent.setup();

    render(<ControlledHost />);

    const accountInput = screen.getByLabelText(/^Account Number/i) as HTMLInputElement;
    await user.type(accountInput, '12ab34');

    expect(accountInput.value).toBe('1234');
  });

  it('renders the confirmAccountNumber error message when provided', () => {
    render(<ControlledHost errors={{ confirmAccountNumber: 'Account numbers do not match.' }} />);

    expect(screen.getByText('Account numbers do not match.')).toBeInTheDocument();
  });
});
