import { useState } from 'react';
import { Center, Loader, Paper, Stack, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocation, useNavigate } from 'react-router-dom';
import TelegramLoginWidget, { type TelegramUser } from '../components/auth/TelegramLoginWidget';
import { setAccessToken } from '../utils/auth';
import apiClient from '../api/client';

function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/dashboards';
  const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';
  const BOT_NAME = (import.meta as any).env?.VITE_TELEGRAM_BOT_NAME || 'ProjectMonitorBot';

  const handleTelegramAuth = async (telegramUser: TelegramUser) => {
    setLoading(true);
    try {
      const authData = {
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || '',
        username: telegramUser.username || '',
        photo_url: telegramUser.photo_url || '',
        init_data: '',
        auth_date: telegramUser.auth_date,
        hash: telegramUser.hash,
      };
      const { data } = await apiClient.post(`${API_URL}/auth/telegram`, authData, {
        headers: { 'Content-Type': 'application/json' },
      });
      setAccessToken(data.access_token);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Ошибка входа через Telegram';
      notifications.show({ color: 'red', title: 'Ошибка', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack align="center" mt={80}>
      <Paper withBorder p="xl" radius="md" className="w-[420px] max-w-[90%]">
        <Stack align="center">
          <Title order={3}>Вход в систему</Title>
          <TelegramLoginWidget botName={BOT_NAME} dataOnauth={handleTelegramAuth} buttonSize="large" />
          {loading && (
            <Center>
              <Loader size="sm" />
            </Center>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

export default Login;

