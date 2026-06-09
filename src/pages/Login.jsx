import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState("OPERATOR");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const roleCredentials = {
        ADMIN: { u: "admin", p: "password123" },
        MANAGER: { u: "manager", p: "manager456" },
        OPERATOR: { u: "operator", p: "operator789" }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        if (login(username, password)) {
            navigate("/dashboard");
        } else {
            setError("Invalid credentials. Please check your username and password.");
        }
    };

    const handleAutofill = () => {
        const creds = roleCredentials[selectedRole];
        setUsername(creds.u);
        setPassword(creds.p);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tighter italic">
                            MANU<span className="text-blue-600">FACT</span>
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-xs">Enterprise Control</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
                            <AlertCircle size={20} className="shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">System Role</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                            >
                                <option value="OPERATOR">Floor Technician</option>
                                <option value="MANAGER">Production Lead</option>
                                <option value="ADMIN">System Administrator</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    required
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                    placeholder="admin"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition active:scale-[0.98]">
                            Sign In
                        </button>

                        <button
                            type="button"
                            onClick={handleAutofill}
                            className="w-full mt-2 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition"
                        >
                            Initialize {selectedRole} Credentials
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}