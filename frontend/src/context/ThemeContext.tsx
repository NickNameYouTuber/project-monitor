import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes';

interface ThemeContextProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeContextProps) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemeProvider>
  );
}

// Хук для использования темы в компонентах
export function useTheme() {
  const { theme, setTheme } = useNextTheme();

  // Предотвращение проблем с SSR
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);

  // Циклическое переключение между тремя темами: light -> dark -> mint -> light
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('mint');
    } else {
      setTheme('light');
    }
  };

  return { 
    theme, 
    setTheme, 
    toggleTheme,
    isMounted: mounted 
  };
}
