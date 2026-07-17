import { Theme } from '../domain/Theme';

export type ThemeName = 'light' | 'dark';

export interface ThemeState {
  currentTheme: Theme;
  availableThemes: Theme[];
}

export class ThemeService {
  private themes: Map<ThemeName, Theme>;

  constructor() {
    this.themes = new Map<ThemeName, Theme>();
    this.initializeThemes();
  }

  private initializeThemes(): void {
    const lightTheme: Theme = {
      id: 'theme-light',
      name: 'light',
      isDark: false,
    };

    const darkTheme: Theme = {
      id: 'theme-dark',
      name: 'dark',
      isDark: true,
    };

    this.themes.set('light', lightTheme);
    this.themes.set('dark', darkTheme);
  }

  getCurrentTheme(): Theme {
    const storedTheme = this.getStoredTheme();
    return this.themes.get(storedTheme) || this.getDefaultTheme();
  }

  switchTheme(themeName: ThemeName): Theme {
    if (!this.themes.has(themeName)) {
      throw new Error(`Theme '${themeName}' is not available`);
    }

    const theme = this.themes.get(themeName)!;
    this.storeTheme(themeName);
    return theme;
  }

  getAvailableThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  isDarkMode(): boolean {
    const currentTheme = this.getCurrentTheme();
    return currentTheme.isDark;
  }

  getDefaultTheme(): Theme {
    return this.themes.get('light')!;
  }

  private getStoredTheme(): ThemeName {
    if (typeof window === 'undefined') {
      return 'light';
    }

    try {
      const stored = localStorage.getItem('app-theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (error) {
      console.error('Failed to read theme from localStorage:', error);
    }

    return 'light';
  }

  private storeTheme(themeName: ThemeName): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('app-theme', themeName);
    } catch (error) {
      console.error('Failed to store theme in localStorage:', error);
    }
  }

  getThemeByName(name: string): Theme | null {
    return this.themes.get(name as ThemeName) || null;
  }

  validateTheme(themeName: string): boolean {
    return themeName === 'light' || themeName === 'dark';
  }
}

export const themeService = new ThemeService();