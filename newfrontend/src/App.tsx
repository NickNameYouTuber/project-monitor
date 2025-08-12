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
      <AppShell.Main className="w-full h-[calc(100vh-56px)] overflow-hidden">
        <div className="w-full h-full" style={{ padding: '20px' }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
