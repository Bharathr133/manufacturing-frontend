import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    OPERATOR: "OPERATOR",
};

const DUMMY_USERS = [
    { username: "admin", password: "password123", role: ROLES.ADMIN, name: "Super Admin" },
    { username: "manager", password: "manager456", role: ROLES.MANAGER, name: "Production Lead" },
    { username: "operator", password: "operator789", role: ROLES.OPERATOR, name: "Technician" },
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("manufacturing_user");
        return saved ? JSON.parse(saved) : null;
    });

    const login = (username, password) => {
        const found = DUMMY_USERS.find((candidate) => candidate.username === username && candidate.password === password);
        if (!found) return false;

        const { password: _password, ...userData } = found;
        setUser(userData);
        localStorage.setItem("manufacturing_user", JSON.stringify(userData));
        return true;
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
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
