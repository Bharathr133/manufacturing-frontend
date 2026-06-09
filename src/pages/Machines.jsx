import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { getMachines, createMachine, updateMachine } from "../api/machineApi";
import { Search, Edit2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Machines() {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ machineName: "", machineType: "", status: "IDLE" });
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        loadMachines();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type }), 3000);
    };

    const loadMachines = async () => {
        setLoading(true);
        try {
            const res = await getMachines();
            setMachines(res.data);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to load machines";
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.machineName.trim()) {
            showToast("Machine Name is required", "error");
            return;
        }
        if (!formData.machineType) {
            showToast("Machine Type is required", "error");
            return;
        }
        if (editingId && !formData.status) {
            showToast("Status is required", "error");
            return;
        }

        try {
            if (editingId) {
                await updateMachine(editingId, formData);
                showToast("Machine updated successfully", "success");
            } else {
                await createMachine({
                    machineName: formData.machineName.trim(),
                    machineType: formData.machineType,
                });
                showToast("Machine created in IDLE status", "success");
            }
            setModalOpen(false);
            resetForm();
            loadMachines();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || "Operation failed";
            showToast(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg), "error");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ machineName: "", machineType: "", status: "IDLE" });
    };

    const openEditModal = (machine) => {
        setEditingId(machine.id);
        const normalizedStatus = (!machine.status || machine.status === "UNKNOWN") ? "IDLE" : machine.status;
        setFormData({
            machineName: machine.machineName,
            machineType: machine.machineType,
            status: normalizedStatus,
        });
        setModalOpen(true);
    };

    // Filter machines
    const filteredMachines = machines.filter((m) =>
        m.machineName?.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination logic
    const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
    const paginatedMachines = filteredMachines.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status) => {
        const s = (status && ["RUNNING", "STOPPED", "MAINTENANCE"].includes(status)) ? status : "IDLE";
        const statusMap = {
            RUNNING: "bg-green-100 text-green-800",
            STOPPED: "bg-red-100 text-red-800",
            IDLE: "bg-yellow-100 text-yellow-800",
            MAINTENANCE: "bg-gray-100 text-gray-800",
        };
        return statusMap[s] || "bg-blue-100 text-blue-800";
    };

    // Machine types for dropdown
    const machineTypes = ["CNC", "LATHE", "MILL", "DRILL", "GRINDER"];
    const statusOptions = ["RUNNING", "STOPPED", "IDLE", "MAINTENANCE"];

    return (
        <MainLayout>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Machines</h1>
                    <p className="text-gray-500 mt-1">Manage your equipment</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition"
                >
                    <Plus size={18} /> Add Machine
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by machine name..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-80 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-10">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedMachines.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-10 text-gray-500">
                                        {search ? "No machines match your search" : "No machines found"}
                                    </td>
                                </tr>
                            ) : (
                                paginatedMachines.map((machine) => (
                                    <tr key={machine.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm">{machine.id}</td>
                                        <td className="px-6 py-4 font-medium">{machine.machineName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{machine.machineType}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(machine.status)}`}>
                                                {(machine.status && ["RUNNING", "STOPPED", "MAINTENANCE"].includes(machine.status)) ? machine.status : "IDLE"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openEditModal(machine)} className="text-yellow-600 hover:text-yellow-800">
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t">
                        <div className="text-sm text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMachines.length)} of {filteredMachines.length}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-4 py-2 text-sm">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Form with Dropdowns */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-5 border-b">
                            <h2 className="text-xl font-semibold">{editingId ? "Edit Machine" : "New Machine"}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Machine Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter machine name"
                                    value={formData.machineName}
                                    onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Machine Type *</label>
                                <select
                                    value={formData.machineType}
                                    onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">Select Machine Type</option>
                                    {machineTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {editingId && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Operating Status *</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                {editingId ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast.show && (
                <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-white ${toast.type === "error" ? "bg-red-500" : "bg-green-500"} transition-all z-50`}>
                    {toast.message}
                </div>
            )}
        </MainLayout>
    );
}
