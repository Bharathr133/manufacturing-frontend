import api from "./axios";

// Professional Part List
export const PRODUCTION_PART_TEMPLATES = [
    { id: "PISTON-X1", name: "Hydraulic Piston X1" },
    { id: "GEAR-V8", name: "Transmission Gear V8" },
    { id: "SHAFT-M4", name: "Drive Shaft M4" },
    { id: "VALVE-TR7", name: "Intake Valve TR7" },
    { id: "BEARING-Z2", name: "Ceramic Bearing Z2" },
    { id: "CUSTOM", name: "-- Manual Entry --" }
];

export const getOrders = () => api.get("/production");
export const startProduction = (machineId, data) => {
    if (data.quantity <= 0) throw new Error("Production quantity must be greater than zero.");
    return api.post(`/production/${machineId}`, data);
};
export const completeProduction = (orderId) => api.put(`/production/${orderId}/complete`);
export const getOrderCount = () => api.get("/production/count");
