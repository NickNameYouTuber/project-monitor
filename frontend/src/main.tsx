import React, { createContext, useContext, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import App from './App.tsx'
import { MantineProvider, createTheme, MantineColorScheme } from '@mantine/core'
import '@mantine/core/styles.css'

// Создаем контекст для темы
interface ThemeContextType {
  colorScheme: MantineColorScheme;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Создаем тему для Mantine
const theme = createTheme({
  primaryColor: 'green',
  colors: {
    green: [
      '#e3f9e5', // 0
      '#c1f2c7', // 1
      '#91e697', // 2
      '#7AB988', // 3: primary brand color
      '#5DA570', // 4
      '#4C8858', // 5
      '#3A6642', // 6
      '#2E513A', // 7
      '#243C2C', // 8
      '#1B2E21'  // 9
    ]
  },
  components: {
    Paper: {
      defaultProps: {
        p: 'md',
      },
    },
  }
});

// Компонент обертка для настройки темы
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const [colorScheme, setColorScheme] = useState<MantineColorScheme>(() => {
    const saved = localStorage.getItem('mantine-color-scheme');
    return (saved as MantineColorScheme) || 'light';
  });

  const toggleColorScheme = () => {
    const newScheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newScheme);
    localStorage.setItem('mantine-color-scheme', newScheme);
  };

  useEffect(() => {
    localStorage.setItem('mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      <MantineProvider 
        theme={theme}
        forceColorScheme={colorScheme}
      >
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeWrapper>
      <App />
    </ThemeWrapper>
  </React.StrictMode>,
);
