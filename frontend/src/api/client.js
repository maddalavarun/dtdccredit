import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle errors globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else if (!err.response) {
            // Network error (e.g., Neon DB waking up / backend unreachable)
            console.error('Network Error usually due to cold start or disconnected backend:', err);
            // Notice: don't import toast globally here to avoid circular dep, 
            // usually handled in components, but we can log or trigger a custom event
        }
        return Promise.reject(err);
    }
);

export const fetcher = url => api.get(url).then(res => res.data);

export default api;
