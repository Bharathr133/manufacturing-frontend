import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const api = axios.create({
    baseURL: "http://localhost:8080",
    timeout: 10000,
});

export default api;