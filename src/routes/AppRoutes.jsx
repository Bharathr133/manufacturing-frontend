import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Machines from "../pages/Machines";
import Production from "../pages/Production";
import Quality from "../pages/Quality";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/machines" element={<Machines />} />
            <Route path="/production" element={<Production />} />
            <Route path="/quality" element={<Quality />} />
        </Routes>
    );
}