import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, LayoutDashboard, TableProperties, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

const INST_COLORS = {
    RPS: '#f5a623', Common: '#3b82f6', KPM: '#10b981',
    College: '#e74c3c', TIPS: '#a855f7', CAR: '#eab308'
};

const CHART_DEFAULTS = {
    color: '#475569',
    borderColor: '#e2e8f0',
    font: { family: "'Inter', system-ui, sans-serif" }
};

ChartJS.defaults.color = CHART_DEFAULTS.color;
ChartJS.defaults.borderColor = CHART_DEFAULTS.borderColor;
ChartJS.defaults.font.family = CHART_DEFAULTS.font.family;


const FuelReport = () => {
    const navigate = useNavigate();
    const [fuelData, setFuelData] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [institutions, setInstitutions] = useState([]);

    const [selectedInstId, setSelectedInstId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(localStorage.getItem('fuelReportViewMode') || 'analytics'); // 'analytics' | 'matrix'
    useEffect(() => {
        localStorage.setItem('fuelReportViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fuelRes, vehicleRes, instRes] = await Promise.all([
                    api.get('fuel-data/'),
                    api.get('vehicles/'),
                    api.get('institutions/')
                ]);
                setFuelData(fuelRes.data);
                setVehicles(vehicleRes.data);
                setInstitutions(instRes.data);
            } catch (err) {
                console.error("Failed to fetch fuel report data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // MATRIX VIEW LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const { uniqueDates, vehicleRows, dateTotals, grandTotal } = useMemo(() => {
        const filteredVehicles = selectedInstId
            ? vehicles.filter(v => v.institution === parseInt(selectedInstId))
            : vehicles;

        const filteredFuelData = selectedMonth
            ? fuelData.filter(f => f.date.slice(0, 7) === selectedMonth)
            : fuelData;

        if (!filteredFuelData.length || !filteredVehicles.length) return { uniqueDates: [], vehicleRows: [], dateTotals: {}, grandTotal: { liters: 0, amount: 0 } };

        const datesSet = new Set(filteredFuelData.map(f => f.date));
        const uniqueDates = Array.from(datesSet).sort((a, b) => new Date(a) - new Date(b));

        const matrix = {};
        filteredVehicles.forEach(v => {
            matrix[v.id] = { vehicleNum: v.vehicle_number, dates: {}, totalLiters: 0, totalAmount: 0 };
            uniqueDates.forEach(d => { matrix[v.id].dates[d] = { liters: 0, amount: 0 }; });
        });

        const dateTotals = {};
        uniqueDates.forEach(d => { dateTotals[d] = { liters: 0, amount: 0 }; });

        let overallLiters = 0; let overallAmount = 0;

        filteredFuelData.forEach(entry => {
            const vId = entry.vehicle;
            const d = entry.date;
            const liters = parseFloat(entry.liters) || 0;
            const amount = parseFloat(entry.actual_amount || entry.amount) || 0;

            if (matrix[vId] && matrix[vId].dates[d]) {
                matrix[vId].dates[d].liters += liters;
                matrix[vId].dates[d].amount += amount;
                matrix[vId].totalLiters += liters;
                matrix[vId].totalAmount += amount;
                dateTotals[d].liters += liters;
                dateTotals[d].amount += amount;
                overallLiters += liters;
                overallAmount += amount;
            }
        });

        const vehicleRows = Object.values(matrix)
            .filter(row => row.totalLiters > 0)
            .sort((a, b) => a.vehicleNum.localeCompare(b.vehicleNum));

        return { uniqueDates, vehicleRows, dateTotals, grandTotal: { liters: overallLiters, amount: overallAmount } };
    }, [fuelData, vehicles, selectedInstId, selectedMonth]);

    // ─────────────────────────────────────────────────────────────────────────────
    // ANALYTICS DASHBOARD LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const analyticsData = useMemo(() => {
        if (!fuelData.length) return null;

        const instMap = {};
        institutions.forEach(i => instMap[i.id] = i.name);

        const vehMap = {};
        vehicles.forEach(v => vehMap[v.id] = v);

        // Filter Data
        const filtered = fuelData.filter(r => {
            const v = vehMap[r.vehicle];
            if (!v) return false;
            const instId = v.institution;
            const rMonth = r.date.slice(0, 7); // YYYY-MM

            if (selectedInstId && parseInt(selectedInstId) !== instId) return false;
            if (selectedMonth && rMonth !== selectedMonth) return false;
            return true;
        });

        // KPIs
        const totalAmount = filtered.reduce((a, r) => a + parseFloat(r.actual_amount || r.amount || 0), 0);
        const totalLiters = filtered.reduce((a, r) => a + parseFloat(r.liters || 0), 0);
        const uniqueVehicles = new Set(filtered.map(r => r.vehicle)).size;
        const totalTxns = filtered.length;

        // Collect all months for X-axis in charts
        const allMonthsSet = new Set(fuelData.map(f => f.date.slice(0, 7)));
        const sortedMonths = Array.from(allMonthsSet).sort();

        // 1. Monthly Chart (Stacked by Institution)
        const monthlyByInst = {}; // { 'RPS': [val1, val2, ...], 'College': [...] }
        institutions.forEach(inst => {
            monthlyByInst[inst.name] = sortedMonths.map(() => 0);
        });

        filtered.forEach(r => {
            const v = vehMap[r.vehicle];
            const instName = instMap[v?.institution] || 'Unknown';
            const monthIdx = sortedMonths.indexOf(r.date.slice(0, 7));
            const amt = parseFloat(r.actual_amount || r.amount || 0);
            if (monthlyByInst[instName] && monthIdx !== -1) {
                monthlyByInst[instName][monthIdx] += amt;
            }
        });

        const monthlyDatasets = Object.keys(monthlyByInst).filter(k => monthlyByInst[k].some(v => v > 0)).map(inst => ({
            label: inst,
            data: monthlyByInst[inst],
            backgroundColor: (INST_COLORS[inst] || '#888') + '99',
            borderColor: INST_COLORS[inst] || '#888',
            borderWidth: 2,
            borderRadius: 4,
        }));

        // 2. Donut Chart (By Institution)
        const donutData = {};
        filtered.forEach(r => {
            const instName = instMap[vehMap[r.vehicle]?.institution] || 'Unknown';
            donutData[instName] = (donutData[instName] || 0) + parseFloat(r.actual_amount || r.amount || 0);
        });
        const donutLabels = Object.keys(donutData);
        const donutValues = donutLabels.map(l => donutData[l]);
        const donutColors = donutLabels.map(l => INST_COLORS[l] || '#888');

        // 3. Liters Trend (Line)
        const litersTrend = sortedMonths.map(() => 0);
        filtered.forEach(r => {
            const monthIdx = sortedMonths.indexOf(r.date.slice(0, 7));
            if (monthIdx !== -1) {
                litersTrend[monthIdx] += parseFloat(r.liters || 0);
            }
        });

        // 4. By Make (Horizontal Bar)
        const makeData = {};
        filtered.forEach(r => {
            const make = vehMap[r.vehicle]?.make || 'Unknown';
            makeData[make] = (makeData[make] || 0) + parseFloat(r.actual_amount || r.amount || 0);
        });
        const sortedMakes = Object.entries(makeData).sort((a, b) => b[1] - a[1]).slice(0, 8);

        // 5. Top Vehicles Table
        const vehStats = {};
        filtered.forEach(r => {
            const v = vehMap[r.vehicle];
            const vNum = v?.vehicle_number || 'Unknown';
            const instName = instMap[v?.institution] || 'Unknown';
            const route = v?.route_name || v?.purpose || '—';

            const key = `${vNum}_${instName}`;
            if (!vehStats[key]) {
                vehStats[key] = {
                    vNum, instName, make: v?.make || '—', route, count: 0, liters: 0, amount: 0
                };
            }
            vehStats[key].count += 1;
            vehStats[key].liters += parseFloat(r.liters || 0);
            vehStats[key].amount += parseFloat(r.actual_amount || r.amount || 0);
        });

        let topVehiclesArr = Object.values(vehStats).sort((a, b) => b.amount - a.amount);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            topVehiclesArr = topVehiclesArr.filter(v =>
                v.vNum.toLowerCase().includes(q) ||
                v.route.toLowerCase().includes(q) ||
                v.make.toLowerCase().includes(q)
            );
        }
        const maxVehAmount = topVehiclesArr[0]?.amount || 1;

        return {
            kpis: { totalAmount, totalLiters, uniqueVehicles, totalTxns },
            sortedMonths,
            monthlyDatasets,
            donutLabels, donutValues, donutColors,
            litersTrend,
            sortedMakes,
            topVehiclesArr, maxVehAmount
        };

    }, [fuelData, vehicles, institutions, selectedInstId, selectedMonth, searchQuery]);

    const formatINR = (num) => {
        if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + 'L';
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-slate-400">
                Loading Fuel Analytics...
            </div>
        );
    }

    const ad = analyticsData; // shortcut

    return (
        <div className="min-h-screen bg-slate-900/50 text-white font-sans flex flex-col pb-4 animate-fade-in -m-6 lg:-mx-10 lg:-mt-[22px] lg:-mb-10 p-6 lg:p-10">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 mr-4 bg-slate-900/50 rounded-lg text-slate-200 hover:text-slate-900 hover:bg-slate-200 transition-colors border border-slate-700"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            Fuel Purchase Analytics
                            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('analytics')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'analytics' ? 'bg-slate-900 shadow text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                                    title="Dashboard View"
                                >
                                    <LayoutDashboard size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('matrix')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'matrix' ? 'bg-slate-900 shadow text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                                    title="Matrix View"
                                >
                                    <TableProperties size={16} />
                                </button>
                            </div>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Fleet Operations & Resource Management</p>
                    </div>
                </div>

                {/* GLOBAL FILTERS */}
                <div className="flex items-center gap-3 bg-slate-800/40 p-2 rounded-xl border border-slate-700 backdrop-blur-sm">
                    <select
                        className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        value={selectedInstId}
                        onChange={(e) => setSelectedInstId(e.target.value)}
                    >
                        <option value="">All Institutions</option>
                        {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                    </select>

                    <select
                        className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="">All Time</option>
                        {ad?.sortedMonths.map(m => (
                            <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => { setSelectedInstId(''); setSelectedMonth(''); setSearchQuery(''); }}
                        className="text-xs text-slate-400 hover:text-slate-900 px-2 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* VIEWS */}
            {viewMode === 'matrix' && (
                <div className="bg-slate-900 shadow-sm rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md flex flex-col relative animate-fade-in w-full overflow-hidden">
                    {vehicleRows.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 py-20">
                            No fuel data available.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-auto w-full custom-scrollbar relative report-matrix-container max-h-[600px]">
                                <table className="report-matrix-table w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="sticky-corner-tl bg-slate-800 p-4 border border-slate-600 text-white font-bold whitespace-nowrap min-w-[120px]">
                                                Vehicle Number
                                            </th>
                                            {uniqueDates.map(d => (
                                                <th key={d} className="sticky-top bg-slate-800 p-4 border border-slate-600 text-center text-white font-semibold min-w-[180px]">
                                                    {new Date(d).toLocaleDateString('en-GB')}
                                                </th>
                                            ))}
                                            <th className="sticky-corner-tr bg-blue-900 p-4 border border-slate-600 text-center text-blue-100 font-bold min-w-[180px]">
                                                Grand Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vehicleRows.map(row => (
                                            <tr key={row.vehicleNum} className="hover:bg-slate-900/50 transition-colors">
                                                <td className="sticky-left bg-slate-900 p-4 border border-slate-600 font-semibold text-slate-200">
                                                    {row.vehicleNum}
                                                </td>
                                                {uniqueDates.map(d => {
                                                    const cell = row.dates[d];
                                                    const rate = cell.liters > 0 ? (cell.amount / cell.liters).toFixed(2) : '-';
                                                    return (
                                                        <td key={d} className="p-3 border border-slate-700 text-center text-slate-400">
                                                            {cell.liters > 0 ? (
                                                                <div className="flex flex-col gap-1 text-xs">
                                                                    <span className="text-yellow-400 font-semibold">{cell.liters.toFixed(2)} L</span>
                                                                    <span className="text-slate-200">₹ {cell.amount.toFixed(2)}</span>
                                                                    <span className="text-slate-400">@ ₹{rate}/L</span>
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="sticky-right bg-slate-900 p-3 border border-slate-600 text-center">
                                                    <div className="flex flex-col gap-1 text-xs font-semibold">
                                                        <span className="text-yellow-400">{row.totalLiters.toFixed(2)} L</span>
                                                        <span className="text-blue-300">₹ {row.totalAmount.toFixed(2)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td className="sticky-corner-bl bg-blue-900 p-4 border border-slate-600 text-blue-100 font-bold whitespace-nowrap">
                                                Total (Day)
                                            </td>
                                            {uniqueDates.map(d => {
                                                const cell = dateTotals[d];
                                                return (
                                                    <td key={d} className="sticky-bottom bg-blue-900 p-3 border border-slate-600 text-center">
                                                        <div className="flex flex-col gap-1 text-xs font-bold text-blue-100">
                                                            <span>{cell.liters.toFixed(2)} L</span>
                                                            <span>₹ {cell.amount.toFixed(2)}</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="sticky-corner-br bg-emerald-900 p-4 border border-emerald-700 text-center shadow-inner">
                                                <div className="flex flex-col gap-1 text-sm font-black text-emerald-100">
                                                    <span>{grandTotal.liters.toFixed(2)} L</span>
                                                    <span>₹ {grandTotal.amount.toFixed(2)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="text-xs text-slate-500 mt-3 mb-2 mr-2 text-right">
                                * Note: The price per liter (₹/L) shown is calculated after applying any relevant discounts.
                            </div>
                        </>
                    )}
                </div>
            )}

            {viewMode === 'analytics' && ad && (
                <div className="animate-fade-in flex flex-col gap-6">

                    {/* KPI STRIP */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">Total Spent</div>
                            <div className="text-3xl font-black text-white tracking-tight">{formatINR(ad.kpis.totalAmount)}</div>
                            <div className="text-xs text-slate-400 mt-2">Across all institutions</div>
                            <div className="absolute top-4 right-4 text-3xl opacity-10 group-hover:opacity-20 transition-opacity">₹</div>
                        </div>
                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-900/300"></div>
                            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">Total Litres</div>
                            <div className="text-3xl font-black text-white tracking-tight">{ad.kpis.totalLiters.toLocaleString('en-IN', { maximumFractionDigits: 0 })} L</div>
                            <div className="text-xs text-slate-400 mt-2">Avg ₹{(ad.kpis.totalAmount / (ad.kpis.totalLiters || 1)).toFixed(2)}/L (post-discount)</div>
                            <div className="absolute top-4 right-4 text-3xl opacity-10 group-hover:opacity-20 transition-opacity">🛢</div>
                        </div>
                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-900/300"></div>
                            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">Vehicles Active</div>
                            <div className="text-3xl font-black text-white tracking-tight">{ad.kpis.uniqueVehicles}</div>
                            <div className="text-xs text-slate-400 mt-2">Unique vehicles filled</div>
                            <div className="absolute top-4 right-4 text-3xl opacity-10 group-hover:opacity-20 transition-opacity">🚌</div>
                        </div>
                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
                            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">Fill Events</div>
                            <div className="text-3xl font-black text-white tracking-tight">{ad.kpis.totalTxns}</div>
                            <div className="text-xs text-slate-400 mt-2">Total transactions</div>
                            <div className="absolute top-4 right-4 text-3xl opacity-10 group-hover:opacity-20 transition-opacity">📋</div>
                        </div>
                    </div>

                    {/* ROW 1: Monthly + Donut */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5">
                            <h2 className="text-sm font-bold text-white">Monthly Fuel Spent Trend</h2>
                            <p className="text-xs text-slate-400 mb-4">Amount (₹) by month, split by institution</p>
                            <div className="h-64 relative">
                                <Bar
                                    data={{
                                        labels: ad.sortedMonths.map(m => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })),
                                        datasets: ad.monthlyDatasets
                                    }}
                                    options={{
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                                            y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '₹' + (v / 1000).toFixed(0) + 'K' } }
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex flex-wrap gap-4 mt-4 justify-center">
                                {ad.monthlyDatasets.map(ds => (
                                    <div key={ds.label} className="flex items-center gap-2 text-xs text-slate-400">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ds.borderColor }}></div>
                                        {ds.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5 flex flex-col">
                            <h2 className="text-sm font-bold text-white">Spent by Institution</h2>
                            <p className="text-xs text-slate-400 mb-4">Share of total ₹ spent</p>
                            <div className="flex-1 relative min-h-[200px] flex items-center justify-center">
                                <Doughnut
                                    data={{
                                        labels: ad.donutLabels,
                                        datasets: [{
                                            data: ad.donutValues,
                                            backgroundColor: ad.donutColors,
                                            borderColor: '#ffffff',
                                            borderWidth: 2,
                                            hoverOffset: 4
                                        }]
                                    }}
                                    options={{
                                        responsive: true, maintainAspectRatio: false, cutout: '70%',
                                        plugins: {
                                            legend: { position: 'bottom', labels: { padding: 15, font: { size: 11 }, boxWidth: 12, color: '#94a3b8' } },
                                            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ₹${(ctx.raw / 1000).toFixed(1)}K` } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ROW 2: Liters Trend + By Make */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5">
                            <h2 className="text-sm font-bold text-white">Monthly Litres Consumed</h2>
                            <p className="text-xs text-slate-400 mb-4">Volume trend</p>
                            <div className="h-56 relative">
                                <Line
                                    data={{
                                        labels: ad.sortedMonths.map(m => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })),
                                        datasets: [{
                                            label: 'Litres',
                                            data: ad.litersTrend,
                                            borderColor: '#3b82f6',
                                            backgroundColor: 'rgba(59,130,246,0.15)',
                                            borderWidth: 2,
                                            fill: true,
                                            tension: 0.4
                                        }]
                                    }}
                                    options={{
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => v.toLocaleString() + 'L' } }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5">
                            <h2 className="text-sm font-bold text-white">Spent by Vehicle Make</h2>
                            <p className="text-xs text-slate-400 mb-4">Top manufacturers by fuel cost</p>
                            <div className="h-56 relative">
                                <Bar
                                    data={{
                                        labels: ad.sortedMakes.map(m => m[0]),
                                        datasets: [{
                                            data: ad.sortedMakes.map(m => m[1]),
                                            backgroundColor: ['#f5a623', '#3b82f6', '#10b981', '#e74c3c', '#a855f7', '#eab308', '#06b6d4'],
                                            borderRadius: 4
                                        }]
                                    }}
                                    options={{
                                        indexAxis: 'y',
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => '₹' + (v / 1000).toFixed(0) + 'K' } },
                                            y: { grid: { display: false } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: Top Vehicles Table */}
                    <div className="bg-slate-900 shadow-sm border border-slate-700 rounded-2xl p-5 mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h2 className="text-sm font-bold text-white">Top Vehicles by Fuel Spent</h2>
                                <p className="text-xs text-slate-400">Ranked by total ₹ amount, with litres and fill frequency</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search vehicle, route, make..."
                                    className="bg-slate-900/50 border border-slate-600 text-white text-sm rounded-lg pl-9 pr-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4 font-semibold">#</th>
                                        <th className="py-3 px-4 font-semibold">Vehicle No.</th>
                                        <th className="py-3 px-4 font-semibold">Institution</th>
                                        <th className="py-3 px-4 font-semibold">Make</th>
                                        <th className="py-3 px-4 font-semibold">Route / Purpose</th>
                                        <th className="py-3 px-4 font-semibold text-center">Fills</th>
                                        <th className="py-3 px-4 font-semibold">Litres</th>
                                        <th className="py-3 px-4 font-semibold">Total Spent</th>
                                        <th className="py-3 px-4 font-semibold">Avg ₹/Fill</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ad.topVehiclesArr.length === 0 ? (
                                        <tr><td colSpan="9" className="py-8 text-center text-slate-400">No vehicles found.</td></tr>
                                    ) : ad.topVehiclesArr.map((v, i) => (
                                        <tr key={`${v.vNum}-${v.instName}`} className="border-b border-slate-700 hover:bg-slate-900/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-blue-400">{i + 1}</td>
                                            <td className="py-3 px-4 font-mono text-slate-200">{v.vNum}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className="px-2 py-1 rounded text-[10px] font-bold"
                                                    style={{
                                                        backgroundColor: (INST_COLORS[v.instName] || '#888') + '25',
                                                        color: INST_COLORS[v.instName] || '#aaa'
                                                    }}
                                                >
                                                    {v.instName}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 text-xs">{v.make}</td>
                                            <td className="py-3 px-4 text-slate-400 text-xs truncate max-w-[150px]" title={v.route}>{v.route}</td>
                                            <td className="py-3 px-4 text-center text-slate-400">{v.count}</td>
                                            <td className="py-3 px-4 text-slate-200">{v.liters.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L</td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-white">₹{v.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                                                        style={{ width: `${(v.amount / ad.maxVehAmount * 100).toFixed(1)}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 text-xs">₹{(v.amount / v.count).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FuelReport;
