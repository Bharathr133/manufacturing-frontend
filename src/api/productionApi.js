import api from "./axios";

// Professional Part List
export const PRODUCTION_PART_TEMPLATES = [
    // TURNING
    { id: "TURNING-SHAFT", name: "Shaft", type: "TURNING" },
    { id: "TURNING-BUSH", name: "Bush", type: "TURNING" },
    { id: "TURNING-ROLLER", name: "Roller", type: "TURNING" },
    { id: "TURNING-PIN", name: "Pin", type: "TURNING" },
    // MILLING
    { id: "MILLING-BRACKET", name: "Bracket", type: "MILLING" },
    { id: "MILLING-HOUSING", name: "Housing", type: "MILLING" },
    { id: "MILLING-BASE", name: "Base Plate", type: "MILLING" },
    { id: "MILLING-FIXTURE", name: "Fixture Block", type: "MILLING" },
    // PRESS
    { id: "PRESS-PLATE", name: "Pressed Plate", type: "PRESS" },
    { id: "PRESS-WASHER", name: "Washer", type: "PRESS" },
    { id: "PRESS-DISC", name: "Metal Disc", type: "PRESS" },
    { id: "PRESS-CLAMP", name: "Clamp", type: "PRESS" },
    // MOLDING
    { id: "MOLDING-CAP", name: "Plastic Cap", type: "MOLDING" },
    { id: "MOLDING-COVER", name: "Plastic Cover", type: "MOLDING" },
    { id: "MOLDING-HOUSING", name: "Plastic Housing", type: "MOLDING" },
    { id: "MOLDING-CONNECTOR", name: "Connector", type: "MOLDING" },
    { id: "CUSTOM", name: "-- Manual Entry --", type: "ALL" }
];

export const getOrders = () => api.get("/production");
export const startProduction = (machineId, data) => {
    if (data.quantity <= 0) throw new Error("Production quantity must be greater than zero.");
    return api.post(`/production/${machineId}`, data);
};
export const completeProduction = (orderId) => api.put(`/production/${orderId}/complete`);
export const getOrderCount = () => api.get("/production/count");
