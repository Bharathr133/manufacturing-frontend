import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
    getAllQualityChecks,
    getQualityStats,
    recordQualityCheck,
    getQualityChecksByMachine,
    getQualityChecksByOrder
} from "../api/qualityApi";
import { getMachines } from "../api/machineApi";
import { getOrders } from "../api/productionApi";
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    TrendingUp,
    Plus,
    X,
    Search,
    Filter,
    Calendar,
    BarChart3,
    LineChart,
    PieChart
} from "lucide-react";

export default function Quality() {
    // State for quality checks
    const [qualityChecks, setQualityChecks] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCheck, setSelectedCheck] = useState(null);

    // State for filters
    const [filterMachine, setFilterMachine] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // State for modal
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        productionOrderId: "",
        machineId: "",
        partNumber: "",
        quantityProduced: "",
        quantityPassed: "",
        defectType: "",
        severity: "MINOR",
        inspector: "",
        comments: ""
    });

    // State for dropdown data
    const [machines, setMachines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // State for chart view
    const [showChartModal, setShowChartModal] = useState(false);

    useEffect(() => {
        loadData();
        loadMachines();
        loadOrders();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // These now return data directly, not response objects
            const qualityChecksData = await getAllQualityChecks();
            const qualityStatsData = await getQualityStats();

            setQualityChecks(qualityChecksData || []);
            setStats(qualityStatsData || null);
        } catch (error) {
            console.error("Failed to load quality data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMachines = async () => {
        try {
            const res = await getMachines();
            setMachines(res.data);
        } catch (error) {
            console.error("Failed to load machines", error);
        }
    };

    const loadOrders = async () => {
        try {
            const res = await getOrders();
            setOrders(res.data);
        } catch (error) {
            console.error("Failed to load orders", error);
        }
    };

    const applyFilters = async () => {
        setLoading(true);
        try {
            let filteredData = [];
            if (filterMachine && filterMachine !== "") {
                const data = await getQualityChecksByMachine(filterMachine);
                filteredData = data || [];
            } else if (filterStatus && filterStatus !== "") {
                const data = await getAllQualityChecks();
                filteredData = (data || []).filter(q => q.status === filterStatus);
            } else {
                const data = await getAllQualityChecks();
                filteredData = data || [];
            }

            // Apply search filter
            if (searchTerm) {
                filteredData = filteredData.filter(q =>
                    q.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    q.inspector?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            setQualityChecks(filteredData);
        } catch (error) {
            console.error("Failed to apply filters", error);
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilterMachine("");
        setFilterStatus("");
        setFilterDate("");
        setSearchTerm("");
        loadData();
    };

    const handleMachineChange = (mId) => {
        if (!mId) {
            setFormData({ ...formData, machineId: "", productionOrderId: "", partNumber: "", quantityProduced: "" });
            return;
        }
        const machineId = parseInt(mId);
        // Find the most relevant order (Prefer ACTIVE batches, then latest COMPLETED)
        const relevantOrder = [...orders]
            .filter(o => o.machineId === machineId)
            .sort((a, b) => {
                if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
                if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
                return (b.id || 0) - (a.id || 0);
            })[0];

        if (relevantOrder) {
            setFormData({
                ...formData,
                machineId: mId,
                productionOrderId: relevantOrder.id.toString(),
                partNumber: relevantOrder.partNumber,
                quantityProduced: relevantOrder.quantity.toString(),
                quantityPassed: relevantOrder.quantity.toString() // Default pass all
            });
        } else {
            setFormData({ ...formData, machineId: mId, productionOrderId: "", partNumber: "", quantityProduced: "" });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await recordQualityCheck({
                productionOrderId: parseInt(formData.productionOrderId),
                machineId: parseInt(formData.machineId),
                partNumber: formData.partNumber,
                quantityProduced: parseInt(formData.quantityProduced),
                quantityPassed: parseInt(formData.quantityPassed),
                defectType: formData.defectType || "NONE",
                severity: formData.severity,
                inspector: formData.inspector,
                comments: formData.comments
            });
            setSuccessMessage("Quality check recorded successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            setShowModal(false);
            resetForm();
            loadData();
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
            defectType: "",
            severity: "MINOR",
            inspector: "",
            comments: ""
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PASSED":
                return "bg-green-100 text-green-800";
            case "REWORK_NEEDED":
                return "bg-yellow-100 text-yellow-800";
            case "FAILED":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case "CRITICAL":
                return "bg-red-100 text-red-800";
            case "MAJOR":
                return "bg-orange-100 text-orange-800";
            case "MINOR":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    // Chart component
    const ChartModal = () => {
        const statusCounts = qualityChecks.reduce((acc, check) => {
            acc[check.status] = (acc[check.status] || 0) + 1;
            return acc;
        }, {});

        const defectRateData = qualityChecks.slice(-10).map((check, idx) => ({
            index: idx + 1,
            rate: check.quantityFailed / check.quantityProduced * 100
        }));

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowChartModal(false)}>
                <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Quality Analytics</h3>
                        <button onClick={() => setShowChartModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Distribution */}
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

                        {/* Defect Rate Trend */}
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><LineChart size={18} /> Defect Rate Trend</h4>
                            <div className="space-y-2">
                                {defectRateData.map((point, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span>Batch {point.index}</span>
                                        <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(point.rate, 100)}%` }}></div>
                                        </div>
                                        <span className="font-mono">{point.rate.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Quality Control</h1>
                        <p className="text-gray-500 mt-1">Track quality checks and defect rates</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowChartModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <BarChart3 size={18} />
                            Analytics
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <Plus size={18} />
                            Record Quality Check
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Total Checks</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalChecks}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Passed</p>
                        <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Rework Needed</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.rework}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                        <p className="text-sm text-gray-500">Defect Rate</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.defectRate?.toFixed(1)}%</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Machine</label>
                        <select
                            value={filterMachine}
                            onChange={(e) => setFilterMachine(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm"
                        >
                            <option value="">All Machines</option>
                            {machines.map(m => (
                                <option key={m.id} value={m.id}>{m.machineName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm"
                        >
                            <option value="">All Status</option>
                            <option value="PASSED">Passed</option>
                            <option value="REWORK_NEEDED">Rework Needed</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                        <input
                            type="text"
                            placeholder="Search by part number or inspector..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={applyFilters}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                        >
                            <Filter size={16} />
                            Apply Filters
                        </button>
                        <button
                            onClick={resetFilters}
                            className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
                        >
                            Reset
                        </button>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passed</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-10">Loading...</td>
                                </tr>
                            ) : qualityChecks.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-10 text-gray-500">No quality checks recorded</td>
                                </tr>
                            ) : (
                                qualityChecks.map((check) => (
                                    <tr key={check.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedCheck(check)}>
                                        <td className="px-6 py-4 text-sm">{check.id}</td>
                                        <td className="px-6 py-4 text-sm">{check.productionOrderId}</td>
                                        <td className="px-6 py-4 text-sm">{check.machineId}</td>
                                        <td className="px-6 py-4 font-medium">{check.partNumber}</td>
                                        <td className="px-6 py-4 text-sm">{check.quantityProduced}</td>
                                        <td className="px-6 py-4 text-sm text-green-600">{check.quantityPassed}</td>
                                        <td className="px-6 py-4 text-sm text-red-600">{check.quantityFailed}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(check.status)}`}>
                                                {check.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadge(check.severity)}`}>
                                                {check.severity || "N/A"}
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
            </div>

            {/* Record Quality Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-5 border-b">
                            <h2 className="text-xl font-semibold">Record Quality Check</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Production Order ID *</label>
                                    <select
                                        required
                                        value={formData.productionOrderId}
                                        onChange={(e) => setFormData({ ...formData, productionOrderId: e.target.value })}
                                        className="w-full border p-2 rounded-lg bg-gray-50"
                                    >
                                        <option value="">Select Order</option>
                                        {orders.map(order => (
                                            <option key={order.id} value={order.id}>Order #{order.id} - {order.partNumber}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Machine *</label>
                                    <select
                                        required
                                        value={formData.machineId}
                                        onChange={(e) => handleMachineChange(e.target.value)}
                                        className="w-full border p-2 rounded-lg"
                                    >
                                        <option value="">Select Machine</option>
                                        {machines.map(machine => (
                                            <option key={machine.id} value={machine.id}>{machine.machineName}</option>
                                        ))}
                                    </select>
                                    {formData.machineId && !formData.productionOrderId && (
                                        <p className="text-xs text-amber-600 mt-1">⚠ No active production found on this unit.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Part Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.partNumber}
                                        onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                                        className="w-full border p-2 rounded-lg bg-gray-50"
                                        placeholder="GEAR-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Inspector *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.inspector}
                                        onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantity Produced *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.quantityProduced}
                                        onChange={(e) => setFormData({ ...formData, quantityProduced: Math.max(0, e.target.value) })}
                                        className="w-full border p-2 rounded-lg"
                                        placeholder="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantity Passed *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.quantityPassed}
                                        onChange={(e) => setFormData({ ...formData, quantityPassed: Math.max(0, e.target.value) })}
                                        className="w-full border p-2 rounded-lg"
                                        placeholder="95"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Defect Type</label>
                                    <select
                                        value={formData.defectType}
                                        onChange={(e) => setFormData({ ...formData, defectType: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    >
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
                                    <select
                                        value={formData.severity}
                                        onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                        className="w-full border p-2 rounded-lg"
                                    >
                                        <option value="MINOR">Minor</option>
                                        <option value="MAJOR">Major</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Comments</label>
                                <textarea
                                    value={formData.comments}
                                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                    className="w-full border p-2 rounded-lg"
                                    rows="3"
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
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
                            <div><span className="font-medium">Machine ID:</span> {selectedCheck.machineId}</div>
                            <div><span className="font-medium">Part Number:</span> {selectedCheck.partNumber}</div>
                            <div><span className="font-medium">Quantity Produced:</span> {selectedCheck.quantityProduced}</div>
                            <div><span className="font-medium">Quantity Passed:</span> {selectedCheck.quantityPassed}</div>
                            <div><span className="font-medium">Quantity Failed:</span> {selectedCheck.quantityFailed}</div>
                            <div><span className="font-medium">Defect Rate:</span> {(selectedCheck.quantityFailed / selectedCheck.quantityProduced * 100).toFixed(1)}%</div>
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