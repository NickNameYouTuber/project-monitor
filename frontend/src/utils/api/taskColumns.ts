import axios from 'axios';
import { API_BASE_URL } from './config';

export interface TaskColumn {
  id: string;
  name: string;
  order: number;
  project_id: string;
}

export interface TaskColumnCreate {
  name: string;
  order?: number;
  project_id: string;
}

export interface TaskColumnUpdate {
  name?: string;
  order?: number;
}

const taskColumnsApi = {
  async create(columnData: TaskColumnCreate, token: string) {
    const response = await axios.post(`${API_BASE_URL}/api/task-columns/`, columnData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async getAll(projectId: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/api/task-columns/project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async get(columnId: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/api/task-columns/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async update(columnId: string, updateData: TaskColumnUpdate, token: string) {
    const response = await axios.put(`${API_BASE_URL}/api/task-columns/${columnId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async delete(columnId: string, token: string) {
    await axios.delete(`${API_BASE_URL}/api/task-columns/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  async reorder(projectId: string, columnIds: string[], token: string) {
    const response = await axios.put(`${API_BASE_URL}/api/task-columns/reorder/${projectId}`, columnIds, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default taskColumnsApi;
