import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD 
    ? '/transport/api/' 
    : 'http://127.0.0.1:8000/transport/api/'),
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get an unauthorized error (like an expired token), log the user out
      localStorage.removeItem('pt_token');
      window.location.href = '/transport/';
    }
    return Promise.reject(error);
  }
);

export default api;
