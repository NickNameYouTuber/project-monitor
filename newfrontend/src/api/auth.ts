import apiClient from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
}

export async function loginWithPassword(username: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  const { data } = await apiClient.post<LoginResponse>('/auth/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export interface TelegramAuthRequest {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  init_data?: string;
  auth_date?: number;
  hash?: string;
}

export async function loginWithTelegram(payload: TelegramAuthRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/telegram', payload);
  return data;
}

