import axios from 'axios';
import { API_BASE_URL } from '../api';

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentCreate {
  task_id: string;
  content: string;
}

export interface CommentUpdate {
  content: string;
}

const commentsApi = {
  // Получить комментарии для задачи
  getByTask: async (taskId: string, token: string) => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Создать новый комментарий
  create: async (commentData: CommentCreate, token: string) => {
    const response = await axios.post(`${API_BASE_URL}/comments`, commentData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Обновить комментарий
  update: async (commentId: string, updateData: CommentUpdate, token: string) => {
    const response = await axios.put(`${API_BASE_URL}/comments/${commentId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Удалить комментарий
  delete: async (commentId: string, token: string) => {
    return axios.delete(`${API_BASE_URL}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default commentsApi;
