import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Импортируем наши темы
import './styles/themes.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
