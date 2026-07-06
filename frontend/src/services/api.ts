import axios from 'axios';

const rawUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
const API_URL = (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject stored JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('delegate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
