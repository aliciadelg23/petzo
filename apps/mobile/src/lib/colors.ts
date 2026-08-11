// Tokens de design do app. Sem NativeWind — RN StyleSheet consome esses valores.
export const colors = {
  brand50: '#fff5f0',
  brand100: '#ffe0d1',
  brand500: '#f26621',
  brand600: '#d84f14',
  brand700: '#a83d0d',
  neutral50: '#fafafa',
  neutral100: '#f5f5f5',
  neutral200: '#e5e5e5',
  neutral300: '#d4d4d4',
  neutral400: '#a3a3a3',
  neutral500: '#737373',
  neutral600: '#525252',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  emerald600: '#059669',
  red600: '#dc2626',
  yellow500: '#eab308',
  white: '#ffffff',
  black: '#000000',
  border: '#e5e5e5',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const;
