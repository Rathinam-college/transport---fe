import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, LayoutDashboard, TableProperties, Search, FileText } from 'lucide-react';
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
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

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
    color: '#64748b',
    borderColor: '#252b3b',
    font: { family: "'Inter', system-ui, sans-serif" }
};

ChartJS.defaults.color = CHART_DEFAULTS.color;
ChartJS.defaults.borderColor = CHART_DEFAULTS.borderColor;
ChartJS.defaults.font.family = CHART_DEFAULTS.font.family;


const ExpenseReport = () => {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [budgetHeads, setBudgetHeads] = useState([]);
    const [subBudgetHeads, setSubBudgetHeads] = useState([]);
    const [vendors, setVendors] = useState([]);

    const [selectedInstId, setSelectedInstId] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [selectedBudgetId, setSelectedBudgetId] = useState('');
    const [selectedSubBudgetId, setSelectedSubBudgetId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('date');
    const [sortDir, setSortDir] = useState(1);

    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('analytics'); // 'analytics' | 'matrix'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [expRes, vehRes, instRes, bhRes, sbhRes, vendRes] = await Promise.all([
                    api.get('expenses/'),
                    api.get('vehicles/'),
                    api.get('institutions/'),
                    api.get('budget-heads/'),
                    api.get('sub-budget-heads/'),
                    api.get('vendors/')
                ]);
                
                setExpenses(expRes.data);
                setVehicles(vehRes.data);
                setInstitutions(instRes.data);
                setBudgetHeads(bhRes.data);
                setSubBudgetHeads(sbhRes.data);
                setVendors(vendRes.data);
            } catch (err) {
                console.error("Failed to fetch expense report data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // COMMON FILTERING LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            if (selectedInstId && e.institution !== parseInt(selectedInstId)) return false;
            if (selectedVendorId && e.vendor !== parseInt(selectedVendorId)) return false;
            if (selectedBudgetId && e.budget_head !== parseInt(selectedBudgetId)) return false;
            if (selectedSubBudgetId && e.sub_budget_head !== parseInt(selectedSubBudgetId)) return false;
            if (fromDate && new Date(e.date) < new Date(fromDate)) return false;
            if (toDate && new Date(e.date) > new Date(toDate)) return false;
            return true;
        });
    }, [expenses, selectedInstId, selectedVendorId, selectedBudgetId, selectedSubBudgetId, fromDate, toDate]);

    // ─────────────────────────────────────────────────────────────────────────────
    // MATRIX VIEW LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const { uniqueDates, vehicleRows, dateTotals, grandTotal } = useMemo(() => {
        if (!filteredExpenses.length || !vehicles.length) return { uniqueDates: [], vehicleRows: [], dateTotals: {}, grandTotal: { amount: 0 } };

        const filteredVehicles = selectedInstId 
            ? vehicles.filter(v => v.institution === parseInt(selectedInstId))
            : vehicles;

        const datesSet = new Set(filteredExpenses.map(e => e.date));
        const uniqueDates = Array.from(datesSet).sort((a, b) => new Date(a) - new Date(b));

        const matrix = {};
        filteredVehicles.forEach(v => {
            matrix[v.id] = { vehicleNum: v.vehicle_number, dates: {}, totalAmount: 0 };
            uniqueDates.forEach(d => { matrix[v.id].dates[d] = { amount: 0 }; });
        });

        const dateTotals = {};
        uniqueDates.forEach(d => { dateTotals[d] = { amount: 0 }; });

        let overallAmount = 0;

        filteredExpenses.forEach(entry => {
            const vId = entry.vehicle;
            const d = entry.date;
            const amount = parseFloat(entry.total_amount) || 0;

            if (matrix[vId] && matrix[vId].dates[d]) {
                matrix[vId].dates[d].amount += amount;
                matrix[vId].totalAmount += amount;
                dateTotals[d].amount += amount;
                overallAmount += amount;
            }
        });

        const vehicleRows = Object.values(matrix)
            .filter(row => row.totalAmount > 0)
            .sort((a, b) => a.vehicleNum.localeCompare(b.vehicleNum));

        return { uniqueDates, vehicleRows, dateTotals, grandTotal: { amount: overallAmount } };
    }, [filteredExpenses, vehicles, selectedInstId]);

    // ─────────────────────────────────────────────────────────────────────────────
    // ANALYTICS DASHBOARD LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Mapping utilities
    const instMap = useMemo(() => institutions.reduce((acc, i) => ({ ...acc, [i.id]: i }), {}), [institutions]);
    const vehMap = useMemo(() => vehicles.reduce((acc, v) => ({ ...acc, [v.id]: v }), {}), [vehicles]);
    const bhMap = useMemo(() => budgetHeads.reduce((acc, b) => ({ ...acc, [b.id]: b }), {}), [budgetHeads]);
    const sbhMap = useMemo(() => subBudgetHeads.reduce((acc, b) => ({ ...acc, [b.id]: b }), {}), [subBudgetHeads]);
    const vendMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {}), [vendors]);

    // Calculate OPEX Status for an expense
    const getOpexStatus = (expense) => {
        if (!expense.opex_details || expense.opex_details.length === 0) return 'Unsettled';
        const hasAdvance = expense.opex_details.some(o => o.opex_type === 'Advance');
        const hasSettlement = expense.opex_details.some(o => o.opex_type === 'Settlement');
        if (hasSettlement) return 'Settled';
        if (hasAdvance) return 'Advance Only';
        return 'Unsettled';
    };

    const analyticsData = useMemo(() => {
        if (!filteredExpenses.length) return null;

        let totalSpend = 0;
        let unsettledAmt = 0;
        let topVehId = null; let topVehSpend = 0;

        const trendMap = {};
        const instSum = {};
        const bhSum = {};
        const subBhSum = {};
        const vendorSum = {};
        const opexCount = { 'Settled': 0, 'Advance Only': 0, 'Unsettled': 0 };
        const vehSum = {};

        filteredExpenses.forEach(e => {
            const amt = parseFloat(e.total_amount || 0);
            totalSpend += amt;

            // Trend (by date)
            trendMap[e.date] = (trendMap[e.date] || 0) + amt;

            // Institution
            const instName = instMap[e.institution]?.name || `Inst ${e.institution}`;
            instSum[instName] = (instSum[instName] || 0) + amt;

            // Budget Head
            const bhName = bhMap[e.budget_head]?.name || `BH-${e.budget_head}`;
            bhSum[bhName] = (bhSum[bhName] || 0) + amt;

            // Sub Budget Head
            const sbhName = sbhMap[e.sub_budget_head]?.name || `Sub-BH-${e.sub_budget_head}`;
            subBhSum[sbhName] = (subBhSum[sbhName] || 0) + amt;

            // Vendor
            const vendorName = vendMap[e.vendor]?.name || `Vendor ${e.vendor}`;
            vendorSum[vendorName] = (vendorSum[vendorName] || 0) + amt;

            // OPEX Status & Unsettled Amount
            const status = getOpexStatus(e);
            opexCount[status]++;
            
            const opexSum = (e.opex_details || []).reduce((sum, o) => sum + parseFloat(o.opex_amount || 0), 0);
            unsettledAmt += Math.max(0, amt - opexSum);

            // Vehicle
            const vNum = vehMap[e.vehicle]?.vehicle_number || `Veh ${e.vehicle}`;
            vehSum[vNum] = (vehSum[vNum] || 0) + amt;
        });

        // Format for charts
        const formatBar = (obj, color) => {
            const sorted = Object.entries(obj).sort((a,b) => b[1] - a[1]);
            return {
                labels: sorted.map(i => i[0]),
                datasets: [{
                    label: 'Amount (₹)',
                    data: sorted.map(i => i[1]),
                    backgroundColor: color,
                    borderRadius: 6
                }]
            };
        };

        const sortedTrend = Object.entries(trendMap).sort((a,b) => new Date(a[0]) - new Date(b[0]));
        const trendChart = {
            labels: sortedTrend.map(i => i[0]),
            datasets: [{
                label: 'Total Billed Amount (₹)',
                data: sortedTrend.map(i => i[1]),
                fill: true,
                backgroundColor: 'rgba(255, 159, 67, 0.15)',
                borderColor: '#ff9f43',
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 2,
            }]
        };

        const instLabels = Object.keys(instSum);
        const instChart = {
            labels: instLabels,
            datasets: [{
                data: instLabels.map(l => instSum[l]),
                backgroundColor: instLabels.map(l => INST_COLORS[l] || '#8893a4'),
                borderWidth: 2
            }]
        };

        const opexLabels = Object.keys(opexCount).filter(k => opexCount[k] > 0);
        const opexColors = {'Settled':'#37d399', 'Advance Only':'#3ba0ff', 'Unsettled':'#ff5c6c'};
        const opexChart = {
            labels: opexLabels,
            datasets: [{
                data: opexLabels.map(l => opexCount[l]),
                backgroundColor: opexLabels.map(l => opexColors[l]),
                borderWidth: 2
            }]
        };

        // Top 15 Vehicles
        const sortedVeh = Object.entries(vehSum).sort((a,b) => b[1] - a[1]);
        if(sortedVeh.length > 0) {
            topVehId = sortedVeh[0][0];
            topVehSpend = sortedVeh[0][1];
        }
        const top15Veh = sortedVeh.slice(0, 15);
        const vehChart = {
            labels: top15Veh.map(i => i[0]),
            datasets: [{
                label: 'Amount (₹)',
                data: top15Veh.map(i => i[1]),
                backgroundColor: '#33c2c9',
                borderRadius: 6
            }]
        };

        return {
            totalSpend, totalBills: filteredExpenses.length, unsettledAmt, topVehId, topVehSpend,
            trendChart, instChart, opexChart, vehChart,
            budgetChart: formatBar(bhSum, '#3ba0ff'),
            subBhChart: formatBar(subBhSum, '#37d399'),
            vendorChart: formatBar(vendorSum, '#a785ff')
        };

    }, [filteredExpenses, instMap, vehMap, bhMap, sbhMap, vendMap]);


    // ─────────────────────────────────────────────────────────────────────────────
    // TABLE RENDER LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(sortDir * -1);
        } else {
            setSortKey(key);
            setSortDir(1);
        }
    };

    const tableData = useMemo(() => {
        let rows = [...filteredExpenses];
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            rows = rows.filter(e => {
                const vehNum = vehMap[e.vehicle]?.vehicle_number || '';
                const vendName = vendMap[e.vendor]?.name || '';
                const bhName = bhMap[e.budget_head]?.name || '';
                const sbhName = sbhMap[e.sub_budget_head]?.name || '';
                return (
                    (e.bill_no && e.bill_no.toLowerCase().includes(q)) ||
                    (e.purpose && e.purpose.toLowerCase().includes(q)) ||
                    vehNum.toLowerCase().includes(q) ||
                    vendName.toLowerCase().includes(q) ||
                    bhName.toLowerCase().includes(q) ||
                    sbhName.toLowerCase().includes(q) ||
                    (e.bill_description && e.bill_description.toLowerCase().includes(q))
                );
            });
        }

        rows.sort((a, b) => {
            let valA, valB;
            switch(sortKey) {
                case 'id': valA = a.id; valB = b.id; break;
                case 'date': valA = new Date(a.date); valB = new Date(b.date); break;
                case 'institution': valA = instMap[a.institution]?.name || ''; valB = instMap[b.institution]?.name || ''; break;
                case 'vehicle': valA = vehMap[a.vehicle]?.vehicle_number || ''; valB = vehMap[b.vehicle]?.vehicle_number || ''; break;
                case 'vendor': valA = vendMap[a.vendor]?.name || ''; valB = vendMap[b.vendor]?.name || ''; break;
                case 'budget_head': valA = bhMap[a.budget_head]?.name || ''; valB = bhMap[b.budget_head]?.name || ''; break;
                case 'sub_budget_head': valA = sbhMap[a.sub_budget_head]?.name || ''; valB = sbhMap[b.sub_budget_head]?.name || ''; break;
                case 'amount': valA = parseFloat(a.amount); valB = parseFloat(b.amount); break;
                case 'total_amount': valA = parseFloat(a.total_amount); valB = parseFloat(b.total_amount); break;
                default: valA = a[sortKey] || ''; valB = b[sortKey] || '';
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return -1 * sortDir;
            if (valA > valB) return 1 * sortDir;
            return 0;
        });

        return rows;
    }, [filteredExpenses, searchQuery, sortKey, sortDir, instMap, vehMap, bhMap, sbhMap, vendMap]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in w-full pb-10 -m-6 lg:-mx-10 lg:-mt-[22px] lg:-mb-10 p-6 lg:p-10">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-5">
                <div>
                    <button onClick={() => navigate(-1)} className="flex items-center text-slate-400 hover:text-emerald-400 transition-colors mb-2 text-sm font-medium">
                        <ArrowLeft size={16} className="mr-1" /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <FileText size={24} className="text-emerald-400" />
                        </div>
                        Expense Analytics
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 ml-12">Analyze fleet operations & maintenance spent</p>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 self-end md:self-auto">
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'analytics' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                    >
                        <LayoutDashboard size={16} /> Analytics
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'matrix' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                    >
                        <TableProperties size={16} /> Matrix View
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 mb-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Institution</label>
                        <select value={selectedInstId} onChange={e => setSelectedInstId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="">All Institutions</option>
                            {institutions.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Budget Head</label>
                        <select value={selectedBudgetId} onChange={e => { setSelectedBudgetId(e.target.value); setSelectedSubBudgetId(''); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="">All Budgets</option>
                            {budgetHeads
                                .filter(bh => !selectedInstId || !bh.institutions || bh.institutions.length === 0 || bh.institutions.includes(parseInt(selectedInstId)))
                                .map(bh => (
                                <option key={bh.id} value={bh.id}>{bh.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Vendor</label>
                        <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="">All Vendors</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Sub Budget Head</label>
                        <select value={selectedSubBudgetId} onChange={e => setSelectedSubBudgetId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="">All Sub Budgets</option>
                            {subBudgetHeads
                                .filter(sbh => !selectedBudgetId || sbh.budget_head === parseInt(selectedBudgetId))
                                .map(sbh => (
                                <option key={sbh.id} value={sbh.id}>{sbh.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">From Date</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">To Date</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                </div>
            </div>

            {/* VIEWS */}
            {viewMode === 'analytics' && analyticsData && (
                <div className="space-y-6">
                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Spent</div>
                            <div className="text-2xl font-bold text-white">₹{analyticsData.totalSpend.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
                            <div className="text-xs text-slate-500 mt-1">For selected filters</div>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Bills</div>
                            <div className="text-2xl font-bold text-white">{analyticsData.totalBills}</div>
                            <div className="text-xs text-slate-500 mt-1">Expense entries matched</div>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Unsettled Amount</div>
                            <div className="text-2xl font-bold text-white">₹{analyticsData.unsettledAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
                            <div className="text-xs text-slate-500 mt-1">Awaiting settlement/advances</div>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Highest Spender</div>
                            <div className="text-2xl font-bold text-white">{analyticsData.topVehId || '-'}</div>
                            <div className="text-xs text-slate-500 mt-1">₹{analyticsData.topVehSpend.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-8">
                            <h3 className="text-sm font-semibold text-white mb-1">Spent Trend (Daily)</h3>
                            <p className="text-xs text-slate-400 mb-4">Total billed amount including GST, by bill date</p>
                            <div className="h-72">
                                <Line data={analyticsData.trendChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-4">
                            <h3 className="text-sm font-semibold text-white mb-1">Spent by Institution</h3>
                            <p className="text-xs text-slate-400 mb-4">Share of total expense value</p>
                            <div className="h-72">
                                <Doughnut data={analyticsData.instChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e2e8f0' } } }, cutout: '65%' }} />
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-6">
                            <h3 className="text-sm font-semibold text-white mb-1">Spent by Budget Head</h3>
                            <p className="text-xs text-slate-400 mb-4">Amount allocated across budget head codes</p>
                            <div className="h-64">
                                <Bar data={analyticsData.budgetChart} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } } }} />
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-6">
                            <h3 className="text-sm font-semibold text-white mb-1">Spent by Sub Budget Head</h3>
                            <p className="text-xs text-slate-400 mb-4">Detailed category breakdown</p>
                            <div className="h-64">
                                <Bar data={analyticsData.subBhChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-6">
                            <h3 className="text-sm font-semibold text-white mb-1">Top Vendors by Billing</h3>
                            <p className="text-xs text-slate-400 mb-4">Total amount billed per vendor</p>
                            <div className="h-64">
                                <Bar data={analyticsData.vendorChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-6">
                            <h3 className="text-sm font-semibold text-white mb-1">OPEX Settlement Status</h3>
                            <p className="text-xs text-slate-400 mb-4">Advance vs Settlement vs Unsettled bills</p>
                            <div className="h-64">
                                <Pie data={analyticsData.opexChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e2e8f0' } } } }} />
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 lg:col-span-12">
                            <h3 className="text-sm font-semibold text-white mb-1">Top 15 Vehicles by Total Spent</h3>
                            <p className="text-xs text-slate-400 mb-4">Vehicle IDs with highest cumulative billed amount</p>
                            <div className="h-72">
                                <Bar data={analyticsData.vehChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Expense Records</h3>
                                <p className="text-xs text-slate-400">Showing {tableData.length} records</p>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search size={14} className="text-slate-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search bill, purpose, vendor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors w-full md:w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-700/50 max-h-[500px]">
                            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                                <thead className="bg-slate-900/90 sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        {[
                                            { key: 'id', label: 'ID' },
                                            { key: 'date', label: 'Date' },
                                            { key: 'institution', label: 'Institution' },
                                            { key: 'vehicle', label: 'Vehicle' },
                                            { key: 'vendor', label: 'Vendor' },
                                            { key: 'budget_head', label: 'Budget Head' },
                                            { key: 'sub_budget_head', label: 'Sub Budget Head' },
                                            { key: 'bill_no', label: 'Bill No' },
                                            { key: 'bill_file', label: 'Bill Document' },
                                            { key: 'total_amount', label: 'Total (₹)' },
                                            { key: 'opex_status', label: 'OPEX Status' },
                                        ].map(col => (
                                            <th 
                                                key={col.key} 
                                                className="px-4 py-3 font-medium text-slate-400 border-b border-slate-700/50 cursor-pointer hover:text-white transition-colors"
                                                onClick={() => handleSort(col.key)}
                                            >
                                                {col.label} {sortKey === col.key && (sortDir === 1 ? '↑' : '↓')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map(d => {
                                        const status = getOpexStatus(d);
                                        const badgeColor = status === 'Settled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                           status === 'Advance Only' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                                           'bg-red-500/10 text-red-400 border-red-500/20';
                                        
                                        return (
                                            <tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-700/20 transition-colors">
                                                <td className="px-4 py-3 text-slate-300">{d.id}</td>
                                                <td className="px-4 py-3 text-slate-300">{d.date}</td>
                                                <td className="px-4 py-3 text-slate-300">{instMap[d.institution]?.name || '-'}</td>
                                                <td className="px-4 py-3 font-medium text-emerald-400">{vehMap[d.vehicle]?.vehicle_number || '-'}</td>
                                                <td className="px-4 py-3 text-slate-300">{vendMap[d.vendor]?.name || '-'}</td>
                                                <td className="px-4 py-3 text-slate-300">{bhMap[d.budget_head]?.name || '-'}</td>
                                                <td className="px-4 py-3 text-slate-300">{sbhMap[d.sub_budget_head]?.name || '-'}</td>
                                                <td className="px-4 py-3 text-slate-300">{d.bill_no || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {d.bill_file ? (
                                                        <a 
                                                            href={String(d.bill_file).startsWith('http') ? String(d.bill_file) : `http://localhost:8000${String(d.bill_file).startsWith('/') ? '' : '/'}${d.bill_file}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg text-xs font-semibold"
                                                        >
                                                            📄 View PDF
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs italic">No File</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-300 font-mono">{parseFloat(d.total_amount).toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2.5 py-1 text-xs rounded-full border ${badgeColor}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {tableData.length === 0 && (
                                        <tr>
                                            <td colSpan="11" className="px-4 py-8 text-center text-slate-500">
                                                No expenses found matching the current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Matrix View */}
            {viewMode === 'matrix' && (
                <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Expense Matrix</h2>
                    
                    {vehicleRows.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-700">
                            No expense data available for the selected filters.
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[600px] border border-slate-700/50 rounded-lg custom-scrollbar matrix-table-container">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-slate-900 sticky top-0 z-20">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-[var(--text-main)] border-b border-slate-700 sticky left-0 bg-slate-900 z-30 min-w-[120px]">
                                            Vehicle
                                        </th>
                                        {uniqueDates.map(date => (
                                            <th key={date} className="px-4 py-3 font-medium text-[var(--text-main)] border-b border-l border-slate-700/50 text-right">
                                                {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 font-medium text-emerald-400 border-b border-l border-slate-700 text-right sticky right-0 bg-slate-900 z-30 shadow-[-4px_0_10px_rgba(0,0,0,0.2)]">
                                            Total (₹)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {vehicleRows.map(row => (
                                        <tr key={row.vehicleNum} className="hover:bg-slate-700/20 transition-colors group">
                                            <td className="px-4 py-2 font-medium text-[var(--text-main)] sticky left-0 bg-slate-900 group-hover:bg-slate-800 z-10 backdrop-blur-md">
                                                {row.vehicleNum}
                                            </td>
                                            {uniqueDates.map(date => (
                                                <td key={date} className="px-4 py-2 text-[var(--text-main)] border-l border-slate-700/30 text-right tabular-nums">
                                                    {row.dates[date].amount > 0 ? row.dates[date].amount.toLocaleString('en-IN', {maximumFractionDigits:0}) : '-'}
                                                </td>
                                            ))}
                                            <td className="px-4 py-2 font-bold text-emerald-400 border-l border-slate-700/50 text-right sticky right-0 bg-slate-900 group-hover:bg-slate-800 z-10 backdrop-blur-md shadow-[-4px_0_10px_rgba(0,0,0,0.2)]">
                                                {row.totalAmount.toLocaleString('en-IN', {maximumFractionDigits:0})}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 sticky bottom-0 z-20">
                                    <tr>
                                        <td className="px-4 py-3 font-bold text-[var(--text-main)] sticky left-0 bg-slate-900 z-30">
                                            Grand Total
                                        </td>
                                        {uniqueDates.map(date => (
                                            <td key={`total-${date}`} className="px-4 py-3 font-bold text-white border-l border-slate-700/50 text-right tabular-nums">
                                                {dateTotals[date].amount > 0 ? dateTotals[date].amount.toLocaleString('en-IN', {maximumFractionDigits:0}) : '-'}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 font-bold text-emerald-400 border-l border-slate-700/50 text-right sticky right-0 bg-slate-900 z-30 shadow-[-4px_0_10px_rgba(0,0,0,0.2)]">
                                            {grandTotal.amount.toLocaleString('en-IN', {maximumFractionDigits:0})}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExpenseReport;
