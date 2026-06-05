import api from "./axios";

export const getOrders = () => api.get("/production");
export const startProduction = (machineId, data) => api.post(`/production/${machineId}`, data);
export const completeProduction = (orderId) => api.put(`/production/${orderId}/complete`);
export const getOrderCount = () => api.get("/production/count");
