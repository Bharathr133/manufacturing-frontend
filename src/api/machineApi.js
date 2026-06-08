import api from "./axios";

export const getMachines = () => api.get("/machines");
export const getMachine = (id) => api.get(`/machines/${id}`);
export const createMachine = (machine) => api.post("/machines", { ...machine, status: "IDLE" });
export const updateMachine = (id, machine) => api.put(`/machines/${id}`, machine);

// Get both counts in ONE call
export const getMachineStats = async () => {
    const response = await api.get("/machines/count");
    return { data: response.data }; // Returns {total, running}
};

// For backward compatibility
export const getMachineCount = async () => {
    const response = await api.get("/machines/count");
    return { data: response.data.total };
};

export const getRunningCount = async () => {
    const response = await api.get("/machines/count");
    return { data: response.data.running };
};