import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  ScanEye,
  Bell,
  Package,
  History,
  TrendingUp,
  Cpu,
  Settings,
  Sun,
  Moon,
  Activity,
  ShieldCheck,
  Store,
  Menu,
  X,
} from "lucide-react";
import { checkHealthDetails } from "./api";
import type { AnalysisResult, AuditEntry, HealthInfo } from "./types";
import { GapXLogo } from "./components/GapXLogo";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { InventoryPage } from "./pages/InventoryPage";
import { ModelBenchmarkPage } from "./pages/ModelBenchmarkPage";
import { SettingsPage } from "./pages/SettingsPage";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Shelf Analysis", icon: ScanEye },
  { to: "/alerts", label: "Restock Alerts", icon: Bell },
  { to: "/inventory", label: "Inventory & OSA", icon: Package },
  { to: "/history", label: "Audit History", icon: History },
  { to: "/analytics", label: "Analytics & BI", icon: TrendingUp },
  { to: "/benchmark", label: "Model Benchmark", icon: Cpu },
  { to: "/settings", label: "Settings", icon: Settings },
];

const API_STORAGE_KEY = "gapx-api-url";
const AUDITS_STORAGE_KEY = "gapx-audit-history";
const THEME_STORAGE_KEY = "gapx-theme";

function getStored<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function App() {
  const location = useLocation();
  const [apiBaseUrl, setApiBaseUrl] = useState(
    localStorage.getItem(API_STORAGE_KEY) ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8210"
  );
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [audits, setAudits] = useState<AuditEntry[]>(() =>
    getStored<AuditEntry[]>(AUDITS_STORAGE_KEY, [])
  );
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem(THEME_STORAGE_KEY) as "dark" | "light" | null) || "dark"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(AUDITS_STORAGE_KEY, JSON.stringify(audits));
  }, [audits]);

  useEffect(() => {
    localStorage.setItem(API_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    let active = true;
    async function pollHealth() {
      const info = await checkHealthDetails(apiBaseUrl);
      if (active) {
        setHealthInfo(info);
      }
    }
    pollHealth();
    const timer = window.setInterval(pollHealth, 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl]);

  const latestResult = useMemo(() => audits[0]?.result ?? null, [audits]);

  function appendAudit(source: "upload" | "demo" | "camera", result: AnalysisResult, filename?: string) {
    setAudits((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        source,
        filename,
        storeId: "Store #402",
        result,
      },
      ...prev,
    ]);
  }

  function clearHistory() {
    if (window.confirm("Are you sure you want to clear all stored audit history?")) {
      setAudits([]);
      localStorage.removeItem(AUDITS_STORAGE_KEY);
    }
  }

  const isConnected = !!healthInfo && healthInfo.status === "ok";

  return (
    <div className="app-shell">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Modern Enterprise Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand-wrapper">
          <GapXLogo size={42} showText={true} />
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Store Context Badge */}
        <div className="store-pill-sidebar">
          <Store size={14} className="text-accent mr-2" />
          <div className="store-pill-info">
            <span className="store-name">Store #402</span>
            <span className="store-loc">Downtown Supercenter</span>
          </div>
        </div>

        {/* Main Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>
                {item.to === "/alerts" && latestResult && latestResult.alerts.length > 0 && (
                  <span className="nav-alert-bubble">{latestResult.alerts.length}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Telemetry */}
        <div className="sidebar-footer">
          <div className="footer-status">
            <div className={`status-dot ${isConnected ? "online" : "offline"}`} />
            <div className="footer-status-text">
              <span className="status-label">{isConnected ? "AI Vision Engine Live" : "API Offline"}</span>
              <span className="status-sub">
                {isConnected ? `${healthInfo?.ping_ms ?? 12}ms &bull; Port 8210` : "Reconnecting..."}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Command Surface */}
      <main className="main-panel">
        {/* Top Command Bar */}
        <header className="topbar card">
          <div className="topbar-left">
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="topbar-title-wrap">
                <span className="topbar-title">Retail Shelf Command Center</span>
                <span className="badge-pill store-badge">Store #402</span>
              </div>
              <p className="topbar-sub">{apiBaseUrl}</p>
            </div>
          </div>

          <div className="topbar-actions">
            <div className={`status-pill ${isConnected ? "ok" : "down"}`}>
              <Activity size={13} style={{ marginRight: 5 }} />
              {isConnected ? `Online (${healthInfo?.ping_ms ?? 10}ms)` : "API Disconnected"}
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Page Routing */}
        <AnimatePresence mode="wait">
          <motion.section
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="route-content"
          >
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    latestResult={latestResult}
                    audits={audits}
                    connected={isConnected}
                  />
                }
              />
              <Route
                path="/analyze"
                element={
                  <AnalyzePage
                    apiBaseUrl={apiBaseUrl}
                    latestResult={latestResult}
                    onStoreAudit={appendAudit}
                  />
                }
              />
              <Route
                path="/alerts"
                element={<AlertsPage latestResult={latestResult} apiBaseUrl={apiBaseUrl} />}
              />
              <Route
                path="/inventory"
                element={<InventoryPage latestResult={latestResult} />}
              />
              <Route
                path="/history"
                element={<HistoryPage audits={audits} onClearHistory={clearHistory} />}
              />
              <Route
                path="/analytics"
                element={<AnalyticsPage audits={audits} />}
              />
              <Route
                path="/benchmark"
                element={<ModelBenchmarkPage apiBaseUrl={apiBaseUrl} />}
              />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    apiBaseUrl={apiBaseUrl}
                    onSetApiBaseUrl={setApiBaseUrl}
                    allowedOriginsHint="http://localhost:5173, http://127.0.0.1:5173, http://localhost:8711"
                  />
                }
              />
            </Routes>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
