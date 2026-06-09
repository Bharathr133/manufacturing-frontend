import { useEffect, useState, useMemo, useCallback } from "react";
import MainLayout from "../layouts/MainLayout";
import { startProduction, getOrders, completeProduction, PRODUCTION_PART_TEMPLATES } from "../api/productionApi";
import { getMachines, updateMachine } from "../api/machineApi";
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Activity, Pause, Settings, Package, Gauge, Cog, Square, Clock, Zap } from "lucide-react";

export default function Production() {
    // Cycle Times (Seconds per Part)
    const MACHINE_CYCLE_TIMES = {
        TURNING: 30,
        MILLING: 45,
        PRESS: 20,
        MOLDING: 60
    };

    const MACHINE_STATS = {
        TURNING: { param1: "Spindle", val1: "2500 RPM", param2: "Feed", val2: "300 mm/min" },
        MILLING: { param1: "Spindle", val1: "3500 RPM", param2: "Tool", val2: "Healthy" },
        PRESS: { param1: "Pressure", val1: "120 Bar", param2: "Stroke", val2: "Linear" },
        MOLDING: { param1: "Temp", val1: "240°C", param2: "Mold", val2: "Closed" }
    };

    const [machineId, setMachineId] = useState("");
    const [partNumber, setPartNumber] = useState("");
    const [customPart, setCustomPart] = useState("");
    const [cycleTime, setCycleTime] = useState("30");
    const [customCycleTime, setCustomCycleTime] = useState("");
    const [operator, setOperator] = useState("");
    const [quantity, setQuantity] = useState("");
    const [machines, setMachines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [simProgress, setSimProgress] = useState(() => {
        const saved = localStorage.getItem("manufacturing_sim_v3");
        return saved ? JSON.parse(saved) : {};
    });
    const [circuitBreakerStatus, setCircuitBreakerStatus] = useState(null);

    useEffect(() => {
        loadMachines();
        loadOrders();
        
        const interval = setInterval(() => {
            loadMachines();
            loadOrders();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const activeOrders = useMemo(() => orders.filter((order) => 
        ["RUNNING", "PAUSED", "STOPPED", "ACTIVE", "START"].includes(order.status.toUpperCase())
    ), [orders]);
    
    const completedOrders = useMemo(() => orders.filter((order) => 
        ["COMPLETED"].includes(order.status.toUpperCase())
    ), [orders]);

    const activeMachineIds = useMemo(() => new Set(activeOrders.map((order) => order.machineId)), [activeOrders]);

    // Catch-up logic for navigation/background progression
    useEffect(() => {
        if (machines.length === 0 || orders.length === 0) return;

        const lastTick = localStorage.getItem("manufacturing_last_tick");
        if (lastTick) {
            const secondsPassed = Math.floor((Date.now() - parseInt(lastTick)) / 1000);
            if (secondsPassed > 2) {
                setSimProgress(prev => {
                    const next = { ...prev };
                    let hasChange = false;
                    activeOrders.forEach(order => {
                        const machine = machines.find(m => m.id === parseInt(order.machineId));
                        const stats = next[order.id];
                        const currentStatus = (stats?.status || machine?.status || order.status || "").toUpperCase();
                        
                        if (stats && (currentStatus === 'RUNNING' || currentStatus === 'ACTIVE')) {
                            const cTime = stats.cycleTime || MACHINE_CYCLE_TIMES[machine?.machineType] || 30;
                            const addedRuntime = secondsPassed;
                            const newRuntime = (stats.runtime || 0) + addedRuntime;
                            const newUnits = Math.floor(newRuntime / cTime);
                            
                            next[order.id] = {
                                ...stats,
                                runtime: newRuntime,
                                units: Math.min(order.quantity, newUnits),
                                value: (Math.min(order.quantity, newUnits) / order.quantity) * 100,
                                cycleProgress: ((newRuntime % cTime) / cTime) * 100
                            };
                            hasChange = true;
                        }
                    });
                    return hasChange ? next : prev;
                });
            }
        }
    }, [machines.length, orders.length]);

    useEffect(() => {
        const timer = setInterval(() => {
            localStorage.setItem("manufacturing_last_tick", Date.now().toString());
            setSimProgress(prev => {
                const next = { ...prev };
                let hasUpdate = false;
                activeOrders.forEach(order => {
                    const machine = machines.find(m => m.id === parseInt(order.machineId));
                    const stats = next[order.id];
                    const currentStatus = (stats?.status || machine?.status || order.status || "").toUpperCase();

                    // Simulation ONLY ticks if status is RUNNING or ACTIVE (NOT paused)
                    if (currentStatus !== 'RUNNING' && currentStatus !== 'ACTIVE') return;

                    const cycleTime = MACHINE_CYCLE_TIMES[machine?.machineType] || 30;
                    
                    const current = next[order.id] || { units: 0, seconds: 0, runtime: 0 };
                    if (current.units < order.quantity) {
                        const newRuntime = (current.runtime || 0) + 1;
                        const newUnits = Math.floor(newRuntime / cycleTime);
                        
                        next[order.id] = { 
                            ...current, 
                            runtime: newRuntime,
                            units: Math.min(order.quantity, newUnits),
                            value: (Math.min(order.quantity, newUnits) / order.quantity) * 100,
                            cycleProgress: ((newRuntime % cycleTime) / cycleTime) * 100
                        };
                        hasUpdate = true;
                        
                        if (newUnits >= parseInt(order.quantity)) {
                            handleAutoSyncCompletion(order.id);
                        }
                    }
                });
                return hasUpdate ? next : prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeOrders]);

    useEffect(() => {
        localStorage.setItem("manufacturing_sim_v3", JSON.stringify(simProgress));
    }, [simProgress]);

    const filteredParts = useMemo(() => {
        if (!machineId) return [];
        const selectedMachine = machines.find(m => m.id === parseInt(machineId));
        if (!selectedMachine) return [];
        
        return PRODUCTION_PART_TEMPLATES.filter(t => t.type === selectedMachine.machineType || t.type === "ALL");
    }, [machineId, machines]);

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

    const handleAutoSyncCompletion = async (orderId) => {
        try {
            const order = orders.find(o => o.id === orderId);
            await completeProduction(orderId);
            if (order) {
                const machine = machines.find(m => m.id === order.machineId);
                if (machine) await updateMachine(machine.id, { ...machine, status: "IDLE" });
                // Re-fetch to ensure parent components see the status change
                await loadMachines();
            }
            setSimProgress(prev => ({
                ...prev,
                [orderId]: { ...prev[orderId], status: 'COMPLETED', value: 100, units: order.quantity }
            }));
            loadOrders();
        } catch (e) { console.error("Auto-completion sync failed", e); }
    };

    const getFormattedNow = () => {
        return new Date().toLocaleString('en-US', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
        });
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
        if (!operator.trim()) {
            alert("Validation Error: Operator assignment is required");
            return;
        }
        const finalPartNumber = partNumber === "CUSTOM" ? customPart.trim() : partNumber;
        if (!finalPartNumber) {
            alert("Validation Error: Part number is required");
            return;
        }
        const finalCycleTime = cycleTime === "CUSTOM" ? parseInt(customCycleTime) : parseInt(cycleTime);
        if (isNaN(finalCycleTime) || finalCycleTime < 1 || finalCycleTime > 300) {
            alert("Validation Error: Cycle time must be between 1 and 300 seconds");
            return;
        }

        if (!quantity || Number(quantity) < 1 || Number(quantity) > 1000) {
            alert("Validation Error: Quantity must be between 1 and 1000");
            return;
        }

        setLoading(true);
        const batchNumber = `BT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

        try {
            // 1. Start the Production Order
            const prodRes = await startProduction(machineId, {
                partNumber: finalPartNumber,
                quantity: Number(quantity),
                operator: operator.trim(),
                batchNumber: batchNumber
            });

            // 2. Explicitly update Machine Status to RUNNING
            const selectedMachine = machines.find(m => m.id === parseInt(machineId));
            if (selectedMachine) {
                await updateMachine(machineId, { ...selectedMachine, status: "RUNNING" });
            }

            alert(`Success: ${getResponseMessage(prodRes.data, "Production started successfully")}`);
            await Promise.all([loadOrders(), loadMachines()]);
            setSimProgress(prev => ({ 
                ...prev, 
                [prodRes.data.id]: { 
                    value: 0, 
                    units: 0, 
                    runtime: 0, 
                    batchNumber, 
                    operator: operator.trim(),
                    startTime: getFormattedNow(),
                    cycleTime: finalCycleTime
                } 
            }));
            setPartNumber("");
            setCustomPart("");
            setQuantity("");
            setMachineId("");
            setOperator("");
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.response?.data || "Failed to start production";
            alert(`Production Failed: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteProduction = async (orderId) => {
        try {
            const order = orders.find(o => o.id === orderId);
            const res = await completeProduction(orderId);
            
            // Reset Machine to IDLE
            if (order) {
                const machine = machines.find(m => m.id === order.machineId);
                if (machine) await updateMachine(machine.id, { ...machine, status: "IDLE" });
            }

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

    const MachineAnimation = useCallback(({ type, status: rawStatus }) => {
        const status = rawStatus?.toUpperCase();
        // Machine animates if status is RUNNING or ACTIVE
        const isRunning = status === "RUNNING" || status === "ACTIVE";
        switch (type) {
            case "TURNING":
                return (
                    <div className="relative flex items-center justify-center h-24">
                        <Settings 
                            className={`text-blue-500 ${isRunning ? 'animate-spin' : ''} ${status === 'STOPPED' ? 'opacity-30' : ''}`} 
                            size={64} 
                            style={{ animationDuration: '1s' }}
                        />
                        <div className="absolute w-32 h-2 bg-slate-700 rounded-full opacity-20"></div>
                    </div>
                );
            case "MILLING":
                return (
                    <div className="relative flex items-center justify-center h-24 overflow-hidden">
                        <div className={`p-4 bg-slate-800 rounded-lg ${isRunning ? 'animate-bounce' : ''} ${status === 'STOPPED' ? 'grayscale' : ''}`} style={{ animationDuration: '0.8s' }}>
                            <Zap className="text-amber-400" size={40} />
                        </div>
                    </div>
                );
            case "PRESS":
                return (
                    <div className="relative flex flex-col items-center justify-center h-24">
                        <div className={`w-20 h-8 bg-slate-600 rounded-t-lg transition-all ${isRunning ? 'animate-bounce' : ''} ${status === 'STOPPED' ? 'bg-red-900' : ''}`} style={{ animationDuration: '2s' }}></div>
                        <div className="w-24 h-4 bg-slate-400 rounded-full my-1"></div>
                    </div>
                );
            case "MOLDING":
                return (
                    <div className="flex items-center gap-2 h-24">
                        <div className={`w-10 h-16 bg-slate-700 rounded-l-lg ${isRunning ? 'animate-pulse' : ''}`}></div>
                        <div className={`w-10 h-16 bg-slate-700 rounded-r-lg ${isRunning ? 'animate-pulse' : ''}`}></div>
                    </div>
                );
            default: return <Settings size={40} className={isRunning ? 'animate-spin' : ''} />;
        }
    }, []);

    const getStatusBadge = (status) => {
        const s = status?.toUpperCase() || "IDLE";
        const statusMap = {
            RUNNING: "bg-green-100 text-green-800 border-green-200",
            PAUSED: "bg-orange-100 text-orange-800 border-orange-400",
            STOPPED: "bg-red-100 text-red-800 border-red-200",
            COMPLETED: "bg-blue-100 text-blue-800 border-blue-200",
            IDLE: "bg-gray-100 text-gray-800 border-gray-200",
        };
        return `${statusMap[s] || "bg-gray-100 text-gray-800 border-gray-200"} border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase`;
    };

    const formatDuration = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAction = async (machineId, orderId, action) => {
        const statusMap = { 
            pause: "PAUSED", 
            resume: "RUNNING", 
            stop: "STOPPED",
            start: "RUNNING"
        };
        const newStatus = statusMap[action];
        try {
            const machine = machines.find(m => m.id === parseInt(machineId));
            if (machine) {
                await updateMachine(machineId, { ...machine, status: newStatus });
                // Internal state update for simulation UI
                await Promise.all([loadOrders(), loadMachines()]);
                setSimProgress(prev => ({
                    ...prev,
                    [orderId]: { ...prev[orderId], status: newStatus }
                }));
            }
        } catch (error) {
            alert("Failed to update unit status");
        }
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

                    {machineId && (<div>
                        <label className="block text-sm font-medium mb-1">Part Number *</label>
                        <select
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Part Template</option>
                            {filteredParts.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
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
                    </div>)}

                    <div>
                        <label className="block text-sm font-medium mb-1">Operator *</label>
                        <input
                            type="text"
                            value={operator}
                            onChange={(e) => setOperator(e.target.value)}
                            placeholder="Assigned Operator"
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Cycle Time (Seconds) *</label>
                        <select
                            value={cycleTime}
                            onChange={(e) => setCycleTime(e.target.value)}
                            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="10">10s (Fast)</option>
                            <option value="20">20s</option>
                            <option value="30">30s (Standard)</option>
                            <option value="45">45s</option>
                            <option value="60">60s (Slow)</option>
                            <option value="CUSTOM">Custom Value</option>
                        </select>
                        {cycleTime === "CUSTOM" && (
                            <input
                                type="number"
                                value={customCycleTime}
                                onChange={(e) => setCustomCycleTime(e.target.value)}
                                placeholder="Enter seconds (1-300)"
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
                    disabled={loading || availableMachines.length === 0 || !operator}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    {loading ? "Initializing..." : "Start Production"}
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
                            const stats = simProgress[order.id] || { units: 0, runtime: 0, value: 0 };
                            const machine = machines.find(m => m.id === order.machineId);
                            const cycleTime = MACHINE_CYCLE_TIMES[machine?.machineType] || 30;
                            const remainingUnits = Math.max(0, order.quantity - stats.units);
                            const remainingTimeSec = remainingUnits * cycleTime;
                            const estFinish = new Date(Date.now() + (remainingTimeSec * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const currentStatus = (stats.status || machine?.status || order.status || "IDLE").toUpperCase();
                            const mStats = MACHINE_STATS[machine?.machineType] || { param1: "Load", val1: "Optimal", param2: "State", val2: "Stable" };
                            const utilization = currentStatus === "RUNNING" ? 100 : 0;

                            return (
                                <div key={order.id} className="bg-slate-50 rounded-2xl shadow-xl border-t-8 border-blue-600 p-6 relative overflow-hidden border border-slate-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-xl">{getMachineName(order.machineId)}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-blue-600 font-bold tracking-widest uppercase">Batch: {stats.batchNumber || 'BT-SYNC-01'}</p>
                                                <span className="text-[10px] bg-blue-100 px-2 rounded font-bold text-blue-700">{stats.operator || 'SYSTEM'}</span>
                                            </div>
                                        </div>
                                        <div className={getStatusBadge(currentStatus)}>
                                            {currentStatus}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center py-10 bg-slate-900 rounded-xl mb-6 shadow-inner border-b-4 border-slate-800">
                                        <MachineAnimation type={machine?.machineType} status={currentStatus} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-6">
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                                            <p className="text-[9px] uppercase font-bold text-slate-400">Target</p>
                                            <p className="text-lg font-black text-slate-800">{order.quantity}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                                            <p className="text-[9px] uppercase font-bold text-slate-400">Produced</p>
                                            <p className="text-lg font-black text-blue-600">{stats.units}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                                            <p className="text-[9px] uppercase font-bold text-slate-400">Remaining</p>
                                            <p className="text-lg font-black text-slate-800">{remainingUnits}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                                <span>Production Progress</span>
                                                <span className="text-blue-700">{Math.floor(stats.value)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2 border border-slate-300">
                                                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats.value}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                                <span>Current Part Progress</span>
                                                <span className="text-emerald-600">{Math.floor(stats.cycleProgress || 0)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2 border border-slate-300">
                                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.cycleProgress || 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-6 text-[11px] border-t border-slate-200 pt-4 bg-white/50 p-2 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock size={14} className="text-slate-400" />
                                            <span>Runtime: <b>{formatDuration(stats.runtime || 0)}</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Activity size={14} className="text-slate-400" />
                                            <span>Utilization: <b className="text-emerald-600">{utilization}%</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Settings size={14} className="text-blue-400" />
                                            <span>{mStats.param1}: <b>{mStats.val1}</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Zap size={14} className="text-amber-400" />
                                            <span>{mStats.param2}: <b>{mStats.val2}</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Gauge size={14} className="text-slate-400" />
                                            <span>Cycle: <b>{cycleTime}s</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <RefreshCw size={14} className="text-slate-400" />
                                            <span>Remain: <b>{formatDuration(remainingTimeSec)}</b></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <CheckCircle size={14} className="text-slate-400" />
                                            <span>Finish: <b>{estFinish}</b></span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 relative z-10">
                                        {currentStatus === 'RUNNING' || currentStatus === 'ACTIVE' ? (
                                            <button onClick={() => handleAction(order.machineId, order.id, 'pause')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all">
                                                <Pause size={16} /> PAUSE SYSTEM
                                            </button>
                                        ) : currentStatus === 'PAUSED' ? (
                                            <button onClick={() => handleAction(order.machineId, order.id, 'resume')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all">
                                                <Play size={16} /> RESUME UPLINK
                                            </button>
                                        ) : null}
                                        
                                        {['RUNNING', 'PAUSED', 'ACTIVE'].includes(currentStatus) && (
                                            <button onClick={() => handleAction(order.machineId, order.id, 'stop')} className="flex-1 bg-slate-800 hover:bg-black text-white py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all">
                                                <Square size={16} /> EMERGENCY STOP
                                            </button>
                                        )}
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced / Target</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Runtime</th>
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
                                orders.map((order) => {
                                    const machine = machines.find(m => m.id === order.machineId);
                                    const currentStatus = (simProgress[order.id]?.status || machine?.status || order.status || "IDLE").toUpperCase();

                                    return (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm">{order.id}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{getMachineName(order.machineId)}</td>
                                        <td className="px-6 py-4 font-medium">{order.partNumber}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-blue-600">{simProgress[order.id]?.units || (order.status === 'COMPLETED' ? order.quantity : 0)}</span> / {order.quantity}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusBadge(currentStatus)}`}>
                                                {currentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{simProgress[order.id]?.operator || order.operator || 'SYSTEM'}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-500">{simProgress[order.id]?.startTime || (order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : '-')}</td>
                                        <td className="px-6 py-4 text-sm font-mono">{formatDuration(simProgress[order.id]?.runtime || 0)}</td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
}