import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { startProduction, getOrders, completeProduction, PRODUCTION_PART_TEMPLATES, } from "../api/productionApi";
import { getMachines, updateMachine } from "../api/machineApi";
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Activity, Pause, Settings, Package, Gauge, Cog, Square, Clock, Zap, ChevronLeft, ChevronRight, ExternalLink, } from "lucide-react";

export default function Production() {
    const navigate = useNavigate();
    const MACHINE_CYCLE_TIMES = {
        TURNING: 15,
        MILLING: 25,
        PRESS: 20,
        MOLDING: 45
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
    const [filterMachineId, setFilterMachineId] = useState("ALL");
    const [simProgress, setSimProgress] = useState(() => {
        try {
            const saved = localStorage.getItem("manufacturing_sim_v3");
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [circuitBreakerStatus, setCircuitBreakerStatus] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const ordersPerPage = 4;

    const sortedOrders = useMemo(() => {
        let list = [...orders];
        if (filterMachineId !== "ALL") {
            list = list.filter(o => o.machineId === parseInt(filterMachineId));
        }
        return list.sort((a, b) => {
            if (a.machineId !== b.machineId) return a.machineId - b.machineId;
            return b.id - a.id;
        });
    }, [orders, filterMachineId]);

    const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);
    const paginatedOrders = sortedOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

    useEffect(() => {
        loadMachines();
        loadOrders();
        const interval = setInterval(() => {
            loadMachines();
            loadOrders();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const ordersToSimulate = useMemo(() => orders.filter((order) =>
        order.status.toUpperCase() !== "COMPLETED"
    ), [orders]);

    const activeOrders = useMemo(() => ordersToSimulate.filter((order) =>
        simProgress[order.id]?.status !== "COMPLETED" &&
        (filterMachineId === "ALL" || order.machineId === parseInt(filterMachineId))
    ), [ordersToSimulate, simProgress, filterMachineId]);

    const completedOrders = useMemo(() => orders.filter((order) =>
        ["COMPLETED"].includes(order.status.toUpperCase())
    ), [orders]);

    const activeMachineIds = useMemo(
        () => new Set(
            activeOrders
                .filter(order => {
                    const stats = simProgress[order.id];
                    const produced = stats?.units || 0;
                    return produced < order.quantity;
                })
                .map(order => order.machineId)
        ),
        [activeOrders, simProgress]
    );

    const autoSyncRef = useRef(null);

    const catchUp = useCallback(() => {
        const lastTick = localStorage.getItem("manufacturing_last_tick");
        if (!lastTick) return;
        const secondsPassed = Math.floor((Date.now() - parseInt(lastTick)) / 1000);
        if (secondsPassed < 3) return;

        setSimProgress(prev => {
            const next = { ...prev };
            let hasChange = false;
            const runningOrders = orders.filter(o => {
                if (o.status.toUpperCase() === "COMPLETED") return false;
                const s = prev[o.id];
                const st = (s?.status || o.status || "").toUpperCase();
                return st === "RUNNING" || st === "ACTIVE";
            });
            runningOrders.forEach(order => {
                const machine = machines.find(m => m.id === parseInt(order.machineId));
                const stats = next[order.id];
                if (!stats) return;
                // Use saved cycleTime from simProgress only, never from backend
                const cTime = Number(stats.cycleTime || MACHINE_CYCLE_TIMES[machine?.machineType] || 30) || 30;
                const newRuntime = (stats.runtime || 0) + secondsPassed;
                const newUnits = Math.floor(newRuntime / cTime);
                next[order.id] = {
                    ...stats,
                    cycleTime: cTime,
                    runtime: newRuntime,
                    units: Math.min(order.quantity, newUnits),
                    value: (Math.min(order.quantity, newUnits) / order.quantity) * 100,
                    cycleProgress: ((newRuntime % cTime) / cTime) * 100
                };
                hasChange = true;
                if (newUnits >= parseInt(order.quantity)) {
                    setTimeout(() => autoSyncRef.current(order.id), 0);
                }
            });
            return hasChange ? next : prev;
        });
    }, [orders, machines]);

    useEffect(() => {
        catchUp();
        const onVisible = () => { if (document.visibilityState === "visible") catchUp(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [catchUp]);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            localStorage.setItem("manufacturing_last_tick", now.toString());
            setSimProgress(prev => {
                const next = { ...prev };
                let hasUpdate = false;
                activeOrders.forEach(order => {
                    const machine = machines.find(m => m.id === parseInt(order.machineId));
                    const stats = next[order.id];
                    const currentStatus = (stats?.status || machine?.status || order.status || "").toUpperCase();
                    if (currentStatus !== 'RUNNING' && currentStatus !== 'ACTIVE') return;

                    // Only use cycleTime from simProgress (saved when user created the order)
                    // Never use order.cycleTime from backend
                    const cTime = Number(stats?.cycleTime || MACHINE_CYCLE_TIMES[machine?.machineType] || 30) || 30;
                    const current = next[order.id] || {
                        units: 0, runtime: 0, cycleTime: cTime,
                        operator: order.operator || 'SYSTEM',
                        batchNumber: order.batchNumber || 'BT-PENDING'
                    };

                    if (current.units < order.quantity) {
                        const newRuntime = (current.runtime || 0) + 1;
                        const newUnits = Math.floor(newRuntime / cTime);
                        next[order.id] = {
                            ...current,
                            cycleTime: cTime,
                            runtime: newRuntime,
                            units: Math.min(order.quantity, newUnits),
                            value: (Math.min(order.quantity, newUnits) / order.quantity) * 100,
                            cycleProgress: ((newRuntime % cTime) / cTime) * 100
                        };
                        hasUpdate = true;
                        if (newUnits >= parseInt(order.quantity)) {
                            setTimeout(() => autoSyncRef.current(order.id), 0);
                        }
                    }
                });
                return hasUpdate ? next : prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeOrders, machines]);

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
            console.warn("Machine Service Error:", errorMsg);
        }
    };

    const loadOrders = async () => {
        try {
            const res = await getOrders();
            setOrders(res.data);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to load orders";
            console.warn("Production Service Error:", errorMsg);
        }
    };

    const handleAutoSyncCompletion = async (orderId) => {
        try {
            const order = orders.find(o => o.id === orderId);
            await completeProduction(orderId);
            if (order) {
                const machine = machines.find(m => m.id === order.machineId);
                if (machine) await updateMachine(machine.id, { ...machine, status: "IDLE" });
                await loadMachines();
            }
            setSimProgress(prev => ({
                ...prev,
                [orderId]: { ...prev[orderId], status: 'COMPLETED', value: 100, units: order.quantity }
            }));
            loadOrders();
        } catch (e) { console.error("Auto-completion sync failed", e); }
    };
    autoSyncRef.current = handleAutoSyncCompletion;

    const getFormattedNow = () => {
        return new Date().toLocaleString('en-US', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
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
        console.log("Selected Cycle Time:", finalCycleTime);
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
            const prodRes = await startProduction(machineId, {
                partNumber: finalPartNumber,
                quantity: Number(quantity),
                operator: operator.trim(),
                batchNumber: batchNumber,
                cycleTime: finalCycleTime
            });

            const selectedMachine = machines.find(m => m.id === parseInt(machineId));
            if (selectedMachine) {
                await updateMachine(machineId, { ...selectedMachine, status: "RUNNING" });
            }

            alert(`Success: ${getResponseMessage(prodRes.data, "Production started successfully")}`);

            const newOrderId = prodRes?.data?.id || prodRes?.data?.orderId;
            if (!newOrderId) {
                console.warn("Backend did not return an order ID in:", prodRes.data);
            }

            await Promise.all([loadOrders(), loadMachines()]);

            // Save simProgress with cycleTime AFTER loadOrders so it doesn't get overwritten
            if (newOrderId) {
                setSimProgress(prev => {
                    const updated = {
                        ...prev,
                        [newOrderId]: {
                            runtime: 0,
                            units: 0,
                            value: 0,
                            cycleProgress: 0,
                            batchNumber,
                            operator: operator.trim(),
                            startTime: getFormattedNow(),
                            cycleTime: finalCycleTime,
                            status: "RUNNING"
                        }
                    };
                    // Immediately persist so localStorage has it
                    localStorage.setItem("manufacturing_sim_v3", JSON.stringify(updated));
                    return updated;
                });
            }

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

    /* =========== MachineAnimation: Realistic Industrial SVG Machines =========== */
    const MachineAnimation = useCallback(({ type, status: rawStatus }) => {
        const status = rawStatus?.toUpperCase();
        const isRunning = status === "RUNNING" || status === "ACTIVE";
        const stopped = status === "STOPPED" || status === "IDLE";
        const opacity = stopped ? "0.4" : "1";
        const animStyle = `
            @keyframes spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes spin-ccw { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
            @keyframes press-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(12px); } }
            @keyframes mold-clamp { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
            @keyframes shuttle { 0% { transform: translateX(-6px); opacity: 0.3; } 50% { transform: translateX(6px); opacity: 1; } 100% { transform: translateX(-6px); opacity: 0.3; } }
            @keyframes cut-spark { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes die-drop { 0% { transform: translateY(-4px); opacity: 0; } 40% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
            @keyframes conveyor-move { 0% { transform: translateX(0); } 100% { transform: translateX(-16px); } }
        `;
        switch (type) {
            case "TURNING":
                return (<div className="relative flex items-center justify-center h-24 w-full" style={{ opacity }}>
                    <style>{animStyle}</style>
                    <svg viewBox="0 0 160 90" className="w-full h-full max-w-[160px]" fill="none">
                        <rect x="10" y="60" width="140" height="8" rx="2" fill="#334155" />
                        <rect x="12" y="30" width="28" height="30" rx="3" fill="#475569" />
                        <rect x="16" y="28" width="20" height="4" rx="1" fill="#1e293b" />
                        <circle cx="40" cy="48" r="12" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
                        <circle cx="40" cy="48" r="6" fill="#64748b" />
                        <circle cx="40" cy="48" r="3" fill={isRunning ? "#3b82f6" : "#475569"} style={isRunning ? { animation: "spin-cw 0.6s linear infinite", transformOrigin: "40px 48px" } : {}} />
                        <rect x="52" y="42" width="36" height="12" rx="1" fill={isRunning ? "#a3e635" : "#cbd5e1"} />
                        <rect x="88" y="38" width="10" height="6" rx="1" fill="#f59e0b" />
                        <polygon points="98,38 104,41 98,44" fill="#f59e0b" />
                        <rect x="120" y="38" width="24" height="22" rx="2" fill="#475569" />
                        <rect x="116" y="44" width="8" height="10" rx="1" fill="#64748b" />
                        {isRunning && (<><circle cx="94" cy="36" r="1.5" fill="#facc15" style={{ animation: "cut-spark 0.3s ease infinite" }} /><circle cx="96" cy="40" r="1" fill="#f97316" style={{ animation: "cut-spark 0.25s ease infinite 0.1s" }} /><circle cx="92" cy="34" r="1" fill="#fef08a" style={{ animation: "cut-spark 0.35s ease infinite 0.2s" }} /></>)}
                        <rect x="10" y="68" width="100" height="3" rx="1" fill="#1e293b" />
                        {isRunning && <rect x="10" y="68" width="16" height="3" rx="1" fill="#94a3b8" style={{ animation: "conveyor-move 0.8s linear infinite" }} />}
                    </svg>
                </div>);
            case "MILLING":
                return (<div className="relative flex items-center justify-center h-24 w-full" style={{ opacity }}>
                    <style>{animStyle}</style>
                    <svg viewBox="0 0 160 90" className="w-full h-full max-w-[160px]" fill="none">
                        <rect x="50" y="10" width="18" height="50" rx="2" fill="#475569" />
                        <rect x="42" y="6" width="34" height="14" rx="3" fill="#334155" />
                        <rect x="55" y="20" width="8" height="20" rx="1" fill="#64748b" />
                        <rect x="56" y="40" width="6" height="10" rx="1" fill="#94a3b8" />
                        <rect x="55" y="50" width="8" height="6" rx="1" fill={isRunning ? "#a3e635" : "#94a3b8"} style={isRunning ? { animation: "spin-cw 0.4s linear infinite", transformOrigin: "59px 53px" } : {}} />
                        <rect x="20" y="58" width="100" height="8" rx="2" fill="#334155" />
                        <rect x="50" y="50" width="18" height="8" rx="1" fill={isRunning ? "#a3e635" : "#cbd5e1"} />
                        {isRunning && (<><circle cx="59" cy="36" r="1" fill="#60a5fa" style={{ animation: "die-drop 0.6s ease infinite" }} /><circle cx="61" cy="39" r="0.8" fill="#60a5fa" style={{ animation: "die-drop 0.5s ease infinite 0.2s" }} /></>)}
                        {isRunning && <line x1="20" y1="62" x2="28" y2="62" stroke="#facc15" strokeWidth="1" opacity="0.6" style={{ animation: "shuttle 0.3s ease infinite" }} />}
                    </svg>
                </div>);
            case "PRESS":
                return (<div className="relative flex items-center justify-center h-24 w-full" style={{ opacity }}>
                    <style>{animStyle}</style>
                    <svg viewBox="0 0 160 90" className="w-full h-full max-w-[160px]" fill="none">
                        <rect x="30" y="8" width="8" height="72" rx="2" fill="#334155" />
                        <rect x="122" y="8" width="8" height="72" rx="2" fill="#334155" />
                        <rect x="28" y="6" width="104" height="10" rx="3" fill="#1e293b" />
                        <rect x="70" y="16" width="20" height="16" rx="3" fill="#475569" />
                        <rect x="76" y="16" width="8" height="48" rx="2" fill="#64748b" style={isRunning ? { animation: "press-down 1.2s ease-in-out infinite", transformOrigin: "80px 16px" } : {}} />
                        <rect x="50" y="60" width="60" height="8" rx="2" fill="#475569" style={isRunning ? { animation: "press-down 1.2s ease-in-out infinite", transformOrigin: "80px 60px" } : {}} />
                        <rect x="62" y="70" width="36" height="6" rx="2" fill={isRunning ? "#a3e635" : "#cbd5e1"} />
                        <rect x="28" y="76" width="104" height="6" rx="2" fill="#1e293b" />
                        <circle cx="140" cy="20" r="8" fill="#1e293b" /><circle cx="140" cy="20" r="5" fill="#475569" />
                        <line x1="140" y1="20" x2="144" y2="17" stroke={isRunning ? "#ef4444" : "#64748b"} strokeWidth="1.5" style={isRunning ? { animation: "spin-cw 1.5s linear infinite", transformOrigin: "140px 20px" } : {}} />
                    </svg>
                </div>);
            case "MOLDING":
                return (<div className="relative flex items-center justify-center h-24 w-full" style={{ opacity }}>
                    <style>{animStyle}</style>
                    <svg viewBox="0 0 160 90" className="w-full h-full max-w-[160px]" fill="none">
                        <rect x="8" y="72" width="144" height="8" rx="2" fill="#1e293b" />
                        <rect x="30" y="30" width="20" height="42" rx="2" fill="#475569" />
                        <rect x="34" y="34" width="6" height="16" rx="1" fill="#1e293b" /><rect x="42" y="34" width="6" height="16" rx="1" fill="#1e293b" />
                        <rect x="52" y="30" width="20" height="42" rx="2" fill="#475569" style={isRunning ? { animation: "mold-clamp 1.6s ease-in-out infinite", transformOrigin: "62px 30px" } : {}} />
                        <rect x="56" y="34" width="6" height="16" rx="1" fill="#1e293b" /><rect x="62" y="34" width="6" height="16" rx="1" fill="#1e293b" />
                        <rect x="50" y="38" width="2" height="8" fill={isRunning ? "#facc15" : "#64748b"} />
                        <rect x="80" y="40" width="50" height="10" rx="3" fill="#334155" />
                        <polygon points="100,18 92,40 108,40" fill="#475569" /><rect x="94" y="14" width="12" height="6" rx="1" fill="#334155" />
                        <rect x="82" y="42" width="46" height="6" rx="2" fill="#64748b" style={isRunning ? { animation: "shuttle 0.8s ease infinite", transformOrigin: "105px 45px" } : {}} />
                        {isRunning && <rect x="42" y="52" width="8" height="6" rx="1" fill="#a3e635" style={{ animation: "die-drop 1.6s ease infinite" }} />}
                        <rect x="88" y="38" width="6" height="14" rx="1" fill={isRunning ? "#ef4444" : "#475569"} />
                        <rect x="100" y="38" width="6" height="14" rx="1" fill={isRunning ? "#ef4444" : "#475569"} />
                        <rect x="112" y="38" width="6" height="14" rx="1" fill={isRunning ? "#ef4444" : "#475569"} />
                    </svg>
                </div>);
            default:
                return (<div className="relative flex items-center justify-center h-24 w-full" style={{ opacity }}>
                    <svg viewBox="0 0 80 60" className="h-full" fill="none">
                        <rect x="10" y="8" width="60" height="44" rx="4" fill="#475569" />
                        <circle cx="40" cy="30" r="10" fill="#334155" /><circle cx="40" cy="30" r="5" fill="#64748b" />
                        <circle cx="40" cy="30" r="2" fill={isRunning ? "#3b82f6" : "#94a3b8"} style={isRunning ? { animation: "spin-cw 0.6s linear infinite", transformOrigin: "40px 30px" } : {}} />
                    </svg>
                </div>);
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
        const statusMap = { pause: "PAUSED", resume: "RUNNING", stop: "STOPPED", start: "RUNNING" };
        const newStatus = statusMap[action];
        try {
            const machine = machines.find(m => m.id === parseInt(machineId));
            if (machine) {
                await updateMachine(machineId, { ...machine, status: newStatus });
                await Promise.all([loadOrders(), loadMachines()]);
                setSimProgress(prev => ({ ...prev, [orderId]: { ...prev[orderId], status: newStatus } }));
            }
        } catch (error) { alert("Failed to update unit status"); }
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Production Control</h1>
                <p className="text-gray-500">Run one active order per machine and track completed output</p>
            </div>

            {circuitBreakerStatus && (
                <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                            <div>
                                <p className="font-semibold text-yellow-800">Circuit Breaker: {circuitBreakerStatus.state}</p>
                                <p className="text-sm text-yellow-700">{circuitBreakerStatus.message}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

            <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Start Production Order</h2>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">IDLE machines are ready. Starting production automatically changes the machine to RUNNING.</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Machine *</label>
                        <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500">
                            <option value="">Choose available machine</option>
                            {availableMachines.map((machine) => (
                                <option key={machine.id} value={machine.id}>{machine.machineName}{machine.status === "IDLE" ? " (ready)" : " (running)"}</option>
                            ))}
                        </select>
                        {availableMachines.length === 0 && <p className="text-xs text-gray-500 mt-1">No ready machines are free right now.</p>}
                    </div>
                    {machineId && (<div>
                        <label className="block text-sm font-medium mb-1">Part Number *</label>
                        <select value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Part Template</option>
                            {filteredParts.map(t => (<option key={t.id} value={t.name}>{t.name}</option>))}
                        </select>
                        {partNumber === "CUSTOM" && (<input type="text" value={customPart} onChange={(e) => setCustomPart(e.target.value)} placeholder="Enter Custom Serial..." className="mt-2 border p-2 rounded-lg w-full border-blue-300" />)}
                    </div>)}
                    <div>
                        <label className="block text-sm font-medium mb-1">Operator *</label>
                        <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Assigned Operator" className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Cycle Time (Seconds) *</label>
                        <select value={cycleTime} onChange={(e) => setCycleTime(e.target.value)} className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500">
                            <option value="10">10s (Fast)</option>
                            <option value="20">20s</option>
                            <option value="30">30s (Standard)</option>
                            <option value="45">45s</option>
                            <option value="60">60s (Slow)</option>
                            <option value="CUSTOM">Custom Value</option>
                        </select>
                        {cycleTime === "CUSTOM" && (<input type="number" value={customCycleTime} onChange={(e) => setCustomCycleTime(e.target.value)} placeholder="Enter seconds (1-300)" className="mt-2 border p-2 rounded-lg w-full border-blue-300" />)}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Quantity * (1-1000)</label>
                        <input type="number" min="1" max="1000" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Planned units (1-1000)" className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                <button onClick={handleStartProduction} disabled={loading || availableMachines.length === 0 || !operator || !partNumber || !quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 1 || parseInt(quantity) > 1000} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    {loading ? "Initializing..." : "Start Production"}
                </button>
            </div>

            {activeOrders.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-700">
                        <Activity className="text-blue-600 animate-pulse" size={24} /> Live Production Monitoring
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeOrders.map((order) => {
                            const stats = simProgress[order.id] || { units: 0, runtime: 0, value: 0, operator: order.operator || 'SYSTEM', batchNumber: order.batchNumber || 'BT-AUTO', cycleTime: 30 };
                            const machine = machines.find(m => m.id === order.machineId);
                            // CRITICAL: Only use cycleTime from simProgress (saved by user when creating order)
                            // Never fall back to order.cycleTime from backend (it may be wrong/missing)
                            const displayCycleTime = Number(stats?.cycleTime || MACHINE_CYCLE_TIMES[machine?.machineType] || 30) || 30;
                            const remainingUnits = Math.max(0, order.quantity - stats.units);
                            const remainingTimeSec = remainingUnits * displayCycleTime;
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
                                                <p className="text-xs text-blue-600 font-bold tracking-widest uppercase">Batch: {stats.batchNumber || order.batchNumber || 'BT-AUTO'}</p>
                                                <span className="text-[10px] bg-blue-100 px-2 rounded font-bold text-blue-700">{stats.operator || order.operator || 'SYSTEM'}</span>
                                            </div>
                                        </div>
                                        <div className={getStatusBadge(currentStatus)}>{currentStatus}</div>
                                    </div>
                                    <div className="flex items-center justify-center py-10 bg-slate-900 rounded-xl mb-6 shadow-inner border-b-4 border-slate-800">
                                        <MachineAnimation type={machine?.machineType} status={currentStatus} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-6">
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><p className="text-[9px] uppercase font-bold text-slate-400">Target</p><p className="text-lg font-black text-slate-800">{order.quantity}</p></div>
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><p className="text-[9px] uppercase font-bold text-slate-400">Produced</p><p className="text-lg font-black text-blue-600">{stats.units}</p></div>
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><p className="text-[9px] uppercase font-bold text-slate-400">Remaining</p><p className="text-lg font-black text-slate-800">{remainingUnits}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500"><span>Production Progress</span><span className="text-blue-700">{Math.floor(stats.value)}%</span></div>
                                            <div className="w-full bg-slate-200 rounded-full h-2 border border-slate-300"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats.value}%` }}></div></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500"><span>Current Part Progress</span><span className="text-emerald-600">{Math.floor(stats.cycleProgress || 0)}%</span></div>
                                            <div className="w-full bg-slate-200 rounded-full h-2 border border-slate-300"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.cycleProgress || 0}%` }}></div></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 mb-6 text-[11px] border-t border-slate-200 pt-4 bg-white/50 p-2 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-600"><Clock size={14} className="text-slate-400" /><span>Runtime: <b>{formatDuration(stats.runtime || 0)}</b></span></div>
                                        <div className="flex items-center gap-2 text-slate-600"><Activity size={14} className="text-slate-400" /><span>Utilization: <b className="text-emerald-600">{utilization}%</b></span></div>
                                        <div className="flex items-center gap-2 text-slate-600"><Settings size={14} className="text-blue-400" /><span>{mStats.param1}: <b>{mStats.val1}</b></span></div>
                                        <div className="flex items-center gap-2 text-slate-600"><Zap size={14} className="text-amber-400" /><span>{mStats.param2}: <b>{mStats.val2}</b></span></div>
                                        <div className="flex items-center gap-2 text-slate-600"><Gauge size={14} className="text-slate-400" /><span>Cycle: <b>{displayCycleTime}s</b></span></div>
                                        <div className="flex items-center gap-2 text-slate-600"><RefreshCw size={14} className="text-slate-400" /><span>Remain: <b>{formatDuration(remainingTimeSec)}</b></span></div>
                                        <div className="flex items-center gap-2 text-slate-600"><CheckCircle size={14} className="text-slate-400" /><span>Finish: <b>{estFinish}</b></span></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 relative z-10">
                                        {currentStatus === 'RUNNING' || currentStatus === 'ACTIVE' ? (
                                            <button onClick={() => handleAction(order.machineId, order.id, 'pause')} className="bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all"><Pause size={16} /> PAUSE</button>
                                        ) : currentStatus === 'PAUSED' ? (
                                            <button onClick={() => handleAction(order.machineId, order.id, 'resume')} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all"><Play size={16} /> RESUME UPLINK</button>
                                        ) : null}
                                        {['RUNNING', 'PAUSED', 'ACTIVE'].includes(currentStatus) && (
                                            <button onClick={() => handleAction(order.machineId, order.id, 'stop')} className="bg-slate-800 hover:bg-black text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all"><Square size={16} /> STOP</button>
                                        )}
                                        <button onClick={() => navigate(`/machines?search=${encodeURIComponent(getMachineName(order.machineId))}`)} className="col-span-2 mt-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><ExternalLink size={12} /> View Machine Profile & Stats</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">Production Orders</h2>
                        <p className="text-sm text-gray-500 mt-1">Active: {activeOrders.length} | Completed: {completedOrders.length} | Produced units: {producedUnits}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Filter by Machine:</span>
                        <select value={filterMachineId} onChange={(e) => { setFilterMachineId(e.target.value); setCurrentPage(1); }} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all cursor-pointer">
                            <option value="ALL">ALL UNITS</option>
                            {machines.map(m => <option key={m.id} value={m.id}>{m.machineName}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced / Target</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Runtime</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedOrders.length === 0 ? (
                                <tr><td colSpan="8" className="text-center py-10 text-gray-500">{orders.length === 0 ? "No production orders" : "No orders on this page"}</td></tr>
                            ) : (
                                paginatedOrders.map((order) => {
                                    const stats = simProgress[order.id] || { units: 0, runtime: 0, value: 0, operator: order.operator, batchNumber: order.batchNumber, cycleTime: 30 };
                                    const machine = machines.find(m => m.id === order.machineId);
                                    const produced = stats.units || (order.status === "COMPLETED" ? order.quantity : 0);
                                    const currentStatus = produced >= order.quantity ? "COMPLETED" : (stats.status || machine?.status || order.status || "IDLE").toUpperCase();
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 text-sm">{order.id}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-700">{getMachineName(order.machineId)}</td>
                                            <td className="px-6 py-4 font-medium">{order.partNumber}</td>
                                            <td className="px-6 py-4"><span className="font-bold text-blue-600">{stats.units || (order.status === 'COMPLETED' ? order.quantity : 0)}</span> / {order.quantity}</td>
                                            <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusBadge(currentStatus)}`}>{currentStatus}</span></td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-600">{stats.operator || order.operator || 'SYSTEM'}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-500">{stats.startTime || (order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : '-')}</td>
                                            <td className="px-6 py-4 text-sm font-mono">{formatDuration(stats.runtime || 0)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50/50">
                        <div className="text-sm text-gray-500 font-medium">Showing <span className="text-slate-900">{(currentPage - 1) * ordersPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * ordersPerPage, sortedOrders.length)}</span> of <span className="text-slate-900">{sortedOrders.length}</span> orders</div>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronLeft size={18} /></button>
                            <div className="flex items-center px-4 py-2 text-sm font-bold bg-white border rounded-lg shadow-sm">Page {currentPage} of {totalPages}</div>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}