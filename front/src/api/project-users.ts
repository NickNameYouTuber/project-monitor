import { apiClient } from './client';
import type { UserDto } from './users';

export async function getProjectUsers(projectId: string): Promise<UserDto[]> {
  const { data } = await apiClient.get<any[]>(`/projects/${projectId}/members`);
  
  return data.map(member => ({
    id: member.user?.id || member.user_id,
    username: member.user?.username || '',
    displayName: member.user?.display_name,
    email: member.user?.email,
  }));
}

