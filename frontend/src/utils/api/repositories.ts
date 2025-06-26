import axios from 'axios';
import { API_BASE_URL } from '../api';

// Типы видимости репозитория
export const VisibilityType = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  INTERNAL: 'internal'
} as const;

export type VisibilityType = typeof VisibilityType[keyof typeof VisibilityType];

// Интерфейсы для объектов репозитория
export interface Repository {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  url?: string;
  project_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryDetail extends Repository {
  owner: {
    id: string;
    username: string;
    email: string;
  };
}

export interface RepositoryCreate {
  name: string;
  description?: string;
  visibility?: VisibilityType;
  project_id?: string;
}

export interface RepositoryUpdate {
  name?: string;
  description?: string;
  visibility?: VisibilityType;
  url?: string;
  project_id?: string;
}

const repositoriesApi = {
  // Получить все репозитории пользователя
  getAll: async (token: string, projectId?: string) => {
    let url = `${API_BASE_URL}/repositories`;
    if (projectId) {
      url += `?project_id=${projectId}`;
    }
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Получить конкретный репозиторий
  getOne: async (repositoryId: string, token: string) => {
    const response = await axios.get(`${API_BASE_URL}/repositories/${repositoryId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Создать новый репозиторий
  create: async (repositoryData: RepositoryCreate, token: string) => {
    const response = await axios.post(`${API_BASE_URL}/repositories`, repositoryData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Обновить существующий репозиторий
  update: async (repositoryId: string, updateData: RepositoryUpdate, token: string) => {
    const response = await axios.put(`${API_BASE_URL}/repositories/${repositoryId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Удалить репозиторий
  delete: async (repositoryId: string, token: string) => {
    return axios.delete(`${API_BASE_URL}/repositories/${repositoryId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default repositoriesApi;
