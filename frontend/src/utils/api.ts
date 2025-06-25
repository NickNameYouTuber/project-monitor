/**
 * API service for making authenticated requests to the backend
 */

// API base URL - should come from environment variables in production
// Для продакшена используем относительные пути, для разработки - абсолютные
import taskColumnsApi from './api/taskColumns';
import tasksApi from './api/tasks';

// Важно использовать тот же протокол, что и у сайта (для предотвращения Mixed Content)
// Для продакшена обязательно используем относительный путь
let API_URL = '';

// Определяем API URL в зависимости от режима
if (import.meta.env.MODE === 'production') {
  // Для продакшена используем относительный путь
  API_URL = '/api';
} else {
  // В разработке полный URL
  API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7671/api';
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  requireAuth?: boolean;
  token?: string;
}

/**
 * Make an API request with authentication if token is provided
 */
export async function apiRequest(
  endpoint: string,
  options: ApiOptions = {}
): Promise<any> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  // Добавляем токен авторизации, если он предоставлен и требуется авторизация
  if (options.requireAuth && !options.token) {
    throw new Error('Authentication token is required for this request');
  }

  // Добавляем токен в заголовки запроса
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  // Настройки запроса
  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
  };

  // Если есть тело запроса и метод не GET, добавляем его
  if (options.body && options.method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // Отправляем запрос
  const response = await fetch(url, fetchOptions);

  // Если ответ не успешный, выбрасываем ошибку
  if (!response.ok) {
    // Пытаемся получить тело ответа, если оно есть
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      // Если не удалось распарсить JSON, используем статус код
    }
    
    throw new Error(errorMessage);
  }

  // Если ответ пустой (например, для DELETE запросов), возвращаем пустой объект
  if (response.status === 204) {
    return {};
  }

  // Парсим JSON ответ
  const data = await response.json();
  
  return data;
}

// API clients for different endpoints
export const api = {
  // Auth endpoints
  auth: {
    register: (userData: any) => 
      apiRequest('/auth/register', { 
        method: 'POST', 
        body: userData, 
        requireAuth: false
      }),
    login: (credentials: any) => 
      apiRequest('/auth/login', { 
        method: 'POST', 
        body: credentials, 
        requireAuth: false
      }),
    getCurrentUser: (token: string) => 
      apiRequest('/users/me', { requireAuth: true, token })
  },
  
  // Projects endpoints
  projects: {
    getAll: (token: string) => 
      apiRequest('/projects', { requireAuth: true, token }),
    getOne: (id: string, token: string) => 
      apiRequest(`/projects/${id}`, { requireAuth: true, token }),
    create: (projectData: any, token: string) => 
      apiRequest('/projects', { 
        method: 'POST', 
        body: projectData,
        requireAuth: true,
        token
      }),
    update: (id: string, projectData: any, token: string) => 
      apiRequest(`/projects/${id}`, { 
        method: 'PUT', 
        body: projectData,
        requireAuth: true,
        token
      }),
    delete: (id: string, token: string) => 
      apiRequest(`/projects/${id}`, { 
        method: 'DELETE',
        requireAuth: true,
        token
      }),
    updateStatus: (id: string, status: string, token: string) => 
      apiRequest(`/projects/${id}/status`, {
        method: 'PATCH',
        body: { status },
        requireAuth: true,
        token
      }),
    reorder: (reorderData: any, token: string) => 
      apiRequest('/projects/reorder', {
        method: 'POST',
        body: reorderData,
        requireAuth: true,
        token
      })
  },
  
  // Dashboards endpoints
  dashboards: {
    getAll: (token: string) => 
      apiRequest('/dashboards', { requireAuth: true, token }),
    getOne: (id: string, token: string) => 
      apiRequest(`/dashboards/${id}`, { requireAuth: true, token }),
    create: (dashboardData: any, token: string) => 
      apiRequest('/dashboards', { 
        method: 'POST', 
        body: dashboardData,
        requireAuth: true,
        token
      }),
    update: (id: string, dashboardData: any, token: string) => 
      apiRequest(`/dashboards/${id}`, { 
        method: 'PUT', 
        body: dashboardData,
        requireAuth: true,
        token
      }),
    delete: (id: string, token: string) => 
      apiRequest(`/dashboards/${id}`, { 
        method: 'DELETE',
        requireAuth: true,
        token
      }),
    getMembers: (dashboardId: string, token: string) => 
      apiRequest(`/dashboards/${dashboardId}/members`, { requireAuth: true, token }),
    addMember: (dashboardId: string, memberData: any, token: string) => 
      apiRequest(`/dashboards/${dashboardId}/members`, { 
        method: 'POST', 
        body: memberData,
        requireAuth: true,
        token
      }),
    inviteByTelegram: (dashboardId: string, telegramData: any, token: string) => 
      apiRequest(`/dashboards/${dashboardId}/invite_by_telegram`, { 
        method: 'POST', 
        body: telegramData,
        requireAuth: true,
        token
      }),
    removeMember: (dashboardId: string, memberId: string, token: string) => 
      apiRequest(`/dashboards/${dashboardId}/members/${memberId}`, { 
        method: 'DELETE',
        requireAuth: true,
        token
      }),
  },
  
  // Users endpoints
  users: {
    getAll(token: string) {
      return apiRequest('/users', { requireAuth: true, token });
    },
    getOne(id: string, token: string) {
      return apiRequest(`/users/${id}`, { requireAuth: true, token });
    },
    update(userData: any, token: string) {
      return apiRequest('/users', {
        method: 'PUT',
        body: userData,
        requireAuth: true,
        token
      });
    },
    searchByUsername(username: string, token: string = '') {
      return apiRequest(`/users/search?username=${encodeURIComponent(username)}`, { requireAuth: token ? true : false, token });
    }
  },
  
  // Task Columns endpoints
  taskColumns: {
    getAll(projectId: string, token: string) {
      return taskColumnsApi.getAll(projectId, token);
    },
    get(columnId: string, token: string) {
      return taskColumnsApi.get(columnId, token);
    },
    create(columnData: any, token: string) {
      return taskColumnsApi.create(columnData, token);
    },
    update(columnId: string, updateData: any, token: string) {
      return taskColumnsApi.update(columnId, updateData, token);
    },
    delete(columnId: string, token: string) {
      return taskColumnsApi.delete(columnId, token);
    },
    reorder(projectId: string, columnIds: string[], token: string) {
      return taskColumnsApi.reorder(projectId, columnIds, token);
    }
  },
  
  // Tasks endpoints
  tasks: {
    create(taskData: any, token: string) {
      return tasksApi.create(taskData, token);
    },
    get(taskId: string, token: string) {
      return tasksApi.get(taskId, token);
    },
    getByColumn(columnId: string, token: string) {
      return tasksApi.getByColumn(columnId, token);
    },
    getByProject(projectId: string, token: string) {
      return tasksApi.getByProject(projectId, token);
    },
    update(taskId: string, updateData: any, token: string) {
      return tasksApi.update(taskId, updateData, token);
    },
    move(taskId: string, moveData: any, token: string) {
      return tasksApi.move(taskId, moveData, token);
    },
    delete(taskId: string, token: string) {
      return tasksApi.delete(taskId, token);
    },
    reorder(columnId: string, taskIds: string[], token: string) {
      return tasksApi.reorder(columnId, taskIds, token);
    }
  }
};