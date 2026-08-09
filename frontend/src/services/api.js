// frontend/src/services/api.js
import axios from 'axios';

const configuredApiUrl = process.env.REACT_APP_API_URL;
const sameHostApiUrl = `${window.location.protocol}//${window.location.hostname}:5000`;

// When the app is opened from another device on the network, `localhost`
// refers to that device. Use the host serving the frontend instead, unless a
// deployed API URL is explicitly configured.
export const API_URL = (configuredApiUrl || sameHostApiUrl)
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A failed sign-in is an expected 401. Let Login handle it so the user
    // sees its SweetAlert instead of immediately reloading this same page.
    const isLoginRequest = error.config?.url?.replace(/\?.*$/, '').endsWith('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
