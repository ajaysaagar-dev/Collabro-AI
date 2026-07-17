export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
}

export type ThemeName = 'light' | 'dark';

export const LIGHT_THEME: Theme = {
  id: 'light',
  name: 'light',
  isDark: false,
};

export const DARK_THEME: Theme = {
  id: 'dark',
  name: 'dark',
  isDark: true,
};

export function isLightTheme(theme: Theme): boolean {
  return !theme.isDark;
}

export function isDarkTheme(theme: Theme): boolean {
  return theme.isDark;
}

export function toggleTheme(theme: Theme): Theme {
  return {
    ...theme,
    isDark: !theme.isDark,
  };
}

export function getThemeName(theme: Theme): ThemeName {
  return theme.isDark ? 'dark' : 'light';
}

export function createTheme(name: ThemeName): Theme {
  return {
    id: name,
    name,
    isDark: name === 'dark',
  };
}