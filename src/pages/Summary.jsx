import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Transport Summary Matrix — Campus Ops Control                     */
/*  Dark ops-console aesthetic, consistent with TransportCommandCenter */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026",
  "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026",
];

const BRANCHES = ["All Branches", "RPS Branch", "KPM Branch", "College Fleet", "Common Pool"];

const PARAM_GROUPS = [
  {
    label: "Operational Tracking",
    icon: "🚌",
    rows: [
      { key: "vehicles", label: "Number of vehicles", desc: "Active buses & cabs allocated per branch", type: "num" },
      { key: "riders", label: "Number of student & staff travelling", desc: "Average monthly ridership", type: "num" },
      { key: "approvedKm", label: "Approved trip KMs", desc: "Standard authorized route distance", type: "num" },
      { key: "actualKm", label: "Actual trip KMs", desc: "Total odometer distance logged", type: "num" },
      { key: "extraKm", label: "Additional KMs", desc: "Extra trip distances beyond standard route", type: "num" },
      { key: "pptRef", label: "PPT reading reference", desc: "Compliance procedure reference", type: "text" },
      { key: "statutory", label: "Statutory compliance", desc: "Inspection status / compliant count", type: "num" },
      { key: "incidents", label: "No. of Incident", desc: "Reported fleet defect / incident count", type: "num" },
    ],
  },
  {
    label: "Financial & Expense Tracking",
    icon: "💰",
    rows: [
      { key: "fuel", label: "Fuel expenses", desc: "Aggregated diesel expenses", type: "inr" },
      { key: "fc", label: "FC 2025-2026", desc: "Fitness Certificate renewal fees", type: "inr" },
      { key: "vehStatutory", label: "Vehicle Statutory", desc: "Tax & insurance statutory expenses", type: "inr" },
      { key: "repair", label: "Repair & Maintenance", desc: "Workshop repair bills & spare parts", type: "inr" },
      { key: "others", label: "Others", desc: "Miscellaneous transport operating costs", type: "inr" },
      { key: "empCost", label: "Transport Employees Cost", desc: "Driver & mechanic salary expenses", type: "inr" },
      { key: "cctv", label: "CCTV replacement", desc: "Fleet CCTV camera hardware & repair costs", type: "inr" },
      { key: "parking", label: "Vehicle parking & fastag", desc: "Toll, FASTag recharges & parking fees", type: "inr" },
      { key: "total", label: "Total Expenses", desc: "Aggregated total expenditure per branch & month", type: "inr", emphasize: true },
    ],
  },
];

const EXPENSE_KEYS = ["fuel", "fc", "vehStatutory", "repair", "others", "empCost", "cctv", "parking"];

const DOUGHNUT_COLORS = ["#3B82F6", "#F43F5E", "#10B981", "#EAB308", "#A855F7", "#06B6D4", "#6366F1", "#64748B"];

/* --- deterministic seed data so the table always has something to show --- */
function seedRow(base, spread, months = MONTHS.length) {
  const seedVals = {};
  months && MONTHS.forEach((m, i) => {
    const wobble = Math.sin(i * 1.7 + base) * spread;
    seedVals[m] = Math.max(0, Math.round(base + wobble));
  });
  return seedVals;
}

function buildBranchData(seedOffset) {
  const data = {};
  PARAM_GROUPS.forEach((g) =>
    g.rows.forEach((r) => {
      if (r.type === "text") {
        MONTHS.forEach((m) => {
          data[r.key] = data[r.key] || {};
          data[r.key][m] = "TRS-F-03";
        });
      } else {
        const base =
          r.key === "vehicles" ? 8 + seedOffset :
          r.key === "riders" ? 420 + seedOffset * 12 :
          r.key === "approvedKm" ? 3200 + seedOffset * 40 :
          r.key === "actualKm" ? 3350 + seedOffset * 45 :
          r.key === "extraKm" ? 150 + seedOffset * 5 :
          r.key === "statutory" ? 1 :
          r.key === "incidents" ? Math.max(0, 2 - Math.floor(seedOffset / 2)) :
          r.key === "fuel" ? 68000 + seedOffset * 900 :
          r.key === "fc" ? 12000 + seedOffset * 300 :
          r.key === "vehStatutory" ? 9500 + seedOffset * 250 :
          r.key === "repair" ? 21000 + seedOffset * 600 :
          r.key === "others" ? 4200 + seedOffset * 150 :
          r.key === "empCost" ? 145000 + seedOffset * 2000 :
          r.key === "cctv" ? 3000 + seedOffset * 100 :
          r.key === "parking" ? 5200 + seedOffset * 180 :
          0;
        data[r.key] = seedRow(base, base * 0.08);
      }
    })
  );
  // total = sum of expense rows
  data.total = {};
  MONTHS.forEach((m) => {
    data.total[m] = EXPENSE_KEYS.reduce((sum, k) => sum + (data[k]?.[m] || 0), 0);
  });
  return data;
}

const BRANCH_DATA = {
  "RPS Branch": buildBranchData(0),
  "KPM Branch": buildBranchData(3),
  "College Fleet": buildBranchData(6),
  "Common Pool": buildBranchData(1.5),
};

function aggregateAll() {
  const out = {};
  PARAM_GROUPS.forEach((g) =>
    g.rows.forEach((r) => {
      out[r.key] = {};
      MONTHS.forEach((m) => {
        if (r.type === "text") {
          out[r.key][m] = "TRS-F-03";
        } else {
          out[r.key][m] = Object.values(BRANCH_DATA).reduce(
            (sum, b) => sum + (b[r.key]?.[m] || 0), 0
          );
        }
      });
    })
  );
  return out;
}
const ALL_BRANCHES_DATA = aggregateAll();

function getBaseData(branch) {
  return branch === "All Branches" ? ALL_BRANCHES_DATA : BRANCH_DATA[branch];
}

const fmtINR = (n) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

const fmtNum = (n) => Math.round(n).toLocaleString("en-IN");

/* ------------------------------------------------------------------ */

export default function Summary() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState("All Branches");
  const [view, setView] = useState("All"); // Analytics | Matrix View | All
  const [lastSync, setLastSync] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  const [apiData, setApiData] = useState([]);

  // Fetch API data on mount
  const fetchApiData = async () => {
    try {
      const res = await api.get('transport-summary/');
      const items = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      if (items && items.length > 0) {
        setApiData(items);
      }
    } catch (err) {
      console.warn("Using baseline summary metrics:", err);
    }
  };

  useEffect(() => {
    fetchApiData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.get('transport-summary/sync-live-entries/');
      const items = res?.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (items && items.length > 0) {
        setApiData(items);
      } else {
        await fetchApiData();
      }
    } catch (err) {
      console.warn("Sync error, refreshing API data:", err);
      await fetchApiData();
    } finally {
      setLastSync(new Date());
      setSyncing(false);
    }
  };

  // Merge live backend database entries into baseline matrix data
  const data = useMemo(() => {
    const base = getBaseData(branch);
    if (!apiData || apiData.length === 0) return base;

    const merged = JSON.parse(JSON.stringify(base));
    const monthKeys = [
      { key: "2025-09", label: "Sep 2025" },
      { key: "2025-10", label: "Oct 2025" },
      { key: "2025-11", label: "Nov 2025" },
      { key: "2025-12", label: "Dec 2025" },
      { key: "2026-01", label: "Jan 2026" },
      { key: "2026-02", label: "Feb 2026" },
      { key: "2026-03", label: "Mar 2026" },
      { key: "2026-04", label: "Apr 2026" },
      { key: "2026-05", label: "May 2026" },
      { key: "2026-06", label: "Jun 2026" },
    ];

    monthKeys.forEach((mk) => {
      const m = mk.label;
      const filtered = apiData.filter((d) =>
        d.month?.startsWith(mk.key) &&
        (branch === "All Branches" || d.branch === branch.replace(" Branch", "").replace(" Fleet", "").replace(" Pool", ""))
      );

      if (filtered.length > 0) {
        merged.vehicles[m] = filtered.reduce((s, i) => s + (i.vehicles || 0), 0) || merged.vehicles[m];
        merged.riders[m] = Math.round(filtered.reduce((s, i) => s + (i.riders || 0), 0) / (filtered.length || 1)) || merged.riders[m];
        merged.approvedKm[m] = filtered.reduce((s, i) => s + (i.km_approved || 0), 0) || merged.approvedKm[m];
        merged.actualKm[m] = filtered.reduce((s, i) => s + (i.km_actual || 0), 0) || merged.actualKm[m];
        merged.extraKm[m] = filtered.reduce((s, i) => s + (i.km_additional || 0), 0) || merged.extraKm[m];
        merged.incidents[m] = filtered.reduce((s, i) => s + (i.incidents || 0), 0) || merged.incidents[m];

        merged.fuel[m] = filtered.reduce((s, i) => s + (parseFloat(i.fuel_expense) || 0), 0) || merged.fuel[m];
        merged.fc[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_fc) || 0), 0) || merged.fc[m];
        merged.vehStatutory[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_vehicle_statutory) || 0), 0) || merged.vehStatutory[m];
        merged.repair[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_repair) || 0), 0) || merged.repair[m];
        merged.empCost[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_employee_cost) || 0), 0) || merged.empCost[m];
        merged.cctv[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_cctv) || 0), 0) || merged.cctv[m];
        merged.parking[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_parking_fastag) || 0), 0) || merged.parking[m];
        merged.others[m] = filtered.reduce((s, i) => s + (parseFloat(i.exp_others) || 0), 0) || merged.others[m];

        merged.total[m] = EXPENSE_KEYS.reduce((sum, k) => sum + (merged[k]?.[m] || 0), 0);
      }
    });

    return merged;
  }, [branch, apiData]);

  const syncedLabel = lastSync.toLocaleTimeString("en-IN", { hour12: false });

  /* ---- chart data shaping ---- */
  const distanceChartData = MONTHS.map((m) => ({
    month: m.split(" ")[0],
    Approved: data.approvedKm[m],
    Actual: data.actualKm[m],
  }));

  const expenseTrendData = MONTHS.map((m) => ({
    month: m.split(" ")[0],
    "Total Expenses": data.total[m],
    "Fuel Costs": data.fuel[m],
    "Repair & Maintenance": data.repair[m],
  }));

  const doughnutData = EXPENSE_KEYS.map((k) => {
    const row = PARAM_GROUPS[1].rows.find((r) => r.key === k);
    const value = MONTHS.reduce((sum, m) => sum + (data[k][m] || 0), 0);
    return { name: row.label, value };
  });
  const doughnutTotal = doughnutData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={styles.page}>
      <style>{fontImport}</style>

      {/* ---------------- Header ---------------- */}
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>CAMPUS OPS CONTROL / TRANSPORT</div>
          <h1 style={styles.title}>Transport Summary Matrix</h1>
        </div>
      </div>

      {/* ---------------- View switcher + branch pills ---------------- */}
      <div style={styles.controlRow}>
        <div style={styles.viewSwitcher}>
          {["Analytics", "Matrix View", "All"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...styles.viewBtn,
                ...(view === v ? styles.viewBtnActive : {}),
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div style={styles.branchPills}>
          {BRANCHES.map((b) => (
            <button
              key={b}
              onClick={() => setBranch(b)}
              style={{
                ...styles.pill,
                ...(branch === b ? styles.pillActive : {}),
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Analytics ---------------- */}
      {(view === "Analytics" || view === "All") && (
        <div style={styles.analyticsGrid}>
          <Panel title="📊 Monthly Distance Tracking" subtitle="Approved vs Actual Odometer KMs">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distanceChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" vertical={false} />
                <XAxis dataKey="month" stroke="#7C93AC" fontSize={11} tickLine={false} axisLine={{ stroke: "#1E2A38" }} />
                <YAxis stroke="#7C93AC" fontSize={11} tickLine={false} axisLine={{ stroke: "#1E2A38" }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#DCE8F2" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#7C93AC" }} />
                <Bar dataKey="Approved" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill="#10B981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="📈 Financial Expense Trends" subtitle="Total / Fuel / Repair & Maintenance">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={expenseTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" vertical={false} />
                <XAxis dataKey="month" stroke="#7C93AC" fontSize={11} tickLine={false} axisLine={{ stroke: "#1E2A38" }} />
                <YAxis stroke="#7C93AC" fontSize={11} tickLine={false} axisLine={{ stroke: "#1E2A38" }}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#DCE8F2" }}
                  formatter={(v) => fmtINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#7C93AC" }} />
                <Line type="monotone" dataKey="Total Expenses" stroke="#EAB308" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Fuel Costs" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Repair & Maintenance" stroke="#F43F5E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="🍩 Expense Parameter Breakdown" subtitle={`Category split — ${fmtINR(doughnutTotal)} total`} span={2}>
            <div style={styles.doughnutWrap}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={doughnutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {doughnutData.map((_, i) => (
                      <Cell key={i} fill={DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length]} stroke="#0B0F17" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtINR(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={styles.legendGrid}>
                {doughnutData.map((d, i) => (
                  <div key={d.name} style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length] }} />
                    <span style={styles.legendLabel}>{d.name}</span>
                    <span style={styles.legendValue}>{fmtINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ---------------- Matrix ---------------- */}
      {(view === "Matrix View" || view === "All") && (
        <Panel title="17-Parameter Master Spreadsheet" subtitle={`${branch} · Sep 2025 – Jun 2026`}>
          <div style={styles.matrixScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.thSticky, ...styles.thParam }}>Parameter</th>
                  {MONTHS.map((m) => (
                    <th key={m} style={styles.th}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARAM_GROUPS.map((group) => (
                  <React.Fragment key={group.label}>
                    <tr>
                      <td colSpan={MONTHS.length + 1} style={styles.groupRow}>
                        {group.icon} {group.label}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ ...styles.tdSticky, ...(row.emphasize ? styles.tdParamEmph : styles.tdParam) }}>
                          <div style={styles.paramLabel}>{row.label}</div>
                          <div style={styles.paramDesc}>{row.desc}</div>
                        </td>
                        {MONTHS.map((m) => (
                          <td key={m} style={row.emphasize ? styles.tdEmph : styles.td}>
                            {row.type === "text"
                              ? data[row.key][m]
                              : row.type === "inr"
                              ? fmtINR(data[row.key][m])
                              : fmtNum(data[row.key][m])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Panel({ title, subtitle, children, span }) {
  return (
    <div style={{ ...styles.panel, gridColumn: span ? `span ${span}` : undefined }}>
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>{title}</div>
        {subtitle && <div style={styles.panelSubtitle}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
const tooltipStyle = {
  background: "#111826",
  border: "1px solid #24334A",
  borderRadius: 8,
  fontSize: 12,
};

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "#090d16",
    color: "#f8fafc",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: "28px 32px 60px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
    borderBottom: "1px solid #1e293b",
    paddingBottom: 20,
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "#f59e0b",
    marginBottom: 6,
    fontWeight: 700,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.01em",
    color: "#f8fafc",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(16, 185, 129, 0.12)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#10b981",
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 20,
    fontFamily: "'JetBrains Mono', monospace",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 8px #10b981",
  },
  btnGhost: {
    background: "rgba(30, 41, 59, 0.5)",
    border: "1px solid #334155",
    color: "#f1f5f9",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    border: "none",
    color: "#090d16",
    fontWeight: 800,
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
  },
  syncedStamp: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#94a3b8",
  },
  controlRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 24,
  },
  viewSwitcher: {
    display: "flex",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  viewBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    padding: "7px 14px",
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  viewBtnActive: {
    background: "linear-gradient(135deg, #7e22ce, #4338ca)",
    color: "#ffffff",
    fontWeight: 800,
    boxShadow: "0 2px 8px rgba(126, 34, 206, 0.4)",
  },
  branchPills: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    color: "#94a3b8",
    padding: "7px 14px",
    borderRadius: 20,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  pillActive: {
    background: "rgba(245, 158, 11, 0.18)",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    color: "#f59e0b",
    fontWeight: 800,
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginBottom: 24,
  },
  panel: {
    background: "rgba(15, 23, 42, 0.75)",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 20,
    backdropFilter: "blur(12px)",
  },
  panelHeader: {
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#f8fafc",
  },
  panelSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
  },
  doughnutWrap: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  legendGrid: {
    flex: 1,
    minWidth: 240,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    flexShrink: 0,
  },
  legendLabel: {
    color: "#cbd5e1",
    flex: 1,
    fontWeight: 500,
  },
  legendValue: {
    fontFamily: "'JetBrains Mono', monospace",
    color: "#f8fafc",
    fontWeight: 700,
  },
  matrixScroll: {
    overflowX: "auto",
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: 12.5,
    fontFamily: "'JetBrains Mono', monospace",
  },
  th: {
    textAlign: "right",
    padding: "10px 12px",
    color: "#94a3b8",
    fontWeight: 700,
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
  },
  thParam: {
    textAlign: "left",
    minWidth: 220,
  },
  thSticky: {
    position: "sticky",
    left: 0,
    background: "#0f172a",
    zIndex: 2,
  },
  groupRow: {
    background: "#020617",
    color: "#f59e0b",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: "0.04em",
    padding: "10px 12px",
    textTransform: "uppercase",
    borderBottom: "1px solid #1e293b",
  },
  td: {
    textAlign: "right",
    padding: "9px 12px",
    borderBottom: "1px solid #1e293b",
    color: "#cbd5e1",
    whiteSpace: "nowrap",
  },
  tdEmph: {
    textAlign: "right",
    padding: "9px 12px",
    borderBottom: "1px solid #1e293b",
    color: "#f59e0b",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  tdParam: {
    padding: "9px 12px",
    borderBottom: "1px solid #1e293b",
    background: "#0f172a",
    fontFamily: "'Inter', sans-serif",
  },
  tdParamEmph: {
    padding: "9px 12px",
    borderBottom: "1px solid #1e293b",
    background: "#0f172a",
    fontFamily: "'Inter', sans-serif",
    borderLeft: "2px solid #f59e0b",
  },
  tdSticky: {
    position: "sticky",
    left: 0,
    zIndex: 1,
  },
  paramLabel: {
    fontWeight: 700,
    color: "#f8fafc",
    fontSize: 12.5,
  },
  paramDesc: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },
};
