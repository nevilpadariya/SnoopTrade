import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getThemePreference, hasThemePreference, syncThemeWithPreference, toggleThemePreference, type ThemeMode } from '../utils/theme';

const ThemeFloatingToggle = () => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    setMode(syncThemeWithPreference());

    const onStorage = () => {
      setMode(getThemePreference());
    };
    window.addEventListener('storage', onStorage);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => {
      if (!hasThemePreference()) {
        setMode(syncThemeWithPreference());
      }
    };
    media.addEventListener('change', onMediaChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      media.removeEventListener('change', onMediaChange);
    };
  }, []);

  const onToggle = () => {
    setMode(toggleThemePreference());
  };

  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="fixed bottom-20 right-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition hover:scale-[1.02] hover:bg-muted/80 md:bottom-5"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

export default ThemeFloatingToggle;
