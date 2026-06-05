import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { startProduction, getOrders, completeProduction } from "../api/productionApi";
import { getMachines } from "../api/machineApi";
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function Production() {
    const [machineId, setMachineId] = useState("");
    const [partNumber, setPartNumber] = useState("");
    const [quantity, setQuantity] = useState("");
    const [machines, setMachines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [circuitBreakerStatus, setCircuitBreakerStatus] = useState(null);

    useEffect(() => {
        loadMachines();
        loadOrders();
        // const interval = setInterval(checkCircuitBreakerStatus, 5000);
        // return () => clearInterval(interval);
    }, []);

    const activeOrders = orders.filter((order) => order.status === "ACTIVE");
    const completedOrders = orders.filter((order) => order.status === "COMPLETED");
    const activeMachineIds = new Set(activeOrders.map((order) => order.machineId));
    const availableMachines = machines.filter(
        (machine) => ["IDLE", "RUNNING"].includes(machine.status) && !activeMachineIds.has(machine.id)
    );
    const producedUnits = completedOrders.reduce((total, order) => total + Number(order.quantity || 0), 0);

    const getResponseMessage = (data, fallback) => {
        if (typeof data === "string") return data;
        return data?.message || fallback;
    };

    const loadMachines = async () => {
        try {
            const res = await getMachines();
            setMachines(res.data);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to load machines";
            alert(`Machine Service Error: ${errorMsg}`);
        }
    };

    const loadOrders = async () => {
        try {
            const res = await getOrders();
            setOrders(res.data);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to load orders";
            alert(`Production Service Error: ${errorMsg}`);
        }
    };

    const checkCircuitBreakerStatus = async () => {
        try {
            const response = await fetch('http://localhost:8083/actuator/circuitbreakers');
            const data = await response.json();
            const machineCb = data.circuitBreakers?.machineService;
            if (machineCb?.state === 'OPEN') {
                setCircuitBreakerStatus({
                    state: 'OPEN',
                    message: '⚠️ Machine Service is DOWN. Production is running in degraded mode with fallback data.'
                });
            } else if (machineCb?.state === 'HALF_OPEN') {
                setCircuitBreakerStatus({
                    state: 'HALF_OPEN',
                    message: '🔄 Machine Service is recovering. Testing connection...'
                });
            } else {
                setCircuitBreakerStatus(null);
            }
        } catch (error) {
            console.error('Could not fetch circuit breaker status');
        }
    };

    const handleStartProduction = async () => {
        if (!machineId) {
            alert("Validation Error: Please select an available running machine");
            return;
        }

        if (!partNumber.trim()) {
            alert("Validation Error: Part number is required");
            return;
        }

        if (!quantity || Number(quantity) < 1 || Number(quantity) > 1000) {
            alert("Validation Error: Quantity must be between 1 and 1000");
            return;
        }

        setLoading(true);

        try {
            const res = await startProduction(machineId, {
                partNumber: partNumber.trim(),
                quantity: Number(quantity),
            });

            alert(`Success: ${getResponseMessage(res.data, "Production started successfully")}`);
            await Promise.all([loadOrders(), loadMachines()]);
            setPartNumber("");
            setQuantity("");
            setMachineId("");
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.response?.data || "Failed to start production";
            alert(`Production Failed: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteProduction = async (orderId) => {
        try {
            const res = await completeProduction(orderId);
            alert(`Order Completed: ${getResponseMessage(res.data, "Production completed successfully")}`);
            await Promise.all([loadOrders(), loadMachines()]);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to complete production";
            alert(`Completion Failed: ${errorMsg}`);
        }
    };

    const getMachineName = (id) => {
        const machine = machines.find((m) => m.id === id);
        return machine ? machine.machineName : `Machine ${id}`;
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            ACTIVE: "bg-green-100 text-green-800",
            COMPLETED: "bg-blue-100 text-blue-800",
            PENDING: "bg-yellow-100 text-yellow-800",
            CANCELLED: "bg-red-100 text-red-800",
        };
        return statusMap[status] || "bg-gray-100 text-gray-800";
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Production Control</h1>
                <p className="text-gray-500">Run one active order per machine and track completed output</p>
            </div>

            {/* Circuit Breaker Warning Banner */}
            {circuitBreakerStatus && (
                <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                            <div>
                                <p className="font-semibold text-yellow-800">
                                    Circuit Breaker: {circuitBreakerStatus.state}
                                </p>
                                <p className="text-sm text-yellow-700">
                                    {circuitBreakerStatus.message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-5">
                    <p className="text-sm text-gray-500">Active Orders</p>
                    <p className="text-2xl font-bold text-gray-800">{activeOrders.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5">
                    <p className="text-sm text-gray-500">Completed Orders</p>
                    <p className="text-2xl font-bold text-gray-800">{completedOrders.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5">
                    <p className="text-sm text-gray-500">Produced Units</p>
                    <p className="text-2xl font-bold text-gray-800">{producedUnits}</p>
                </div>
            </div>

            {/* Start Production Form */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Start Production Order</h2>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    IDLE machines are ready. Starting production automatically changes the machine to RUNNING.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Machine *</label>
                        <select
                            value={machineId}
                            onChange={(e) => setMachineId(e.target.value)}
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Choose available machine</option>
                            {availableMachines.map((machine) => (
                                <option key={machine.id} value={machine.id}>
                                    {machine.machineName}
                                    {machine.status === "IDLE" ? " (ready)" : " (running)"}
                                </option>
                            ))}
                        </select>
                        {availableMachines.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">No ready machines are free right now.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Part Number *</label>
                        <input
                            type="text"
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            placeholder="Example: GEAR-001"
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Quantity * (1-1000)</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Planned units"
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <button
                    onClick={handleStartProduction}
                    disabled={loading || availableMachines.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    {loading ? "Starting..." : "Start Production"}
                </button>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-5 border-b">
                    <h2 className="text-xl font-semibold">Production Orders</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Active: {activeOrders.length} | Completed: {completedOrders.length} | Produced units: {producedUnits}
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-10 text-gray-500">
                                        No production orders
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm">{order.id}</td>
                                        <td className="px-6 py-4 font-medium">{order.partNumber}</td>
                                        <td className="px-6 py-4">{order.quantity}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                                                {order.status || "ACTIVE"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {order.completedAt ? new Date(order.completedAt).toLocaleString() : "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                                {getMachineName(order.machineId)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.status === "ACTIVE" && (
                                                <button
                                                    onClick={() => handleCompleteProduction(order.id)}
                                                    className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                                >
                                                    <CheckCircle size={16} />
                                                    Complete
                                                </button>
                                            )}
                                            {order.status === "COMPLETED" && (
                                                <span className="text-sm text-gray-500">Produced {order.quantity}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
}