import { useEffect } from 'react'
import { AppProvider } from './utils/AppContext'
import AppRouter from './router/AppRouter'
import './index.css'

// Примечание: MainContent перенесен в соответствующие компоненты роутинга

// App Root Component
function App() {
  // Setup Telegram Web App
  useEffect(() => {
    // Initialize Telegram Web App if it exists
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

// Примечание: Этот компонент больше не используется, т.к. маршрутизация осуществляется в AppRouter
// Весь функционал был перенесен в соответствующие компоненты роутинга

export default App
