import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { checkHealth } from "./api";
import type { AnalysisResult, AuditEntry } from "./types";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { InventoryPage } from "./pages/InventoryPage";
import { SettingsPage } from "./pages/SettingsPage";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/analyze", label: "Shelf Analysis" },
  { to: "/alerts", label: "Restock Alerts" },
  { to: "/inventory", label: "Inventory" },
  { to: "/history", label: "Audit History" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" }
];

const API_STORAGE_KEY = "gapx-api-url";
const AUDITS_STORAGE_KEY = "gapx-audit-history";
const THEME_STORAGE_KEY = "gapx-theme";

function getStored<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
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
  const [connected, setConnected] = useState<boolean>(false);
  const [audits, setAudits] = useState<AuditEntry[]>(() =>
    getStored<AuditEntry[]>(AUDITS_STORAGE_KEY, [])
  );
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem(THEME_STORAGE_KEY) as "dark" | "light" | null) || "dark"
  );

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
      const ok = await checkHealth(apiBaseUrl);
      if (active) {
        setConnected(ok);
      }
    }
    pollHealth();
    const timer = window.setInterval(pollHealth, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl]);

  const latestResult = useMemo(() => audits[0]?.result ?? null, [audits]);

  function appendAudit(source: "upload" | "demo", result: AnalysisResult, filename?: string) {
    setAudits((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        source,
        filename,
        result
      },
      ...prev
    ]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GX</div>
          <div>
            <h1>GapX</h1>
            <p>AI Shelf Intelligence</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <header className="topbar card">
          <div>
            <strong>Retail Shelf Command Center</strong>
            <p>{apiBaseUrl}</p>
          </div>
          <div className="topbar-actions">
            <span className={connected ? "status-pill ok" : "status-pill down"}>
              {connected ? "API Connected" : "API Disconnected"}
            </span>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.section
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route
                path="/"
                element={<DashboardPage latestResult={latestResult} audits={audits} connected={connected} />}
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
              <Route path="/alerts" element={<AlertsPage latestResult={latestResult} apiBaseUrl={apiBaseUrl} />} />
              <Route path="/inventory" element={<InventoryPage latestResult={latestResult} />} />
              <Route path="/history" element={<HistoryPage audits={audits} />} />
              <Route path="/analytics" element={<AnalyticsPage audits={audits} />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    apiBaseUrl={apiBaseUrl}
                    onSetApiBaseUrl={setApiBaseUrl}
                    allowedOriginsHint="http://localhost:5173,http://127.0.0.1:5173"
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

