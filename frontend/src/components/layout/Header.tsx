import React from 'react';
import { useAppContext } from '../../utils/AppContext';
import { 
  AppShell,
  Group, 
  Avatar, 
  Text, 
  Menu, 
  Button,
  UnstyledButton,
  Container,
  useMantineColorScheme,
  ActionIcon,
  Image,
  Box
} from '@mantine/core';
import { 
  IconSun, 
  IconMoon, 
  IconUserCircle, 
  IconSettings, 
  IconLogout,
  IconChevronDown
} from '@tabler/icons-react';
import nitLogo from '../../assets/nit-logo.png';

interface HeaderProps {
  onAddProject?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddProject }) => {
  const { currentUser, logout } = useAppContext();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Toggle dark/light mode
  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  // Handle profile button click
  const handleProfileClick = () => {
    alert('Profile settings coming soon!');
  };

  // Handle preferences button click
  const handlePreferencesClick = () => {
    alert('Preferences coming soon!');
  };

  // Handle logout button click
  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      // Force redirect to auth screen by logging out
      logout();
      // Ensure the UI updates
      window.location.reload();
    }
  };

  return (
    <AppShell.Header p="md">
      <Container size="lg" h="100%">
        <Group justify="space-between" h="100%">
          <Group>
            <Image src={nitLogo} alt="NitLogo" width={40} height={40} />
            <Text fw={700} size="lg">Project Monitor</Text>
          </Group>
          
          <Group>
            {/* Theme Toggle Button */}
            <ActionIcon 
              variant="default" 
              onClick={toggleColorScheme} 
              radius="md"
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? (
                <IconSun size="1.2rem" stroke={1.5} />
              ) : (
                <IconMoon size="1.2rem" stroke={1.5} />
              )}
            </ActionIcon>
            
            {/* User Menu */}
            <Menu position="bottom-end" shadow="md" width={220}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar 
                      src={currentUser?.avatar} 
                      alt={currentUser?.name} 
                      radius="xl" 
                      color="green"
                      size="md"
                    >
                      {currentUser?.name?.charAt(0) || 'G'}
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {currentUser?.name || 'Guest User'}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {currentUser?.type === 'guest' ? 'Guest Account' : 'Telegram Account'}
                      </Text>
                    </Box>
                    <IconChevronDown size="1rem" stroke={1.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>User Settings</Menu.Label>
                <Menu.Item 
                  onClick={handleProfileClick} 
                  leftSection={<IconUserCircle size={14} />}
                >
                  Profile Settings
                </Menu.Item>
                <Menu.Item 
                  onClick={handlePreferencesClick} 
                  leftSection={<IconSettings size={14} />}
                >
                  Preferences
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item 
                  onClick={handleLogoutClick}
                  leftSection={<IconLogout size={14} />}
                  color="red"
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {onAddProject && (
              <Button 
                variant="filled" 
                color="green" 
                onClick={onAddProject}
              >
                New Project
              </Button>
            )}
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
};

export default Header;
