import { useState } from 'react';
import { Bell, User, Calendar, Menu, X } from 'lucide-react';

export default function Navbar({ sidebarOpen, setSidebarOpen }) {
    const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }));

    return (
        <header className="bg-white shadow-sm sticky top-0 z-20">
            <div className="flex justify-between items-center px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="hidden lg:flex items-center gap-2 text-gray-500 text-sm">
                        <Calendar size={16} />
                        <span>{currentDate}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-gray-100 relative">
                        <Bell size={20} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded-lg">
                        <User size={20} className="text-gray-600" />
                        <span className="text-sm font-medium hidden sm:inline">Admin</span>
                    </div>
                </div>
            </div>
        </header>
    );
}