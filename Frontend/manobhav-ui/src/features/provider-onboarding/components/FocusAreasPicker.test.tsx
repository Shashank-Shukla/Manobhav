import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FocusAreasPicker } from './FocusAreasPicker';

function lastCall(onChange: ReturnType<typeof vi.fn>): string[] {
  expect(onChange).toHaveBeenCalled();
  return onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
}

/**
 * Stateful host that mirrors how the parent wires the controlled picker: it feeds
 * each onChange result straight back into `value`, while the spy records emissions.
 */
function ControlledHost({
  initial = [],
  spy,
  error,
}: {
  initial?: string[];
  spy: (next: string[]) => void;
  error?: string;
}) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <FocusAreasPicker
      value={value}
      error={error}
      onChange={(next) => {
        spy(next);
        setValue(next);
      }}
    />
  );
}

/** The option chip root carries aria-pressed; the delete icon does not. */
function optionChip(name: string): HTMLElement {
  return screen
    .getAllByRole('button', { name })
    .find((element) => element.getAttribute('aria-pressed') !== null) as HTMLElement;
}

describe('FocusAreasPicker', () => {
  it('renders the first category active with its sub-options by default', () => {
    render(<ControlledHost spy={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Emotional & Mood Concerns' })).toHaveAttribute('aria-pressed', 'true');
    // A sub-option from the first category is visible in the bottom section.
    expect(optionChip('Anxiety')).toBeInTheDocument();
  });

  it('renders a category\'s sub-options when it is activated', async () => {
    const user = userEvent.setup();
    render(<ControlledHost spy={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Trauma & Healing' }));

    expect(screen.getByRole('button', { name: 'Trauma & Healing' })).toHaveAttribute('aria-pressed', 'true');
    expect(optionChip('PTSD')).toBeInTheDocument();
    expect(optionChip('Childhood Trauma')).toBeInTheDocument();
  });

  it('emits the toggled sub-option label in onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledHost spy={onChange} />);

    await user.click(optionChip('Anxiety'));

    expect(lastCall(onChange)).toEqual(['Anxiety']);
    expect(optionChip('Anxiety')).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps selected options from category A visible after switching to category B', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledHost spy={onChange} />);

    // Select two options in category A (Emotional & Mood Concerns).
    await user.click(optionChip('Anxiety'));
    await user.click(optionChip('Mood Swings'));
    expect(lastCall(onChange)).toEqual(['Anxiety', 'Mood Swings']);

    // Switch the active category to B (Relationships & Interpersonal).
    await user.click(screen.getByRole('button', { name: 'Relationships & Interpersonal' }));

    // B's options are visible.
    expect(optionChip('Boundaries')).toBeInTheDocument();
    // The two selected A-options remain visible and pressed (the selected union).
    expect(optionChip('Anxiety')).toHaveAttribute('aria-pressed', 'true');
    expect(optionChip('Mood Swings')).toHaveAttribute('aria-pressed', 'true');
    // Other (unselected) A-options are no longer in the document.
    expect(screen.queryByRole('button', { name: 'Depression' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Loneliness' })).not.toBeInTheDocument();
  });

  it('removes a selected option when its delete icon is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledHost initial={['Anxiety', 'Mood Swings']} spy={onChange} />);

    const anxiety = optionChip('Anxiety');
    const deleteIcon = within(anxiety).getByTestId('CancelIcon');
    await user.click(deleteIcon);

    expect(lastCall(onChange)).toEqual(['Mood Swings']);
  });

  it('deselects a selected option when its chip is clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledHost initial={['Anxiety']} spy={onChange} />);

    await user.click(optionChip('Anxiety'));

    expect(lastCall(onChange)).toEqual([]);
  });

  it('shows a count indicator on a category that has selected options', async () => {
    const user = userEvent.setup();
    render(<ControlledHost spy={vi.fn()} />);

    await user.click(optionChip('Anxiety'));
    await user.click(optionChip('Mood Swings'));

    expect(screen.getByRole('button', { name: 'Emotional & Mood Concerns (2)' })).toBeInTheDocument();
  });

  it('renders the error message in rose text when provided', () => {
    render(<ControlledHost spy={vi.fn()} error="Select at least one focus area." />);

    const message = screen.getByText('Select at least one focus area.');
    expect(message).toHaveClass('text-rose-700');
  });
});
