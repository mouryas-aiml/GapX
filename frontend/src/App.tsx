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
  Sparkles,
  Terminal,
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
const SIM_STORAGE_KEY = "gapx-sim-mode";

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
  const [simulationMode, setSimulationMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIM_STORAGE_KEY);
    if (saved !== null) return saved === "true";
    return typeof window !== "undefined" && window.location.protocol === "https:";
  });

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
    localStorage.setItem(SIM_STORAGE_KEY, String(simulationMode));
  }, [simulationMode]);

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

  const isMixedContent =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    apiBaseUrl.startsWith("http://");

  const [showConnectionGuide, setShowConnectionGuide] = useState(false);

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
            <div className={`status-dot ${isConnected ? "online" : simulationMode ? "online" : "offline"}`} />
            <div className="footer-status-text">
              <span className="status-label">
                {isConnected ? "AI Vision Engine Live" : simulationMode ? "Demo Sim Engine Active" : "API Offline"}
              </span>
              <span className="status-sub">
                {isConnected
                  ? `${healthInfo?.ping_ms ?? 12}ms \u2022 Port 8210`
                  : simulationMode
                  ? "Interactive Demo Mode"
                  : "Click status to fix"}
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
              <p className="topbar-sub">
                {isConnected ? apiBaseUrl : simulationMode ? "⚡ Demo Simulation Mode (Offline Preview)" : apiBaseUrl}
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            {isConnected ? (
              <div
                className="status-pill ok"
                title={`FastAPI backend is live at ${apiBaseUrl}`}
              >
                <Activity size={13} style={{ marginRight: 5 }} />
                Online ({healthInfo?.ping_ms ?? 10}ms)
              </div>
            ) : simulationMode ? (
              <div
                className="status-pill sim clickable"
                onClick={() => setShowConnectionGuide(true)}
                title="Running in Interactive Simulation Mode. Click for local run commands or cloud backend options."
              >
                <Sparkles size={13} style={{ marginRight: 5 }} />
                Simulation Mode
              </div>
            ) : (
              <div
                className="status-pill down clickable"
                onClick={() => setShowConnectionGuide(true)}
                title="FastAPI backend is disconnected. Click to view local and cloud setup instructions."
              >
                <Activity size={13} style={{ marginRight: 5 }} />
                API Disconnected
              </div>
            )}

            {!isConnected && (
              <button
                type="button"
                className={`secondary btn-sm`}
                onClick={() => setSimulationMode((v) => !v)}
                title={simulationMode ? "Switch off simulation mode" : "Enable offline demo simulation"}
                style={{ padding: "5px 11px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <Sparkles size={13} />
                {simulationMode ? "Sim Active" : "Enable Sim"}
              </button>
            )}

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

        {/* Vercel HTTPS Mixed Content Banner */}
        {isMixedContent && !isConnected && (
          <div className="mixed-content-banner card mb-3">
            <div className="banner-left">
              <span className="banner-badge">Vercel Deployment Notice</span>
              <p>
                This app is hosted on <strong>HTTPS (Vercel)</strong>. Browsers block requests to <code>http://localhost:8210</code> (Mixed Content).
                {simulationMode
                  ? " Running in Interactive Demo Simulation so every page, alert, planogram, and benchmark works smoothly!"
                  : " Click 'Enable Sim' to test all features now, or follow the local run guide to start the live Python AI engine."}
              </p>
            </div>
            <div className="banner-actions">
              {!simulationMode && (
                <button
                  type="button"
                  className="btn-primary-link btn-sm"
                  onClick={() => setSimulationMode(true)}
                >
                  ⚡ Enable Demo Mode
                </button>
              )}
              <button
                type="button"
                className="secondary btn-sm"
                onClick={() => setShowConnectionGuide(true)}
              >
                How to Run on Local
              </button>
              <Link to="/settings" className="secondary btn-sm">
                Open Settings
              </Link>
            </div>
          </div>
        )}

        {/* Connection Troubleshooter Modal */}
        {showConnectionGuide && (
          <div className="modal-backdrop">
            <div className="modal-content connection-modal card">
              <div className="modal-header">
                <h3>Connecting GapX to the Python Backend</h3>
                <button
                  type="button"
                  className="icon-btn close-btn"
                  onClick={() => setShowConnectionGuide(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p className="text-muted">
                  The frontend is currently unable to communicate with <code>{apiBaseUrl}</code>. Here is why and how to fix it:
                </p>

                <div className="solution-card">
                  <div className="solution-title">
                    <strong>1. Run Locally on Your Machine (Full Real AI Vision Pipeline)</strong>
                  </div>
                  <p>When running on your computer, both frontend and backend run under HTTP, bypassing browser Mixed Content blocks entirely:</p>
                  <pre>
                    <code># Terminal 1 — Start the FastAPI Backend:
cd K:\GapX
uv run uvicorn shelfsight.api.main:app --host 127.0.0.1 --port 8210 --reload

# Terminal 2 — Start the React Frontend:
cd K:\GapX\frontend
npm run dev -- --host 127.0.0.1 --port 5173</code>
                  </pre>
                  <p className="text-muted text-sm">
                    Open <strong>http://localhost:5173</strong> in your browser — the status will immediately turn green: <code>Online (4ms)</code>.
                  </p>
                </div>

                <div className="solution-card">
                  <div className="solution-title">
                    <strong>2. Instant Free HTTPS Tunnel for Vercel (No Cloud Setup Needed)</strong>
                  </div>
                  <p>Expose your local port 8210 over HTTPS so the Vercel site can reach it securely:</p>
                  <pre>
                    <code>npx localtunnel --port 8210
# OR with Cloudflare:
cloudflared tunnel --url http://localhost:8210</code>
                  </pre>
                  <p className="text-muted text-sm">
                    Copy the generated <code>https://...</code> URL into <Link to="/settings" onClick={() => setShowConnectionGuide(false)}>Settings</Link> and click <strong>Save URL</strong>.
                  </p>
                </div>

                <div className="solution-card">
                  <div className="solution-title">
                    <strong>3. Interactive Demo Simulation Mode (Works Instantly in Browser)</strong>
                  </div>
                  <p>
                    Evaluate all shelf analysis overlays, stockout gap boxes, planogram compliance matrices, restock pick slips, and benchmark reports without needing Python installed:
                  </p>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="primary btn-sm"
                      onClick={() => {
                        setSimulationMode(true);
                        setShowConnectionGuide(false);
                      }}
                    >
                      ⚡ Activate Demo Simulation Mode Now
                    </button>
                  </div>
                </div>

                <div className="solution-card">
                  <div className="solution-title">
                    <strong>4. Deploy Backend to Free Container Cloud (Render / Railway)</strong>
                  </div>
                  <p>Deploy the FastAPI backend to Render or Railway:</p>
                  <pre>
                    <code>Build: uv sync --group dev
Start: uv run uvicorn shelfsight.api.main:app --host 0.0.0.0 --port 10000</code>
                  </pre>
                  <p className="text-muted text-sm">
                    In Vercel project environment variables, set <code>VITE_API_BASE_URL</code> = <code>https://your-service.onrender.com</code>.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <Link
                  to="/settings"
                  className="btn-primary-link"
                  onClick={() => setShowConnectionGuide(false)}
                >
                  Configure in Settings
                </Link>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowConnectionGuide(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
