import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { 
  Activity, RefreshCw, Download, FileSpreadsheet, AlertTriangle, 
  CheckCircle, Truck, DollarSign, Fuel, ShieldAlert, Plus, Calendar, Filter
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Transport Summary Matrix — Campus Ops Control                     */
/*  Rich Dark Ops Console with Live Data Sync & Full Analytics        */
/* ------------------------------------------------------------------ */

const DEFAULT_MONTHS = [
  "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026",
  "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026"
];

const MONTH_KEY_MAP = {
  "2025-09": "Sep 2025",
  "2025-10": "Oct 2025",
  "2025-11": "Nov 2025",
  "2025-12": "Dec 2025",
  "2026-01": "Jan 2026",
  "2026-02": "Feb 2026",
  "2026-03": "Mar 2026",
  "2026-04": "Apr 2026",
  "2026-05": "May 2026",
  "2026-06": "Jun 2026",
  "2026-07": "Jul 2026",
};

const BRANCHES = ["All Branches", "RPS Branch", "KPM Branch", "University Fleet", "Common Pool"];

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

const DOUGHNUT_COLORS = ["#3B82F6", "#F43F5E", "#10B981", "#EAB308", "#A855F7", "#06B6D4", "#6366F1", "#EC4899"];

function getBaseData(branch) {
  const data = {};
  PARAM_GROUPS.forEach((g) =>
    g.rows.forEach((r) => {
      data[r.key] = {};
      DEFAULT_MONTHS.forEach((m) => {
        if (r.type === "text") {
          data[r.key][m] = "";
        } else {
          data[r.key][m] = 0;
        }
      });
    })
  );
  data.total = {};
  DEFAULT_MONTHS.forEach((m) => {
    data.total[m] = 0;
  });
  return data;
}

const fmtINR = (n) =>
  "₹" + Math.round(n || 0).toLocaleString("en-IN");

const fmtNum = (n) => Math.round(n || 0).toLocaleString("en-IN");

export default function Summary() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState("All Branches");
  const [view, setView] = useState("All"); // Analytics | Matrix View | Remarks Log | All
  const [lastSync, setLastSync] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [newRemark, setNewRemark] = useState({
    title: "",
    note: "",
    category: "Incident",
    branch: "University",
    log_date: new Date().toISOString().split("T")[0]
  });

  // Fetch API data
  const fetchApiData = async () => {
    try {
      setLoading(true);
      const [resSummary, resRemarks] = await Promise.allSettled([
        api.get('transport-summary/'),
        api.get('transport-remarks/')
      ]);

      if (resSummary.status === 'fulfilled') {
        const items = Array.isArray(resSummary.value.data) 
          ? resSummary.value.data 
          : (resSummary.value.data?.results || []);
        setApiData(items);
      }

      if (resRemarks.status === 'fulfilled') {
        const remItems = Array.isArray(resRemarks.value.data) 
          ? resRemarks.value.data 
          : (resRemarks.value.data?.results || []);
        setRemarks(remItems);
      }
    } catch (err) {
      console.warn("Using baseline summary metrics:", err);
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  };

  useEffect(() => {
    fetchApiData();
  }, []);

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newRemark.note.trim()) return;
    try {
      const res = await api.post('transport-remarks/', newRemark);
      if (res.data) {
        setRemarks([res.data, ...remarks]);
        setShowRemarkModal(false);
        setNewRemark({
          title: "",
          note: "",
          category: "Incident",
          branch: "University",
          log_date: new Date().toISOString().split("T")[0]
        });
      }
    } catch (err) {
      alert("Failed to save remark: " + (err.response?.data?.detail || err.message));
    }
  };

  // Build matrix data combining baseline and live database entries
  const { data, activeMonths } = useMemo(() => {
    const base = getBaseData(branch);
    const months = [...DEFAULT_MONTHS];

    if (!apiData || apiData.length === 0) {
      return { data: base, activeMonths: months };
    }

    const merged = JSON.parse(JSON.stringify(base));

    // Ensure all data structures exist
    PARAM_GROUPS.forEach(g => {
      g.rows.forEach(r => {
        if (!merged[r.key]) merged[r.key] = {};
      });
    });
    if (!merged.total) merged.total = {};

    const branchFilterKey = branch === "All Branches" 
      ? null 
      : branch.replace(" Branch", "").replace(" Fleet", "").replace(" Pool", "");

    months.forEach((mLabel) => {
      // Find matching entries for this month label
      const filtered = apiData.filter((d) => {
        const dMonth = String(d.month || "");
        const dYearMonth = dMonth.slice(0, 7);
        const mappedLabel = MONTH_KEY_MAP[dYearMonth];
        const matchMonth = mappedLabel === mLabel || dMonth.startsWith(mLabel);
        const matchBranch = !branchFilterKey || d.branch === branchFilterKey;
        return matchMonth && matchBranch;
      });

      if (filtered.length > 0) {
        const sumVal = (key) => filtered.reduce((s, i) => s + (parseFloat(i[key]) || 0), 0);
        const avgVal = (key) => Math.round(filtered.reduce((s, i) => s + (parseFloat(i[key]) || 0), 0) / (filtered.length || 1));

        merged.vehicles[mLabel] = sumVal("vehicles");
        merged.riders[mLabel] = avgVal("riders");
        merged.approvedKm[mLabel] = sumVal("km_approved");
        merged.actualKm[mLabel] = sumVal("km_actual");
        merged.extraKm[mLabel] = sumVal("km_additional");
        merged.incidents[mLabel] = sumVal("incidents");
        merged.statutory[mLabel] = sumVal("statutory_compliance") || 1;

        merged.fuel[mLabel] = sumVal("fuel_expense");
        merged.fc[mLabel] = sumVal("exp_fc");
        merged.vehStatutory[mLabel] = sumVal("exp_vehicle_statutory");
        merged.repair[mLabel] = sumVal("exp_repair");
        merged.empCost[mLabel] = sumVal("exp_employee_cost");
        merged.cctv[mLabel] = sumVal("exp_cctv");
        merged.parking[mLabel] = sumVal("exp_parking_fastag");
        merged.others[mLabel] = sumVal("exp_others");

        merged.total[mLabel] = EXPENSE_KEYS.reduce((sum, k) => sum + (merged[k]?.[mLabel] || 0), 0);
      }
    });

    return { data: merged, activeMonths: months };
  }, [branch, apiData]);

  // Overall KPI Aggregates
  const kpis = useMemo(() => {
    const totalExp = activeMonths.reduce((sum, m) => sum + (data.total?.[m] || 0), 0);
    const totalFuel = activeMonths.reduce((sum, m) => sum + (data.fuel?.[m] || 0), 0);
    const totalApprovedKm = activeMonths.reduce((sum, m) => sum + (data.approvedKm?.[m] || 0), 0);
    const totalActualKm = activeMonths.reduce((sum, m) => sum + (data.actualKm?.[m] || 0), 0);
    const totalIncidents = activeMonths.reduce((sum, m) => sum + (data.incidents?.[m] || 0), 0);
    const latestMonth = activeMonths[activeMonths.length - 1];
    const currentVehicles = data.vehicles?.[latestMonth] || 0;

    return {
      totalExp,
      totalFuel,
      totalApprovedKm,
      totalActualKm,
      totalIncidents,
      currentVehicles,
      varianceKm: totalActualKm - totalApprovedKm
    };
  }, [data, activeMonths]);

  /* ---- Chart data shaping ---- */
  const distanceChartData = useMemo(() => {
    return activeMonths.map((m) => ({
      month: m.split(" ")[0],
      Approved: data.approvedKm?.[m] || 0,
      Actual: data.actualKm?.[m] || 0,
      Extra: data.extraKm?.[m] || 0,
    }));
  }, [data, activeMonths]);

  const expenseTrendData = useMemo(() => {
    return activeMonths.map((m) => ({
      month: m.split(" ")[0],
      "Total Expenses": data.total?.[m] || 0,
      "Fuel Costs": data.fuel?.[m] || 0,
      "Repair & Maintenance": data.repair?.[m] || 0,
      "Staff Cost": data.empCost?.[m] || 0,
    }));
  }, [data, activeMonths]);

  const doughnutData = useMemo(() => {
    return EXPENSE_KEYS.map((k) => {
      const row = PARAM_GROUPS[1].rows.find((r) => r.key === k);
      const value = activeMonths.reduce((sum, m) => sum + (data[k]?.[m] || 0), 0);
      return { name: row?.label || k, value };
    }).filter(d => d.value > 0);
  }, [data, activeMonths]);

  const doughnutTotal = useMemo(() => doughnutData.reduce((s, d) => s + d.value, 0), [doughnutData]);

  const exportCSV = () => {
    let csv = "Parameter,Group," + activeMonths.join(",") + "\n";
    PARAM_GROUPS.forEach(g => {
      g.rows.forEach(r => {
        const rowVals = activeMonths.map(m => `"${data[r.key]?.[m] ?? ''}"`).join(",");
        csv += `"${r.label}","${g.label}",${rowVals}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transport_Summary_${branch.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const syncedLabel = lastSync.toLocaleTimeString("en-IN", { hour12: false });

  return (
    <div style={styles.page}>
      <style>{fontImport}</style>

      {/* ---------------- Top Header ---------------- */}
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>CAMPUS OPS CONTROL / TRANSPORT</div>
          <h1 style={styles.title}>Transport Summary Matrix</h1>
          <p style={styles.subtext}>Consolidated Fleet Distance, Fuel Logistics, Opex & Statutory Compliance Audit</p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.liveBadge} title="Real-time Data Generation Active">
            <span style={styles.liveDot}></span>
            LIVE DATA
          </div>

          <div style={styles.syncedStamp}>
            Updated: {syncedLabel}
          </div>

          <button
            onClick={fetchApiData}
            disabled={loading}
            style={styles.btnPrimary}
            title="Refresh Live Data"
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>

          <button onClick={exportCSV} style={styles.btnGhost} title="Export Matrix to CSV">
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ---------------- KPI Metric Cards ---------------- */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrap}><Truck size={20} color="#3B82F6" /></div>
          <div>
            <div style={styles.kpiLabel}>ACTIVE FLEET</div>
            <div style={styles.kpiValue}>{kpis.currentVehicles} Vehicles</div>
            <div style={styles.kpiSub}>Across {branch}</div>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrap}><Activity size={20} color="#10B981" /></div>
          <div>
            <div style={styles.kpiLabel}>TOTAL LOGGED KM</div>
            <div style={styles.kpiValue}>{fmtNum(kpis.totalActualKm)} km</div>
            <div style={{ ...styles.kpiSub, color: kpis.varianceKm > 0 ? "#F59E0B" : "#10B981" }}>
              {kpis.varianceKm > 0 ? `+${fmtNum(kpis.varianceKm)} km extra` : 'Within route budget'}
            </div>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrap}><DollarSign size={20} color="#EAB308" /></div>
          <div>
            <div style={styles.kpiLabel}>TOTAL EXPENDITURE</div>
            <div style={{ ...styles.kpiValue, color: "#F59E0B" }}>{fmtINR(kpis.totalExp)}</div>
            <div style={styles.kpiSub}>10-Month Consolidated</div>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrap}><Fuel size={20} color="#06B6D4" /></div>
          <div>
            <div style={styles.kpiLabel}>TOTAL FUEL EXPENSE</div>
            <div style={styles.kpiValue}>{fmtINR(kpis.totalFuel)}</div>
            <div style={styles.kpiSub}>{Math.round((kpis.totalFuel / (kpis.totalExp || 1)) * 100)}% of total opex</div>
          </div>
        </div>
      </div>

      {/* ---------------- View switcher + branch pills ---------------- */}
      <div style={styles.controlRow}>
        <div style={styles.viewSwitcher}>
          {["All", "Analytics", "Matrix View", "Remarks Log"].map((v) => (
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

      {/* ---------------- Analytics Charts ---------------- */}
      {(view === "Analytics" || view === "All") && (
        <div style={styles.analyticsGrid}>
          <Panel title="📊 Monthly Distance Tracking" subtitle="Approved Route KMs vs Logged Actual Odometer KMs">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distanceChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A38" vertical={false} />
                <XAxis dataKey="month" stroke="#7C93AC" fontSize={11} tickLine={false} axisLine={{ stroke: "#1E2A38" }} />
                <YAxis stroke="#7C93AC" fontSize={11} tickLine={false} axisLine={{ stroke: "#1E2A38" }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#DCE8F2" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#7C93AC" }} />
                <Bar dataKey="Approved" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Extra" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="📈 Financial Expense Trends" subtitle="Total Expenditure / Fuel / Repair / Staff Salaries">
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
                <Line type="monotone" dataKey="Staff Cost" stroke="#A855F7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="🍩 Expense Parameter Breakdown" subtitle={`Category split — ${fmtINR(doughnutTotal)} total`} span={2}>
            <div style={styles.doughnutWrap}>
              <ResponsiveContainer width="45%" height={280}>
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
                    <span style={styles.legendPct}>
                      {doughnutTotal > 0 ? Math.round((d.value / doughnutTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ---------------- Matrix Spreadsheet ---------------- */}
      {(view === "Matrix View" || view === "All") && (
        <Panel 
          title="17-Parameter Master Spreadsheet" 
          subtitle={`${branch} · Sep 2025 – Jul 2026 Consolidated Fleet Data`}
        >
          <div style={styles.matrixScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.thSticky, ...styles.thParam }}>Parameter</th>
                  {activeMonths.map((m) => (
                    <th key={m} style={styles.th}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARAM_GROUPS.map((group) => (
                  <React.Fragment key={group.label}>
                    <tr>
                      <td colSpan={activeMonths.length + 1} style={styles.groupRow}>
                        {group.icon} {group.label}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ ...styles.tdSticky, ...(row.emphasize ? styles.tdParamEmph : styles.tdParam) }}>
                          <div style={styles.paramLabel}>{row.label}</div>
                          <div style={styles.paramDesc}>{row.desc}</div>
                        </td>
                        {activeMonths.map((m) => (
                          <td key={m} style={row.emphasize ? styles.tdEmph : styles.td}>
                            {row.type === "text"
                              ? (data[row.key]?.[m] || "TRS-F-03")
                              : row.type === "inr"
                              ? fmtINR(data[row.key]?.[m])
                              : fmtNum(data[row.key]?.[m])}
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

      {/* ---------------- Operational Remarks Log ---------------- */}
      {(view === "Remarks Log" || view === "All") && (
        <div style={{ marginTop: 24 }}>
          <Panel 
            title="📝 Operational Remarks & Activity Log" 
            subtitle="Campus Transport Observations, RTO Audits & Field Logs"
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button 
                onClick={() => setShowRemarkModal(true)} 
                style={styles.btnPrimary}
              >
                <Plus size={15} /> Add Activity Remark
              </button>
            </div>

            <div style={styles.remarksList}>
              {remarks.length === 0 ? (
                <div style={styles.emptyState}>No activity remarks logged yet. Click "+ Add Activity Remark" to record field updates.</div>
              ) : (
                remarks.map((rem) => (
                  <div key={rem.id} style={styles.remarkCard}>
                    <div style={styles.remarkHeader}>
                      <div style={styles.remarkTitleWrap}>
                        <span style={styles.categoryBadge}>{rem.category || "Incident"}</span>
                        <span style={styles.remarkTitle}>{rem.title}</span>
                      </div>
                      <div style={styles.remarkMeta}>
                        <span style={styles.branchTag}>{rem.branch || "General"}</span>
                        <span style={styles.dateTag}><Calendar size={13} /> {rem.log_date}</span>
                      </div>
                    </div>
                    <div style={styles.remarkBody}>{rem.note}</div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Modal for adding remark */}
      {showRemarkModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRemarkModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Add Operational Remark</h2>
            <form onSubmit={handleAddRemark}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Title / Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., RTO FC Inspection Completed"
                  value={newRemark.title}
                  onChange={(e) => setNewRemark({ ...newRemark, title: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select
                    value={newRemark.category}
                    onChange={(e) => setNewRemark({ ...newRemark, category: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="RTO Inspection">RTO Inspection</option>
                    <option value="Driver Safety">Driver Safety</option>
                    <option value="Incident">Incident</option>
                    <option value="Technology Rollout">Technology Rollout</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Audit">Audit</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Branch</label>
                  <select
                    value={newRemark.branch}
                    onChange={(e) => setNewRemark({ ...newRemark, branch: e.target.value })}
                    style={styles.formInput}
                  >
                    <option value="University">University Fleet</option>
                    <option value="RPS">RPS Branch</option>
                    <option value="KPM">KPM Branch</option>
                    <option value="Common">Common Pool</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Log Date</label>
                <input
                  type="date"
                  required
                  value={newRemark.log_date}
                  onChange={(e) => setNewRemark({ ...newRemark, log_date: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Detailed Note / Observations</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter details of the operational event..."
                  value={newRemark.note}
                  onChange={(e) => setNewRemark({ ...newRemark, note: e.target.value })}
                  style={{ ...styles.formInput, resize: "vertical" }}
                />
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowRemarkModal(false)} 
                  style={styles.btnGhost}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.btnPrimary}>
                  Save Remark
                </button>
              </div>
            </form>
          </div>
        </div>
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
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
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
  subtext: {
    fontSize: 13,
    color: "#94a3b8",
    margin: "4px 0 0 0",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(16, 185, 129, 0.12)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#10b981",
    fontSize: 11.5,
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
  syncedStamp: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11.5,
    color: "#94a3b8",
  },
  btnGhost: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(30, 41, 59, 0.6)",
    border: "1px solid #334155",
    color: "#f1f5f9",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    border: "none",
    color: "#090d16",
    fontWeight: 800,
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
    transition: "all 0.2s",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  kpiCard: {
    background: "rgba(15, 23, 42, 0.75)",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  kpiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#94a3b8",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#f8fafc",
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  controlRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 20,
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
    minWidth: 260,
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
  legendPct: {
    fontFamily: "'JetBrains Mono', monospace",
    color: "#94a3b8",
    fontSize: 11,
    minWidth: 32,
    textAlign: "right",
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
  remarksList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  remarkCard: {
    background: "rgba(30, 41, 59, 0.4)",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "14px 16px",
  },
  remarkHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  remarkTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    background: "rgba(245, 158, 11, 0.15)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 6,
  },
  remarkTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: "#f8fafc",
  },
  remarkMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 11.5,
    color: "#94a3b8",
  },
  branchTag: {
    background: "rgba(59, 130, 246, 0.15)",
    color: "#60a5fa",
    padding: "2px 8px",
    borderRadius: 6,
    fontWeight: 600,
  },
  dateTag: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'JetBrains Mono', monospace",
  },
  remarkBody: {
    fontSize: 13,
    color: "#cbd5e1",
    lineHeight: 1.5,
  },
  emptyState: {
    textAlign: "center",
    padding: "24px",
    color: "#64748b",
    fontSize: 13,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modalContent: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 16,
    padding: "24px 28px",
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#f8fafc",
    marginBottom: 18,
  },
  formGroup: {
    marginBottom: 14,
    flex: 1,
  },
  formRow: {
    display: "flex",
    gap: 12,
  },
  formLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 6,
  },
  formInput: {
    width: "100%",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#f8fafc",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
};
