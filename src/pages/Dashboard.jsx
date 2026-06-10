import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth, ROLES } from "../context/AuthContext";
import { getMachineCount, getRunningCount } from "../api/machineApi";
import { getOrderCount } from "../api/productionApi";
import { getQualityStats, getAllQualityChecks } from "../api/qualityApi";
import {
    Activity, Cpu, Package, TrendingUp, CheckCircle, XCircle,
    AlertTriangle, BarChart3, Download, RefreshCw, WifiOff,
    ArrowRight, ShieldCheck
} from "lucide-react";

const SERVICE_STATUS = {
    ONLINE: "online",
    OFFLINE: "offline",
    LOADING: "loading",
};

/* ============ Factory Loader ============ */
function FactoryLoader() {
    const [logHistory, setLogHistory] = useState([]);
    const [pct, setPct] = useState(0);
    const [conveyorReady, setConveyorReady] = useState(false);
    const [floorReady, setFloorReady] = useState(false);
    const [visibleMachines, setVisibleMachines] = useState([]);
    const [lights, setLights] = useState({ l1: null, l2: null, l3: null, l4: null, l5: null });
    const [smokeActive, setSmokeActive] = useState(false);
    const [partsActive, setPartsActive] = useState(false);
    const [gears, setGears] = useState({ g1: false, g4: false });
    const timerRef = useRef(null);

    const steps = [
        { pct: 8,   log: "Laying the factory floor...",      action: "floor"     },
        { pct: 18,  log: "Installing CNC turning center...", action: "m1"        },
        { pct: 28,  log: "Mounting milling machine...",      action: "m2"        },
        { pct: 38,  log: "Bolting hydraulic press...",       action: "m3"        },
        { pct: 48,  log: "Connecting molding unit...",       action: "m4"        },
        { pct: 56,  log: "Setting up QC station...",         action: "m5"        },
        { pct: 64,  log: "Starting conveyor belt...",        action: "conveyor"  },
        { pct: 73,  log: "Powering machine service...",      action: "light1"    },
        { pct: 82,  log: "Waking production service...",     action: "light2"    },
        { pct: 91,  log: "Connecting quality service...",    action: "light3"    },
        { pct: 97,  log: "Running parts through line...",    action: "parts"     },
        { pct: 100, log: "All systems operational.",         action: "done"      },
    ];

    useEffect(() => {
        let currentIdx = 0;
        const run = () => {
            if (currentIdx >= steps.length) return;
            const s = steps[currentIdx];
            currentIdx++;
            setPct(s.pct);
            setLogHistory(prev => {
                const updated = prev.length > 0
                    ? [...prev.slice(0, -1), { ...prev[prev.length - 1], done: true }]
                    : prev;
                return [...updated, { text: s.log, done: false }];
            });
            if (s.action === "floor")       setFloorReady(true);
            else if (s.action === "m1")     setVisibleMachines(p => [...p, "m1"]);
            else if (s.action === "m2")     setVisibleMachines(p => [...p, "m2"]);
            else if (s.action === "m3")     setVisibleMachines(p => [...p, "m3"]);
            else if (s.action === "m4")     setVisibleMachines(p => [...p, "m4"]);
            else if (s.action === "m5")     setVisibleMachines(p => [...p, "m5"]);
            else if (s.action === "conveyor") setConveyorReady(true);
            else if (s.action === "light1") { setLights(p => ({ ...p, l1: "#3b82f6" })); setGears(p => ({ ...p, g1: true })); }
            else if (s.action === "light2") { setLights(p => ({ ...p, l2: "#10b981", l3: "#f59e0b" })); setSmokeActive(true); }
            else if (s.action === "light3") { setLights(p => ({ ...p, l4: "#8b5cf6", l5: "#10b981" })); setGears(p => ({ ...p, g4: true })); }
            else if (s.action === "parts")  setPartsActive(true);
            if (s.action !== "done") {
                timerRef.current = setTimeout(run, currentIdx <= 6 ? 850 : 1050);
            }
        };
        timerRef.current = setTimeout(run, 300);
        return () => clearTimeout(timerRef.current);
    }, []);

    const logShow = logHistory.slice(-4);

    const machineConfig = [
        { id: "m1", label: "CNC",   icon: "gear" },
        { id: "m2", label: "Mill",   icon: "chart" },
        { id: "m3", label: "Press",  icon: "press", hasSmoke: true },
        { id: "m4", label: "Mold",   icon: "mold" },
        { id: "m5", label: "QC",     icon: "check" },
    ];

    const iconMap = {
        gear:  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" style={{ width: "56%", height: "56%" }}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        chart: <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" style={{ width: "52%", height: "52%" }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
        press: <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" style={{ width: "52%", height: "52%" }}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
        mold: <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" style={{ width: "52%", height: "52%" }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
        check:<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" style={{ width: "46%", height: "46%" }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    };

    return (
        <div className="factory-loader">
            <style>{`
                .factory-loader {
                    background: #f8fafc; min-height: 100vh;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 32px 16px;
                    font-family: Georgia, 'Times New Roman', serif;
                }
                @keyframes gearsp { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
                @keyframes blink  { 0%,100%{opacity:1} 40%{opacity:0.1} }
                @keyframes smokeup { 0%{transform:translateY(0) scale(1);opacity:0.4} 100%{transform:translateY(-28px) scale(3);opacity:0} }
                @keyframes partmove { 0%{left:-12px;opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{left:calc(100% + 12px);opacity:0} }
                @keyframes beltmove { from{transform:translateX(0)} to{transform:translateX(-25px)} }
                .mslot { transition: opacity 0.6s ease, transform 0.6s ease; }

                .factory-grid {
                    display: flex; flex-wrap: wrap; justify-content: center;
                    gap: clamp(6px, 1.5vw, 14px); width: 100%;
                    max-width: 540px; margin-bottom: 28px;
                }
                .machine-cell {
                    display: flex; flex-direction: column; align-items: center;
                    flex: 0 0 auto; opacity: 0; transform: translateY(16px);
                    transition: opacity 0.5s ease, transform 0.5s ease;
                }
                .machine-cell.visible { opacity: 1; transform: translateY(0); }
                .machine-block {
                    width: clamp(48px, 11vw, 72px); height: clamp(52px, 12vw, 80px);
                    background: #fff; border-radius: 8px;
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; position: relative;
                }
                .machine-label {
                    font-size: clamp(7px, 1.6vw, 9px); color: #94a3b8;
                    letter-spacing: 0.12em; margin-top: 5px;
                    text-transform: uppercase; font-family: Georgia, serif; white-space: nowrap;
                }
                .machine-light {
                    width: 6px; height: 6px; border-radius: 50%;
                    position: absolute; top: 8px; right: 6px;
                }
                .conveyor-track {
                    width: 100%; max-width: 500px; height: 12px;
                    background: #e2e8f0; overflow: hidden; margin: 0 auto 32px;
                    border-radius: 2px; opacity: 0; transition: opacity 0.5s;
                }
                .conveyor-track.active { opacity: 1; }
                .conveyor-belt {
                    display: flex; position: absolute; top: 3px;
                    animation: beltmove 0.9s linear infinite;
                }
                @media (max-width: 480px) {
                    .machine-block { width: 44px; height: 48px; }
                    .conveyor-track { height: 8px; }
                    .machine-label { font-size: 6px; }
                    .machine-light { width: 4px; height: 4px; top: 4px; right: 4px; }
                }
            `}</style>

            <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 24, letterSpacing: "0.04em", textAlign: "center" }}>
                assembling your factory floor
            </p>

            {/* Machines Grid */}
            <div className="factory-grid">
                {machineConfig.map(m => (
                    <div key={m.id} className={`machine-cell ${visibleMachines.includes(m.id) ? "visible" : ""}`}>
                        <div className="machine-block" style={{
                            border: `1.5px solid ${
                                m.id === "m1" ? "#bfdbfe" : m.id === "m2" ? "#bbf7d0" :
                                m.id === "m3" ? "#fde68a" : m.id === "m4" ? "#ddd6fe" : "#bbf7d0"
                            }`
                        }}>
                            <div className="machine-light" style={{
                                background: lights[m.id === "m1" ? "l1" : m.id === "m2" ? "l2" : m.id === "m3" ? "l3" : m.id === "m4" ? "l4" : "l5"] || "#e2e8f0",
                                animation: lights[m.id === "m1" ? "l1" : m.id === "m2" ? "l2" : m.id === "m3" ? "l3" : m.id === "m4" ? "l4" : "l5"] ? "pulse 1.2s ease-in-out infinite" : "none"
                            }} />
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: "100%", height: "100%",
                                animation: m.id === "m1" && gears.g1 ? "gearsp 2s linear infinite" :
                                           m.id === "m4" && gears.g4 ? "gearsp 3s linear infinite" : "none"
                            }}>
                                {iconMap[m.icon]}
                            </div>
                            {m.hasSmoke && smokeActive && (
                                <>
                                    <div style={{ position: "absolute", top: -2, left: "30%", width: 4, height: 4, borderRadius: "50%", background: "#94a3b8", animation: "smokeup 2.2s ease-out infinite" }} />
                                    <div style={{ position: "absolute", top: -2, left: "55%", width: 4, height: 4, borderRadius: "50%", background: "#94a3b8", animation: "smokeup 2.2s ease-out infinite 0.7s" }} />
                                </>
                            )}
                        </div>
                        <span className="machine-label">{m.label}</span>
                    </div>
                ))}
            </div>

            {/* Conveyor */}
            <div style={{ position: "relative", width: "100%", maxWidth: 500, margin: "0 auto 20px" }}>
                <div style={{ position: "absolute", bottom: 0, left: "8%", right: "8%", height: 2, background: "#cbd5e1", transform: floorReady ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: "transform 1s ease" }} />
                <div className={`conveyor-track ${conveyorReady ? "active" : ""}`} style={{ position: "relative" }}>
                    <div className="conveyor-belt">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} style={{ width: 24, height: 6, background: "#cbd5e1", borderRight: "1px solid #e2e8f0", flexShrink: 0 }} />
                        ))}
                    </div>
                </div>
                {partsActive && (
                    <>
                        <div style={{ width: 8, height: 7, borderRadius: 2, background: "#93c5fd", position: "absolute", bottom: 2, left: "8%", animation: "partmove 2.2s linear infinite" }} />
                        <div style={{ width: 8, height: 7, borderRadius: 2, background: "#6ee7b7", position: "absolute", bottom: 2, left: "8%", animation: "partmove 2.2s linear infinite 0.8s" }} />
                        <div style={{ width: 8, height: 7, borderRadius: 2, background: "#fcd34d", position: "absolute", bottom: 2, left: "8%", animation: "partmove 2.2s linear infinite 1.6s" }} />
                    </>
                )}
            </div>

            {/* Log */}
            <div style={{ width: "100%", maxWidth: 380 }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", height: 80, overflow: "hidden" }}>
                    {logShow.map((l, i) => (
                        <div key={i} style={{ fontSize: 12, lineHeight: 1.9, fontFamily: "Georgia, serif", fontStyle: "italic", color: l.done ? "#64748b" : "#0f172a", transition: "color 0.3s" }}>
                            {l.text}
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                        {logShow[logShow.length - 1]?.text || "initialising..."}
                    </span>
                    <span style={{ fontSize: 14, color: "#0f172a", fontFamily: "Georgia, serif" }}>{pct}%</span>
                </div>
                <div style={{ height: 2, background: "#e2e8f0", borderRadius: 1, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#334155", borderRadius: 1, width: `${pct}%`, transition: "width 0.8s ease" }} />
                </div>
            </div>
        </div>
    );
}

/* ============ Skeleton ============ */
function SkeletonCard({ spanFull }) {
    return (
        <div className={`skeleton-card ${spanFull ? "skeleton-full" : ""}`}>
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                .skeleton-card {
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 200% 100%; animation: shimmer 1.5s infinite;
                    border-radius: 14px; height: 100px;
                }
                .skeleton-full { grid-column: 1 / -1; }
                @media (max-width: 480px) { .skeleton-card { height: 76px; } }
            `}</style>
        </div>
    );
}

/* ============ Sub-components ============ */
function SectionLabel({ title, subtitle }) {
    return (
        <div className="section-label-wrap" style={{ marginBottom: 10, marginTop: 4 }}>
            <style>{`
                .section-label-wrap h2 {
                    margin: 0; font-weight: 700; color: #0f172a;
                    text-transform: uppercase; letter-spacing: 0.06em;
                    font-size: clamp(12px, 2vw, 14px);
                }
                .section-label-wrap p {
                    margin: 2px 0 0; color: #94a3b8;
                    font-size: clamp(11px, 1.6vw, 13px);
                }
            `}</style>
            <h2>{title}</h2>
            <p>{subtitle}</p>
        </div>
    );
}

function StatCard({ label, value, icon, accent, accentBg, sub, onClick, offline, offlineMsg }) {
    return (
        <div
            className="stat-card"
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
            style={{ cursor: onClick ? "pointer" : "default" }}
        >
            <style>{`
                .stat-card {
                    background: ${offline ? "#f8fafc" : "#fff"};
                    border: 1px solid #e2e8f0; border-radius: 14px;
                    padding: clamp(14px, 2vw, 20px); position: relative;
                    transition: box-shadow 0.15s, transform 0.15s;
                    animation: fadeUp 0.3s ease both;
                }
                .stat-card:hover {
                    ${!offline && onClick ? "box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-2px);" : ""}
                }
                @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

                .stat-label {
                    margin: 0 0 6px; font-weight: 600; color: #94a3b8;
                    text-transform: uppercase; letter-spacing: 0.06em;
                    font-size: clamp(10px, 1.5vw, 12px);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .stat-value {
                    margin: 0; font-weight: 800; color: #0f172a;
                    letter-spacing: -0.5px; line-height: 1.1;
                    font-size: clamp(24px, 5vw, 32px);
                }
                .stat-sub {
                    margin: 4px 0 0; color: #94a3b8;
                    font-size: clamp(10px, 1.5vw, 12px);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .stat-icon-box {
                    width: clamp(32px, 5vw, 40px); height: clamp(32px, 5vw, 40px);
                    border-radius: 10px; display: flex; align-items: center;
                    justify-content: center; flex-shrink: 0; margin-left: 10px;
                    background: ${offline ? "#f1f5f9" : accentBg};
                }
                .stat-offline-msg {
                    font-size: clamp(12px, 1.8vw, 14px); color: #cbd5e1; font-weight: 500;
                }
            `}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="stat-label">{label}</p>
                    {offline ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <WifiOff size={14} color="#cbd5e1" />
                            <span className="stat-offline-msg">{offlineMsg}</span>
                        </div>
                    ) : (
                        <>
                            <p className="stat-value">{value}</p>
                            <p className="stat-sub">{sub}</p>
                        </>
                    )}
                </div>
                <div className="stat-icon-box">
                    {offline ? <WifiOff size={16} color="#cbd5e1" /> : icon}
                </div>
            </div>
            {onClick && !offline && (
                <div style={{ position: "absolute", bottom: 10, right: 14 }}>
                    <ArrowRight size={12} color={accent} />
                </div>
            )}
        </div>
    );
}

function QualityBar({ passed, rework, failed, total }) {
    const pw = ((passed / total) * 100).toFixed(1);
    const rw = ((rework / total) * 100).toFixed(1);
    const fw = ((failed / total) * 100).toFixed(1);
    return (
        <div className="quality-bar">
            <style>{`
                .quality-bar {
                    background: #fff; border: 1px solid #e2e8f0;
                    border-radius: 14px; padding: clamp(12px, 2vw, 20px);
                }
                .qb-title {
                    margin: 0 0 10px; font-weight: 600; color: #94a3b8;
                    text-transform: uppercase; letter-spacing: 0.06em;
                    font-size: clamp(10px, 1.5vw, 12px);
                }
                .qb-track {
                    display: flex; border-radius: 100px; overflow: hidden; gap: 2px;
                    height: clamp(8px, 1.5vw, 12px);
                }
                .qb-legend {
                    display: flex; gap: clamp(8px, 2vw, 16px); margin-top: 8px; flex-wrap: wrap;
                }
                .qb-legend-item {
                    display: flex; align-items: center; gap: 5px;
                    font-size: clamp(10px, 1.5vw, 12px); color: #64748b; white-space: nowrap;
                }
                .qb-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
            `}</style>
            <p className="qb-title">Quality breakdown</p>
            <div className="qb-track">
                <div style={{ width: `${pw}%`, background: "#10b981", borderRadius: "100px 0 0 100px" }} title={`Passed: ${pw}%`} />
                <div style={{ width: `${rw}%`, background: "#f59e0b" }} title={`Rework: ${rw}%`} />
                <div style={{ width: `${fw}%`, background: "#ef4444", borderRadius: "0 100px 100px 0" }} title={`Failed: ${fw}%`} />
            </div>
            <div className="qb-legend">
                {[["#10b981", `Passed ${pw}%`], ["#f59e0b", `Rework ${rw}%`], ["#ef4444", `Failed ${fw}%`]].map(([color, label]) => (
                    <div key={label} className="qb-legend-item">
                        <div className="qb-legend-dot" style={{ background: color }} />
                        <span>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        PASSED:        { bg: "#f0fdf4", color: "#166534", label: "Passed"  },
        REWORK_NEEDED: { bg: "#fffbeb", color: "#92400e", label: "Rework"  },
        FAILED:        { bg: "#fef2f2", color: "#991b1b", label: "Failed"  },
    };
    const s = map[status] || { bg: "#f1f5f9", color: "#475569", label: status };
    return (
        <span className="status-badge" style={{ background: s.bg, color: s.color }}>
            <style>{`
                .status-badge {
                    font-size: clamp(10px, 1.4vw, 11px); font-weight: 700;
                    padding: 2px 8px; border-radius: 20px;
                    text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
                }
            `}</style>
            {s.label}
        </span>
    );
}

function SystemBanner({ services, onRetry }) {
    const anyOffline = Object.values(services).some(s => s === SERVICE_STATUS.OFFLINE);
    if (!anyOffline) return null;
    const allOffline = Object.values(services).every(s => s === SERVICE_STATUS.OFFLINE);
    return (
        <div className="system-banner">
            <style>{`
                .system-banner {
                    background: #fffbeb; border: 1px solid #fde68a;
                    border-radius: 10px; padding: 12px 14px; margin-bottom: 20px;
                    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
                }
                .system-banner p {
                    margin: 0; color: #92400e; line-height: 1.5; flex: 1;
                    font-size: clamp(12px, 1.6vw, 13px);
                }
                .retry-btn {
                    white-space: nowrap; font-size: 12px; font-weight: 600;
                    color: #92400e; background: none; border: 1px solid #fde68a;
                    border-radius: 6px; padding: 4px 12px; cursor: pointer; flex-shrink: 0;
                }
                @media (max-width: 480px) {
                    .system-banner { padding: 10px 12px; flex-direction: column; align-items: flex-start; }
                }
            `}</style>
            <div style={{ flexShrink: 0, display: "flex" }}>
                <AlertTriangle size={16} color="#b45309" />
            </div>
            <p>
                {allOffline
                    ? "🔧 We're performing some maintenance. Please check back in a few minutes."
                    : "⚠️ Some sections are temporarily unavailable. We're working on it."
                }
            </p>
            <button onClick={onRetry} className="retry-btn">Try again</button>
        </div>
    );
}

function SectionUnavailable() {
    return (
        <div className="section-unavail">
            <style>{`
                .section-unavail {
                    background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 10px; padding: 12px 16px;
                    display: flex; align-items: center; gap: 8px;
                }
                .section-unavail p {
                    margin: 0; color: #94a3b8;
                    font-size: clamp(12px, 1.6vw, 13px);
                }
            `}</style>
            <AlertTriangle size={14} color="#94a3b8" />
            <p>This section is temporarily unavailable.</p>
        </div>
    );
}

function QuickAction({ label, icon, color, onClick }) {
    return (
        <button
            onClick={onClick}
            className="quick-action"
            style={{ border: `1.5px solid ${color}22`, background: `${color}0d`, color }}
        >
            {icon} {label}
            <style>{`
                .quick-action {
                    display: flex; align-items: center; gap: 6px;
                    padding: clamp(7px, 1.5vw, 9px) clamp(12px, 2vw, 18px);
                    border-radius: 8px; font-size: clamp(12px, 1.6vw, 13px);
                    font-weight: 600; cursor: pointer; transition: background 0.15s;
                    white-space: nowrap;
                }
                .quick-action:hover { opacity: 0.85; }
            `}</style>
        </button>
    );
}

function ReportRow({ label, value, color, offline }) {
    return (
        <div className="report-row">
            <style>{`
                .report-row {
                    display: flex; justify-content: space-between;
                    align-items: center; padding: 5px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                .report-row span:first-child {
                    font-size: clamp(12px, 1.6vw, 13px); color: #64748b;
                }
                .report-row span:last-child {
                    font-size: clamp(12px, 1.6vw, 13px); font-weight: 700;
                    text-align: right; margin-left: 8px;
                }
            `}</style>
            <span>{label}</span>
            <span style={{ color: offline ? "#cbd5e1" : color || "#0f172a" }}>
                {value}
            </span>
        </div>
    );
}

/* ============ Reports Drawer ============ */
function ReportsDrawer({ open, onClose, services, machineStats, productionStats, qualityStats, defectColors, reportPeriod, setReportPeriod, downloadReport }) {
    return (
        <>
            <div
                onClick={onClose}
                className="reports-backdrop"
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                    zIndex: 1000, opacity: open ? 1 : 0,
                    pointerEvents: open ? "all" : "none", transition: "opacity 0.3s ease"
                }}
            />

            <div className="reports-drawer" style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}>
                <style>{`
                    .reports-drawer {
                        position: fixed; top: 0; right: 0; height: 100%;
                        background: #fff; z-index: 1001;
                        box-shadow: -4px 0 32px rgba(0,0,0,0.12);
                        transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
                        display: flex; flex-direction: column;
                        font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
                        width: clamp(300px, 40vw, 420px);
                    }
                    .drawer-header {
                        padding: clamp(14px, 2vw, 24px) clamp(16px, 2.5vw, 24px);
                        border-bottom: 1px solid #f1f5f9;
                        display: flex; align-items: center; justify-content: space-between;
                        flex-shrink: 0;
                    }
                    .drawer-body {
                        flex: 1; overflow-y: auto;
                        padding: clamp(14px, 2vw, 24px) clamp(16px, 2.5vw, 24px);
                    }
                    .drawer-footer {
                        padding: clamp(12px, 2vw, 16px) clamp(16px, 2.5vw, 24px);
                        border-top: 1px solid #f1f5f9; flex-shrink: 0;
                    }
                    .download-btn {
                        width: 100%; display: flex; align-items: center;
                        justify-content: center; gap: 8px; background: #0f172a;
                        color: #fff; border: none; border-radius: 10px;
                        padding: clamp(10px, 1.5vw, 12px) 16px;
                        font-size: clamp(13px, 1.6vw, 14px); font-weight: 600;
                        cursor: pointer;
                    }
                    .drawer-title {
                        margin: 0; font-weight: 700; color: #0f172a;
                        font-size: clamp(14px, 2vw, 16px);
                    }
                    .drawer-sub {
                        margin: 2px 0 0; color: #94a3b8;
                        font-size: clamp(11px, 1.5vw, 12px);
                    }
                    .drawer-close {
                        background: #f1f5f9; border: none; border-radius: 8px;
                        width: 32px; height: 32px; display: flex; align-items: center;
                        justify-content: center; cursor: pointer; color: #64748b; flex-shrink: 0;
                    }
                    .report-period-label {
                        font-size: clamp(10px, 1.4vw, 11px); font-weight: 600;
                        color: #94a3b8; text-transform: uppercase;
                        letter-spacing: 0.07em; margin-bottom: 8px; margin-top: 0;
                    }
                    .period-btns {
                        display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
                    }
                    .period-btn {
                        padding: 5px 12px; border-radius: 8px;
                        font-size: clamp(12px, 1.5vw, 13px);
                        font-weight: 600; cursor: pointer; text-transform: capitalize;
                    }
                    .summary-card {
                        background: #f8fafc; border: 1px solid #f1f5f9;
                        border-radius: 12px;
                        padding: clamp(12px, 2vw, 16px); margin-bottom: 14px;
                    }
                    .summary-card h4 {
                        margin: 0 0 10px; font-weight: 700; color: #334155;
                        font-size: clamp(12px, 1.6vw, 13px);
                    }
                    @media (max-width: 480px) {
                        .reports-drawer {
                            width: 100%; border-radius: 16px 16px 0 0;
                            top: auto; bottom: 0; height: 85vh;
                            transform: translateY(100%);
                        }
                        .reports-drawer[style*="translateX(0)"] { transform: translateY(0) !important; }
                    }
                `}</style>

                {/* Header */}
                <div className="drawer-header">
                    <div>
                        <h3 className="drawer-title">Manufacturing Reports</h3>
                        <p className="drawer-sub">Summary across all services</p>
                    </div>
                    <button onClick={onClose} className="drawer-close">
                        <XCircle size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="drawer-body">
                    <p className="report-period-label">Report Period</p>
                    <div className="period-btns">
                        {["day", "week", "month", "year"].map(p => (
                            <button
                                key={p}
                                onClick={() => setReportPeriod(p)}
                                className="period-btn"
                                style={{
                                    border: reportPeriod === p ? "none" : "1px solid #e2e8f0",
                                    background: reportPeriod === p ? "#6366f1" : "#fff",
                                    color: reportPeriod === p ? "#fff" : "#64748b"
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="summary-card">
                        <h4>Production Summary</h4>
                        <ReportRow label="Total Orders" value={services.production === SERVICE_STATUS.OFFLINE ? "Unavailable" : productionStats.orderCount} offline={services.production === SERVICE_STATUS.OFFLINE} />
                        <ReportRow label="Total Machines" value={services.machines === SERVICE_STATUS.OFFLINE ? "Unavailable" : machineStats.machineCount} offline={services.machines === SERVICE_STATUS.OFFLINE} />
                        <ReportRow label="Running Machines" value={services.machines === SERVICE_STATUS.OFFLINE ? "Unavailable" : machineStats.runningCount} offline={services.machines === SERVICE_STATUS.OFFLINE} />
                    </div>

                    <div className="summary-card">
                        <h4>Quality Summary</h4>
                        <ReportRow label="Total Checks" value={services.quality === SERVICE_STATUS.OFFLINE ? "Unavailable" : qualityStats.totalChecks} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                        <ReportRow label="Passed" value={services.quality === SERVICE_STATUS.OFFLINE ? "Unavailable" : qualityStats.passedChecks} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                        <ReportRow label="Rework" value={services.quality === SERVICE_STATUS.OFFLINE ? "Unavailable" : qualityStats.reworkChecks} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                        <ReportRow label="Failed" value={services.quality === SERVICE_STATUS.OFFLINE ? "Unavailable" : qualityStats.failedChecks} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                        <ReportRow label="Defect Rate" value={services.quality === SERVICE_STATUS.OFFLINE ? "Unavailable" : `${qualityStats.defectRate.toFixed(1)}%`} color={defectColors?.text} offline={services.quality === SERVICE_STATUS.OFFLINE} />
                    </div>

                    {services.quality === SERVICE_STATUS.ONLINE && qualityStats.totalChecks > 0 && (
                        <QualityBar passed={qualityStats.passedChecks} rework={qualityStats.reworkChecks} failed={qualityStats.failedChecks} total={qualityStats.totalChecks} />
                    )}
                </div>

                {/* Footer */}
                <div className="drawer-footer">
                    <button onClick={downloadReport} className="download-btn">
                        <Download size={15} /> Download JSON Report
                    </button>
                </div>
            </div>
        </>
    );
}

/* ============ Retry with Backoff ============ */
const BACKOFF = [2000, 4000, 8000, 16000, 30000];
const retryTimers = {};

function scheduleRetry(fetchFn, label) {
    if (!retryTimers[label]) retryTimers[label] = { attempts: 0 };
    const state = retryTimers[label];
    state.attempts++;
    const idx = Math.min(state.attempts - 1, BACKOFF.length - 1);
    const delay = BACKOFF[idx];
    console.info(`[Dashboard] Retrying ${label} in ${delay}ms (attempt ${state.attempts})...`);
    state.timer = setTimeout(() => {
        fetchFn();
    }, delay);
}

function clearRetries() {
    Object.keys(retryTimers).forEach(k => {
        if (retryTimers[k].timer) clearTimeout(retryTimers[k].timer);
    });
}

/* ============ Main Dashboard ============ */
export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [machineStats, setMachineStats] = useState({ machineCount: 0, runningCount: 0 });
    const [productionStats, setProductionStats] = useState({ orderCount: 0 });
    const [qualityStats, setQualityStats] = useState({
        totalChecks: 0, passedChecks: 0, reworkChecks: 0,
        failedChecks: 0, defectRate: 0, recentChecks: []
    });
    const [services, setServices] = useState({
        machines: SERVICE_STATUS.LOADING,
        production: SERVICE_STATUS.LOADING,
        quality: SERVICE_STATUS.LOADING,
    });
    const [showReports, setShowReports] = useState(false);
    const [reportPeriod, setReportPeriod] = useState("week");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [toast, setToast] = useState(null);
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowLoader(false), 10000);
        return () => clearTimeout(timer);
    }, []);

    const firstLoad = showLoader || (
        services.machines === SERVICE_STATUS.LOADING
        && services.production === SERVICE_STATUS.LOADING
        && services.quality === SERVICE_STATUS.LOADING
    );

    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        fetchAll();
        return () => clearRetries();
    }, []);

    const showToastMsg = (message) => {
        setToast({ message });
        setTimeout(() => setToast(null), 3000);
    };

    const unwrap = (res, fallback = 0) => {
        if (res === null || res === undefined) return fallback;
        if (typeof res === "number") return res;
        if (typeof res?.data === "number") return res.data;
        if (typeof res?.data?.count === "number") return res.data.count;
        if (typeof res?.count === "number") return res.count;
        if (typeof res?.data === "object" && res.data !== null) return res.data;
        return fallback;
    };

    const fetchMachines = async () => {
        setServices(prev => ({ ...prev, machines: SERVICE_STATUS.LOADING }));
        try {
            const [machinesRes, runningRes] = await Promise.all([getMachineCount(), getRunningCount()]);
            setMachineStats({ machineCount: unwrap(machinesRes), runningCount: unwrap(runningRes) });
            setServices(prev => ({ ...prev, machines: SERVICE_STATUS.ONLINE }));
        } catch (err) {
            console.warn("[Dashboard] Machine service error:", err?.message);
            setServices(prev => ({ ...prev, machines: SERVICE_STATUS.OFFLINE }));
            scheduleRetry(fetchMachines, "machines");
        }
    };

    const fetchProduction = async () => {
        setServices(prev => ({ ...prev, production: SERVICE_STATUS.LOADING }));
        try {
            const ordersRes = await getOrderCount();
            setProductionStats({ orderCount: unwrap(ordersRes) });
            setServices(prev => ({ ...prev, production: SERVICE_STATUS.ONLINE }));
        } catch (err) {
            console.warn("[Dashboard] Production service error:", err?.message);
            setServices(prev => ({ ...prev, production: SERVICE_STATUS.OFFLINE }));
            scheduleRetry(fetchProduction, "production");
        }
    };

    const fetchQuality = async () => {
        setServices(prev => ({ ...prev, quality: SERVICE_STATUS.LOADING }));
        try {
            const [qs, qc] = await Promise.all([getQualityStats(), getAllQualityChecks()]);
            const s = qs?.data ?? qs ?? {};
            const checks = qc?.data ?? qc ?? [];
            setQualityStats({
                totalChecks:  s.totalChecks ?? s.total ?? 0,
                passedChecks: s.passed ?? s.passedChecks ?? 0,
                reworkChecks: s.rework ?? s.reworkChecks ?? 0,
                failedChecks: s.failed ?? s.failedChecks ?? 0,
                defectRate:   s.defectRate ?? s.defect_rate ?? 0,
                recentChecks: Array.isArray(checks) ? checks.slice(-3) : []
            });
            setServices(prev => ({ ...prev, quality: SERVICE_STATUS.ONLINE }));
        } catch (err) {
            console.warn("[Dashboard] Quality service error:", err?.message);
            setServices(prev => ({ ...prev, quality: SERVICE_STATUS.OFFLINE }));
            scheduleRetry(fetchQuality, "quality");
        }
    };

    const fetchAll = useCallback(() => {
        fetchMachines();
        fetchProduction();
        fetchQuality();
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [fetchAll]);

    const downloadReport = () => {
        const blob = new Blob([JSON.stringify({
            generatedAt: new Date().toISOString(), period: reportPeriod,
            stats: {
                totalMachines: machineStats.machineCount,
                runningMachines: machineStats.runningCount,
                totalOrders: productionStats.orderCount,
                quality: {
                    totalChecks: qualityStats.totalChecks,
                    passed: qualityStats.passedChecks,
                    rework: qualityStats.reworkChecks,
                    failed: qualityStats.failedChecks,
                    defectRate: `${qualityStats.defectRate.toFixed(1)}%`
                }
            },
            recentQualityChecks: qualityStats.recentChecks
        }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `manufacturing-report-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToastMsg("Report downloaded successfully!");
    };

    const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(0) : 0;
    const uptimePct = pct(machineStats.runningCount, machineStats.machineCount);
    const isManager = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;

    const getDefectColor = (rate) => {
        if (rate < 5)  return { bg: "#f0fdf4", text: "#15803d", badge: "#dcfce7", badgeText: "#166534" };
        if (rate < 15) return { bg: "#fffbeb", text: "#b45309", badge: "#fef3c7", badgeText: "#92400e" };
        return           { bg: "#fef2f2", text: "#dc2626", badge: "#fee2e2", badgeText: "#991b1b" };
    };
    const defectColors = getDefectColor(qualityStats.defectRate);

    if (firstLoad) {
        return (
            <MainLayout>
                <FactoryLoader />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="dashboard-container">
                <style>{`
                    .dashboard-container {
                        font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
                        max-width: 1280px; margin: 0 auto;
                        padding: 0 clamp(4px, 1vw, 16px);
                    }
                    .grid-2c { display: grid; grid-template-columns: repeat(auto-fit, minmax(clamp(160px, 30vw, 240px), 1fr)); gap: clamp(10px, 1.5vw, 16px); }
                    .grid-4c { display: grid; grid-template-columns: repeat(auto-fit, minmax(clamp(140px, 25vw, 220px), 1fr)); gap: clamp(10px, 1.5vw, 16px); }
                    .grid-span-2 { grid-column: span 2; }

                    .dash-header {
                        display: flex; justify-content: space-between;
                        align-items: flex-start; flex-wrap: wrap; gap: 12px;
                        margin-bottom: clamp(20px, 3vw, 32px); padding-top: 4px;
                    }
                    .dash-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
                    .dash-btn-secondary {
                        display: flex; align-items: center; gap: 5px;
                        padding: clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 16px);
                        border-radius: 8px; border: 1px solid #e2e8f0;
                        background: #fff; color: #334155;
                        font-size: clamp(12px, 1.5vw, 14px); font-weight: 500;
                        cursor: pointer; white-space: nowrap;
                    }
                    .dash-title {
                        font-size: clamp(20px, 4vw, 26px); font-weight: 700;
                        color: #0f172a; margin: 0; letter-spacing: -0.5px;
                    }
                    .dash-role-badge {
                        background: #f1f5f9; color: #64748b;
                        font-size: clamp(10px, 1.4vw, 12px); font-weight: 500;
                        padding: 2px 8px; border-radius: 20px;
                        border: 1px solid #e2e8f0; white-space: nowrap;
                    }
                    .dash-timestamp {
                        color: #94a3b8; margin: 0;
                        font-size: clamp(12px, 1.6vw, 14px);
                    }
                    .dash-toast {
                        position: fixed; bottom: clamp(12px, 3vw, 24px);
                        right: clamp(12px, 3vw, 24px); z-index: 9999;
                        background: #1e293b; color: #fff;
                        padding: clamp(10px, 1.5vw, 12px) clamp(14px, 2vw, 20px);
                        border-radius: 10px; font-size: clamp(12px, 1.6vw, 14px);
                        box-shadow: 0 4px 24px rgba(0,0,0,0.18);
                        display: flex; align-items: center; gap: 8px; max-width: 90vw;
                    }

                    .uptime-card {
                        background: #fff; border: 1px solid #e2e8f0;
                        border-radius: 14px; padding: clamp(14px, 2vw, 20px);
                        display: flex; flex-direction: column; gap: 6px;
                        grid-column: 1 / -1;
                    }
                    .uptime-track {
                        background: #f1f5f9; border-radius: 100px;
                        height: clamp(6px, 1vw, 8px); overflow: hidden;
                    }
                    .uptime-fill {
                        height: 100%; border-radius: 100px;
                        transition: width 1s ease;
                    }
                    .section-mb { margin-bottom: clamp(16px, 2.5vw, 24px); }

                    .defect-card {
                        border-radius: 14px;
                        padding: clamp(14px, 2vw, 20px);
                        display: flex; flex-direction: column; gap: 6px;
                    }
                    .defect-label {
                        font-size: clamp(11px, 1.5vw, 13px);
                        font-weight: 600; opacity: 0.8;
                    }
                    .defect-value {
                        font-size: clamp(28px, 5vw, 36px); font-weight: 800;
                        letter-spacing: -1px; line-height: 1;
                    }
                    .defect-badge {
                        font-size: clamp(10px, 1.4vw, 11px);
                        padding: 2px 8px; border-radius: 20px;
                        align-self: flex-start; font-weight: 600;
                        white-space: nowrap;
                    }

                    .recent-checks-card {
                        background: #fff; border: 1px solid #e2e8f0;
                        border-radius: 14px; overflow: hidden; margin-top: 14px;
                    }
                    .checks-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    .checks-table-wrap table { width: 100%; border-collapse: collapse; font-size: clamp(12px, 1.5vw, 14px); }
                    .checks-table-wrap th {
                        padding: clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 20px); text-align: left;
                        font-size: clamp(10px, 1.3vw, 11px); font-weight: 600;
                        color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;
                        background: #f8fafc; white-space: nowrap;
                    }
                    .checks-table-wrap td {
                        padding: clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 20px);
                        border-top: 1px solid #f1f5f9; white-space: nowrap;
                    }
                    .checks-header {
                        padding: clamp(12px, 2vw, 16px) clamp(14px, 2vw, 20px);
                        border-bottom: 1px solid #f1f5f9;
                        display: flex; justify-content: space-between;
                        align-items: center; flex-wrap: wrap; gap: 8px;
                    }
                    .view-all-btn {
                        display: flex; align-items: center; gap: 4px;
                        background: none; border: none; color: #6366f1;
                        font-size: clamp(12px, 1.5vw, 13px); font-weight: 600;
                        cursor: pointer; white-space: nowrap;
                    }
                    .quick-actions-card {
                        background: #fff; border: 1px solid #e2e8f0;
                        border-radius: 14px;
                        padding: clamp(16px, 2.5vw, 24px);
                        margin-top: clamp(20px, 3vw, 24px); margin-bottom: 16px;
                    }
                    .qa-title {
                        margin: 0 0 clamp(10px, 1.5vw, 14px);
                        font-size: clamp(13px, 1.8vw, 15px);
                        font-weight: 700; color: #0f172a;
                    }
                    .qa-btns {
                        display: flex; flex-wrap: wrap;
                        gap: clamp(6px, 1.5vw, 10px);
                    }

                    @media (max-width: 480px) {
                        .grid-span-2 { grid-column: 1 / -1; }
                        .dashboard-container { padding: 0 2px; }
                    }
                `}</style>

                {/* Toast */}
                {toast && (
                    <div className="dash-toast">
                        <CheckCircle size={16} color="#4ade80" /> {toast.message}
                    </div>
                )}

                {/* Header */}
                <div className="dash-header">
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <h1 className="dash-title">Dashboard</h1>
                            <span className="dash-role-badge">{user?.role}</span>
                        </div>
                        <p className="dash-timestamp">
                            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Loading data…"}
                        </p>
                    </div>
                    <div className="dash-actions">
                        <button onClick={fetchAll} className="dash-btn-secondary">
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {isManager && (
                            <button
                                onClick={() => setShowReports(!showReports)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 16px)",
                                    borderRadius: 8, fontSize: "clamp(12px, 1.5vw, 14px)",
                                    fontWeight: 600, cursor: "pointer",
                                    border: showReports ? "none" : "1.5px solid #6366f1",
                                    background: showReports ? "#6366f1" : "#fff",
                                    color: showReports ? "#fff" : "#6366f1",
                                    whiteSpace: "nowrap", transition: "all 0.15s"
                                }}
                            >
                                <BarChart3 size={14} />
                                {showReports ? "Hide Reports" : "Reports"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Service health banner */}
                {Object.values(services).some(s => s === SERVICE_STATUS.OFFLINE) && (
                    <SystemBanner services={services} onRetry={fetchAll} />
                )}

                {/* ── MACHINES ── */}
                <SectionLabel title="Machines" subtitle="Equipment status" />
                <div className="grid-2c section-mb">
                    {services.machines === SERVICE_STATUS.LOADING ? (
                        <><SkeletonCard /><SkeletonCard /></>
                    ) : services.machines === SERVICE_STATUS.OFFLINE ? (
                        <div style={{ gridColumn: "1 / -1" }}><SectionUnavailable /></div>
                    ) : (
                        <>
                            <StatCard
                                label="Total Machines" value={machineStats.machineCount}
                                icon={<Cpu size={18} color="#6366f1" />}
                                accent="#6366f1" accentBg="#eef2ff"
                                sub="Registered equipment" onClick={() => navigate("/machines")}
                            />
                            <StatCard
                                label="Running Now" value={machineStats.runningCount}
                                icon={<Activity size={18} color="#10b981" />}
                                accent="#10b981" accentBg="#f0fdf4"
                                sub={`${uptimePct}% uptime`} onClick={() => navigate("/machines")}
                            />
                            {services.machines === SERVICE_STATUS.ONLINE && machineStats.machineCount > 0 && (
                                <div className="uptime-card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                                        <span style={{ fontSize: "clamp(11px, 1.5vw, 13px)", color: "#64748b", fontWeight: 500 }}>Machine uptime</span>
                                        <span style={{ fontSize: "clamp(12px, 1.6vw, 13px)", fontWeight: 700, color: uptimePct >= 70 ? "#15803d" : uptimePct >= 40 ? "#b45309" : "#dc2626" }}>
                                            {uptimePct}%
                                        </span>
                                    </div>
                                    <div className="uptime-track">
                                        <div className="uptime-fill" style={{
                                            width: `${uptimePct}%`,
                                            background: uptimePct >= 70 ? "#10b981" : uptimePct >= 40 ? "#f59e0b" : "#ef4444"
                                        }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                                        <span style={{ fontSize: "clamp(10px, 1.4vw, 12px)", color: "#94a3b8" }}>{machineStats.runningCount} running</span>
                                        <span style={{ fontSize: "clamp(10px, 1.4vw, 12px)", color: "#94a3b8" }}>{machineStats.machineCount - machineStats.runningCount} idle</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── PRODUCTION ── */}
                {isManager && (
                    <>
                        <SectionLabel title="Production" subtitle="Orders and scheduling" />
                        <div className="grid-2c section-mb">
                            {services.production === SERVICE_STATUS.OFFLINE ? (
                                <SectionUnavailable />
                            ) : (
                                <StatCard
                                    label="Production Orders" value={productionStats.orderCount}
                                    icon={<Package size={18} color="#8b5cf6" />}
                                    accent="#8b5cf6" accentBg="#f5f3ff"
                                    sub="Total orders created" onClick={() => navigate("/production")}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* ── QUALITY ── */}
                {isManager && (
                    <>
                        <SectionLabel title="Quality" subtitle="Inspection results" />
                        {services.quality === SERVICE_STATUS.LOADING ? (
                            <div className="grid-4c section-mb">
                                {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : services.quality === SERVICE_STATUS.OFFLINE ? (
                            <SectionUnavailable />
                        ) : (
                            <>
                                <div className="grid-4c" style={{ marginBottom: 12 }}>
                                    <div className="defect-card" style={{ background: defectColors.bg, border: `1.5px solid ${defectColors.badge}` }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <span className="defect-label" style={{ color: defectColors.text }}>Defect Rate</span>
                                            {qualityStats.defectRate < 5 ? <ShieldCheck size={18} color={defectColors.text} /> : qualityStats.defectRate < 15 ? <AlertTriangle size={18} color={defectColors.text} /> : <XCircle size={18} color={defectColors.text} />}
                                        </div>
                                        <span className="defect-value" style={{ color: defectColors.text }}>
                                            {qualityStats.defectRate.toFixed(1)}%
                                        </span>
                                        <span className="defect-badge" style={{ background: defectColors.badge, color: defectColors.badgeText }}>
                                            {qualityStats.defectRate < 5 ? "Excellent" : qualityStats.defectRate < 15 ? "Needs improvement" : "Critical"}
                                        </span>
                                    </div>
                                    <StatCard label="Total Checks" value={qualityStats.totalChecks} icon={<TrendingUp size={18} color="#6366f1" />} accent="#6366f1" accentBg="#eef2ff" sub={`${qualityStats.passedChecks} passed`} onClick={() => navigate("/quality")} />
                                    <StatCard label="Passed" value={qualityStats.passedChecks} icon={<CheckCircle size={18} color="#10b981" />} accent="#10b981" accentBg="#f0fdf4" sub={`${pct(qualityStats.passedChecks, qualityStats.totalChecks)}%`} onClick={() => navigate("/quality")} />
                                    <StatCard label="Rework" value={qualityStats.reworkChecks} icon={<AlertTriangle size={18} color="#f59e0b" />} accent="#f59e0b" accentBg="#fffbeb" sub={`${pct(qualityStats.reworkChecks, qualityStats.totalChecks)}%`} onClick={() => navigate("/quality")} />
                                    <StatCard label="Failed" value={qualityStats.failedChecks} icon={<XCircle size={18} color="#ef4444" />} accent="#ef4444" accentBg="#fef2f2" sub={`${pct(qualityStats.failedChecks, qualityStats.totalChecks)}%`} onClick={() => navigate("/quality")} />
                                </div>

                                {qualityStats.totalChecks > 0 && (
                                    <QualityBar passed={qualityStats.passedChecks} rework={qualityStats.reworkChecks} failed={qualityStats.failedChecks} total={qualityStats.totalChecks} />
                                )}

                                {qualityStats.recentChecks.length > 0 && (
                                    <div className="recent-checks-card">
                                        <div className="checks-header">
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: "clamp(13px, 1.8vw, 15px)", fontWeight: 600, color: "#0f172a" }}>Recent Quality Checks</h3>
                                                <p style={{ margin: "2px 0 0", fontSize: "clamp(11px, 1.4vw, 12px)", color: "#94a3b8" }}>Last 3 inspections</p>
                                            </div>
                                            <button onClick={() => navigate("/quality")} className="view-all-btn">
                                                View all <ArrowRight size={12} />
                                            </button>
                                        </div>
                                        <div className="checks-table-wrap">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Order ID</th>
                                                        <th>Part Number</th>
                                                        <th>Status</th>
                                                        <th>Inspector</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {qualityStats.recentChecks.map((check) => (
                                                        <tr key={check.id}>
                                                            <td style={{ color: "#475569" }}>{check.productionOrderId}</td>
                                                            <td style={{ fontWeight: 600, color: "#0f172a" }}>{check.partNumber}</td>
                                                            <td><StatusBadge status={check.status} /></td>
                                                            <td style={{ color: "#475569" }}>{check.inspector}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ── REPORTS ── */}
                {isManager && (
                    <ReportsDrawer
                        open={showReports}
                        onClose={() => setShowReports(false)}
                        services={services}
                        machineStats={machineStats}
                        productionStats={productionStats}
                        qualityStats={qualityStats}
                        defectColors={defectColors}
                        reportPeriod={reportPeriod}
                        setReportPeriod={setReportPeriod}
                        downloadReport={downloadReport}
                    />
                )}

                {/* ── QUICK ACTIONS ── */}
                <div className="quick-actions-card">
                    <h3 className="qa-title">Quick Actions</h3>
                    <div className="qa-btns">
                        <QuickAction label="Start Production" icon={<Activity size={13} />} color="#6366f1" onClick={() => navigate("/production")} />
                        {isManager && <QuickAction label="Record Quality Check" icon={<CheckCircle size={13} />} color="#10b981" onClick={() => navigate("/quality")} />}
                        <QuickAction label="Manage Machines" icon={<Cpu size={13} />} color="#8b5cf6" onClick={() => navigate("/machines")} />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}