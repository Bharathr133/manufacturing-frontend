import { NavLink } from 'react-router-dom';
import { Home, Settings, Package, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/machines', label: 'Machines', icon: Settings },
    { path: '/production', label: 'Production', icon: Package },
    { path: '/quality', label: 'Quality', icon: CheckCircle },
];

export default function Sidebar({ isOpen, setIsOpen }) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:relative z-30 bg-gradient-to-b from-gray-900 to-gray-800 text-white 
                    shadow-xl transition-all duration-300 flex flex-col
                    ${isOpen ? 'w-64' : 'w-20'}
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className={`p-6 border-b border-gray-700 ${!isOpen && 'px-4'}`}>
                    {isOpen ? (
                        <>
                            <h1 className="text-2xl font-bold tracking-tight">MES</h1>
                            <p className="text-xs text-gray-400 mt-1">Manufacturing System</p>
                        </>
                    ) : (
                        <h1 className="text-xl font-bold tracking-tight text-center">M</h1>
                    )}
                </div>

                <nav className="flex-1 mt-6">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                } ${!isOpen && 'justify-center px-4'}`
                            }
                        >
                            <Icon size={20} />
                            {isOpen && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Toggle button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="hidden lg:flex items-center justify-center p-3 border-t border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    {isOpen && <span className="ml-2 text-sm">Collapse</span>}
                </button>
            </aside>
        </>
    );
}