import axios from 'axios';
import { API_BASE_URL } from '../api';

// Роли пользователей в репозитории
export const RepositoryRole = {
  ADMIN: 'admin',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer'
} as const;

export type RepositoryRole = typeof RepositoryRole[keyof typeof RepositoryRole];

// Интерфейсы для объектов участников репозитория
export interface RepositoryMember {
  id: string;
  repository_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepositoryMemberDetail extends RepositoryMember {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface RepositoryMemberCreate {
  repository_id: string;
  user_id: string;
  role?: RepositoryRole;
}

export interface RepositoryMemberUpdate {
  role?: RepositoryRole;
  is_active?: boolean;
}

const repositoryMembersApi = {
  // Получить всех участников репозитория
  getByRepository: async (repositoryId: string, token: string) => {
    const response = await axios.get(`${API_BASE_URL}/repositories/${repositoryId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Добавить участника в репозиторий
  addMember: async (repositoryId: string, memberData: RepositoryMemberCreate, token: string) => {
    const response = await axios.post(`${API_BASE_URL}/repositories/${repositoryId}/members`, memberData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Обновить роль участника репозитория
  updateMember: async (repositoryId: string, memberId: string, updateData: RepositoryMemberUpdate, token: string) => {
    const response = await axios.put(`${API_BASE_URL}/repositories/${repositoryId}/members/${memberId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Удалить участника из репозитория
  removeMember: async (repositoryId: string, memberId: string, token: string) => {
    return axios.delete(`${API_BASE_URL}/repositories/${repositoryId}/members/${memberId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default repositoryMembersApi;
