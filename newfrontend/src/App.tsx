import { AppShell } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import './App.css';

function App() {
  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>
      <AppShell.Main className="h-full w-full" style={{ padding: 0 }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
