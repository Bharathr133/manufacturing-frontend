// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import MainLayout from "../layouts/MainLayout";
// import { useAuth, ROLES } from "../context/AuthContext";
// import { getMachineCount, getRunningCount } from "../api/machineApi";
// import { getOrderCount } from "../api/productionApi";
// import { getQualityStats, getAllQualityChecks } from "../api/qualityApi";
// import { Activity, Cpu, Package, TrendingUp, CheckCircle, XCircle, AlertTriangle, BarChart3, Download } from "lucide-react";

// // Cache for 30 seconds
// let cachedStats = null;
// let lastFetchTime = 0;
// const CACHE_DURATION = 30000; // 30 seconds

// export default function Dashboard() {
//     const navigate = useNavigate();
//     const { user } = useAuth();
//     const [stats, setStats] = useState({
//         machineCount: 0,
//         runningCount: 0,
//         orderCount: 0,
//         totalChecks: 0,
//         passedChecks: 0,
//         reworkChecks: 0,
//         failedChecks: 0,
//         defectRate: 0,
//         recentChecks: [],
//     });
//     const [loading, setLoading] = useState(true);
//     const [showReports, setShowReports] = useState(false);
//     const [reportPeriod, setReportPeriod] = useState("week");

//     useEffect(() => {
//         // Simple Role-Based Access Control for the page
//         if (!user) {
//             navigate("/login");
//             return;
//         }
//         loadStats();
//     }, []);

//     const loadStats = async () => {
//         setLoading(true);
//         try {
//             // Get machine stats
//             const machinesCount = await getMachineCount();
//             const runningCount = await getRunningCount();
//             const orders = await getOrderCount();

//             // Get quality stats - NOW RETURNS DATA DIRECTLY
//             const qualityStats = await getQualityStats();
//             const qualityChecks = await getAllQualityChecks();

//             const recentChecks = qualityChecks?.slice(-3) || [];

//             setStats({
//                 machineCount: machinesCount.data,
//                 runningCount: runningCount.data,
//                 orderCount: orders.data,
//                 totalChecks: qualityStats?.totalChecks || 0,
//                 passedChecks: qualityStats?.passed || 0,
//                 reworkChecks: qualityStats?.rework || 0,
//                 failedChecks: qualityStats?.failed || 0,
//                 defectRate: qualityStats?.defectRate || 0,
//                 recentChecks: recentChecks,
//             });
//         } catch (error) {
//             console.error("Failed to load stats", error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const showToast = (message) => {
//         const toast = document.createElement('div');
//         toast.className = 'fixed bottom-6 right-6 bg-gray-800 text-white px-5 py-3 rounded-lg shadow-lg z-50';
//         toast.innerText = message;
//         document.body.appendChild(toast);
//         setTimeout(() => toast.remove(), 3000);
//     };

//     const downloadReport = () => {
//         const reportData = {
//             generatedAt: new Date().toISOString(),
//             period: reportPeriod,
//             stats: {
//                 totalMachines: stats.machineCount,
//                 runningMachines: stats.runningCount,
//                 totalOrders: stats.orderCount,
//                 quality: {
//                     totalChecks: stats.totalChecks,
//                     passed: stats.passedChecks,
//                     rework: stats.reworkChecks,
//                     failed: stats.failedChecks,
//                     defectRate: `${stats.defectRate.toFixed(1)}%`
//                 }
//             },
//             recentQualityChecks: stats.recentChecks
//         };

//         const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `manufacturing-report-${new Date().toISOString().split('T')[0]}.json`;
//         a.click();
//         URL.revokeObjectURL(url);
//         showToast("Report downloaded successfully!");
//     };

//     const getQualityStatusIcon = () => {
//         if (stats.defectRate < 5) return <CheckCircle className="text-green-500" size={24} />;
//         if (stats.defectRate < 15) return <AlertTriangle className="text-yellow-500" size={24} />;
//         return <XCircle className="text-red-500" size={24} />;
//     };

//     const cards = [
//         {
//             title: "Total Machines",
//             value: stats.machineCount,
//             icon: Cpu,
//             gradient: "from-blue-500 to-blue-700",
//             subtitle: "Registered equipment",
//             link: "/machines",
//             roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR]
//         },
//         {
//             title: "Running Machines",
//             value: stats.runningCount,
//             icon: Activity,
//             gradient: "from-green-500 to-green-700",
//             subtitle: `${((stats.runningCount / stats.machineCount) * 100 || 0).toFixed(0)}% of total`,
//             link: "/machines",
//             roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR]
//         },
//         {
//             title: "Production Orders",
//             value: stats.orderCount,
//             icon: Package,
//             gradient: "from-purple-500 to-purple-700",
//             subtitle: "Total orders created",
//             link: "/production",
//             roles: [ROLES.ADMIN, ROLES.MANAGER]
//         },
//         {
//             title: "Quality Checks",
//             value: stats.totalChecks,
//             icon: TrendingUp,
//             gradient: "from-indigo-500 to-indigo-700",
//             subtitle: `${stats.passedChecks} passed, ${stats.failedChecks} failed`,
//             link: "/quality",
//             roles: [ROLES.ADMIN, ROLES.MANAGER]
//         },
//     ].filter(card => card.roles.includes(user?.role));

//     const qualityCards = [
//         {
//             title: "Defect Rate",
//             value: `${stats.defectRate.toFixed(1)}%`,
//             gradient: stats.defectRate < 5 ? "from-green-500 to-green-700" : stats.defectRate < 15 ? "from-yellow-500 to-yellow-700" : "from-red-500 to-red-700",
//             subtitle: stats.defectRate < 5 ? "Excellent quality" : stats.defectRate < 15 ? "Needs improvement" : "Critical attention needed",
//             roles: [ROLES.ADMIN, ROLES.MANAGER]
//         },
//         {
//             title: "Passed",
//             value: stats.passedChecks,
//             gradient: "from-green-500 to-green-700",
//             subtitle: `${((stats.passedChecks / stats.totalChecks) * 100 || 0).toFixed(0)}% of checks`,
//             roles: [ROLES.ADMIN, ROLES.MANAGER]
//         },
//         {
//             title: "Rework Needed",
//             value: stats.reworkChecks,
//             gradient: "from-yellow-500 to-yellow-700",
//             subtitle: `${((stats.reworkChecks / stats.totalChecks) * 100 || 0).toFixed(0)}% of checks`,
//             roles: [ROLES.ADMIN, ROLES.MANAGER]
//         },
//         {
//             title: "Failed",
//             value: stats.failedChecks,
//             gradient: "from-red-500 to-red-700",
//             subtitle: `${((stats.failedChecks / stats.totalChecks) * 100 || 0).toFixed(0)}% of checks`,
//             roles: [ROLES.ADMIN, ROLES.MANAGER]
//         },
//     ].filter(card => card.roles.includes(user?.role));

//     // Skeleton loader component
//     const SkeletonCard = () => (
//         <div className="bg-gray-200 p-6 rounded-2xl h-32 animate-pulse"></div>
//     );

//     return (
//         <MainLayout>
//             <div className="mb-8">
//                 <div className="flex justify-between items-center">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
//                         <p className="text-gray-500 mt-1">Real-time manufacturing overview</p>
//                     </div>
//                     <button
//                         onClick={() => setShowReports(!showReports)}
//                         className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
//                     >
//                         <BarChart3 size={18} />
//                         {showReports ? "Hide Reports" : "View Reports"}
//                     </button>
//                 </div>
//             </div>

//             {loading ? (
//                 <>
//                     <div className="mb-8">
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                             {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
//                         </div>
//                     </div>
//                     <div className="mb-8">
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                             {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
//                         </div>
//                     </div>
//                 </>
//             ) : (
//                 <>
//                     {/* Main Stats Cards */}
//                     <div className="mb-8">
//                         <h2 className="text-xl font-semibold text-gray-700 mb-4">Overview</h2>
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                             {cards.map((card, idx) => (
//                                 <div
//                                     key={idx}
//                                     onClick={() => navigate(card.link)}
//                                     className={`bg-gradient-to-r ${card.gradient} text-white p-6 rounded-2xl shadow-lg transform transition hover:scale-105 cursor-pointer`}
//                                 >
//                                     <div className="flex justify-between items-start">
//                                         <div>
//                                             <p className="text-sm opacity-90">{card.title}</p>
//                                             <p className="text-4xl font-bold mt-2">{card.value}</p>
//                                             <p className="text-xs opacity-75 mt-2">{card.subtitle}</p>
//                                         </div>
//                                         <card.icon size={32} className="opacity-80" />
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Quality Stats Cards */}
//                     <div className="mb-8">
//                         <h2 className="text-xl font-semibold text-gray-700 mb-4">Quality Overview</h2>
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                             {qualityCards.map((card, idx) => (
//                                 <div
//                                     key={idx}
//                                     className={`bg-gradient-to-r ${card.gradient} text-white p-6 rounded-2xl shadow-lg transform transition hover:scale-105`}
//                                 >
//                                     <div className="flex justify-between items-start">
//                                         <div>
//                                             <p className="text-sm opacity-90">{card.title}</p>
//                                             <p className="text-4xl font-bold mt-2">{card.value}</p>
//                                             <p className="text-xs opacity-75 mt-2">{card.subtitle}</p>
//                                         </div>
//                                         <div className="opacity-80">
//                                             {card.title === "Defect Rate" && getQualityStatusIcon()}
//                                             {card.title === "Passed" && <CheckCircle size={32} />}
//                                             {card.title === "Rework Needed" && <AlertTriangle size={32} />}
//                                             {card.title === "Failed" && <XCircle size={32} />}
//                                         </div>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Recent Quality Checks - Only show if exists */}
//                     {stats.recentChecks.length > 0 && (
//                         <div className="mb-8 bg-white rounded-xl shadow overflow-hidden">
//                             <div className="p-5 border-b">
//                                 <h2 className="text-xl font-semibold">Recent Quality Checks</h2>
//                                 <p className="text-sm text-gray-500 mt-1">Last 3 inspections</p>
//                             </div>
//                             <div className="overflow-x-auto">
//                                 <table className="min-w-full divide-y divide-gray-200">
//                                     <thead className="bg-gray-50">
//                                         <tr>
//                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
//                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
//                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
//                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody className="divide-y divide-gray-200">
//                                             {stats.recentChecks && Array.isArray(stats.recentChecks) && stats.recentChecks.map((check) => (
//                                             <tr key={check.id} className="hover:bg-gray-50 transition">
//                                                 <td className="px-6 py-4 text-sm">{check.productionOrderId}</td>
//                                                 <td className="px-6 py-4 font-medium">{check.partNumber}</td>
//                                                 <td className="px-6 py-4">
//                                                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
//                                                         check.status === "PASSED" ? "bg-green-100 text-green-800" :
//                                                         check.status === "REWORK_NEEDED" ? "bg-yellow-100 text-yellow-800" :
//                                                         "bg-red-100 text-red-800"
//                                                     }`}>
//                                                         {check.status}
//                                                     </span>
//                                                 </td>
//                                                 <td className="px-6 py-4 text-sm">{check.inspector}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                         </div>
//                     )}

//                     {/* Reports Section */}
//                     {showReports && (
//                         <div className="mt-8 bg-white rounded-xl shadow p-6">
//                             <div className="flex justify-between items-center mb-6">
//                                 <h2 className="text-xl font-semibold">Manufacturing Reports</h2>
//                                 <button
//                                     onClick={downloadReport}
//                                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
//                                 >
//                                     <Download size={18} />
//                                     Download Report
//                                 </button>
//                             </div>

//                             <div className="mb-4">
//                                 <label className="block text-sm font-medium mb-2">Report Period</label>
//                                 <div className="flex gap-2">
//                                     {["day", "week", "month", "year"].map((period) => (
//                                         <button
//                                             key={period}
//                                             onClick={() => setReportPeriod(period)}
//                                             className={`px-4 py-2 rounded-lg capitalize transition ${
//                                                 reportPeriod === period
//                                                     ? "bg-blue-600 text-white"
//                                                     : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                                             }`}
//                                         >
//                                             {period}
//                                         </button>
//                                     ))}
//                                 </div>
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 <div className="border rounded-lg p-4">
//                                     <h3 className="font-semibold mb-3">Production Summary</h3>
//                                     <div className="space-y-2">
//                                         <div className="flex justify-between">
//                                             <span>Total Orders:</span>
//                                             <span className="font-bold">{stats.orderCount}</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div className="border rounded-lg p-4">
//                                     <h3 className="font-semibold mb-3">Quality Summary</h3>
//                                     <div className="space-y-2">
//                                         <div className="flex justify-between">
//                                             <span>Overall Defect Rate:</span>
//                                             <span className={`font-bold ${
//                                                 stats.defectRate < 5 ? "text-green-600" : 
//                                                 stats.defectRate < 15 ? "text-yellow-600" : "text-red-600"
//                                             }`}>
//                                                 {stats.defectRate.toFixed(1)}%
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Quick Actions */}
//                     <div className="mt-8 bg-white rounded-xl shadow p-6">
//                         <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
//                         <div className="flex gap-4 flex-wrap">
//                             <button
//                                 onClick={() => navigate("/production")}
//                                 className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
//                             >
//                                 <Activity size={18} />
//                                 Start Production
//                             </button>
//                             <button
//                                 onClick={() => navigate("/quality")}
//                                 className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
//                             >
//                                 <CheckCircle size={18} />
//                                 Record Quality Check
//                             </button>
//                             <button
//                                 onClick={() => navigate("/machines")}
//                                 className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
//                             >
//                                 <Cpu size={18} />
//                                 Manage Machines
//                             </button>
//                         </div>
//                     </div>
//                 </>
//             )}
//         </MainLayout>
//     );
// }

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth, ROLES } from "../context/AuthContext";
import { getMachineCount, getRunningCount } from "../api/machineApi";
import { getOrderCount } from "../api/productionApi";
import { getQualityStats, getAllQualityChecks } from "../api/qualityApi";
import {
    Activity, Cpu, Package, TrendingUp, CheckCircle, XCircle,
    AlertTriangle, BarChart3, Download, RefreshCw, WifiOff,
    ArrowRight, ShieldCheck
} from "lucide-react";

const SERVICE_STATUS = {
    ONLINE: "online",
    OFFLINE: "offline",
    LOADING: "loading",
};

// ─── Factory Loader ───────────────────────────────────────────────────────────
function FactoryLoader() {
    const [stepIdx, setStepIdx] = useState(0);
    const [logHistory, setLogHistory] = useState([]);
    const [pct, setPct] = useState(0);
    const [conveyorReady, setConveyorReady] = useState(false);
    const [floorReady, setFloorReady] = useState(false);
    const [visibleMachines, setVisibleMachines] = useState([]);
    const [lights, setLights] = useState({ l1: null, l2: null, l3: null, l4: null, l5: null });
    const [smokeActive, setSmokeActive] = useState(false);
    const [partsActive, setPartsActive] = useState(false);
    const [gears, setGears] = useState({ g1: false, g4: false });
    const timerRef = useRef(null);

    const steps = [
        { pct: 8,   log: "Laying the factory floor...",      action: "floor"     },
        { pct: 18,  log: "Installing CNC turning center...", action: "m1"        },
        { pct: 28,  log: "Mounting milling machine...",      action: "m2"        },
        { pct: 38,  log: "Bolting hydraulic press...",       action: "m3"        },
        { pct: 48,  log: "Connecting molding unit...",       action: "m4"        },
        { pct: 56,  log: "Setting up QC station...",         action: "m5"        },
        { pct: 64,  log: "Starting conveyor belt...",        action: "conveyor"  },
        { pct: 73,  log: "Powering machine service...",      action: "light1"    },
        { pct: 82,  log: "Waking production service...",     action: "light2"    },
        { pct: 91,  log: "Connecting quality service...",    action: "light3"    },
        { pct: 97,  log: "Running parts through line...",    action: "parts"     },
        { pct: 100, log: "All systems operational.",         action: "done"      },
    ];

    useEffect(() => {
        let currentIdx = 0;

        const run = () => {
            if (currentIdx >= steps.length) return;
            const s = steps[currentIdx];
            currentIdx++;

            setPct(s.pct);
            setLogHistory(prev => {
                const updated = prev.length > 0
                    ? [...prev.slice(0, -1), { ...prev[prev.length - 1], done: true }]
                    : prev;
                return [...updated, { text: s.log, done: false }];
            });

            if (s.action === "floor")     setFloorReady(true);
            else if (s.action === "m1")   setVisibleMachines(p => [...p, "m1"]);
            else if (s.action === "m2")   setVisibleMachines(p => [...p, "m2"]);
            else if (s.action === "m3")   setVisibleMachines(p => [...p, "m3"]);
            else if (s.action === "m4")   setVisibleMachines(p => [...p, "m4"]);
            else if (s.action === "m5")   setVisibleMachines(p => [...p, "m5"]);
            else if (s.action === "conveyor") setConveyorReady(true);
            else if (s.action === "light1") {
                setLights(p => ({ ...p, l1: "#3b82f6" }));
                setGears(p => ({ ...p, g1: true }));
            }
            else if (s.action === "light2") {
                setLights(p => ({ ...p, l2: "#10b981", l3: "#f59e0b" }));
                setSmokeActive(true);
            }
            else if (s.action === "light3") {
                setLights(p => ({ ...p, l4: "#8b5cf6", l5: "#10b981" }));
                setGears(p => ({ ...p, g4: true }));
            }
            else if (s.action === "parts") setPartsActive(true);

            if (s.action !== "done") {
                timerRef.current = setTimeout(run, currentIdx <= 6 ? 850 : 1050);
            }
        };

        timerRef.current = setTimeout(run, 300);
        return () => clearTimeout(timerRef.current);
    }, []);

    const logShow = logHistory.slice(-4);

    const machineConfig = [
        {
            id: "m1", left: 16, width: 62, height: 70, border: "#bfdbfe", top: "#bfdbfe", lightId: "l1",
            icon: (
                <svg style={{ marginTop: 13, transformOrigin: "12px 12px", animation: gears.g1 ? "gearsp 2s linear infinite" : "none" }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            ),
            label: "CNC turning"
        },
        {
            id: "m2", left: 112, width: 58, height: 78, border: "#bbf7d0", top: "#bbf7d0", lightId: "l2",
            icon: (
                <svg style={{ marginTop: 15 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
            ),
            label: "Milling"
        },
        {
            id: "m3", left: 204, width: 68, height: 66, border: "#fde68a", top: "#fde68a", lightId: "l3",
            icon: (
                <svg style={{ marginTop: 12 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                </svg>
            ),
            label: "Press", hasSmoke: true
        },
        {
            id: "m4", left: 308, width: 62, height: 74, border: "#ddd6fe", top: "#ddd6fe", lightId: "l4",
            icon: (
                <svg style={{ marginTop: 14, transformOrigin: "12px 12px", animation: gears.g4 ? "gearsp 3s linear infinite" : "none" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
            ),
            label: "Molding"
        },
        {
            id: "m5", left: 408, width: 56, height: 62, border: "#bbf7d0", top: "#bbf7d0", lightId: "l5",
            icon: (
                <svg style={{ marginTop: 12 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
            ),
            label: "QC station"
        },
    ];

    return (
        <div style={{
            background: "#f8fafc", minHeight: "100vh", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px 20px", fontFamily: "Georgia, 'Times New Roman', serif"
        }}>
            <style>{`
                @keyframes gearsp { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
                @keyframes blink  { 0%,100%{opacity:1} 40%{opacity:0.1} }
                @keyframes smokeup { 0%{transform:translateY(0) scale(1);opacity:0.4} 100%{transform:translateY(-28px) scale(3);opacity:0} }
                @keyframes partmove { 0%{left:-14px;opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{left:calc(100% + 14px);opacity:0} }
                @keyframes beltmove { from{transform:translateX(0)} to{transform:translateX(-25px)} }
                .mslot { transition: opacity 0.6s ease, transform 0.6s ease; }
            `}</style>

            <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 28, letterSpacing: "0.04em" }}>
                assembling your factory floor
            </p>

            {/* Floor area */}
            <div style={{ width: "100%", maxWidth: 500, height: 220, position: "relative", marginBottom: 32 }}>

                {/* Floor line */}
                <div style={{
                    position: "absolute", bottom: 28, left: 0, right: 0, height: 2,
                    background: "#cbd5e1", transform: floorReady ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left", transition: "transform 1s ease"
                }} />

                {/* Conveyor */}
                <div style={{
                    position: "absolute", bottom: 28, left: 0, right: 0, height: 12,
                    background: "#e2e8f0", borderTop: "1px solid #cbd5e1", overflow: "hidden",
                    opacity: conveyorReady ? 1 : 0, transition: "opacity 0.5s"
                }}>
                    <div style={{ display: "flex", position: "absolute", top: 3, animation: "beltmove 0.9s linear infinite" }}>
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} style={{ width: 24, height: 6, background: "#cbd5e1", borderRight: "1px solid #e2e8f0", flexShrink: 0 }} />
                        ))}
                    </div>
                </div>

                {/* Parts on belt */}
                {partsActive && (
                    <>
                        <div style={{ width: 10, height: 8, borderRadius: 2, background: "#93c5fd", position: "absolute", bottom: 42, animation: "partmove 2.2s linear infinite" }} />
                        <div style={{ width: 10, height: 8, borderRadius: 2, background: "#6ee7b7", position: "absolute", bottom: 42, animation: "partmove 2.2s linear infinite 0.8s" }} />
                        <div style={{ width: 10, height: 8, borderRadius: 2, background: "#fcd34d", position: "absolute", bottom: 42, animation: "partmove 2.2s linear infinite 1.6s" }} />
                    </>
                )}

                {/* Machines */}
                {machineConfig.map(m => (
                    <div key={m.id} className="mslot" style={{
                        position: "absolute", bottom: 40, left: m.left,
                        display: "flex", flexDirection: "column", alignItems: "center",
                        opacity: visibleMachines.includes(m.id) ? 1 : 0,
                        transform: visibleMachines.includes(m.id) ? "translateY(0)" : "translateY(16px)"
                    }}>
                        <div style={{
                            width: m.width, height: m.height, background: "#fff",
                            border: `1.5px solid ${m.border}`, borderRadius: 8,
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", position: "relative"
                        }}>
                            <div style={{ position: "absolute", top: 0, left: "15%", width: "70%", height: 6, background: m.top, borderRadius: "3px 3px 0 0" }} />
                            {m.icon}
                            <div style={{
                                width: 7, height: 7, borderRadius: "50%",
                                position: "absolute", top: 9, right: 7,
                                background: lights[m.lightId] || "#e2e8f0",
                                animation: lights[m.lightId] ? "pulse 1.2s ease-in-out infinite" : "none"
                            }} />
                            {m.hasSmoke && smokeActive && (
                                <>
                                    <div style={{ position: "absolute", top: 0, left: 16, width: 5, height: 5, borderRadius: "50%", background: "#94a3b8", animation: "smokeup 2.2s ease-out infinite" }} />
                                    <div style={{ position: "absolute", top: 0, left: 26, width: 5, height: 5, borderRadius: "50%", background: "#94a3b8", animation: "smokeup 2.2s ease-out infinite 0.7s" }} />
                                </>
                            )}
                        </div>
                        <div style={{ fontSize: 8, color: "#94a3b8", letterSpacing: "0.12em", marginTop: 5, textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
                            {m.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Log + progress */}
            <div style={{ width: "100%", maxWidth: 400 }}>
                <div style={{
                    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                    padding: "14px 18px", height: 92, overflow: "hidden"
                }}>
                    {logShow.map((l, i) => (
                        <div key={i} style={{
                            fontSize: 12, lineHeight: 1.9, fontFamily: "Georgia, serif", fontStyle: "italic",
                            color: l.done ? "#64748b" : "#0f172a", transition: "color 0.3s"
                        }}>{l.text}</div>
                    ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                        {logShow[logShow.length - 1]?.text || "initialising..."}
                    </span>
                    <span style={{ fontSize: 14, color: "#0f172a", fontFamily: "Georgia, serif" }}>{pct}%</span>
                </div>
                <div style={{ height: 2, background: "#e2e8f0", borderRadius: 1, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#334155", borderRadius: 1, width: `${pct}%`, transition: "width 0.8s ease" }} />
                </div>
            </div>
        </div>
    );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ wide }) {
    return (
        <div style={{
            background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            borderRadius: 14, height: 110,
            gridColumn: wide ? "span 2" : undefined
        }}>
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [machineStats, setMachineStats] = useState({ machineCount: 0, runningCount: 0 });
    const [productionStats, setProductionStats] = useState({ orderCount: 0 });
    const [qualityStats, setQualityStats] = useState({
        totalChecks: 0, passedChecks: 0, reworkChecks: 0,
        failedChecks: 0, defectRate: 0, recentChecks: []
    });

    const [services, setServices] = useState({
        machines: SERVICE_STATUS.LOADING,
        production: SERVICE_STATUS.LOADING,
        quality: SERVICE_STATUS.LOADING,
    });

    const [showReports, setShowReports] = useState(false);
    const [reportPeriod, setReportPeriod] = useState("week");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [toast, setToast] = useState(null);

    // First load = ALL three still loading → show factory loader
    // With this:
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowLoader(false), 10000); // match your loader duration
        return () => clearTimeout(timer);
    }, []);

    const firstLoad = showLoader || (
        services.machines === SERVICE_STATUS.LOADING
        && services.production === SERVICE_STATUS.LOADING
        && services.quality === SERVICE_STATUS.LOADING
    );
    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        fetchAll();
    }, []);

    const showToastMsg = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const unwrap = (res, fallback = 0) => {
        if (res === null || res === undefined) return fallback;
        if (typeof res === "number") return res;
        if (typeof res?.data === "number") return res.data;
        if (typeof res?.data?.count === "number") return res.data.count;
        if (typeof res?.count === "number") return res.count;
        if (typeof res?.data === "object" && res.data !== null) return res.data;
        return fallback;
    };

    // Each service fetches and renders independently — no waiting for others
    const fetchMachines = async () => {
        setServices(prev => ({ ...prev, machines: SERVICE_STATUS.LOADING }));
        try {
            const [machinesRes, runningRes] = await Promise.all([getMachineCount(), getRunningCount()]);
            setMachineStats({ machineCount: unwrap(machinesRes), runningCount: unwrap(runningRes) });
            setServices(prev => ({ ...prev, machines: SERVICE_STATUS.ONLINE }));
        } catch (err) {
            console.warn("[Dashboard] Machine service error:", err?.message);
            setServices(prev => ({ ...prev, machines: SERVICE_STATUS.OFFLINE }));
        }
    };

    const fetchProduction = async () => {
        setServices(prev => ({ ...prev, production: SERVICE_STATUS.LOADING }));
        try {
            const ordersRes = await getOrderCount();
            setProductionStats({ orderCount: unwrap(ordersRes) });
            setServices(prev => ({ ...prev, production: SERVICE_STATUS.ONLINE }));
        } catch (err) {
            console.warn("[Dashboard] Production service error:", err?.message);
            setServices(prev => ({ ...prev, production: SERVICE_STATUS.OFFLINE }));
        }
    };

    const fetchQuality = async () => {
        setServices(prev => ({ ...prev, quality: SERVICE_STATUS.LOADING }));
        try {
            const [qs, qc] = await Promise.all([getQualityStats(), getAllQualityChecks()]);
            const s = qs?.data ?? qs ?? {};
            const checks = qc?.data ?? qc ?? [];
            setQualityStats({
                totalChecks:  s.totalChecks ?? s.total ?? 0,
                passedChecks: s.passed ?? s.passedChecks ?? 0,
                reworkChecks: s.rework ?? s.reworkChecks ?? 0,
                failedChecks: s.failed ?? s.failedChecks ?? 0,
                defectRate:   s.defectRate ?? s.defect_rate ?? 0,
                recentChecks: Array.isArray(checks) ? checks.slice(-3) : []
            });
            setServices(prev => ({ ...prev, quality: SERVICE_STATUS.ONLINE }));
        } catch (err) {
            console.warn("[Dashboard] Quality service error:", err?.message);
            setServices(prev => ({ ...prev, quality: SERVICE_STATUS.OFFLINE }));
        }
    };

    const fetchAll = () => {
        // Fire all three independently — each updates its own section when ready
        fetchMachines();
        fetchProduction();
        fetchQuality();
        setLastUpdated(new Date());
    };

    // Visibility-based auto-refresh
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, []);

    const downloadReport = () => {
        const blob = new Blob([JSON.stringify({
            generatedAt: new Date().toISOString(), period: reportPeriod,
            stats: {
                totalMachines: machineStats.machineCount,
                runningMachines: machineStats.runningCount,
                totalOrders: productionStats.orderCount,
                quality: {
                    totalChecks: qualityStats.totalChecks,
                    passed: qualityStats.passedChecks,
                    rework: qualityStats.reworkChecks,
                    failed: qualityStats.failedChecks,
                    defectRate: `${qualityStats.defectRate.toFixed(1)}%`
                }
            },
            recentQualityChecks: qualityStats.recentChecks
        }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `manufacturing-report-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToastMsg("Report downloaded successfully!");
    };

    const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(0) : 0;
    const uptimePct = pct(machineStats.runningCount, machineStats.machineCount);

    const isManager = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;

    const getDefectColor = (rate) => {
        if (rate < 5)  return { bg: "#f0fdf4", text: "#15803d", badge: "#dcfce7", badgeText: "#166534" };
        if (rate < 15) return { bg: "#fffbeb", text: "#b45309", badge: "#fef3c7", badgeText: "#92400e" };
        return           { bg: "#fef2f2", text: "#dc2626", badge: "#fee2e2", badgeText: "#991b1b" };
    };
    const defectColors = getDefectColor(qualityStats.defectRate);

    // Show factory loader only on very first load (all 3 still pending)
    if (firstLoad) {
        return (
            <MainLayout>
                <FactoryLoader />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif", maxWidth: 1280, margin: "0 auto", padding: "0 4px" }}>

                {/* Toast */}
                {toast && (
                    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircle size={16} color="#4ade80" /> {toast.message}
                    </div>
                )}

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingTop: 4 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>Dashboard</h1>
                            <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 20, border: "1px solid #e2e8f0" }}>
                                {user?.role}
                            </span>
                        </div>
                        <p style={{ color: "#94a3b8", margin: 0, fontSize: 14 }}>
                            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Loading data…"}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button
                            onClick={fetchAll}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                        >
                            <RefreshCw size={15} />
                            Refresh
                        </button>
                        {isManager && (
                            <button
                                onClick={() => setShowReports(!showReports)}
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1.5px solid #6366f1`, background: showReports ? "#6366f1" : "#fff", color: showReports ? "#fff" : "#6366f1", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                            >
                                <BarChart3 size={15} />
                                {showReports ? "Hide Reports" : "View Reports"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Service health bar — only when something offline */}
                {Object.values(services).some(s => s === SERVICE_STATUS.OFFLINE) && (
                    <ServiceHealthBar services={services} />
                )}

                {/* ── MACHINES — renders as soon as machine fetch resolves ── */}
                <SectionLabel title="Machines" subtitle="Equipment status across the floor" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                    {services.machines === SERVICE_STATUS.LOADING ? (
                        <><SkeletonCard /><SkeletonCard /></>
                    ) : (
                        <>
                            <StatCard
                                label="Total Machines"
                                value={services.machines === SERVICE_STATUS.OFFLINE ? "—" : machineStats.machineCount}
                                icon={<Cpu size={20} color="#6366f1" />}
                                accent="#6366f1" accentBg="#eef2ff"
                                sub="Registered equipment"
                                onClick={() => navigate("/machines")}
                                offline={services.machines === SERVICE_STATUS.OFFLINE}
                                offlineMsg="Machine service offline"
                            />
                            <StatCard
                                label="Running Now"
                                value={services.machines === SERVICE_STATUS.OFFLINE ? "—" : machineStats.runningCount}
                                icon={<Activity size={20} color="#10b981" />}
                                accent="#10b981" accentBg="#f0fdf4"
                                sub={services.machines === SERVICE_STATUS.ONLINE ? `${uptimePct}% uptime` : "—"}
                                onClick={() => navigate("/machines")}
                                offline={services.machines === SERVICE_STATUS.OFFLINE}
                                offlineMsg="Machine service offline"
                            />
                            {services.machines === SERVICE_STATUS.ONLINE && machineStats.machineCount > 0 && (
                                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8, gridColumn: "span 2" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Machine uptime</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: uptimePct >= 70 ? "#15803d" : uptimePct >= 40 ? "#b45309" : "#dc2626" }}>{uptimePct}%</span>
                                    </div>
                                    <div style={{ background: "#f1f5f9", borderRadius: 100, height: 8, overflow: "hidden" }}>
                                        <div style={{ width: `${uptimePct}%`, background: uptimePct >= 70 ? "#10b981" : uptimePct >= 40 ? "#f59e0b" : "#ef4444", height: "100%", borderRadius: 100, transition: "width 1s ease" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{machineStats.runningCount} running</span>
                                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{machineStats.machineCount - machineStats.runningCount} idle / off</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── PRODUCTION — renders as soon as production fetch resolves ── */}
                {isManager && (
                    <>
                        <SectionLabel title="Production" subtitle="Orders and scheduling" />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                            {services.production === SERVICE_STATUS.LOADING ? (
                                <SkeletonCard />
                            ) : (
                                <StatCard
                                    label="Production Orders"
                                    value={services.production === SERVICE_STATUS.OFFLINE ? "—" : productionStats.orderCount}
                                    icon={<Package size={20} color="#8b5cf6" />}
                                    accent="#8b5cf6" accentBg="#f5f3ff"
                                    sub="Total orders created"
                                    onClick={() => navigate("/production")}
                                    offline={services.production === SERVICE_STATUS.OFFLINE}
                                    offlineMsg="Production service offline"
                                />
                            )}
                        </div>
                    </>
                )}

                {/* ── QUALITY — renders as soon as quality fetch resolves ── */}
                {isManager && (
                    <>
                        <SectionLabel title="Quality" subtitle="Inspection results and defect tracking" />
                        {services.quality === SERVICE_STATUS.LOADING ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                                {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : services.quality === SERVICE_STATUS.OFFLINE ? (
                            <OfflineAlert service="Quality" onRetry={fetchQuality} />
                        ) : (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
                                    <div style={{ background: defectColors.bg, border: `1.5px solid ${defectColors.badge}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <span style={{ fontSize: 13, color: defectColors.text, fontWeight: 600, opacity: 0.8 }}>Defect Rate</span>
                                            {qualityStats.defectRate < 5 ? <ShieldCheck size={20} color={defectColors.text} /> : qualityStats.defectRate < 15 ? <AlertTriangle size={20} color={defectColors.text} /> : <XCircle size={20} color={defectColors.text} />}
                                        </div>
                                        <span style={{ fontSize: 36, fontWeight: 800, color: defectColors.text, letterSpacing: "-1px", lineHeight: 1 }}>{qualityStats.defectRate.toFixed(1)}%</span>
                                        <span style={{ fontSize: 12, background: defectColors.badge, color: defectColors.badgeText, padding: "3px 10px", borderRadius: 20, alignSelf: "flex-start", fontWeight: 600 }}>
                                            {qualityStats.defectRate < 5 ? "Excellent quality" : qualityStats.defectRate < 15 ? "Needs improvement" : "Critical attention"}
                                        </span>
                                    </div>
                                    <StatCard label="Total Checks"    value={qualityStats.totalChecks}  icon={<TrendingUp size={20} color="#6366f1" />}  accent="#6366f1" accentBg="#eef2ff" sub={`${qualityStats.passedChecks} passed, ${qualityStats.failedChecks} failed`} onClick={() => navigate("/quality")} />
                                    <StatCard label="Passed"          value={qualityStats.passedChecks} icon={<CheckCircle size={20} color="#10b981" />}  accent="#10b981" accentBg="#f0fdf4" sub={`${pct(qualityStats.passedChecks, qualityStats.totalChecks)}% of checks`} onClick={() => navigate("/quality")} />
                                    <StatCard label="Rework Needed"   value={qualityStats.reworkChecks} icon={<AlertTriangle size={20} color="#f59e0b" />} accent="#f59e0b" accentBg="#fffbeb" sub={`${pct(qualityStats.reworkChecks, qualityStats.totalChecks)}% of checks`} onClick={() => navigate("/quality")} />
                                    <StatCard label="Failed"          value={qualityStats.failedChecks} icon={<XCircle size={20} color="#ef4444" />}       accent="#ef4444" accentBg="#fef2f2" sub={`${pct(qualityStats.failedChecks, qualityStats.totalChecks)}% of checks`} onClick={() => navigate("/quality")} />
                                </div>
                                {qualityStats.totalChecks > 0 && (
                                    <QualityBar passed={qualityStats.passedChecks} rework={qualityStats.reworkChecks} failed={qualityStats.failedChecks} total={qualityStats.totalChecks} />
                                )}
                                {qualityStats.recentChecks.length > 0 && (
                                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
                                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>Recent Quality Checks</h3>
                                                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Last 3 inspections</p>
                                            </div>
                                            <button onClick={() => navigate("/quality")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                                View all <ArrowRight size={14} />
                                            </button>
                                        </div>
                                        <div style={{ overflowX: "auto" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                                <thead>
                                                    <tr style={{ background: "#f8fafc" }}>
                                                        {["Order ID", "Part Number", "Status", "Inspector"].map(h => (
                                                            <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {qualityStats.recentChecks.map((check) => (
                                                        <tr key={check.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                                                            <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{check.productionOrderId}</td>
                                                            <td style={{ padding: "12px 20px", fontWeight: 600, color: "#0f172a" }}>{check.partNumber}</td>
                                                            <td style={{ padding: "12px 20px" }}><StatusBadge status={check.status} /></td>
                                                            <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{check.inspector}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ── REPORTS ── */}
                {isManager && showReports && (
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24, marginTop: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Manufacturing Reports</h3>
                            <button onClick={downloadReport} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                <Download size={15} /> Download JSON
                            </button>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Report Period</p>
                            <div style={{ display: "flex", gap: 8 }}>
                                {["day","week","month","year"].map(p => (
                                    <button key={p} onClick={() => setReportPeriod(p)} style={{ padding: "6px 16px", borderRadius: 8, border: reportPeriod === p ? "none" : "1px solid #e2e8f0", background: reportPeriod === p ? "#6366f1" : "#fff", color: reportPeriod === p ? "#fff" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: 16, background: "#f8fafc" }}>
                                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#334155" }}>Production Summary</p>
                                <ReportRow label="Total Orders"     value={services.production === SERVICE_STATUS.OFFLINE ? "Offline" : productionStats.orderCount} offline={services.production === SERVICE_STATUS.OFFLINE} />
                                <ReportRow label="Running Machines" value={services.machines === SERVICE_STATUS.OFFLINE ? "Offline" : machineStats.runningCount} offline={services.machines === SERVICE_STATUS.OFFLINE} />
                            </div>
                            <div style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: 16, background: "#f8fafc" }}>
                                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#334155" }}>Quality Summary</p>
                                <ReportRow label="Total Checks" value={services.quality === SERVICE_STATUS.OFFLINE ? "Offline" : qualityStats.totalChecks} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                                <ReportRow label="Defect Rate"  value={services.quality === SERVICE_STATUS.OFFLINE ? "Offline" : `${qualityStats.defectRate.toFixed(1)}%`} color={defectColors.text} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── QUICK ACTIONS ── */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginTop: 24, marginBottom: 16 }}>
                    <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Quick Actions</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <QuickAction label="Start Production"      icon={<Activity size={15} />}     color="#6366f1" onClick={() => navigate("/production")} />
                        {isManager && <QuickAction label="Record Quality Check" icon={<CheckCircle size={15} />} color="#10b981" onClick={() => navigate("/quality")} />}
                        <QuickAction label="Manage Machines"       icon={<Cpu size={15} />}          color="#8b5cf6" onClick={() => navigate("/machines")} />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

/* ─── Sub-components ─────────────────────────────────────────────────────────*/

function SectionLabel({ title, subtitle }) {
    return (
        <div style={{ marginBottom: 12, marginTop: 4 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h2>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{subtitle}</p>
        </div>
    );
}

function StatCard({ label, value, icon, accent, accentBg, sub, onClick, offline, offlineMsg }) {
    return (
        <div
            onClick={onClick}
            style={{ background: offline ? "#f8fafc" : "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", cursor: onClick ? "pointer" : "default", transition: "box-shadow 0.15s, transform 0.15s", position: "relative", animation: "fadeUp 0.3s ease both" }}
            onMouseEnter={e => { if (!offline) { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
        >
            <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    {offline ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <WifiOff size={16} color="#cbd5e1" />
                            <span style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 500 }}>{offlineMsg}</span>
                        </div>
                    ) : (
                        <>
                            <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1 }}>{value}</p>
                            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>{sub}</p>
                        </>
                    )}
                </div>
                <div style={{ background: offline ? "#f1f5f9" : accentBg, width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {offline ? <WifiOff size={18} color="#cbd5e1" /> : icon}
                </div>
            </div>
            {onClick && !offline && (
                <div style={{ position: "absolute", bottom: 14, right: 16 }}>
                    <ArrowRight size={14} color={accent} />
                </div>
            )}
        </div>
    );
}

function QualityBar({ passed, rework, failed, total }) {
    const pw = ((passed / total) * 100).toFixed(1);
    const rw = ((rework / total) * 100).toFixed(1);
    const fw = ((failed / total) * 100).toFixed(1);
    return (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quality breakdown</p>
            <div style={{ display: "flex", height: 12, borderRadius: 100, overflow: "hidden", gap: 2 }}>
                <div style={{ width: `${pw}%`, background: "#10b981", borderRadius: "100px 0 0 100px" }} title={`Passed: ${pw}%`} />
                <div style={{ width: `${rw}%`, background: "#f59e0b" }} title={`Rework: ${rw}%`} />
                <div style={{ width: `${fw}%`, background: "#ef4444", borderRadius: "0 100px 100px 0" }} title={`Failed: ${fw}%`} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                {[["#10b981", `Passed ${pw}%`], ["#f59e0b", `Rework ${rw}%`], ["#ef4444", `Failed ${fw}%`]].map(([color, label]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        PASSED:        { bg: "#f0fdf4", color: "#166534", label: "Passed"  },
        REWORK_NEEDED: { bg: "#fffbeb", color: "#92400e", label: "Rework"  },
        FAILED:        { bg: "#fef2f2", color: "#991b1b", label: "Failed"  },
    };
    const s = map[status] || { bg: "#f1f5f9", color: "#475569", label: status };
    return (
        <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {s.label}
        </span>
    );
}

function ServiceHealthBar({ services }) {
    const items = [
        { key: "machines",   label: "Machines"   },
        { key: "production", label: "Production" },
        { key: "quality",    label: "Quality"    },
    ];
    return (
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
            {items.map(({ key, label }) => {
                const s = services[key];
                const isOnline  = s === "online";
                const isLoading = s === "loading";
                return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, background: isLoading ? "#f8fafc" : isOnline ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isLoading ? "#e2e8f0" : isOnline ? "#bbf7d0" : "#fecaca"}`, borderRadius: 20, padding: "4px 12px 4px 10px", fontSize: 12, fontWeight: 600, color: isLoading ? "#94a3b8" : isOnline ? "#166534" : "#991b1b" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isLoading ? "#cbd5e1" : isOnline ? "#22c55e" : "#ef4444", boxShadow: isOnline ? "0 0 0 2px #bbf7d0" : "none" }} />
                        {label}: {isLoading ? "…" : isOnline ? "Online" : "Offline"}
                    </div>
                );
            })}
        </div>
    );
}

function OfflineAlert({ service, onRetry }) {
    return (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <WifiOff size={18} color="#ef4444" />
                <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#991b1b" }}>{service} service is currently offline</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#f87171" }}>Data will appear here when the service reconnects.</p>
                </div>
            </div>
            {onRetry && (
                <button onClick={onRetry} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#991b1b", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <RefreshCw size={13} /> Retry
                </button>
            )}
        </div>
    );
}

function QuickAction({ label, icon, color, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8, border: `1.5px solid ${color}22`, background: `${color}0d`, color, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}1a`}
            onMouseLeave={e => e.currentTarget.style.background = `${color}0d`}
        >
            {icon} {label}
        </button>
    );
}

function ReportRow({ label, value, color, offline }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: offline ? "#cbd5e1" : color || "#0f172a" }}>{value}</span>
        </div>
    );
}