import { AppShell } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import './App.css';

function App() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>
      <AppShell.Main className="h-full w-full">
        <div className="h-full w-full">
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
