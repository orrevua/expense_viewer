// Validated categorical palette (fixed order) with light/dark steps.
export const CATEGORY_COLORS = {
  blue:    { light: '#2a78d6', dark: '#3987e5' },
  orange:  { light: '#eb6834', dark: '#d95926' },
  aqua:    { light: '#1baf7a', dark: '#199e70' },
  yellow:  { light: '#eda100', dark: '#c98500' },
  magenta: { light: '#e87ba4', dark: '#d55181' },
  green:   { light: '#008300', dark: '#0ca30c' },
  violet:  { light: '#6250d6', dark: '#9085e9' },
  red:     { light: '#e34948', dark: '#e66767' },
  gray:    { light: '#8a8984', dark: '#7a7974' },
};

export const COLOR_KEYS = Object.keys(CATEGORY_COLORS);

export function categoryColor(key, dark) {
  const c = CATEGORY_COLORS[key] || CATEGORY_COLORS.gray;
  return dark ? c.dark : c.light;
}

// Status colors: always paired with an icon + text label.
export const STATUS = { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b' };

// Two-series chart (expenses vs income).
export const SERIES = {
  expense: { light: '#2a78d6', dark: '#3987e5' },
  income: { light: '#1baf7a', dark: '#199e70' },
};
