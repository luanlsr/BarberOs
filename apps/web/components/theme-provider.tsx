'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

type ResolvedTheme = 'light' | 'dark';

export function getNextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme;
  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = resolveTheme(theme);
}

function readStoredTheme(): Theme {
  const storedTheme = window.localStorage.getItem('barberos-theme') as Theme | null;
  return storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
    ? storedTheme
    : 'system';
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return readStoredTheme();
  });

  useEffect(() => {
    const storedTheme = readStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => applyTheme('system');
    media.addEventListener('change', handleSystemThemeChange);
    return () => media.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      cycleTheme() {
        const currentResolvedTheme = resolveTheme(theme);
        const nextTheme = getNextTheme(currentResolvedTheme);
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem('barberos-theme', nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

type ThemeContextValue = { theme: Theme; cycleTheme: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
