import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, LayoutDashboard, TableProperties, Search, Calendar, MapPin, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const CHART_DEFAULTS = {
    color: '#64748b',
    borderColor: '#e2e8f0',
    font: { family: "'Inter', system-ui, sans-serif" }
};

const OdometerDigits = ({ value }) => {
    const valStr = Math.floor(value).toString().padStart(6, '0');
    return (
        <div className="flex items-center space-x-1 font-mono text-4xl sm:text-5xl lg:text-6xl font-black text-white my-4">
            {valStr.split('').map((digit, i) => (
                <div key={i} className="relative w-[1em] h-[1.2em] overflow-hidden bg-slate-800 border border-slate-700 rounded-lg shadow-inner flex justify-center items-center">
                    <span className="absolute inset-0 flex justify-center items-center text-white">{digit}</span>
                </div>
            ))}
            <div className="text-xl sm:text-2xl font-bold text-slate-400 ml-2 uppercase tracking-wide">KM</div>
        </div>
    );
};

const OdometerReport = () => {
    const navigate = useNavigate();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [fromDate, setFromDate] = useState(sessionStorage.getItem('odometer_fromDate') || firstDay.toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(sessionStorage.getItem('odometer_toDate') || today.toISOString().split('T')[0]);
    const [selectedInstId, setSelectedInstId] = useState(sessionStorage.getItem('odometer_instId') || 'all');
    const [searchQuery, setSearchQuery] = useState(sessionStorage.getItem('odometer_search') || '');
    const [viewMode, setViewMode] = useState(sessionStorage.getItem('odometer_viewMode') || 'analytics');

    useEffect(() => {
        sessionStorage.setItem('odometer_fromDate', fromDate);
        sessionStorage.setItem('odometer_toDate', toDate);
        sessionStorage.setItem('odometer_instId', selectedInstId);
        sessionStorage.setItem('odometer_search', searchQuery);
        sessionStorage.setItem('odometer_viewMode', viewMode);
    }, [fromDate, toDate, selectedInstId, searchQuery, viewMode]);

    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let url = `vehicle-odometer-log/?end_date=${toDate}`;
                
                const [logRes, vehicleRes, instRes] = await Promise.all([
                    api.get(url),
                    api.get('vehicles/'),
                    api.get('institutions/')
                ]);
                setLogs(logRes.data);
                setVehicles(vehicleRes.data);
                setInstitutions(instRes.data);
            } catch (err) {
                console.error("Failed to fetch odometer data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [fromDate, toDate]);

    const { 
        uniqueDates, vehicleRows, dateTotals, grandTotal, grandTotalActual, grandTotalAdditional, grandTotalApproved, matrix,
        lineChartData, topVehicles, instChartData, distChartData,
        kpis, instCards, heatmapData
    } = useMemo(() => {
        const filteredVehicles = selectedInstId !== 'all'
            ? vehicles.filter(v => v.institution === parseInt(selectedInstId))
            : vehicles;

        const filteredVehicleIds = new Set(filteredVehicles.map(v => v.id));
        let filteredLogs = logs.filter(l => filteredVehicleIds.has(l.vehicle));

        if (!filteredLogs.length || !filteredVehicles.length) {
            return { 
                uniqueDates: [], vehicleRows: [], dateTotals: {}, grandTotal: 0, matrix: {},
                lineChartData: null, topVehicles: null, instChartData: null, distChartData: null,
                kpis: {}, instCards: [], heatmapData: []
            };
        }

        const logsByVehicle = {};
        filteredLogs.forEach(log => {
            if (!logsByVehicle[log.vehicle]) logsByVehicle[log.vehicle] = [];
            logsByVehicle[log.vehicle].push(log);
        });

        // Dates for the matrix (Only include dates within the selected range)
        const datesSet = new Set(
            filteredLogs
                .filter(l => new Date(l.log_date) >= new Date(fromDate))
                .map(l => l.log_date)
        );
        const uniqueDates = Array.from(datesSet).sort((a, b) => new Date(a) - new Date(b));

        const dateTotals = {};
        uniqueDates.forEach(d => {
            dateTotals[d] = { actual: 0, additional: 0, total: 0 };
        });

        let grandTotal = 0;
        let grandTotalActual = 0;
        let grandTotalAdditional = 0;
        let grandTotalApproved = 0;
        const vehicleTotals = {};
        const instDataMap = {};
        const matrix = {};
        
        let maxDailyRun = 0;
        let peakDay = '-';

        // Initialize Institution Data Map
        institutions.forEach(inst => {
            instDataMap[inst.id] = { id: inst.id, name: inst.name, total: 0, vehicles: 0, logs: 0 };
        });

        const distBuckets = { '<50':0, '50-100':0, '100-150':0, '150-200':0, '>200':0 };

        filteredVehicles.forEach(v => {
            let vLogs = logsByVehicle[v.id] || [];
            vLogs.sort((a, b) => new Date(a.log_date) - new Date(b.log_date));

            let vTotal = 0;
            let vActualTotal = 0;
            let vAdditionalTotal = 0;
            let vPeakDay = 0;
            let lastLog = '-';
            const datesMap = {};

            vLogs.forEach((log, index) => {
                let actual = 0;
                if (index > 0) {
                    const prevReading = vLogs[index - 1].evening_330 || vLogs[index - 1].morning_930;
                    actual = log.morning_930 - prevReading;
                } else {
                    actual = 0;
                }
                let additional = 0;
                if (log.evening_330 && log.morning_930) {
                    additional = log.evening_330 - log.morning_930;
                }

                let total = actual + additional;
                if (actual < 0) actual = 0;
                if (additional < 0) additional = 0;
                if (total < 0) total = 0;

                const isWithinRange = new Date(log.log_date) >= new Date(fromDate);

                if (isWithinRange) {
                    datesMap[log.log_date] = {
                        morning: log.morning_930,
                        evening: log.evening_330 || '-',
                        actual,
                        additional,
                        total
                    };

                    vTotal += total;
                    vActualTotal += actual;
                    vAdditionalTotal += additional;
                    dateTotals[log.log_date].actual += actual;
                    dateTotals[log.log_date].additional += additional;
                    dateTotals[log.log_date].total += total;
                    grandTotal += total;
                    grandTotalActual += actual;
                    grandTotalAdditional += additional;

                    if(total > vPeakDay) vPeakDay = total;
                    
                    // Distribution Buckets (based on daily run)
                    if(total < 50) distBuckets['<50']++;
                    else if(total < 100) distBuckets['50-100']++;
                    else if(total < 150) distBuckets['100-150']++;
                    else if(total < 200) distBuckets['150-200']++;
                    else distBuckets['>200']++;

                    if (v.institution && instDataMap[v.institution]) {
                        instDataMap[v.institution].total += total;
                        instDataMap[v.institution].logs += 1;
                    }
                }
                
                lastLog = log.log_date;
            });

            const approvedKms = v.current_operation?.approved_kms || 0;
            const logDaysCount = Object.keys(datesMap).length;
            const vApprovedTotal = logDaysCount * approvedKms;
            grandTotalApproved += vApprovedTotal;

            if(logDaysCount > 0) {
                if (v.institution && instDataMap[v.institution]) {
                    instDataMap[v.institution].vehicles += 1;
                }
                
                matrix[v.id] = {
                    vehicle: v,
                    dates: datesMap,
                    totalRun: vTotal,
                    actualTotal: vActualTotal,
                    additionalTotal: vAdditionalTotal,
                    approvedTotal: vApprovedTotal
                };
            }

            vehicleTotals[v.id] = {
                vehicle: v,
                total: vTotal,
                logsCount: logDaysCount,
                approvedTotal: vApprovedTotal,
                avgDay: logDaysCount > 0 ? (vTotal / logDaysCount) : 0,
                peakDay: vPeakDay,
                lastLog: lastLog
            };
        });
        
        uniqueDates.forEach(d => {
            if(dateTotals[d].total > maxDailyRun) {
                maxDailyRun = dateTotals[d].total;
                peakDay = dateTotals[d].total; // Peak day fleet total
            }
        });

        // Vehicle Rows for Table
        let vehicleRows = Object.values(vehicleTotals);
        if (searchQuery) {
            vehicleRows = vehicleRows.filter(r => r.vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        vehicleRows.sort((a, b) => b.total - a.total);

        const activeVehiclesCount = Object.values(vehicleTotals).filter(v => v.logsCount > 0).length;
        const totalLogsCount = filteredLogs.length;
        const daysSpanned = uniqueDates.length;
        
        const kpis = {
            totalRun: grandTotal,
            activeVehicles: activeVehiclesCount,
            totalLogs: totalLogsCount,
            instCount: Object.values(instDataMap).filter(i => i.total > 0).length,
            avgDaily: activeVehiclesCount > 0 && daysSpanned > 0 ? (grandTotal / activeVehiclesCount / daysSpanned) : 0,
            avgPerVeh: activeVehiclesCount > 0 ? (grandTotal / activeVehiclesCount) : 0,
            avgPerDayFleet: daysSpanned > 0 ? (grandTotal / daysSpanned) : 0,
            peakDayFleet: peakDay,
            daysSpanned: daysSpanned
        };

        const instCards = Object.values(instDataMap).filter(i => i.total > 0).sort((a,b)=>b.total-a.total);

        // Charts
        const lineChartData = {
            labels: uniqueDates,
            datasets: [{
                label: 'Total Fleet KM',
                data: uniqueDates.map(d => dateTotals[d].total),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        const top12 = Object.values(vehicleTotals).sort((a, b) => b.total - a.total).slice(0, 12);
        const topVehicles = {
            labels: top12.map(v => v.vehicle.vehicle_number),
            datasets: [{
                label: 'Total KM',
                data: top12.map(v => v.total),
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        };

        const instChartData = {
            labels: instCards.map(i => i.name),
            datasets: [{
                data: instCards.map(i => i.total),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                borderWidth: 0
            }]
        };

        const distChartData = {
            labels: Object.keys(distBuckets),
            datasets: [{
                label: 'Days Logged',
                data: Object.values(distBuckets),
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        };

        // Heatmap
        const heatmapData = [];
        let curDate = new Date(fromDate);
        const eDate = new Date(toDate);
        
        while(curDate <= eDate) {
            const dateStr = curDate.toISOString().split('T')[0];
            const val = dateTotals[dateStr] ? dateTotals[dateStr].total : 0;
            heatmapData.push({ date: dateStr, val: val });
            curDate.setDate(curDate.getDate() + 1);
        }

        return { 
            uniqueDates, vehicleRows, dateTotals, grandTotal, grandTotalActual, grandTotalAdditional, grandTotalApproved, matrix,
            lineChartData, topVehicles, instChartData, distChartData,
            kpis, instCards, heatmapData
        };
    }, [logs, vehicles, institutions, selectedInstId, searchQuery, fromDate, toDate]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1
            }
        },
        scales: {
            x: { grid: { display: false, color: CHART_DEFAULTS.borderColor }, ticks: { color: CHART_DEFAULTS.color } },
            y: { grid: { color: CHART_DEFAULTS.borderColor }, ticks: { color: CHART_DEFAULTS.color } }
        }
    };
    
    const pieOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { color: CHART_DEFAULTS.color } }
        }
    };

    if (loading) return <div className="p-6">Loading Odometer Report...</div>;

    const renderHeatmap = () => {
        if (!heatmapData.length) return null;
        
        let firstDayIndex = new Date(heatmapData[0].date).getDay();
        
        const cells = [];
        for(let i=0; i<firstDayIndex; i++) {
            cells.push(<div key={`empty-start-${i}`} className="w-3.5 h-3.5"></div>);
        }
        
        heatmapData.forEach((d, i) => {
            let colorClass = 'bg-slate-800 border border-slate-700';
            if (d.val > 0) colorClass = 'bg-emerald-100 border-emerald-200';
            if (d.val > 50) colorClass = 'bg-emerald-300 border-emerald-400';
            if (d.val > 150) colorClass = 'bg-emerald-900/300 border-emerald-600';
            if (d.val > 300) colorClass = 'bg-emerald-700 border-emerald-800';
            
            cells.push(
                <div key={d.date} className={`w-3.5 h-3.5 rounded-sm ${colorClass}`} title={`${d.date}: ${d.val} km`}></div>
            );
        });
return <div className="grid grid-flow-col grid-rows-7 gap-1">{cells}</div>;
    };

    return (
        <div className="min-h-screen bg-slate-900/50 text-white font-sans -m-6 lg:-mx-10 lg:-mt-[22px] lg:-mb-10">
            <div className="bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">Odometer Report</h1>
                            <p className="text-sm text-slate-400">Fleet distance tracking and analytics</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('analytics')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'analytics' ? 'bg-slate-900 shadow text-blue-400' : 'text-slate-300 hover:text-slate-900'}`}
                            >
                                <LayoutDashboard size={16} /> Analytics
                            </button>
                            <button 
                                onClick={() => setViewMode('matrix')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'matrix' ? 'bg-slate-900 shadow text-blue-400' : 'text-slate-300 hover:text-slate-900'}`}
                            >
                                <TableProperties size={16} /> Matrix View
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                            <input
                                type="date"
                                className="px-3 py-2 border border-slate-600 rounded-lg text-sm bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                            <input
                                type="date"
                                className="px-3 py-2 border border-slate-600 rounded-lg text-sm bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full p-6 space-y-6">
                {viewMode === 'analytics' ? (
                    <>
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div>
                                <div className="text-sm font-semibold text-blue-400 tracking-wider uppercase mb-1">Total Fleet Distance Logged</div>
                                <OdometerDigits value={kpis?.totalRun || 0} />
                                <div className="text-slate-400 text-sm mt-2">
                                    across <span className="font-semibold text-slate-200">{kpis?.activeVehicles || 0}</span> vehicles · <span className="font-semibold text-slate-200">{kpis?.totalLogs || 0}</span> log entries · <span className="font-semibold text-slate-200">{kpis?.instCount || 0}</span> institutions
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 lg:gap-8 w-full lg:w-auto">
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                    <div className="text-2xl font-bold text-white">{Math.round(kpis?.avgPerVeh || 0)}</div>
                                    <div className="text-xs text-slate-400 font-medium">AVG KM / VEHICLE</div>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                    <div className="text-2xl font-bold text-white">{Math.round(kpis?.avgPerDayFleet || 0)}</div>
                                    <div className="text-xs text-slate-400 font-medium">AVG KM / DAY (FLEET)</div>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                    <div className="text-2xl font-bold text-white">{Math.round(kpis?.peakDayFleet || 0)}</div>
                                    <div className="text-xs text-slate-400 font-medium">PEAK DAY (KM)</div>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                    <div className="text-2xl font-bold text-white">{kpis?.daysSpanned || 0}</div>
                                    <div className="text-xs text-slate-400 font-medium">DAYS SPANNED</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-5">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Total Run Distance</div>
                                <div className="text-2xl font-bold text-white my-1">{Math.round(kpis?.totalRun || 0)}</div>
                                <div className="text-xs text-slate-400">actual + additional km</div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-5">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Active Vehicles</div>
                                <div className="text-2xl font-bold text-white my-1">{kpis?.activeVehicles || 0}</div>
                                <div className="text-xs text-slate-400">unique registration numbers</div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-5">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Log Entries</div>
                                <div className="text-2xl font-bold text-white my-1">{kpis?.totalLogs || 0}</div>
                                <div className="text-xs text-slate-400">daily odometer records</div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-5">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Institutions</div>
                                <div className="text-2xl font-bold text-white my-1">{kpis?.instCount || 0}</div>
                                <div className="text-xs text-slate-400">campuses covered</div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-5">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Avg Daily Run</div>
                                <div className="text-2xl font-bold text-white my-1">{Math.round(kpis?.avgDaily || 0)}</div>
                                <div className="text-xs text-slate-400">km per vehicle / day</div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-6">
                            <h3 className="font-semibold text-white mb-1">Fleet Activity Heatmap</h3>
                            <p className="text-sm text-slate-400 mb-6">Total km run per day</p>
                            <div className="overflow-x-auto pb-4 flex justify-start">
                                {renderHeatmap()}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                <span>Less</span>
                                <span className="w-3.5 h-3.5 rounded-sm bg-slate-800 border border-slate-700"></span>
                                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 border-emerald-200"></span>
                                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-300 border-emerald-400"></span>
                                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-900/300 border-emerald-600"></span>
                                <span className="w-3.5 h-3.5 rounded-sm bg-emerald-700 border-emerald-800"></span>
                                <span>More</span>
                            </div>
                        </div>

                        {instCards && instCards.length > 0 && (
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-6">
                                <h3 className="font-semibold text-white mb-1">Institutions</h3>
                                <p className="text-sm text-slate-400 mb-6">Summary across campuses</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {instCards.map(inst => (
                                        <div key={inst.id} 
                                            onClick={() => { setSelectedInstId(inst.id.toString()); setSearchQuery(''); }}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedInstId === inst.id.toString() ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-900/30' : 'border-slate-700 hover:border-blue-300 hover:bg-slate-900/50'}`}
                                        >
                                            <div className="flex items-center gap-2 font-medium text-white mb-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-900/300"></div>
                                                <div className="truncate">{inst.name}</div>
                                            </div>
                                            <div className="text-2xl font-bold text-white mb-3">{Math.round(inst.total)}<span className="text-sm font-normal text-slate-400 ml-1">KM</span></div>
                                            <div className="flex justify-between text-sm text-slate-300 mb-1">
                                                <span>Vehicles</span><span className="font-semibold">{inst.vehicles}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-slate-300">
                                                <span>Logs</span><span className="font-semibold">{inst.logs}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedInstId !== 'all' && (
                                        <div onClick={() => setSelectedInstId('all')} className="p-4 rounded-xl border border-dashed border-slate-600 flex flex-col justify-center items-center cursor-pointer hover:bg-slate-900/50 transition-colors text-slate-400 hover:text-slate-200">
                                            <LayoutDashboard className="mb-2" size={24} />
                                            <div className="font-medium">View All Fleet</div>
                                            <div className="text-xs mt-1">Clear Filter</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-6">
                                <h3 className="font-semibold text-white mb-1">Daily Fleet Distance Trend</h3>
                                <p className="text-sm text-slate-400 mb-6">Total km run by all filtered vehicles, per day</p>
                                <div className="h-64">
                                    {lineChartData && <Line data={lineChartData} options={chartOptions} />}
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-6">
                                <h3 className="font-semibold text-white mb-1">Distance by Institution</h3>
                                <p className="text-sm text-slate-400 mb-6">Share of total km run</p>
                                <div className="h-64">
                                    {instChartData && <Doughnut data={instChartData} options={pieOptions} />}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-6">
                                <h3 className="font-semibold text-white mb-1">Top 12 Vehicles by Distance</h3>
                                <p className="text-sm text-slate-400 mb-6">Total km run over the period</p>
                                <div className="h-64">
                                    {topVehicles && <Bar data={topVehicles} options={chartOptions} />}
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 p-6">
                                <h3 className="font-semibold text-white mb-1">Daily Run Distribution</h3>
                                <p className="text-sm text-slate-400 mb-6">How far vehicles typically run in a day</p>
                                <div className="h-64">
                                    {distChartData && <Bar data={distChartData} options={chartOptions} />}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <h3 className="font-semibold text-white mb-1">Vehicle Summary</h3>
                                <p className="text-sm text-slate-400">Per-vehicle totals — search, filter and sort</p>
                            </div>
                            
                            <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex flex-wrap items-center gap-4">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search vehicle number..." 
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="px-4 py-2 border border-slate-600 rounded-lg bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedInstId} 
                                    onChange={(e) => setSelectedInstId(e.target.value)}
                                >
                                    <option value="all">All institutions</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                                <div className="px-3 py-1 bg-blue-900/50 text-blue-300 font-medium rounded-full text-sm">
                                    {vehicleRows.length} Vehicles
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900/50 border-b border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle No.</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Institution</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Log Days</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Run (km)</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg / Day (km)</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peak Day (km)</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Log</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {vehicleRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                                                <td className="py-3 px-4 font-medium text-white">{row.vehicle.vehicle_number}</td>
                                                <td className="py-3 px-4 text-slate-300">{institutions.find(x => x.id === row.vehicle.institution)?.name || '-'}</td>
                                                <td className="py-3 px-4 text-slate-300">{row.logsCount}</td>
                                                <td className="py-3 px-4 font-semibold text-white">{row.total}</td>
                                                <td className="py-3 px-4 text-slate-300">{Math.round(row.avgDay)}</td>
                                                <td className="py-3 px-4 text-slate-300">{row.peakDay}</td>
                                                <td className="py-3 px-4 text-slate-400 text-sm">{row.lastLog}</td>
                                            </tr>
                                        ))}
                                        {vehicleRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                                    No data found for selected filters
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="font-semibold text-white mb-1">Matrix View</h3>
                            <p className="text-sm text-slate-400">Daily breakdown by vehicle</p>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Working Days</div>
                                    <div className="text-2xl font-bold text-white">{uniqueDates.length}</div>
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Total Approved KM</div>
                                    <div className="text-2xl font-bold text-white">{grandTotalApproved}</div>
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Total Actual KM</div>
                                    <div className="text-2xl font-bold text-white">{grandTotalActual}</div>
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Total Extra KM</div>
                                    <div className="text-2xl font-bold text-white">{grandTotalAdditional}</div>
                                </div>
                                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-100 flex flex-col items-center justify-center">
                                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1 text-center">Grand Total KM</div>
                                    <div className="text-2xl font-bold text-blue-200">{grandTotal}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex flex-wrap gap-4 items-center">
                             <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search vehicle number..." 
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select 
                                className="px-4 py-2 border border-slate-600 rounded-lg bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedInstId} 
                                onChange={(e) => setSelectedInstId(e.target.value)}
                            >
                                <option value="all">All institutions</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="overflow-auto max-h-[70vh]">
                            {uniqueDates.length > 0 && vehicleRows.length > 0 ? (
                                <table className="report-matrix-table w-full text-left border-separate border-spacing-0 whitespace-nowrap">
                                    <thead className="bg-slate-900">
                                        <tr>
                                            <th className="py-3 px-4 font-semibold text-slate-200 bg-slate-800 border-b border-slate-600 border-r border-slate-700 sticky top-0 left-0 z-40 min-w-[130px] max-w-[130px]">Vehicle</th>
                                            <th className="py-3 px-4 font-semibold text-slate-200 bg-slate-900 border-b border-slate-600 border-r border-slate-700 sticky top-0 left-[130px] z-40 text-center min-w-[100px] max-w-[100px]">Institution</th>
                                            <th className="py-3 px-4 font-semibold text-slate-200 bg-slate-800 border-b border-slate-600 border-r border-slate-700 sticky top-0 left-[230px] z-40 text-center min-w-[140px] max-w-[140px]">Total Approved</th>
                                            <th className="py-3 px-4 font-semibold text-blue-300 bg-blue-900 border-b border-slate-600 border-r border-slate-700 sticky top-0 left-[370px] z-40 text-center min-w-[110px] max-w-[110px]">Total Run</th>
                                            {uniqueDates.map(date => (
                                                <th key={date} className="py-3 px-4 font-semibold text-slate-300 bg-slate-900 border-b border-slate-600 border-r border-slate-700 sticky top-0 z-20 text-center min-w-[320px]">
                                                    {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    <div className="grid grid-cols-5 gap-1 mt-2 text-[10px] text-slate-400 uppercase tracking-wider">
                                                        <span>Morn</span>
                                                        <span>Eve</span>
                                                        <span>Actual</span>
                                                        <span>Extra</span>
                                                        <span className="font-bold text-slate-300">Total</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="py-3 px-4 font-semibold text-slate-300 bg-slate-900 border-b border-slate-600 border-l border-l-slate-700 sticky top-0 z-20 text-center min-w-[100px]">Total Actual</th>
                                            <th className="py-3 px-4 font-semibold text-slate-300 bg-slate-900 border-b border-slate-600 sticky top-0 z-20 text-center min-w-[100px]">Total Extra</th>
                                            <th className="py-3 px-4 font-bold text-blue-300 bg-blue-900 border-b border-slate-600 border-r border-slate-700 sticky top-0 z-20 text-center min-w-[110px]">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {vehicleRows.map(row => {
                                            const inst = institutions.find(i => i.id === row.vehicle.institution);
                                            const vData = matrix[row.vehicle.id];
                                            
                                            return (
                                                <tr key={row.vehicle.id} className="hover:bg-slate-800">
                                                    <td className="py-3 px-4 font-semibold text-white bg-slate-900 sticky left-0 z-30 border-b border-slate-700 border-r border-slate-700 min-w-[130px] max-w-[130px]">{row.vehicle.vehicle_number}</td>
                                                    <td className="py-3 px-4 text-slate-300 bg-slate-900 sticky left-[130px] z-30 text-center text-sm border-b border-slate-700 border-r border-slate-700 min-w-[100px] max-w-[100px]">{inst?.name || '-'}</td>
                                                    <td className="py-3 px-4 font-semibold text-emerald-400 bg-slate-800 sticky left-[230px] z-30 text-center border-b border-slate-700 border-r border-slate-700 min-w-[140px] max-w-[140px]">{row.approvedTotal || '-'}</td>
                                                    <td className="py-3 px-4 font-bold text-blue-300 bg-blue-900 sticky left-[370px] z-30 text-center border-b border-slate-700 border-r border-slate-700 min-w-[110px] max-w-[110px]">{row.total}</td>
                                                    {uniqueDates.map(date => {
                                                        const dData = vData?.dates[date];
                                                        if (!dData) {
                                                            return <td key={date} className="py-2 px-4 text-center border-b border-slate-700 border-r border-slate-700 text-slate-500">-</td>;
                                                        }
                                                        return (
                                                            <td key={date} className="py-2 px-4 text-center border-b border-slate-700 border-r border-slate-700">
                                                                <div className="grid grid-cols-5 gap-1 text-sm">
                                                                    <span className="text-slate-400">{dData.morning}</span>
                                                                    <span className="text-slate-400">{dData.evening}</span>
                                                                    <span className="text-slate-300 font-medium">{dData.actual}</span>
                                                                    <span className="text-slate-300 font-medium">{dData.additional}</span>
                                                                    <span className={`font-bold ${dData.total > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{dData.total}</span>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-3 px-4 font-semibold text-slate-300 bg-slate-900 text-center border-b border-slate-700 border-l border-l-slate-700">{vData?.actualTotal || 0}</td>
                                                    <td className="py-3 px-4 font-semibold text-slate-300 bg-slate-900 text-center border-b border-slate-700">{vData?.additionalTotal || 0}</td>
                                                    <td className="py-3 px-4 font-bold text-blue-300 bg-blue-900 text-center border-b border-slate-700 border-r border-slate-700">{vData?.totalRun || 0}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Totals Row */}
                                        <tr className="bg-slate-800 font-bold sticky bottom-0 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
                                            <td className="py-3 px-4 text-white sticky left-0 z-50 bg-slate-800 border-t-2 border-t-slate-600 border-r border-slate-700 min-w-[130px] max-w-[130px]">Fleet Total</td>
                                            <td className="py-3 px-4 bg-slate-800 sticky left-[130px] z-50 border-t-2 border-t-slate-600 border-r border-slate-700 min-w-[100px] max-w-[100px]"></td>
                                            <td className="py-3 px-4 text-emerald-300 font-bold text-center bg-slate-800 sticky left-[230px] z-50 border-t-2 border-t-slate-600 border-r border-slate-700 min-w-[140px] max-w-[140px]">{grandTotalApproved}</td>
                                            <td className="py-3 px-4 text-blue-200 text-center bg-blue-900 sticky left-[370px] z-50 border-t-2 border-t-slate-600 border-r border-slate-700 min-w-[110px] max-w-[110px]">{grandTotal}</td>
                                            {uniqueDates.map(date => (
                                                <td key={date} className="py-3 px-4 text-center border-t-2 border-t-slate-600 border-r border-slate-700 bg-slate-800">
                                                    <div className="grid grid-cols-5 gap-1 text-sm">
                                                        <span></span>
                                                        <span></span>
                                                        <span className="text-emerald-300 font-medium">{dateTotals[date].actual}</span>
                                                        <span className="text-emerald-300 font-medium">{dateTotals[date].additional}</span>
                                                        <span className="text-emerald-300 font-bold">{dateTotals[date].total}</span>
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="py-3 px-4 text-emerald-300 font-bold text-center bg-slate-800 border-t-2 border-t-slate-600 border-l border-l-slate-700">{grandTotalActual}</td>
                                            <td className="py-3 px-4 text-emerald-300 font-bold text-center bg-slate-800 border-t-2 border-t-slate-600">{grandTotalAdditional}</td>
                                            <td className="py-3 px-4 text-blue-200 font-bold text-center bg-blue-900 border-t-2 border-t-slate-600 border-r border-slate-700">{grandTotal}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-400">
                                    No data available for the selected filters.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OdometerReport;
