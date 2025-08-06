import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
// Импортируем наши темы
import './styles/themes.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'

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
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MantineProvider>
  </React.StrictMode>,
)
