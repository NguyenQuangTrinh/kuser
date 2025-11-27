// API Configuration
export const API_CONFIG = {
    // When using Next.js rewrites, we use relative paths (empty string)
    // The browser will request /api/... which Next.js proxies to the backend
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.33:8000',
    SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://192.168.1.33:8000',
};

// Helper function to build API URLs
export const getApiUrl = (path: string) => {
    return `${API_CONFIG.BACKEND_URL}${path}`;
};

export const getSocketUrl = () => {
    return API_CONFIG.SOCKET_URL;
};
