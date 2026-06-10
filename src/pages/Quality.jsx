import { useEffect, useState, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import {
    getAllQualityChecks,
    getQualityStats,
    recordQualityCheck,
    getQualityChecksByMachine
} from "../api/qualityApi";
import { getMachines } from "../api/machineApi";
import { getOrders } from "../api/productionApi";
import {
    Plus,
    X,
    Filter,
    BarChart3,
    LineChart,
    PieChart,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

export default function Quality() {
    const [qualityChecks, setQualityChecks] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCheck, setSelectedCheck] = useState(null);

    // Pagination - set to 5 per page
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // Filters
    const [filterMachine, setFilterMachine] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        productionOrderId: "",
        machineId: "",
        partNumber: "",
        quantityProduced: "",
        quantityFailed: 0,
        quantityRework: 0,
        defectType: "",
        severity: "MINOR",
        inspector: "",
        comments: ""
    });

    // Dropdown data
    const [machines, setMachines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [checkedOrderIds, setCheckedOrderIds] = useState(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Chart modal
    const [showChartModal, setShowChartModal] = useState(false);

    useEffect(() => {
        loadData();
        loadMachines();
        loadOrders();
    }, []);

    // Auto-calculate Passed Quantity = Produced - Failed - Rework
    useEffect(() => {
        const produced = parseInt(formData.quantityProduced) || 0;
        const rejected = Math.max(0, parseInt(formData.quantityFailed) || 0);
        const rework = Math.max(0, parseInt(formData.quantityRework) || 0);
        setFormData(prev => ({
            ...prev,
            quantityPassed: Math.max(0, produced - rejected - rework)
        }));
    }, [formData.quantityProduced, formData.quantityFailed, formData.quantityRework]);

    const loadData = async () => {
        setLoading(true);
        try {
            const qualityChecksData = await getAllQualityChecks();
            const qualityStatsData = await getQualityStats();

            setQualityChecks(qualityChecksData || []);
            setStats(qualityStatsData || null);

            // Build set of already-checked order IDs to exclude them from dropdown
            if (qualityChecksData) {
                const checkedIds = new Set(
                    qualityChecksData
                        .filter(q => q.productionOrderId)
                        .map(q => parseInt(q.productionOrderId))
                );
                setCheckedOrderIds(checkedIds);
            }
        } catch (error) {
            console.error("Failed to load quality data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMachines = async () => {
        try {
            const res = await getMachines();
            setMachines(res.data || []);
        } catch (error) {
            console.error("Failed to load machines", error);
        }
    };

    const loadOrders = async () => {
        try {
            const res = await getOrders();
            setOrders(res.data || []);
        } catch (error) {
            console.error("Failed to load orders", error);
        }
    };

    // Filtered and paginated data
    const filteredChecks = useMemo(() => {
        let data = [...qualityChecks];

        // Machine filter
        if (filterMachine) {
            data = data.filter(q => q.machineId === parseInt(filterMachine) || q.machineId === filterMachine);
        }
        // Status filter
        if (filterStatus) {
            data = data.filter(q => q.status === filterStatus);
        }
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(q =>
                (q.partNumber && q.partNumber.toLowerCase().includes(term)) ||
                (q.inspector && q.inspector.toLowerCase().includes(term)) ||
                (q.productionOrderId && q.productionOrderId.toString().includes(term))
            );
        }

        // Sort by most recent first
        data.sort((a, b) => new Date(b.checkedAt || 0) - new Date(a.checkedAt || 0));

        return data;
    }, [qualityChecks, filterMachine, filterStatus, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredChecks.length / pageSize));
    const paginatedChecks = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredChecks.slice(start, start + pageSize);
    }, [filteredChecks, currentPage, pageSize]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterMachine, filterStatus, searchTerm]);

    const applyFilters = () => {
        if (filterMachine && filterMachine !== "") {
            setLoading(true);
            getQualityChecksByMachine(filterMachine)
                .then(data => setQualityChecks(data || []))
                .catch(err => console.error("Failed to filter by machine", err))
                .finally(() => setLoading(false));
        } else {
            loadData();
        }
    };

    const resetFilters = () => {
        setFilterMachine("");
        setFilterStatus("");
        setSearchTerm("");
        setCurrentPage(1);
        loadData();
    };

    const handleOrderChange = (orderId) => {
        if (!orderId) {
            setFormData({ productionOrderId: "", machineId: "", partNumber: "", quantityProduced: "", quantityPassed: "", quantityFailed: 0, quantityRework: 0, defectType: "", severity: "MINOR", inspector: "", comments: "" });
            return;
        }
        const selectedOrder = orders.find(o => o.id === parseInt(orderId));
        if (selectedOrder) {
            setFormData({
                ...formData,
                productionOrderId: orderId,
                machineId: selectedOrder.machineId ? selectedOrder.machineId.toString() : "",
                partNumber: selectedOrder.partNumber || "",
                quantityProduced: selectedOrder.quantity?.toString() || "0",
                quantityPassed: selectedOrder.quantity || 0,
                quantityFailed: 0,
                quantityRework: 0,
                defectType: "NONE",
                severity: "MINOR",
                inspector: selectedOrder.operator || "",
                comments: "",
            });
        } else {
            setFormData({ productionOrderId: "", machineId: "", partNumber: "", quantityProduced: "", quantityPassed: "", quantityFailed: 0, quantityRework: 0, defectType: "", severity: "MINOR", inspector: "", comments: "" });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const produced = parseInt(formData.quantityProduced) || 0;
        const passed = parseInt(formData.quantityPassed) || 0;
        const failed = Math.max(0, parseInt(formData.quantityFailed) || 0);
        const rework = Math.max(0, parseInt(formData.quantityRework) || 0);

        // Validation: sum must equal produced
        const totalInspected = passed + failed + rework;
        if (totalInspected !== produced) {
            alert(`Validation Error: Passed (${passed}) + Rejected (${failed}) + Rework (${rework}) must equal Produced (${produced}).`);
            setSubmitting(false);
            return;
        }

        try {
            const userComments = formData.comments || "";
            // Store rework value in comments since backend doesn't save quantityRework
            const reworkComment = rework > 0 ? `[Rework: ${rework}] ${userComments}` : userComments;

            const payload = {
                productionOrderId: parseInt(formData.productionOrderId),
                machineId: parseInt(formData.machineId),
                partNumber: formData.partNumber,
                quantityProduced: produced,
                quantityPassed: passed,
                quantityFailed: failed,
                quantityRework: rework,
                rework: rework,
                reworkQuantity: rework,
                defectType: formData.defectType || "NONE",
                severity: formData.severity,
                inspector: formData.inspector,
                comments: reworkComment
            };
            const response = await recordQualityCheck(payload);
            console.log("[Quality] Record response:", response?.data || response);

            setSuccessMessage("Quality check recorded successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            setShowModal(false);
            resetForm();
            await loadData();
            await loadOrders();
        } catch (error) {
            console.error("Failed to record quality check", error);
            alert("Failed to record quality check");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            productionOrderId: "",
            machineId: "",
            partNumber: "",
            quantityProduced: "",
            quantityPassed: "",
            quantityFailed: 0,
            quantityRework: 0,
            defectType: "",
            severity: "MINOR",
            inspector: "",
            comments: ""
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PASSED": return "bg-green-100 text-green-800";
            case "REWORK_NEEDED": return "bg-yellow-100 text-yellow-800";
            case "FAILED": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case "CRITICAL": return "bg-red-100 text-red-800";
            case "MAJOR": return "bg-orange-100 text-orange-800";
            case "MINOR": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // Get rework value from check: backend doesn't store quantityRework field
    // So we extract it from comments: "Rework: X | actual comments..."
    const getReworkValue = (check) => {
        // Try direct field first (in case backend ever adds it)
        if (check.quantityRework !== undefined && check.quantityRework !== null) return check.quantityRework;
        if (check.rework !== undefined && check.rework !== null) return check.rework;
        if (check.reworkQuantity !== undefined && check.reworkQuantity !== null) return check.reworkQuantity;
        // Fallback: parse from comments ([Rework: X] or Rework: X format)
        if (check.comments) {
            const match = check.comments.match(/\[?Rework:\s*(\d+)\]/i);
            if (match) return parseInt(match[1]);
        }
        return 0;
    };

    // Get failed value from check - try multiple possible field names
    const getFailedValue = (check) => {
        return check.quantityFailed ?? check.failed ?? check.failedQuantity ?? 0;
    };

    // Clean comments display: remove [Rework: X] prefix
    const getCleanComments = (check) => {
        if (!check.comments) return "No comments";
        return check.comments.replace(/\[Rework:\s*\d+\]\s*/i, "").trim() || "No comments";
    };

    const getMachineName = (machineId) => {
        if (!machineId) return "";
        const mid = parseInt(machineId);
        const m = machines.find(m => m.id === mid);
        return m?.machineName || m?.name || machineId;
    };

    // Chart Modal
    const ChartModal = () => {
        const statusCounts = qualityChecks.reduce((acc, check) => {
            acc[check.status] = (acc[check.status] || 0) + 1;
            return acc;
        }, {});

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowChartModal(false)}>
                <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Quality Analytics</h3>
                        <button onClick={() => setShowChartModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><PieChart size={18} /> Status Distribution</h4>
                            <div className="space-y-2">
                                {Object.entries(statusCounts).map(([status, count]) => (
                                    <div key={status} className="flex justify-between items-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(status)}`}>{status}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><LineChart size={18} /> Recent Checks</h4>
                            <div className="space-y-2">
                                {qualityChecks.slice(-8).reverse().map((check, idx) => {
                                    const defectCount = getFailedValue(check);
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span>#{check.id}</span>
                                            <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((defectCount / (check.quantityProduced || 1)) * 100, 100)}%` }} />
                                            </div>
                                            <span className="font-mono">{check.quantityPassed || 0}/{check.quantityProduced || 0}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Pagination Component
    const Pagination = ({ currentPage, totalPages, onPageChange }) => {
        if (totalPages <= 1) return null;
        const pages = [];
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        for (let i = startPage; i <= endPage; i++) pages.push(i);

        return (
            <div className="flex items-center justify-between px-6 py-4 border-t flex-wrap gap-2">
                <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages} ({filteredChecks.length} records)
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}
                        className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronLeft size={16} />
                    </button>
                    {pages.map(page => (
                        <button key={page} onClick={() => onPageChange(page)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${page === currentPage ? "bg-blue-600 text-white" : "border hover:bg-gray-50 text-gray-700"}`}>
                            {page}
                        </button>
                    ))}
                    <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}
                        className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    if (loading && qualityChecks.length === 0) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 text-lg">Loading quality data...</div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="mb-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Quality Control</h1>
                        <p className="text-gray-500 mt-1">Track quality checks and defect rates</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <button onClick={() => setShowChartModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                            <BarChart3 size={18} /> Analytics
                        </button>
                        <button onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                            <Plus size={18} /> Record Quality Check
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
                    ✅ {successMessage}
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Total Checks</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalChecks || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Passed</p>
                        <p className="text-2xl font-bold text-green-600">{stats.passed || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Rework Needed</p>
                        <p className="text-2xl font-bold text-yellow-600">
                            {stats.rework ?? stats.reworkChecks ?? stats.quantityRework ?? 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{stats.failed || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Defect Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {stats.defectRate ? `${Number(stats.defectRate).toFixed(1)}%` : "0.0%"}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Machine</label>
                        <select value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm">
                            <option value="">All Machines</option>
                            {machines.map(m => (
                                <option key={m.id} value={m.id}>{m.machineName || m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm">
                            <option value="">All Status</option>
                            <option value="PASSED">Passed</option>
                            <option value="REWORK_NEEDED">Rework Needed</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                        <input type="text" placeholder="Search by part number, order ID, or inspector..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={applyFilters}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                            <Filter size={16} /> Apply Filters
                        </button>
                        <button onClick={resetFilters}
                            className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm">Reset</button>
                    </div>
                </div>
            </div>

            {/* Quality Checks Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-5 border-b">
                    <h2 className="text-xl font-semibold">Quality Check History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passed</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rework</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedChecks.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-10 text-gray-500">No quality checks recorded</td>
                                </tr>
                            ) : (
                                paginatedChecks.map((check) => (
                                    <tr key={check.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedCheck(check)}>
                                        <td className="px-6 py-4 text-sm">{check.id}</td>
                                        <td className="px-6 py-4 text-sm">{check.productionOrderId}</td>
                                        <td className="px-6 py-4 text-sm">{getMachineName(check.machineId)}</td>
                                        <td className="px-6 py-4 font-medium">{check.partNumber}</td>
                                        <td className="px-6 py-4 text-sm">{check.quantityProduced || 0}</td>
                                        <td className="px-6 py-4 text-sm text-green-600 font-bold">{check.quantityPassed || 0}</td>
                                        <td className="px-6 py-4 text-sm text-yellow-600 font-bold">{getReworkValue(check)}</td>
                                        <td className="px-6 py-4 text-sm text-red-600 font-bold">{getFailedValue(check)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(check.status)}`}>
                                                {check.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{check.inspector}</td>
                                        <td className="px-6 py-4 text-sm">
                                            {check.checkedAt ? new Date(check.checkedAt).toLocaleString() : "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>

            {/* Record Quality Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-5 border-b">
                            <h2 className="text-xl font-semibold">Record Quality Check</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Production Order ID *</label>
                                    <select required value={formData.productionOrderId} onChange={(e) => handleOrderChange(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50">
                                        <option value="">Select Order</option>
                                        {orders
                                            .filter(o => o.status === 'COMPLETED')
                                            .filter(o => !checkedOrderIds.has(parseInt(o.id)))
                                            .map(order => (
                                            <option key={order.id} value={order.id}>Order #{order.id} - {order.partNumber}</option>
                                        ))}
                                    </select>
                                    {orders.filter(o => o.status === 'COMPLETED' && !checkedOrderIds.has(parseInt(o.id))).length === 0 && (
                                        <p className="text-xs text-amber-600 mt-1">All completed orders have been checked.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Machine</label>
                                    <input type="text" disabled
                                        value={getMachineName(formData.machineId) || ""}
                                        className="w-full border p-2 rounded-lg bg-gray-100 font-bold text-slate-700" placeholder="Auto-populated" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Part Number *</label>
                                    <input type="text" disabled value={formData.partNumber} className="w-full border p-2 rounded-lg bg-gray-100 font-bold text-slate-700" placeholder="Auto-populated" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Inspector *</label>
                                    <input type="text" required value={formData.inspector}
                                        onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                                        className="w-full border p-2 rounded-lg" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantity Produced *</label>
                                    <input type="number" disabled value={formData.quantityProduced} className="w-full border p-2 rounded-lg bg-gray-100 font-bold text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rejected Quantity</label>
                                    <input type="number" min="0" value={formData.quantityFailed}
                                        onChange={(e) => setFormData({ ...formData, quantityFailed: e.target.value })}
                                        className="w-full border p-2 rounded-lg border-red-200" placeholder="Enter Rejected" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rework Quantity</label>
                                    <input type="number" min="0" value={formData.quantityRework}
                                        onChange={(e) => setFormData({ ...formData, quantityRework: e.target.value })}
                                        className="w-full border p-2 rounded-lg border-yellow-200" placeholder="Enter Rework" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Passed (Auto-Calc)</label>
                                    <input type="number" disabled value={formData.quantityPassed} className="w-full border p-2 rounded-lg bg-green-50 font-black text-green-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Defect Type</label>
                                    <select value={formData.defectType} onChange={(e) => setFormData({ ...formData, defectType: e.target.value })} className="w-full border p-2 rounded-lg">
                                        <option value="">Select Defect Type</option>
                                        <option value="DIMENSION">Dimension</option>
                                        <option value="SURFACE">Surface</option>
                                        <option value="MATERIAL">Material</option>
                                        <option value="ASSEMBLY">Assembly</option>
                                        <option value="FUNCTIONAL">Functional</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Severity</label>
                                    <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="w-full border p-2 rounded-lg">
                                        <option value="MINOR">Minor</option>
                                        <option value="MAJOR">Major</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Comments</label>
                                <textarea value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    className="w-full border p-2 rounded-lg" rows="3" placeholder="Additional notes..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    {submitting ? "Recording..." : "Record Quality Check"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedCheck && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCheck(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Quality Check Details</h3>
                            <button onClick={() => setSelectedCheck(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="font-medium">ID:</span> {selectedCheck.id}</div>
                            <div><span className="font-medium">Order ID:</span> {selectedCheck.productionOrderId}</div>
                            <div><span className="font-medium">Machine:</span> {getMachineName(selectedCheck.machineId)}</div>
                            <div><span className="font-medium">Part Number:</span> {selectedCheck.partNumber}</div>
                            <div><span className="font-medium">Produced:</span> {selectedCheck.quantityProduced || 0}</div>
                            <div><span className="font-medium">Passed:</span> {selectedCheck.quantityPassed || 0}</div>
                            <div><span className="font-medium">Rework:</span> {getReworkValue(selectedCheck)}</div>
                            <div><span className="font-medium">Failed:</span> {getFailedValue(selectedCheck)}</div>
                            <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedCheck.status)}`}>{selectedCheck.status}</span></div>
                            <div><span className="font-medium">Severity:</span> <span className={`px-2 py-1 rounded-full text-xs ${getSeverityBadge(selectedCheck.severity)}`}>{selectedCheck.severity || "N/A"}</span></div>
                            <div><span className="font-medium">Defect Type:</span> {selectedCheck.defectType || "N/A"}</div>
                            <div><span className="font-medium">Inspector:</span> {selectedCheck.inspector}</div>
                            <div className="col-span-2"><span className="font-medium">Comments:</span> {selectedCheck.comments || "No comments"}</div>
                            <div className="col-span-2"><span className="font-medium">Checked At:</span> {selectedCheck.checkedAt ? new Date(selectedCheck.checkedAt).toLocaleString() : "-"}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Modal */}
            {showChartModal && <ChartModal />}
        </MainLayout>
    );
}