/**
 * API service for making authenticated requests to the backend
 */

// API base URL - should come from environment variables in production
const API_URL = import.meta.env.VITE_API_URL || 'https://projectsmonitor.nicorp.tech/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  requireAuth?: boolean;
}

/**
 * Make an API request with authentication if token is provided
 */
export async function apiRequest<T>(
  endpoint: string, 
  options: ApiOptions = {},
  token?: string
): Promise<T> {
  const {
    method = 'GET',
    body,
    requireAuth = true
  } = options;

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token is provided
  if (requireAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth && !token) {
    throw new Error('Authentication token required for this request');
  }

  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  // Add body if provided
  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  // Make the request
  const response = await fetch(`${API_URL}${endpoint}`, requestOptions);

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') === -1) {
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    return response.text() as unknown as T;
  }

  // Parse response as JSON
  const data = await response.json();

  // Handle error responses
  if (!response.ok) {
    throw new Error(data.detail || 'API request failed');
  }

  return data as T;
}

// API endpoints for different resources
export const api = {
  // Auth endpoints
  auth: {
    login: (username: string, password: string) => 
      apiRequest('/auth/token', { 
        method: 'POST', 
        body: { username, password },
        requireAuth: false
      }),
    register: (userData: any) => 
      apiRequest('/auth/register', { 
        method: 'POST', 
        body: userData,
        requireAuth: false
      }),
    telegramAuth: (authData: any) => 
      apiRequest('/auth/telegram', { 
        method: 'POST', 
        body: authData,
        requireAuth: false
      }),
    guestLogin: () => 
      apiRequest('/auth/guest', { 
        method: 'POST',
        requireAuth: false
      }),
    getCurrentUser: (token: string) => 
      apiRequest('/users/me', { requireAuth: true }, token)
  },
  
  // Projects endpoints
  projects: {
    getAll: (token: string) => 
      apiRequest('/projects', { requireAuth: true }, token),
    getOne: (id: string, token: string) => 
      apiRequest(`/projects/${id}`, { requireAuth: true }, token),
    create: (projectData: any, token: string) => 
      apiRequest('/projects', { 
        method: 'POST', 
        body: projectData,
        requireAuth: true 
      }, token),
    update: (id: string, projectData: any, token: string) => 
      apiRequest(`/projects/${id}`, { 
        method: 'PUT', 
        body: projectData,
        requireAuth: true 
      }, token),
    delete: (id: string, token: string) => 
      apiRequest(`/projects/${id}`, { 
        method: 'DELETE',
        requireAuth: true 
      }, token),
    updateStatus: (id: string, status: string, token: string) => 
      apiRequest(`/projects/${id}/status`, {
        method: 'PATCH',
        body: { status },
        requireAuth: true
      }, token),
    reorder: (reorderData: any, token: string) => 
      apiRequest('/projects/reorder', {
        method: 'POST',
        body: reorderData,
        requireAuth: true
      }, token)
  },
  
  // Dashboards endpoints
  dashboards: {
    getAll: (token: string) => 
      apiRequest('/dashboards', { requireAuth: true }, token),
    getOne: (id: string, token: string) => 
      apiRequest(`/dashboards/${id}`, { requireAuth: true }, token),
    create: (dashboardData: any, token: string) => 
      apiRequest('/dashboards', { 
        method: 'POST', 
        body: dashboardData,
        requireAuth: true 
      }, token),
    update: (id: string, dashboardData: any, token: string) => 
      apiRequest(`/dashboards/${id}`, { 
        method: 'PUT', 
        body: dashboardData,
        requireAuth: true 
      }, token),
    delete: (id: string, token: string) => 
      apiRequest(`/dashboards/${id}`, { 
        method: 'DELETE',
        requireAuth: true 
      }, token)
  },
  
  // Users endpoints
  users: {
    getAll: (token: string) => 
      apiRequest('/users', { requireAuth: true }, token),
    getOne: (id: string, token: string) => 
      apiRequest(`/users/${id}`, { requireAuth: true }, token),
    update: (userData: any, token: string) => 
      apiRequest('/users/me', { 
        method: 'PUT', 
        body: userData,
        requireAuth: true 
      }, token)
  }
};
