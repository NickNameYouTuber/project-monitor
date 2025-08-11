import { Group, Title, Button, Box } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { clearAccessToken, getAccessToken } from '../utils/auth';

function AppHeader() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getAccessToken());

  const handleLogout = () => {
    clearAccessToken();
    navigate('/login', { replace: true });
  };

  return (
    <Group justify="space-between" px="md" py={8}>
      <Box>
        <Title order={4} style={{ lineHeight: 1 }}>
          <Link to="/dashboards" style={{ textDecoration: 'none', color: 'inherit' }}>
            NIT
          </Link>
        </Title>
      </Box>
      <Group gap="sm">
        <ThemeToggle />
        {isAuthenticated ? (
          <Button variant="light" onClick={handleLogout}>
            Выйти
          </Button>
        ) : (
          <Button component={Link} to="/login" variant="light">
            Войти
          </Button>
        )}
      </Group>
    </Group>
  );
}

export default AppHeader;

