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

  // Переключение между светлой и темной темами
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return { 
    theme, 
    setTheme, 
    toggleTheme,
    isMounted: mounted 
  };
}
