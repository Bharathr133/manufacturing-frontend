import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { getMachineCount, getRunningCount } from "../api/machineApi";
import { getOrderCount } from "../api/productionApi";
import { getQualityStats, getAllQualityChecks } from "../api/qualityApi";
import { Activity, Cpu, Package, TrendingUp, CheckCircle, XCircle, AlertTriangle, BarChart3, Download } from "lucide-react";

// Cache for 30 seconds
let cachedStats = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        machineCount: 0,
        runningCount: 0,
        orderCount: 0,
        totalChecks: 0,
        passedChecks: 0,
        reworkChecks: 0,
        failedChecks: 0,
        defectRate: 0,
        recentChecks: [],
    });
    const [loading, setLoading] = useState(true);
    const [showReports, setShowReports] = useState(false);
    const [reportPeriod, setReportPeriod] = useState("week");

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            // Get machine stats
            const machinesCount = await getMachineCount();
            const runningCount = await getRunningCount();
            const orders = await getOrderCount();

            // Get quality stats - NOW RETURNS DATA DIRECTLY
            const qualityStats = await getQualityStats();
            const qualityChecks = await getAllQualityChecks();

            const recentChecks = qualityChecks?.slice(-3) || [];

            setStats({
                machineCount: machinesCount.data,
                runningCount: runningCount.data,
                orderCount: orders.data,
                totalChecks: qualityStats?.totalChecks || 0,
                passedChecks: qualityStats?.passed || 0,
                reworkChecks: qualityStats?.rework || 0,
                failedChecks: qualityStats?.failed || 0,
                defectRate: qualityStats?.defectRate || 0,
                recentChecks: recentChecks,
            });
        } catch (error) {
            console.error("Failed to load stats", error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-6 right-6 bg-gray-800 text-white px-5 py-3 rounded-lg shadow-lg z-50';
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const downloadReport = () => {
        const reportData = {
            generatedAt: new Date().toISOString(),
            period: reportPeriod,
            stats: {
                totalMachines: stats.machineCount,
                runningMachines: stats.runningCount,
                totalOrders: stats.orderCount,
                quality: {
                    totalChecks: stats.totalChecks,
                    passed: stats.passedChecks,
                    rework: stats.reworkChecks,
                    failed: stats.failedChecks,
                    defectRate: `${stats.defectRate.toFixed(1)}%`
                }
            },
            recentQualityChecks: stats.recentChecks
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manufacturing-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Report downloaded successfully!");
    };

    const getQualityStatusIcon = () => {
        if (stats.defectRate < 5) return <CheckCircle className="text-green-500" size={24} />;
        if (stats.defectRate < 15) return <AlertTriangle className="text-yellow-500" size={24} />;
        return <XCircle className="text-red-500" size={24} />;
    };

    const cards = [
        {
            title: "Total Machines",
            value: stats.machineCount,
            icon: Cpu,
            gradient: "from-blue-500 to-blue-700",
            subtitle: "Registered equipment",
            link: "/machines"
        },
        {
            title: "Running Machines",
            value: stats.runningCount,
            icon: Activity,
            gradient: "from-green-500 to-green-700",
            subtitle: `${((stats.runningCount / stats.machineCount) * 100 || 0).toFixed(0)}% of total`,
            link: "/machines"
        },
        {
            title: "Production Orders",
            value: stats.orderCount,
            icon: Package,
            gradient: "from-purple-500 to-purple-700",
            subtitle: "Total orders created",
            link: "/production"
        },
        {
            title: "Quality Checks",
            value: stats.totalChecks,
            icon: TrendingUp,
            gradient: "from-indigo-500 to-indigo-700",
            subtitle: `${stats.passedChecks} passed, ${stats.failedChecks} failed`,
            link: "/quality"
        },
    ];

    const qualityCards = [
        {
            title: "Defect Rate",
            value: `${stats.defectRate.toFixed(1)}%`,
            gradient: stats.defectRate < 5 ? "from-green-500 to-green-700" : stats.defectRate < 15 ? "from-yellow-500 to-yellow-700" : "from-red-500 to-red-700",
            subtitle: stats.defectRate < 5 ? "Excellent quality" : stats.defectRate < 15 ? "Needs improvement" : "Critical attention needed",
        },
        {
            title: "Passed",
            value: stats.passedChecks,
            gradient: "from-green-500 to-green-700",
            subtitle: `${((stats.passedChecks / stats.totalChecks) * 100 || 0).toFixed(0)}% of checks`,
        },
        {
            title: "Rework Needed",
            value: stats.reworkChecks,
            gradient: "from-yellow-500 to-yellow-700",
            subtitle: `${((stats.reworkChecks / stats.totalChecks) * 100 || 0).toFixed(0)}% of checks`,
        },
        {
            title: "Failed",
            value: stats.failedChecks,
            gradient: "from-red-500 to-red-700",
            subtitle: `${((stats.failedChecks / stats.totalChecks) * 100 || 0).toFixed(0)}% of checks`,
        },
    ];

    // Skeleton loader component
    const SkeletonCard = () => (
        <div className="bg-gray-200 p-6 rounded-2xl h-32 animate-pulse"></div>
    );

    return (
        <MainLayout>
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                        <p className="text-gray-500 mt-1">Real-time manufacturing overview</p>
                    </div>
                    <button
                        onClick={() => setShowReports(!showReports)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                        <BarChart3 size={18} />
                        {showReports ? "Hide Reports" : "View Reports"}
                    </button>
                </div>
            </div>

            {loading ? (
                <>
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
                        </div>
                    </div>
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Main Stats Cards */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {cards.map((card, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => navigate(card.link)}
                                    className={`bg-gradient-to-r ${card.gradient} text-white p-6 rounded-2xl shadow-lg transform transition hover:scale-105 cursor-pointer`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm opacity-90">{card.title}</p>
                                            <p className="text-4xl font-bold mt-2">{card.value}</p>
                                            <p className="text-xs opacity-75 mt-2">{card.subtitle}</p>
                                        </div>
                                        <card.icon size={32} className="opacity-80" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quality Stats Cards */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quality Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {qualityCards.map((card, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-gradient-to-r ${card.gradient} text-white p-6 rounded-2xl shadow-lg transform transition hover:scale-105`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm opacity-90">{card.title}</p>
                                            <p className="text-4xl font-bold mt-2">{card.value}</p>
                                            <p className="text-xs opacity-75 mt-2">{card.subtitle}</p>
                                        </div>
                                        <div className="opacity-80">
                                            {card.title === "Defect Rate" && getQualityStatusIcon()}
                                            {card.title === "Passed" && <CheckCircle size={32} />}
                                            {card.title === "Rework Needed" && <AlertTriangle size={32} />}
                                            {card.title === "Failed" && <XCircle size={32} />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Quality Checks - Only show if exists */}
                    {stats.recentChecks.length > 0 && (
                        <div className="mb-8 bg-white rounded-xl shadow overflow-hidden">
                            <div className="p-5 border-b">
                                <h2 className="text-xl font-semibold">Recent Quality Checks</h2>
                                <p className="text-sm text-gray-500 mt-1">Last 3 inspections</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                            {stats.recentChecks && Array.isArray(stats.recentChecks) && stats.recentChecks.map((check) => (
                                            <tr key={check.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 text-sm">{check.productionOrderId}</td>
                                                <td className="px-6 py-4 font-medium">{check.partNumber}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                        check.status === "PASSED" ? "bg-green-100 text-green-800" :
                                                        check.status === "REWORK_NEEDED" ? "bg-yellow-100 text-yellow-800" :
                                                        "bg-red-100 text-red-800"
                                                    }`}>
                                                        {check.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">{check.inspector}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Reports Section */}
                    {showReports && (
                        <div className="mt-8 bg-white rounded-xl shadow p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold">Manufacturing Reports</h2>
                                <button
                                    onClick={downloadReport}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                                >
                                    <Download size={18} />
                                    Download Report
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Report Period</label>
                                <div className="flex gap-2">
                                    {["day", "week", "month", "year"].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setReportPeriod(period)}
                                            className={`px-4 py-2 rounded-lg capitalize transition ${
                                                reportPeriod === period
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                            }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-semibold mb-3">Production Summary</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Total Orders:</span>
                                            <span className="font-bold">{stats.orderCount}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-semibold mb-3">Quality Summary</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Overall Defect Rate:</span>
                                            <span className={`font-bold ${
                                                stats.defectRate < 5 ? "text-green-600" : 
                                                stats.defectRate < 15 ? "text-yellow-600" : "text-red-600"
                                            }`}>
                                                {stats.defectRate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-8 bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={() => navigate("/production")}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <Activity size={18} />
                                Start Production
                            </button>
                            <button
                                onClick={() => navigate("/quality")}
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <CheckCircle size={18} />
                                Record Quality Check
                            </button>
                            <button
                                onClick={() => navigate("/machines")}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <Cpu size={18} />
                                Manage Machines
                            </button>
                        </div>
                    </div>
                </>
            )}
        </MainLayout>
    );
}