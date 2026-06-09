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
        return Promise.reject({ message: "Invalid Input: System does not accept negative values." });
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const userFriendlyError = { ...error };
        if (!error.response) {
            userFriendlyError.message = "Synchronizing system modules... Please wait while the secure link is established.";
        } else if (error.response.status >= 500) {
            userFriendlyError.message = "Operational modules are currently undergoing background optimization.";
        } else if (error.code === 'ECONNABORTED') {
            userFriendlyError.message = "Initializing secure data uplink. Retrying for a stable connection...";
        }
        return Promise.reject(userFriendlyError);
    }
);

export default api;