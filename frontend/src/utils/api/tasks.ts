import axios from 'axios';
import { API_BASE_URL } from '../api';

export interface Assignee {
  id: string;
  username: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  project_id: string;
  order: number;
  created_at: string;
  updated_at: string;
  assignees: Assignee[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  column_id: string;
  project_id: string;
  order?: number;
  assignee_ids?: string[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  column_id?: string;
  order?: number;
  assignee_ids?: string[];
}

export interface TaskMove {
  column_id: string;
  order: number;
}

const tasksApi = {
  async create(taskData: TaskCreate, token: string) {
    const { project_id, ...rest } = taskData;
    const response = await axios.post(`${API_BASE_URL}/projects/${project_id}/tasks`, rest, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async get(taskId: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/projects/_/tasks/${taskId}`.replace('/_/', '/'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async getByColumn(columnId: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/projects/_/tasks/column/${columnId}`.replace('/_/', '/'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async getByProject(projectId: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async update(taskId: string, updateData: TaskUpdate, token: string) {
    const response = await axios.put(`${API_BASE_URL}/projects/_/tasks/${taskId}`.replace('/_/', '/'), updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async move(taskId: string, moveData: TaskMove, token: string) {
    const response = await axios.put(`${API_BASE_URL}/projects/_/tasks/${taskId}/move`.replace('/_/', '/'), moveData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async delete(taskId: string, token: string) {
    await axios.delete(`${API_BASE_URL}/projects/_/tasks/${taskId}`.replace('/_/', '/'), {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  async reorder(columnId: string, taskIds: string[], token: string) {
    const response = await axios.put(`${API_BASE_URL}/projects/_/tasks/column/${columnId}/reorder`.replace('/_/', '/'), { task_ids: taskIds }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default tasksApi;
