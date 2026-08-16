import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 min — AI calls (resume analyze, career, interview) can take 60-90s
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const resumeAPI = {
  upload: (formData, onProgress) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  }),
  analyze: (data) => api.post('/resume/analyze', data),
  get: () => api.get('/resume'),
  improve: (data) => api.post('/resume/improve', data),
};

export const githubAPI = {
  analyze: (username) => api.get(`/github/${username}`),
  get: () => api.get('/github'),
};

export const careerAPI = {
  analyze: (data) => api.post('/career/analyze', data),
  get: () => api.get('/career'),
};

export const skillsAPI = {
  analyze: (data) => api.post('/skills/analyze', data),
  get: () => api.get('/skills'),
};

export const roadmapAPI = {
  generate: (data) => api.post('/roadmap/generate', data),
  get: () => api.get('/roadmap'),
  completeStage: (stageNumber) => api.patch(`/roadmap/stage/${stageNumber}/complete`),
};

export const interviewAPI = {
  start: (data) => api.post('/interview/start', data),
  answer: (data) => api.post('/interview/answer', data),
  getResult: (id) => api.get(`/interview/result/${id}`),
  list: () => api.get('/interview'),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
};

export default api;
