import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, ROLES } from "../context/AuthContext";
import { LayoutDashboard, Cpu, Package, ClipboardCheck, LogOut, Menu, X, UserCircle } from "lucide-react";

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
        { name: "Machines", href: "/machines", icon: Cpu, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
        { name: "Production", href: "/production", icon: Package, roles: [ROLES.ADMIN, ROLES.MANAGER] },
        { name: "Quality", href: "/quality", icon: ClipboardCheck, roles: [ROLES.ADMIN, ROLES.MANAGER] },
    ];

    const allowedNavigation = navigation.filter(item => item.roles.includes(user?.role));

    const NavItem = ({ item }) => (
        <NavLink
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                    isActive ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
            }
        >
            <item.icon size={22} />
            <span className="font-semibold">{item.name}</span>
        </NavLink>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-white fixed inset-y-0 left-0 z-50">
                <div className="p-8 text-2xl font-black italic tracking-tighter">MANU<span className="text-blue-500">FACT</span></div>
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {allowedNavigation.map((item) => <NavItem key={item.name} item={item} />)}
                </nav>
                <div className="p-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <UserCircle className="text-blue-400" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold truncate">{user?.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{user?.role}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition font-bold text-xs">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${sidebarOpen ? "visible" : "invisible"}`}>
                <div 
                    className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0"}`} 
                    onClick={() => setSidebarOpen(false)} 
                />
                <aside className={`absolute inset-y-0 left-0 w-72 bg-slate-900 text-white p-6 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="text-2xl font-black italic">MANU<span className="text-blue-500">FACT</span></div>
                        <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded-full"><X size={24} /></button>
                    </div>
                    <nav className="space-y-2">
                        {allowedNavigation.map((item) => <NavItem key={item.name} item={item} />)}
                    </nav>
                </aside>
            </div>

            <div className="flex-1 flex flex-col lg:ml-72 min-w-0">
                <header className="lg:hidden bg-white sticky top-0 z-40 h-16 flex items-center justify-between px-6 border-b">
                    <div className="text-xl font-black italic">MANU<span className="text-blue-600">FACT</span></div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                </header>
                <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">{children}</main>
            </div>
        </div>
    );
}