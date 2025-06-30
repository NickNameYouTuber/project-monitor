import { apiRequest, API_BASE_URL } from '../api';
import type { WhiteboardData } from '../../types/whiteboard';

/**
 * API-клиент для работы с интерактивными досками (Miro)
 */

// Получить все доски проекта
const getAll = (projectId: string, token: string) => {
  return apiRequest(`${API_BASE_URL}/projects/${projectId}/whiteboards`, {
    method: 'GET',
    token
  });
};

// Получить одну доску по ID
const getOne = (whiteboardId: string, token: string) => {
  return apiRequest(`${API_BASE_URL}/whiteboards/${whiteboardId}`, {
    method: 'GET',
    token
  });
};

// Создать новую доску
const create = (projectId: string, whiteboardData: Partial<WhiteboardData>, token: string) => {
  return apiRequest(`${API_BASE_URL}/projects/${projectId}/whiteboards`, {
    method: 'POST',
    body: whiteboardData,
    token
  });
};

// Обновить существующую доску
const update = (whiteboardId: string, whiteboardData: Partial<WhiteboardData>, token: string) => {
  return apiRequest(`${API_BASE_URL}/whiteboards/${whiteboardId}`, {
    method: 'PUT',
    body: whiteboardData,
    token
  });
};

// Удалить доску
const deleteWhiteboard = (whiteboardId: string, token: string) => {
  return apiRequest(`${API_BASE_URL}/whiteboards/${whiteboardId}`, {
    method: 'DELETE',
    token
  });
};

// Загрузить изображение на доску
const uploadImage = (whiteboardId: string, file: File, token: string) => {
  const formData = new FormData();
  formData.append('image', file);
  
  return apiRequest(`${API_BASE_URL}/whiteboards/${whiteboardId}/images`, {
    method: 'POST',
    body: formData,
    token
  });
};

export default {
  getAll,
  getOne,
  create,
  update,
  delete: deleteWhiteboard,
  uploadImage
};
