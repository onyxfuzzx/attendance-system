import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for cookies (refreshToken)
});

// Request interceptor for Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401s and token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const api = {
  client: axiosInstance,
  auth: {
    login: (email: string, password: string) =>
      axiosInstance.post('/auth/login', { email, password }).then(r => r.data),
    register: (data: any) =>
      axiosInstance.post('/auth/register', data).then(r => r.data),
    logout: () => axiosInstance.post('/auth/logout').then(r => r.data),
    refresh: () => axiosInstance.post('/auth/refresh').then(r => r.data),
  },

  profile: {
    get: () => axiosInstance.get('/profile').then(r => r.data),
    update: (data: any) => axiosInstance.put('/profile', data).then(r => r.data),
    updatePassword: (data: any) => axiosInstance.put('/profile/password', data).then(r => r.data),
    uploadPhoto: (formData: FormData) => 
      axiosInstance.post('/profile/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(r => r.data),
  },

  locations: {
    getAll: (params?: any) => axiosInstance.get('/locations', { params }).then(r => r.data),
    get: (id: string) => axiosInstance.get(`/locations/${id}`).then(r => r.data),
    create: (data: any) => axiosInstance.post('/locations', data).then(r => r.data),
    update: (id: string, data: any) => axiosInstance.put(`/locations/${id}`, data).then(r => r.data),
    delete: (id: string) => axiosInstance.delete(`/locations/${id}`).then(r => r.data),
  },

  shifts: {
    getAll: (params?: any) => axiosInstance.get('/shifts', { params }).then(r => r.data),
    get: (id: string) => axiosInstance.get(`/shifts/${id}`).then(r => r.data),
    create: (data: any) => axiosInstance.post('/shifts', data).then(r => r.data),
    update: (id: string, data: any) => axiosInstance.put(`/shifts/${id}`, data).then(r => r.data),
    delete: (id: string) => axiosInstance.delete(`/shifts/${id}`).then(r => r.data),
    getEmployees: (id: string) => axiosInstance.get(`/shifts/${id}/employees`).then(r => r.data),
    assignEmployees: (id: string, data: { user_ids: string[]; effective_from?: string }) =>
      axiosInstance.post(`/shifts/${id}/employees`, data).then(r => r.data),
    removeEmployee: (shiftId: string, userId: string) =>
      axiosInstance.delete(`/shifts/${shiftId}/employees/${userId}`).then(r => r.data),
  },

  employees: {
    getAll: (params?: any) => axiosInstance.get('/employees', { params }).then(r => r.data),
    create: (data: any) => axiosInstance.post('/employees', data).then(r => r.data),
    update: (id: string, data: any) => axiosInstance.put(`/employees/${id}`, data).then(r => r.data),
    delete: (id: string, adminPassword: string) => axiosInstance.delete(`/employees/${id}`, { data: { adminPassword } }).then(r => r.data),
  },

  attendance: {
    getAll: (params?: any) => axiosInstance.get('/attendance', { params }).then(r => r.data),
    scan: (data: any) => axiosInstance.post('/attendance/scan', data).then(r => r.data),
  },

  corrections: {
    getAll: (params?: any) => axiosInstance.get('/corrections', { params }).then(r => r.data),
    get: (id: string) => axiosInstance.get(`/corrections/${id}`).then(r => r.data),
    create: (data: any) => axiosInstance.post('/corrections', data).then(r => r.data),
    review: (id: string, data: any) => axiosInstance.patch(`/corrections/${id}/review`, data).then(r => r.data),
  },

  audit: {
    getAll: () => axiosInstance.get('/audit').then(r => r.data),
  },

  analytics: {
    getEmployee: () => axiosInstance.get('/analytics/employee').then(r => r.data),
    getAdmin: () => axiosInstance.get('/analytics/admin').then(r => r.data),
  }
};