import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MantineProvider, createTheme, localStorageColorSchemeManager, useMantineColorScheme } from '@mantine/core';
import { useEffect } from 'react';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import App from './App';
import Login from './pages/Login';
import Dashboards from './pages/Dashboards';
import DashboardDetail from './pages/DashboardDetail';
import ProjectDetail from './pages/ProjectDetail';
import RepositoryDetail from './pages/RepositoryDetail';
import RepositoryCreate from './pages/RepositoryCreate';
import ProtectedRoute from './routes/ProtectedRoute';

const theme = createTheme({});
const colorSchemeManager = localStorageColorSchemeManager({ key: 'pm-color-scheme' });

// Sync Tailwind's `dark` class with Mantine color scheme for global styles
function TailwindColorSchemeSync() {
  const { colorScheme } = useMantineColorScheme();
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', colorScheme === 'dark');
    }
  }, [colorScheme]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} colorSchemeManager={colorSchemeManager} defaultColorScheme="light">
      <TailwindColorSchemeSync />
      <Notifications />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}> 
            <Route element={<App />}>
              <Route index element={<Navigate to="/dashboards" replace />} />
              <Route path="/dashboards" element={<Dashboards />} />
              <Route path="/dashboards/:dashboardId" element={<DashboardDetail />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/repositories/:repositoryId" element={<RepositoryDetail />} />
              <Route path="/repositories/create" element={<RepositoryCreate />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboards" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>
);
