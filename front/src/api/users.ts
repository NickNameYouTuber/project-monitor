import { apiClient } from './client';

export type UserDto = {
  id: string;
  username: string;
  displayName?: string;
  createdAt?: string;
};

export async function getCurrentUser(): Promise<UserDto> {
  const { data } = await apiClient.get<UserDto>('/users/me');
  return data;
}

export async function updateCurrentUser(payload: { username?: string; displayName?: string }): Promise<UserDto> {
  const { data } = await apiClient.put<UserDto>('/users/me', payload);
  return data;
}

export async function listUsers(limit = 100): Promise<UserDto[]> {
  const { data } = await apiClient.get<UserDto[]>('/users', { params: { limit } });
  return data;
}
