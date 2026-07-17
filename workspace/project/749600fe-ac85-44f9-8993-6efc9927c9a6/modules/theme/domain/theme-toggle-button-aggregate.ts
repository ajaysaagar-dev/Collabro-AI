/**
 * Theme Toggle Button Aggregate Interface
 * 
 * Provides a centralized interface for theme management operations including
 * validation, storage, and retrieval of user theme preferences.
 * Supports both light and dark mode themes with proper input validation.
 */

export interface ThemePreference {
  theme: 'light' | 'dark';
  userId?: string;
  persisted: boolean;
}

export interface ThemeToggleState {
  currentTheme: 'light' | 'dark';
  isDarkMode: boolean;
  isLightMode: boolean;
  toggleTheme: () => 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  persistTheme: (theme: 'light' | 'dark') => Promise<boolean>;
  validateTheme: (theme: string) => theme is 'light' | 'dark';
}

export interface ThemeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface ThemeValidator {
  isValidTheme: (theme: string) => boolean;
  sanitizeTheme: (theme: string) => 'light' | 'dark';
  validateThemePreference: (preference: ThemePreference) => boolean;
}

export class ThemeToggleAggregate implements ThemeToggleState {
  private storage: ThemeStorage;
  private validator: ThemeValidator;
  private THEME_KEY = 'user-theme-preference';

  constructor(storage?: ThemeStorage, validator?: ThemeValidator) {
    this.storage = storage || {
      getItem: (key: string) => localStorage?.getItem(key) || null,
      setItem: (key: string, value: string) => localStorage?.setItem(key, value),
      removeItem: (key: string) => localStorage?.removeItem(key),
    };
    this.validator = validator || new DefaultThemeValidator();
  }

  get currentTheme(): 'light' | 'dark' {
    const stored = this.storage.getItem(this.THEME_KEY);
    return this.validator.isValidTheme(stored || '') 
      ? this.validator.sanitizeTheme(stored!) 
      : 'light';
  }

  get isDarkMode(): boolean {
    return this.currentTheme === 'dark';
  }

  get isLightMode(): boolean {
    return this.currentTheme === 'light';
  }

  toggleTheme(): 'light' | 'dark' {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  setTheme(theme: 'light' | 'dark'): void {
    if (this.validator.isValidTheme(theme)) {
      this.storage.setItem(this.THEME_KEY, theme);
    }
  }

  async persistTheme(theme: 'light' | 'dark'): Promise<boolean> {
    try {
      if (!this.validator.isValidTheme(theme)) {
        return false;
      }

      const preference: ThemePreference = {
        theme,
        userId: undefined,
        persisted: true,
      };

      if (this.validator.validateThemePreference(preference)) {
        this.storage.setItem(this.THEME_KEY, theme);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to persist theme:', error);
      return false;
    }
  }

  validateTheme(theme: string): theme is 'light' | 'dark' {
    return this.validator.isValidTheme(theme);
  }
}

export class DefaultThemeValidator implements ThemeValidator {
  private readonly VALID_THEMES = ['light', 'dark'] as const;

  isValidTheme(theme: string): boolean {
    return this.VALID_THEMES.includes(theme as 'light' | 'dark');
  }

  sanitizeTheme(theme: string): 'light' | 'dark' {
    const normalized = theme.toLowerCase().trim();
    return this.VALID_THEMES.includes(normalized as 'light' | 'dark')
      ? normalized as 'light' | 'dark'
      : 'light';
  }

  validateThemePreference(preference: ThemePreference): boolean {
    if (!this.isValidTheme(preference.theme)) {
      return false;
    }

    if (preference.userId !== undefined && typeof preference.userId !== 'string') {
      return false;
    }

    if (typeof preference.persisted !== 'boolean') {
      return false;
    }

    return true;
  }
}

export const createThemeToggleAggregate = (
  storage?: ThemeStorage,
  validator?: ThemeValidator
): ThemeToggleAggregate => {
  return new ThemeToggleAggregate(storage, validator);
};

export const themeToggleDefaults = {
  defaultTheme: 'light' as const,
  storageKey: 'user-theme-preference',
  supportedThemes: ['light', 'dark'] as const,
};

export type { ThemePreference, ThemeToggleState, ThemeStorage, ThemeValidator };