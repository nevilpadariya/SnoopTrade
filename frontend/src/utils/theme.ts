export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

export function getThemePreference(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return getSystemTheme();
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function toggleThemePreference(): ThemeMode {
  const nextTheme: ThemeMode = getThemePreference() === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  return nextTheme;
}

export function syncThemeWithPreference(): ThemeMode {
  const initialTheme = getThemePreference();
  applyTheme(initialTheme);
  return initialTheme;
}
