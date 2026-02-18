export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

export function hasThemePreference(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark';
}

export function getThemePreference(): ThemeMode {
  if (hasThemePreference()) {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  }
  return getSystemTheme();
}

export function applyTheme(theme: ThemeMode, persist = false): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
  if (persist && typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function clearThemePreference(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(THEME_STORAGE_KEY);
  applyTheme(getSystemTheme(), false);
}

export function toggleThemePreference(): ThemeMode {
  const nextTheme: ThemeMode = getThemePreference() === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme, true);
  return nextTheme;
}

export function syncThemeWithPreference(): ThemeMode {
  const initialTheme = getThemePreference();
  applyTheme(initialTheme, false);
  return initialTheme;
}
