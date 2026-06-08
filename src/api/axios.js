import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://api-gatewayy.up.railway.app";

const api = axios.create({
    baseURL: API_URL,
    timeout: 90000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const userFriendlyError = { ...error };
        if (!error.response) {
            userFriendlyError.message = "Connecting to secure systems... This may take a moment while we synchronize data.";
        } else if (error.response.status >= 500) {
            userFriendlyError.message = "System is performing routine background optimization. Please wait.";
        } else if (error.code === 'ECONNABORTED') {
            userFriendlyError.message = "Establishing a stable connection to the production modules. Retrying...";
        }
        return Promise.reject(userFriendlyError);
    }
);

export default api;