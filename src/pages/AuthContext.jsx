import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const ROLES = {
    ADMIN: "ADMIN",       // Full Access
    MANAGER: "MANAGER",   // Production + Quality + Machines
    OPERATOR: "OPERATOR"  // Machines Only
};

const DUMMY_USERS = [
    { username: "admin", password: "password123", role: ROLES.ADMIN, name: "Super Admin" },
    { username: "manager", password: "manager456", role: ROLES.MANAGER, name: "Production Lead" },
    { username: "operator", password: "operator789", role: ROLES.OPERATOR, name: "Technician" },
];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("manufacturing_user");
        return saved ? JSON.parse(saved) : null;
    });

    const login = (username, password) => {
        const found = DUMMY_USERS.find(u => u.username === username && u.password === password);
        if (found) {
            const { password, ...userData } = found;
            setUser(userData);
            localStorage.setItem("manufacturing_user", JSON.stringify(userData));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("manufacturing_user");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);