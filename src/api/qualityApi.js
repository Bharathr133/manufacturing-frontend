import api from "./axios";

// Record a quality check
export const recordQualityCheck = (data) => api.post("/quality/check", data);

// Get all quality checks - RETURNS DATA DIRECTLY
export const getAllQualityChecks = async () => {
    const response = await api.get("/quality/all");
    return response.data;  // Returns array of quality checks
};

// Get quality check by ID
export const getQualityCheckById = async (id) => {
    const response = await api.get(`/quality/${id}`);
    return response.data;
};

// Get quality statistics - RETURNS DATA DIRECTLY
export const getQualityStats = async () => {
    const response = await api.get("/quality/stats");
    return response.data;  // Returns {totalChecks, passed, rework, failed, defectRate}
};

// Get checks by order ID
export const getQualityChecksByOrder = async (orderId) => {
    const response = await api.get(`/quality/order/${orderId}`);
    return response.data;
};

// Get checks by machine ID
export const getQualityChecksByMachine = async (machineId) => {
    const response = await api.get(`/quality/machine/${machineId}`);
    return response.data;
};