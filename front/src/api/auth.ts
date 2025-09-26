import { apiClient, setAccessToken } from './client';

type LoginResponse = { token?: string; access_token?: string };

export async function registerUser(username: string, password: string, displayName?: string): Promise<string> {
  const body: Record<string, unknown> = { username, password };
  if (displayName) body.display_name = displayName;
  const { data } = await apiClient.post<LoginResponse>('/auth/register', body);
  const token = data.token || data.access_token || '';
  setAccessToken(token);
  return token;
}

export async function loginUser(username: string, password: string): Promise<string> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  const token = data.token || data.access_token || '';
  setAccessToken(token);
  return token;
}

export async function loginWithTelegram(payload: {
  telegram_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  init_data?: string;
  auth_date?: number;
  hash: string;
}): Promise<string> {
  const { data } = await apiClient.post<LoginResponse>('/auth/telegram', payload);
  const token = data.access_token || data.token || '';
  setAccessToken(token);
  return token;
}

export function logoutUser() {
  setAccessToken(null);
}


