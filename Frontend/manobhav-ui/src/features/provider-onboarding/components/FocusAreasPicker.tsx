import { useState, type JSX } from 'react';
import Chip from '@mui/material/Chip';
import { focusAreasTaxonomy, type FocusAreaCategory } from './focusAreasTaxonomy';
import {
  countSelectedInCategory,
  getDefaultCategoryKey,
  getVisibleOptions,
  toggleOption,
} from './focusAreas';

interface FocusAreasPickerProps {
  /** Selected sub-option labels (strings), e.g. ["Anxiety", "Mood Swings"]. */
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

export function FocusAreasPicker({ value, onChange, error }: FocusAreasPickerProps): JSX.Element {
  const [activeCategoryKey, setActiveCategoryKey] = useState<string>(getDefaultCategoryKey);
  const visibleOptions = getVisibleOptions(activeCategoryKey, value);
  const groupId = 'focus-areas-picker';
  const errorId = `${groupId}-error`;

  return (
    <div
      aria-describedby={error ? errorId : undefined}
      aria-labelledby={`${groupId}-label`}
      className="space-y-2 md:col-span-2"
      role="group"
    >
      <span id={`${groupId}-label`} className="block text-sm font-semibold text-gray-700">
        Focus areas
        <span className="ml-1 text-rose-600">*</span>
      </span>
      <div className={error ? 'rounded-lg border border-rose-400 p-3' : 'rounded-lg border border-gray-200 p-3'}>
        <CategorySection
          activeCategoryKey={activeCategoryKey}
          onActivate={setActiveCategoryKey}
          value={value}
        />
        <hr className="my-3 border-gray-200" />
        <OptionSection options={visibleOptions} onChange={onChange} value={value} />
      </div>
      {error && <p id={errorId} className="text-sm font-medium text-rose-700">{error}</p>}
    </div>
  );
}

function CategorySection({
  activeCategoryKey,
  onActivate,
  value,
}: {
  activeCategoryKey: string;
  onActivate: (categoryKey: string) => void;
  value: string[];
}) {
  return (
    <div className="space-y-2" role="group" aria-label="Categories">
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Categories</span>
      <div className="flex flex-wrap gap-2">
        {focusAreasTaxonomy.map((category) => (
          <CategoryChip
            category={category}
            isActive={category.key === activeCategoryKey}
            key={category.key}
            onActivate={() => onActivate(category.key)}
            value={value}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryChip({
  category,
  isActive,
  onActivate,
  value,
}: {
  category: FocusAreaCategory;
  isActive: boolean;
  onActivate: () => void;
  value: string[];
}) {
  const count = countSelectedInCategory(category, value);
  const label = count > 0 ? `${category.label} (${count})` : category.label;
  return (
    <Chip
      aria-pressed={isActive}
      clickable
      label={label}
      onClick={onActivate}
      sx={getChipSx(isActive)}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );
}

function OptionSection({
  options,
  onChange,
  value,
}: {
  options: string[];
  onChange: (next: string[]) => void;
  value: string[];
}) {
  return (
    <div className="space-y-2" role="group" aria-label="Focus areas">
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Focus areas</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <Chip
              aria-pressed={selected}
              clickable
              key={option}
              label={option}
              onClick={() => onChange(toggleOption(value, option))}
              onDelete={selected ? () => onChange(toggleOption(value, option)) : undefined}
              sx={getChipSx(selected)}
              variant={selected ? 'filled' : 'outlined'}
            />
          );
        })}
        {options.length === 0 && <span className="text-sm text-gray-500">Select a category to see focus areas.</span>}
      </div>
    </div>
  );
}

function getChipSx(selected: boolean) {
  if (!selected) {
    return {
      backgroundColor: '#F1F5F9',
      borderColor: '#E2E8F0',
      color: '#64748B',
      '&:hover': { backgroundColor: '#E2E8F0' },
    };
  }

  return {
    backgroundColor: '#9CAF88',
    color: '#FFFFFF',
    '&:hover': { backgroundColor: '#7A8C6A' },
    '& .MuiChip-deleteIcon': { color: '#FFFFFF' },
  };
}
