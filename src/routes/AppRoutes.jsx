import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";
import Machines from "../pages/Machines";
import Production from "../pages/Production";
import Quality from "../pages/Quality";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/machines" element={<Machines />} />
            <Route path="/production" element={<Production />} />
            <Route path="/quality" element={<Quality />} />
        </Routes>
    );
}
