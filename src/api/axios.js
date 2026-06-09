import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://api-gatewayy.up.railway.app";

const api = axios.create({
    baseURL: API_URL,
    timeout: 90000,
});

api.interceptors.request.use((config) => {
    // Recursive function to check for negative values in the payload
    const hasNegative = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'number' && obj[key] < 0) return true;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (hasNegative(obj[key])) return true;
            }
        }
        return false;
    };

    if (config.data && hasNegative(config.data)) {
        const error = new Error("System Integrity Protocol: Negative operational values are strictly prohibited.");
        error.code = 'VALIDATION_ERROR';
        return Promise.reject(error);
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const userFriendlyError = { ...error };
        if (!error.response) {
            userFriendlyError.message = "Establishing Secure Uplink: The production module is initializing. Please maintain connection.";
        } else if (error.response.status >= 500) {
            userFriendlyError.message = "Module Synchronization: Background system optimization is currently in progress.";
        } else if (error.code === 'ECONNABORTED') {
            userFriendlyError.message = "Operational Warm-up: The environment is preparing for production. Please wait.";
        }
        return Promise.reject(userFriendlyError);
    }
);

export default api;