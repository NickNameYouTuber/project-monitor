import { apiClient } from './client';

export type TokenDto = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
};

export async function listTokens(): Promise<TokenDto[]> {
  const { data } = await apiClient.get<TokenDto[]>('/tokens');
  return data;
}

export async function createToken(name: string): Promise<{ token: string }> {
  const { data } = await apiClient.post<{ token: string }>('/tokens', { name });
  return data;
}

export async function revokeToken(tokenId: string): Promise<void> {
  await apiClient.delete(`/tokens/${tokenId}`);
}
