import { Theme } from '@/modules/theme/domain/Theme'

export type ThemeMode = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'app-theme'

export const getStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export const storeTheme = (theme: ThemeMode): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Silently fail if localStorage is not available
  }
}

export const applyTheme = (theme: ThemeMode): void => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const switchTheme = (newTheme: ThemeMode): void => {
  storeTheme(newTheme)
  applyTheme(newTheme)
}

export const initializeTheme = (): ThemeMode => {
  const storedTheme = getStoredTheme()
  if (storedTheme) {
    applyTheme(storedTheme)
    return storedTheme
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const defaultTheme: ThemeMode = prefersDark ? 'dark' : 'light'
  applyTheme(defaultTheme)
  storeTheme(defaultTheme)
  return defaultTheme
}

export const getThemeFromPrisma = (theme: Theme): ThemeMode => {
  return theme.isDark ? 'dark' : 'light'
}

export const createThemeObject = (name: string, isDark: boolean): Theme => {
  return {
    id: '',
    name,
    isDark,
  }
}