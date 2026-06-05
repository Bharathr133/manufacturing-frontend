import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://api-gatewayy.up.railway.app";

const api = axios.create({
    baseURL:"https://api-gatewayy.up.railway.app",
    timeout: 10000,
});

export default api;