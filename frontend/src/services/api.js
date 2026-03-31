import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        
        let message = 'An unexpected error occurred';
        if (error.response?.data) {
            if (typeof error.response.data === 'string') {
                message = error.response.data.substring(0, 150) + '...';
            } else {
                message = error.response.data.detail || 
                          error.response.data.error || 
                          (typeof error.response.data === 'object' ? Object.values(error.response.data).join(', ') : null) ||
                          error.message;
            }
        } else if (error.message) {
            message = error.message;
        }
        
        // For 400 errors (validation), component handles it.
        // For 500 or Network Errors, display alert and resolve safely to avoid unhandled crashes.
        if (error.response?.status >= 500) {
            alert(`Server Error: The backend encountered a problem. \n\nDetails: ${message}`);
            return Promise.resolve({ data: { results: [], error: true } });
        } else if (!error.response) {
            alert(`Network Error: Cannot connect to backend. Is it running? \n\nDetails: ${message}`);
            return Promise.resolve({ data: { results: [], error: true } });
        }
        
        return Promise.reject(error);
    }
);

export default api;
