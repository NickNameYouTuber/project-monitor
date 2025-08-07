import { AppShell, Container } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import './App.css';

function App() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
