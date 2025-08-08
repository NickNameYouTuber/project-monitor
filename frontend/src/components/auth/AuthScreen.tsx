import React, { useState } from 'react';
import { useAppContext } from '../../utils/AppContext';
import type { User } from '../../types';
import TelegramLoginWidget from './TelegramLoginWidget';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Title, 
  Text, 
  Paper, 
  Loader, 
  Group, 
  Anchor, 
  Button, 
  Stack,
  Box,
  AppShell,
  Divider,
  Center
} from '@mantine/core';
import { IconArrowLeft, IconHelp } from '@tabler/icons-react';

const AuthScreen: React.FC = () => {
  const { login } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  // API URL - would come from env in production
  const API_URL = import.meta.env.VITE_API_URL || 'https://nit.nicorp.tech/api';
  
  // Function to handle Telegram authentication using the Login Widget
  const handleTelegramAuth = async (telegramUser: any) => {
    setIsLoading(true);
    try {
      console.log('Received Telegram user data:', telegramUser);
      
      // Prepare auth data for backend using the data from Telegram Login Widget
      const authData = {
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || '',
        username: telegramUser.username || '',
        photo_url: telegramUser.photo_url || '',
        init_data: '', // Not used with Login Widget
        auth_date: telegramUser.auth_date,
        hash: telegramUser.hash
      };
      
      console.log('Sending auth data to backend:', authData);
      
      // Send to backend with mode: 'cors' explicitly set
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify(authData)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert backend user data to frontend User format
        const userData: User = {
          id: data.user.id,
          name: `${data.user.first_name} ${data.user.last_name || ''}`.trim(),
          username: data.user.username,
          avatar: data.user.avatar_url,
          type: 'telegram',
          token: data.access_token // Store the JWT token
        };
        // Store token in localStorage for API requests
        localStorage.setItem('auth_token', data.access_token);
        login(userData);
      } else {
        // Handle non-OK responses
        try {
          const errorData = await response.json();
          console.error('Telegram auth failed:', errorData);
          alert(`Authentication failed: ${errorData.detail || 'Unknown error'}`);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          alert(`Authentication failed: Server returned ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      alert('Failed to authenticate with Telegram. Please try again or continue as guest.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get bot name from environment variables
  const BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'NIProjectMonitorBot';

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header bg="green.4" c="white">
        <Container size="lg">
          <Group py="md" justify="space-between">
            <Anchor component={Link} to="/" fw={700} fz="lg" c="white">
              NIT
            </Anchor>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main bg="gray.0">
        <Container py="xl" size="xs">
          <Paper radius="md" p="xl" withBorder shadow="md">
            <Stack align="center" gap="md" mb="md">
              <Title order={1} ta="center">
                <Text span c="green.3">N</Text>
                <Text span c="green.3">I</Text>
                <Text span c="green.3">T</Text>
              </Title>
              <Text c="dimmed" size="sm" ta="center">
                Эффективное управление проектами и задачами
              </Text>
            </Stack>

            <Paper p="md" withBorder radius="md" mb="md">
              <Stack align="center">
                <Title order={3} size="h4" c="green.6" mb="md">
                  Вход в систему
                </Title>
                <Box mb="md" pos="relative">
                  <TelegramLoginWidget
                    botName={BOT_NAME}
                    dataOnauth={handleTelegramAuth}
                    buttonSize="large"
                    cornerRadius={10}
                    requestAccess={true}
                  />
                  
                  {isLoading && (
                    <Center style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)' }}>
                      <Loader color="green" />
                    </Center>
                  )}
                </Box>
              </Stack>
            </Paper>

            <Divider my="md" />

            <Stack align="center" gap="xs">
              <Group gap="xs" justify="center">
                <IconHelp size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  Нужна помощь? <Anchor href="#" c="green.5">Свяжитесь с поддержкой</Anchor>
                </Text>
              </Group>

              <Button 
                component={Link} 
                to="/" 
                variant="subtle" 
                color="green" 
                size="sm" 
                leftSection={<IconArrowLeft size={16} />}
              >
                Вернуться на главную
              </Button>
            </Stack>
          </Paper>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default AuthScreen;
