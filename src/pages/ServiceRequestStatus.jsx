import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Wrench,
  Building2,
  CheckCircle2,
  Clock,
  PlusCircle,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Bus,
  DollarSign,
  AlertTriangle,
  Calendar,
  Layers,
  FileText,
  Activity,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

// Fallback Institutions when DB is empty
const DEFAULT_INSTITUTIONS = [
  { id: 1, name: 'Rathinam College of Arts and Science (RCAS)' },
  { id: 2, name: 'Rathinam Technical Campus (RTC)' },
  { id: 3, name: 'Rathinam School of Architecture (RSA)' },
  { id: 4, name: 'RPS School' },
  { id: 5, name: 'KPM School' }
];

// Fallback Sample Service Requests when DB is empty
const DEFAULT_SERVICE_REQUESTS = [
  {
    id: 101,
    request_id: 'SR202607280001',
    date: '2026-07-28',
    institution: 1,
    institution_name: 'Rathinam College of Arts and Science (RCAS)',
    vehicle: 1,
    vehicle_number: 'TN-37-AB-1234',
    cab_no: 'CAB-01',
    nature_of_problem: 'Engine Oil Leak & Oil Filter Replacement',
    vendor_name_detail: 'Royal Auto Workshop',
    estimated_repair_cost: 18500.00,
    is_closed: false
  },
  {
    id: 102,
    request_id: 'SR202607250003',
    date: '2026-07-25',
    institution: 2,
    institution_name: 'Rathinam Technical Campus (RTC)',
    vehicle: 2,
    vehicle_number: 'TN-37-CD-5678',
    cab_no: 'CAB-04',
    nature_of_problem: 'Front Brake Pad & Disc Servicing',
    vendor_name_detail: 'Sri Ram Motors',
    estimated_repair_cost: 12000.00,
    is_closed: true
  },
  {
    id: 103,
    request_id: 'SR202607200005',
    date: '2026-07-20',
    institution: 4,
    institution_name: 'RPS School',
    vehicle: 3,
    vehicle_number: 'TN-37-EF-9012',
    cab_no: 'BUS-08',
    nature_of_problem: 'Clutch Plate Assembly & Gearbox Overhaul',
    vendor_name_detail: 'Coimbatore Fleet Repairs',
    estimated_repair_cost: 24000.00,
    is_closed: false
  },
  {
    id: 104,
    request_id: 'SR202607180002',
    date: '2026-07-18',
    institution: 5,
    institution_name: 'KPM School',
    vehicle: 4,
    vehicle_number: 'TN-37-GH-3456',
    cab_no: 'BUS-02',
    nature_of_problem: 'AC Compressor Servicing & Gas Refill',
    vendor_name_detail: 'Cooling Systems Ltd',
    estimated_repair_cost: 9500.00,
    is_closed: true
  },
  {
    id: 105,
    request_id: 'SR202607150004',
    date: '2026-07-15',
    institution: 3,
    institution_name: 'Rathinam School of Architecture (RSA)',
    vehicle: 5,
    vehicle_number: 'TN-37-JK-7890',
    cab_no: 'CAB-03',
    nature_of_problem: '4 Radial Heavy Duty Tire Replacement',
    vendor_name_detail: 'Universal Rubber & Tyres',
    estimated_repair_cost: 32000.00,
    is_closed: true
  },
  {
    id: 106,
    request_id: 'SR202607100006',
    date: '2026-07-10',
    institution: 1,
    institution_name: 'Rathinam College of Arts and Science (RCAS)',
    vehicle: 6,
    vehicle_number: 'TN-37-MN-2345',
    cab_no: 'CAB-07',
    nature_of_problem: 'Electrical Harness Wiring & Battery Upgrade',
    vendor_name_detail: 'Exide Power Garage',
    estimated_repair_cost: 8200.00,
    is_closed: false
  }
];

const ServiceRequestStatus = () => {
  const navigate = useNavigate();

  // State
  const [serviceRequests, setServiceRequests] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Switcher Mode: 'ALL' | 'ANALYSIS' | 'MATRIX'
  const [activeView, setActiveView] = useState('ALL');

  // Filters
  const [selectedInst, setSelectedInst] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL | OPEN | CLOSED
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Fetch Data from Backend API
  const fetchData = async () => {
    try {
      setLoading(true);

      const [srRes, instRes] = await Promise.all([
        api.get('service-requests/').catch(() => ({ data: [] })),
        api.get('institutions/').catch(() => ({ data: [] }))
      ]);

      const apiSrs = srRes.data || [];
      const apiInsts = instRes.data || [];

      // Use API data if available, else fallback cleanly
      setServiceRequests(apiSrs.length > 0 ? apiSrs : DEFAULT_SERVICE_REQUESTS);
      setInstitutions(apiInsts.length > 0 ? apiInsts : DEFAULT_INSTITUTIONS);
    } catch (err) {
      console.error('Failed to load Service Request Status data:', err);
      setServiceRequests(DEFAULT_SERVICE_REQUESTS);
      setInstitutions(DEFAULT_INSTITUTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Service Requests
  const filteredServiceRequests = useMemo(() => {
    return serviceRequests.filter(sr => {
      const matchInst = selectedInst === 'ALL' || sr.institution === parseInt(selectedInst, 10);
      const matchStatus = 
        selectedStatus === 'ALL' ||
        (selectedStatus === 'OPEN' && !sr.is_closed) ||
        (selectedStatus === 'CLOSED' && sr.is_closed);
      const matchMonth = !monthFilter || (sr.date && sr.date.startsWith(monthFilter));
      
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (sr.request_id && sr.request_id.toLowerCase().includes(searchLower)) ||
        (sr.vehicle_number && sr.vehicle_number.toLowerCase().includes(searchLower)) ||
        (sr.institution_name && sr.institution_name.toLowerCase().includes(searchLower)) ||
        (sr.nature_of_problem && sr.nature_of_problem.toLowerCase().includes(searchLower)) ||
        (sr.vendor_name_detail && sr.vendor_name_detail.toLowerCase().includes(searchLower));

      return matchInst && matchStatus && matchMonth && matchSearch;
    });
  }, [serviceRequests, selectedInst, selectedStatus, monthFilter, searchTerm]);

  // Institution-wise Statistics
  const institutionStats = useMemo(() => {
    return institutions.map(inst => {
      const instSrs = serviceRequests.filter(sr => sr.institution === inst.id);
      const openSrs = instSrs.filter(sr => !sr.is_closed);
      const closedSrs = instSrs.filter(sr => sr.is_closed);
      const openCost = openSrs.reduce((sum, sr) => sum + parseFloat(sr.estimated_repair_cost || 0), 0);
      const closedCost = closedSrs.reduce((sum, sr) => sum + parseFloat(sr.estimated_repair_cost || 0), 0);

      return {
        id: inst.id,
        name: inst.name,
        totalCount: instSrs.length,
        openCount: openSrs.length,
        closedCount: closedSrs.length,
        openCost,
        closedCost,
        resolutionPct: instSrs.length > 0 ? Math.round((closedSrs.length / instSrs.length) * 100) : 100
      };
    });
  }, [institutions, serviceRequests]);

  // Overall KPI Metrics
  const overallMetrics = useMemo(() => {
    const total = filteredServiceRequests.length;
    const openSrs = filteredServiceRequests.filter(sr => !sr.is_closed);
    const closedSrs = filteredServiceRequests.filter(sr => sr.is_closed);
    
    const openCost = openSrs.reduce((sum, sr) => sum + parseFloat(sr.estimated_repair_cost || 0), 0);
    const closedCost = closedSrs.reduce((sum, sr) => sum + parseFloat(sr.estimated_repair_cost || 0), 0);
    const totalCost = openCost + closedCost;

    const resolutionPct = total > 0 ? Math.round((closedSrs.length / total) * 100) : 100;

    return {
      total,
      openCount: openSrs.length,
      closedCount: closedSrs.length,
      openCost,
      closedCost,
      totalCost,
      resolutionPct
    };
  }, [filteredServiceRequests]);

  // CHART 1: Institution Open vs Closed Requests (Bar Chart)
  const chartInstitutionStatusData = useMemo(() => {
    const labels = institutions.map(i => i.name.split(' (')[0]);
    const openData = institutions.map(inst => {
      return serviceRequests.filter(sr => sr.institution === inst.id && !sr.is_closed).length;
    });
    const closedData = institutions.map(inst => {
      return serviceRequests.filter(sr => sr.institution === inst.id && sr.is_closed).length;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Open / In-Progress',
          data: openData,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 8
        },
        {
          label: 'Closed / Settled',
          data: closedData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 8
        }
      ]
    };
  }, [institutions, serviceRequests]);

  // CHART 2: Status Breakdown Donut
  const chartStatusDonutData = useMemo(() => {
    return {
      labels: ['Closed / Resolved', 'Open / Pending'],
      datasets: [
        {
          data: [overallMetrics.closedCount, overallMetrics.openCount],
          backgroundColor: ['#10b981', '#f59e0b'],
          borderColor: '#0f172a',
          borderWidth: 3
        }
      ]
    };
  }, [overallMetrics]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide">Loading Institution Service Request Status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in pb-20 max-w-7xl mx-auto">
      


      {/* VIEW SWITCHER CONTROL TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 p-3 rounded-3xl border border-purple-500/30 shadow-xl backdrop-blur-md gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveView('ANALYSIS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeView === 'ANALYSIS'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 scale-105'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity size={16} className={activeView === 'ANALYSIS' ? 'text-white' : 'text-purple-400'} />
            Analysis View
          </button>

          <button
            onClick={() => setActiveView('MATRIX')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeView === 'MATRIX'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 scale-105'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText size={16} className={activeView === 'MATRIX' ? 'text-white' : 'text-purple-400'} />
            Master Ticket Matrix View
          </button>

          <button
            onClick={() => setActiveView('ALL')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeView === 'ALL'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 scale-105'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers size={16} className={activeView === 'ALL' ? 'text-white' : 'text-purple-400'} />
            Combined View (All)
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 px-4">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
          <span className="font-semibold text-slate-300">
            {activeView === 'ANALYSIS' && 'Showing Fleet Performance Charts & Metrics'}
            {activeView === 'MATRIX' && 'Showing Service Requests Master Ticket Matrix Table'}
            {activeView === 'ALL' && 'Showing Full Service Request Analytics & Ticket Matrix'}
          </span>
        </div>
      </div>

      {/* ANALYSIS VIEW SECTION */}
      {(activeView === 'ANALYSIS' || activeView === 'ALL') && (
        <>
          {/* TOP EXECUTIVE METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Total Service Requests */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-purple-500 flex flex-col justify-between group hover:border-purple-500/50 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Total Requests</p>
                  <h2 className="text-4xl font-black text-white mt-1.5">{overallMetrics.total}</h2>
                </div>
                <span className="p-3.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Wrench size={24} />
                </span>
              </div>
              <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span>Total Est. Cost:</span>
                <span className="text-purple-400 font-extrabold text-sm">₹{overallMetrics.totalCost.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 2: Open Requests */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-amber-500 flex flex-col justify-between group hover:border-amber-500/50 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">Open / In-Progress</p>
                  <h2 className="text-4xl font-black text-amber-400 mt-1.5">{overallMetrics.openCount}</h2>
                </div>
                <span className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 group-hover:scale-110 transition-transform animate-pulse">
                  <Clock size={24} />
                </span>
              </div>
              <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span>Pending Repair Value:</span>
                <span className="text-amber-400 font-extrabold text-sm">₹{overallMetrics.openCost.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 3: Closed Requests */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-emerald-500 flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">Closed / Settled</p>
                  <h2 className="text-4xl font-black text-emerald-400 mt-1.5">{overallMetrics.closedCount}</h2>
                </div>
                <span className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </span>
              </div>
              <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span>Settled Repair Value:</span>
                <span className="text-emerald-400 font-extrabold text-sm">₹{overallMetrics.closedCost.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 4: Resolution Efficiency */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-blue-500 flex flex-col justify-between group hover:border-blue-500/50 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">Resolution Rate</p>
                  <h2 className="text-4xl font-black text-blue-400 mt-1.5">{overallMetrics.resolutionPct}%</h2>
                </div>
                <span className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <Zap size={24} />
                </span>
              </div>
              <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span>Fleet Condition:</span>
                <span className="text-emerald-400 font-bold">Active Fleet Operational</span>
              </div>
            </div>
          </div>

          {/* INSTITUTION STATUS PERFORMANCE COMMAND CARDS */}
          <div className="bg-slate-900/60 backdrop-blur-md p-7 rounded-3xl border border-slate-800/80 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <Building2 size={22} className="text-purple-400" />
                  Institution Performance & Status Breakdown
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Select an institution card to filter tickets and view in Master Ticket Matrix below
                </p>
              </div>

              {selectedInst !== 'ALL' && (
                <button
                  onClick={() => setSelectedInst('ALL')}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-3.5 py-1.5 rounded-xl border border-purple-500/30 transition-all"
                >
                  Clear Institution Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {institutionStats.map(inst => {
                const isSelected = selectedInst === String(inst.id);
                return (
                  <div
                    key={inst.id}
                    onClick={() => {
                      setSelectedInst(isSelected ? 'ALL' : String(inst.id));
                      if (activeView === 'ANALYSIS') setActiveView('MATRIX');
                    }}
                    className={`p-6 rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-950/60 to-slate-900 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.25)] ring-2 ring-purple-500/40'
                        : 'bg-slate-800/40 border-slate-700/60 hover:border-purple-500/60 hover:bg-slate-800/70 hover:shadow-xl'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition-colors flex items-center gap-2 line-clamp-1">
                          <Building2 size={18} className="text-purple-400 shrink-0" />
                          {inst.name}
                        </h4>
                        <span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-800 text-purple-300 border border-purple-500/30 shrink-0">
                          {inst.totalCount} Total
                        </span>
                      </div>

                      {/* Dual-Segment Resolution Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-3 my-4 overflow-hidden border border-slate-700/80 flex">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${inst.resolutionPct}%` }}
                          title={`Closed: ${inst.resolutionPct}%`}
                        ></div>
                        <div
                          className="bg-amber-500 h-full transition-all"
                          style={{ width: `${100 - inst.resolutionPct}%` }}
                          title={`Open: ${100 - inst.resolutionPct}%`}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs mt-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/25">
                          <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">Open Status</span>
                          <span className="text-xl font-black text-amber-300 mt-1 block">{inst.openCount}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">Est. ₹{inst.openCost.toLocaleString()}</span>
                        </div>

                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/25">
                          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block">Closed Status</span>
                          <span className="text-xl font-black text-emerald-300 mt-1 block">{inst.closedCount}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">Settled ₹{inst.closedCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="font-semibold">{inst.resolutionPct}% Resolved</span>
                      <span className="text-purple-400 font-extrabold group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                        {isSelected ? 'Viewing Matrix' : 'View Matrix Tickets'} <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ANALYTICS CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CHART 1: Institution Open vs Closed Bar Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md p-7 rounded-3xl border border-slate-800/80 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-white flex items-center gap-2.5">
                  <TrendingUp size={20} className="text-purple-400" />
                  Institution Service Request Comparison
                </h3>
                <span className="text-xs text-slate-400 font-medium">Open vs Closed Tickets Per Campus</span>
              </div>
              <div className="h-68 w-full">
                <Bar
                  data={chartInstitutionStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' } } } },
                    scales: {
                      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
                    }
                  }}
                />
              </div>
            </div>

            {/* CHART 2: Resolution Doughnut (1 Col) */}
            <div className="bg-slate-900/60 backdrop-blur-md p-7 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Activity size={20} className="text-emerald-400" />
                    Overall Resolution Split
                  </h3>
                </div>
                <div className="h-56 w-full flex items-center justify-center my-2">
                  <Doughnut
                    data={chartStatusDonutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' } } } }
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-xs text-center text-slate-300 font-medium">
                <span className="text-emerald-400 font-black text-sm">{overallMetrics.closedCount}</span> of <span className="text-white font-black text-sm">{overallMetrics.total}</span> total service requests resolved
              </div>
            </div>
          </div>
        </>
      )}

      {/* MATRIX VIEW SECTION: MASTER TICKET MATRIX TABLE & CONTROLS */}
      {(activeView === 'MATRIX' || activeView === 'ALL') && (
        <div className="bg-slate-900/60 backdrop-blur-md p-7 rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
        
        {/* FILTER CONTROL BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2.5">
              <FileText size={20} className="text-purple-400" />
              Service Requests Master Ticket Matrix
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Detailed tracking for reported vehicle defects, repair costs, vendors, and settlement status
            </p>
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2.5 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs shadow-inner">
              <Search size={15} className="text-purple-400" />
              <input
                type="text"
                placeholder="Search vehicle, issue, vendor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none placeholder-slate-500 w-48 font-medium"
              />
            </div>

            {/* Institution Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs">
              <Building2 size={15} className="text-purple-400" />
              <select
                value={selectedInst}
                onChange={e => setSelectedInst(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold"
              >
                <option value="ALL" className="bg-slate-900">All Institutions</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id} className="bg-slate-900">{inst.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Tab Pills */}
            <div className="flex items-center p-1 bg-slate-800/90 rounded-2xl border border-slate-700 text-xs">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedStatus === 'ALL'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({serviceRequests.length})
              </button>
              <button
                onClick={() => setSelectedStatus('OPEN')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedStatus === 'OPEN'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟡 Open
              </button>
              <button
                onClick={() => setSelectedStatus('CLOSED')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedStatus === 'CLOSED'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Closed
              </button>
            </div>
          </div>
        </div>

        {/* TICKET TABLE */}
        {filteredServiceRequests.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-800">
            No service requests found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar border border-slate-800/80 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700">
                  <th className="p-3.5 font-black uppercase">Request ID</th>
                  <th className="p-3.5 font-black uppercase">Date</th>
                  <th className="p-3.5 font-black uppercase">Institution</th>
                  <th className="p-3.5 font-black uppercase">Vehicle Details</th>
                  <th className="p-3.5 font-black uppercase">Nature of Problem</th>
                  <th className="p-3.5 font-black uppercase">Vendor / Workshop</th>
                  <th className="p-3.5 font-black uppercase">Est. Repair Cost</th>
                  <th className="p-3.5 font-black uppercase text-center">Status</th>
                  <th className="p-3.5 font-black uppercase text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredServiceRequests.map(sr => (
                  <tr key={sr.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="p-3.5 font-extrabold text-purple-400 group-hover:text-purple-300">{sr.request_id || `SR-${sr.id}`}</td>
                    <td className="p-3.5 text-slate-400 font-medium">{sr.date || '-'}</td>
                    <td className="p-3.5 font-bold text-slate-200 max-w-[180px] truncate" title={sr.institution_name}>{sr.institution_name || 'Institution'}</td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-white">{sr.vehicle_number || `Vehicle #${sr.vehicle}`}</div>
                      {sr.cab_no && <span className="text-[10px] text-slate-400 block font-normal">Cab: {sr.cab_no}</span>}
                    </td>
                    <td className="p-3.5 text-slate-300 max-w-[220px] truncate font-sans" title={sr.nature_of_problem}>
                      {sr.nature_of_problem || 'General Maintenance'}
                    </td>
                    <td className="p-3.5 text-slate-400 font-sans">{sr.vendor_name_detail || 'Workshop'}</td>
                    <td className="p-3.5 font-black text-white">
                      ₹{parseFloat(sr.estimated_repair_cost || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      {sr.is_closed ? (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-black text-[10px] rounded-full border border-emerald-500/30 inline-flex items-center gap-1 shadow-sm">
                          🟢 CLOSED
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 font-black text-[10px] rounded-full border border-amber-500/30 inline-flex items-center gap-1 animate-pulse shadow-sm">
                          🟡 OPEN
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {!sr.is_closed ? (
                        <button
                          onClick={() => navigate('/entry/expenses')}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[10px] rounded-xl transition-all shadow-md shadow-emerald-600/20 hover:scale-105"
                          title="Record expense bill to settle and close this service request"
                        >
                          Settle Bill
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px] font-semibold">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

    </div>
  );
};

export default ServiceRequestStatus;
