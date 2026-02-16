import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// API functions
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
};

export const tasksApi = {
  getAll: (params?: { status?: string; category?: string; search?: string }) =>
    apiClient.get('/tasks', { params }),
  create: (data: {
    title: string;
    description?: string;
    status?: string;
    category?: string;
    startDate?: string;
    dueDate?: string;
  }) => apiClient.post('/tasks', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
};

export const auditApi = {
  getLogs: (page?: number, limit?: number) =>
    apiClient.get('/audit-log', { params: { page, limit } }),
};
