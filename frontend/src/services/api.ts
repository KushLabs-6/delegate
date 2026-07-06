import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL;
// If VITE_API_URL is exactly "/api", or undefined (in which case we use /api for same-domain prod, or localhost for dev)
const isDev = import.meta.env.DEV;
const API_URL = rawUrl ? rawUrl : (isDev ? 'http://localhost:5000/api' : '/api');

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
