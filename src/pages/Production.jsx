import { useEffect, useState, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { startProduction, getOrders, completeProduction, PRODUCTION_PART_TEMPLATES } from "../api/productionApi";
import { getMachines } from "../api/machineApi";
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Activity, Pause, Settings, Package } from "lucide-react";

export default function Production() {
    const [machineId, setMachineId] = useState("");
    const [partNumber, setPartNumber] = useState("");
    const [customPart, setCustomPart] = useState("");
    const [quantity, setQuantity] = useState("");
    const [machines, setMachines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [simProgress, setSimProgress] = useState({});
    const [circuitBreakerStatus, setCircuitBreakerStatus] = useState(null);

    useEffect(() => {
        loadMachines();
        loadOrders();
        // const interval = setInterval(checkCircuitBreakerStatus, 5000);
        // return () => clearInterval(interval);
    }, []);

    const activeOrders = useMemo(() => orders.filter((order) => order.status === "ACTIVE"), [orders]);
    const completedOrders = useMemo(() => orders.filter((order) => order.status === "COMPLETED"), [orders]);
    const activeMachineIds = useMemo(() => new Set(activeOrders.map((order) => order.machineId)), [activeOrders]);

    useEffect(() => {
        const timer = setInterval(() => {
            setSimProgress(prev => {
                const next = { ...prev };
                let hasUpdate = false;
                activeOrders.forEach(order => {
                    const current = next[order.id] || { value: 0, paused: false };
                    if (!current.paused && current.value < 100) {
                        next[order.id] = { ...current, value: Math.min(100, current.value + 0.5) };
                        hasUpdate = true;
                    }
                });
                return hasUpdate ? next : prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeOrders]);

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

        const finalPartNumber = partNumber === "CUSTOM" ? customPart.trim() : partNumber;
        if (!finalPartNumber) {
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
                partNumber: finalPartNumber,
                quantity: Number(quantity),
            });

            alert(`Success: ${getResponseMessage(res.data, "Production started successfully")}`);
            await Promise.all([loadOrders(), loadMachines()]);
            setSimProgress(prev => ({
                ...prev,
                [res.data.id]: { value: 0, paused: false }
            }));
            setPartNumber("");
            setCustomPart("");
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
            setSimProgress(prev => {
                const next = { ...prev };
                delete next[orderId];
                return next;
            });
            await Promise.all([loadOrders(), loadMachines()]);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to complete production";
            alert(`Completion Failed: ${errorMsg}`);
        }
    };

    const togglePause = (orderId) => {
        setSimProgress(prev => {
            const current = prev[orderId] || { value: 0, paused: false };
            return { ...prev, [orderId]: { ...current, paused: !current.paused } };
        });
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
                        <select
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Part Template</option>
                            {PRODUCTION_PART_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {partNumber === "CUSTOM" && (
                            <input
                                type="text"
                                value={customPart}
                                onChange={(e) => setCustomPart(e.target.value)}
                                placeholder="Enter Custom Serial..."
                                className="mt-2 border p-2 rounded-lg w-full border-blue-300"
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Quantity * (1-1000)</label>
                        <input
                            type="number"
                            min="1"
                            max="1000"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Planned units (1-1000)"
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

            {/* Live Production Monitoring - Simulation Section */}
            {activeOrders.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-700">
                        <Activity className="text-blue-600 animate-pulse" size={24} />
                        Live Production Monitoring
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeOrders.map((order) => {
                            const progress = simProgress[order.id]?.value || 0;
                            const isPaused = simProgress[order.id]?.paused || false;
                            
                            return (
                                <div key={order.id} className={`bg-white rounded-xl shadow-lg border-l-4 ${isPaused ? 'border-amber-400' : 'border-blue-500'} p-5 relative overflow-hidden transition-all hover:shadow-xl`}>
                                    {/* Background Gear Animation */}
                                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                        <Settings 
                                            size={80} 
                                            className={`${!isPaused && progress < 100 ? "animate-spin" : ""}`} 
                                            style={{ animationDuration: '10s', animationPlayState: isPaused ? 'paused' : 'running' }} 
                                        />
                                    </div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{getMachineName(order.machineId)}</h3>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{order.partNumber}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${isPaused ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {isPaused ? 'System Paused' : 'Processing'}
                                        </span>
                                    </div>

                                    {/* Visual Simulation Block */}
                                    <div className="flex items-center justify-center py-6 bg-slate-50 rounded-xl mb-4 border border-dashed border-slate-200">
                                        <div className="relative flex items-center gap-4">
                                            <div className={`p-4 rounded-2xl ${isPaused ? 'bg-slate-200' : 'bg-blue-100'} transition-colors duration-500`}>
                                                <Settings 
                                                    className={`${!isPaused && progress < 100 ? 'animate-spin' : ''} ${isPaused ? 'text-slate-400' : 'text-blue-500'}`} 
                                                    size={40} 
                                                    style={{ animationDuration: '3s', animationPlayState: isPaused ? 'paused' : 'running' }} 
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {[1, 2, 3].map(j => (
                                                    <div 
                                                        key={j} 
                                                        className={`h-1.5 w-1.5 rounded-full ${!isPaused && progress < 100 ? 'bg-blue-400 animate-pulse' : 'bg-slate-300'}`}
                                                        style={{ animationDelay: `${j * 0.1}s` }}
                                                    />
                                                ))}
                                            </div>
                                            <div className={`p-4 rounded-2xl ${progress >= 100 ? 'bg-green-500' : isPaused ? 'bg-slate-400' : 'bg-blue-600'} text-white shadow-lg transition-all duration-500`}>
                                                <Package size={24} className={!isPaused && progress < 100 ? 'animate-bounce' : ''} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-gray-500 uppercase">Batch Integrity</span>
                                            <span className={isPaused ? 'text-amber-600' : 'text-blue-700'}>{Math.floor(progress)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ease-out ${progress >= 100 ? 'bg-green-500' : isPaused ? 'bg-amber-400' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 relative z-10">
                                        <button onClick={() => togglePause(order.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${isPaused ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                            {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                                            {isPaused ? 'RESUME' : 'PAUSE'}
                                        </button>
                                        <button onClick={() => handleCompleteProduction(order.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-shadow shadow-md">
                                            COMPLETE
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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