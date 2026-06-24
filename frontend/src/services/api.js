import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('catinder_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data)
};

export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadPhoto: (formData) => api.post('/users/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDiscover: (page = 1, filters = {}) => {
    const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, 'true');
    });
    return api.get(`/users/discover?${params.toString()}`);
  },
  swipe: (direction, userId) => api.post(`/users/swipe/${direction}/${userId}`),
  getShiftStats: () => api.get('/users/shift-stats'),
  
  // Break Match
  activateBreak: () => api.post('/users/break/available'),
  deactivateBreak: () => api.post('/users/break/stop'),
  findBreakMatch: () => api.get('/users/break/find'),
  getBreakZones: () => api.get('/users/break/zones'),
  inviteBreak: (userId) => api.post(`/users/break/invite/${userId}`)
};

export const matchService = {
  getMatches: () => api.get('/matches'),
  getMessages: (matchId) => api.get(`/matches/${matchId}/messages`),
  sendMessage: (matchId, content) => api.post(`/matches/${matchId}/messages`, { content })
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  toggleUserStatus: (userId) => api.put(`/admin/users/${userId}/toggle-status`),
  toggleUserAdmin: (userId) => api.put(`/admin/users/${userId}/toggle-admin`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  createUser: (data) => api.post('/admin/users', data)
};

export default api;
