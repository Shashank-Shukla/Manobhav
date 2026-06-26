import { focusAreasTaxonomy, type FocusAreaCategory } from './focusAreasTaxonomy';

/** The category shown by default so the bottom section is never empty on first render. */
export function getDefaultCategoryKey(): string {
  return focusAreasTaxonomy[0]?.key ?? '';
}

export function findCategory(categoryKey: string): FocusAreaCategory | undefined {
  return focusAreasTaxonomy.find((category) => category.key === categoryKey);
}

/** How many of a category's options are currently selected — drives the count indicator. */
export function countSelectedInCategory(category: FocusAreaCategory, selected: string[]): number {
  const selectedSet = new Set(selected);
  return category.options.reduce((count, option) => (selectedSet.has(option) ? count + 1 : count), 0);
}

/**
 * The options rendered in the bottom section: the active category's options,
 * followed by any currently-selected options that aren't already among them.
 * This keeps selections from other categories visible after switching category.
 */
export function getVisibleOptions(activeCategoryKey: string, selected: string[]): string[] {
  const active = findCategory(activeCategoryKey);
  const activeOptions = active?.options ?? [];
  const seen = new Set(activeOptions);
  const extras = selected.filter((option) => !seen.has(option));
  return [...activeOptions, ...extras];
}

/** Add or remove an option from the selected list, preserving the existing order. */
export function toggleOption(selected: string[], option: string): string[] {
  return selected.includes(option)
    ? selected.filter((value) => value !== option)
    : [...selected, option];
}
