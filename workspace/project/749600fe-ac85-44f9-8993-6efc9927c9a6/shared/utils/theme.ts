// shared/utils/theme.ts

import { useState, useEffect } from 'react';

interface Theme {
  mode: 'light' | 'dark';
}

const getThemeFromLocalStorage = () => {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    return JSON.parse(storedTheme);
  }
  return { mode: 'light' };
};

const setThemeToLocalStorage = (theme: Theme) => {
  localStorage.setItem('theme', JSON.stringify(theme));
};

const useTheme = () => {
  const [theme, setTheme] = useState(getThemeFromLocalStorage());

  useEffect(() => {
    setThemeToLocalStorage(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => ({ mode: prevTheme.mode === 'light' ? 'dark' : 'light' }));
  };

  return { theme, toggleTheme };
};

const getThemeClasses = (theme: Theme) => {
  return theme.mode === 'dark'
    ? 'dark-mode'
    : 'light-mode';
};

const getThemeIcon = (theme: Theme) => {
  return theme.mode === 'dark'
    ? 'moon'
    : 'sun';
};

export { useTheme, getThemeClasses, getThemeIcon };