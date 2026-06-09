import api from "./axios";

// Professional Part List
export const PREFILLED_PARTS = [
    "PISTON-X1", "GEAR-V8", "SHAFT-M4", "VALVE-TR7", "BEARING-Z2", "CUSTOM"
];

export const getOrders = () => api.get("/production");
export const startProduction = (machineId, data) => {
    if (data.quantity <= 0) throw new Error("Production quantity must be greater than zero.");
    return api.post(`/production/${machineId}`, data);
};
export const completeProduction = (orderId) => api.put(`/production/${orderId}/complete`);
export const getOrderCount = () => api.get("/production/count");
