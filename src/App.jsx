import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import api from './services/api';
import Sidebar from './components/Sidebar';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import {
  Bus,
  Fuel,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Building2,
  TrendingUp,
  PlusCircle,
  Calendar,
  DollarSign,
  Filter,
  Sparkles,
  ChevronRight,
  Zap,
  BarChart3,
  FileSpreadsheet,
  AlertTriangle,
  Activity,
  Layers,
  Clock
} from 'lucide-react';

import DataCheck from './pages/DataCheck';
import DataEntry from './pages/DataEntry';
import FleetDetails from './pages/FleetDetails';
import Login from './pages/Login';
import FuelReport from './pages/FuelReport';
import ExpenseReport from './pages/ExpenseReport';
import OdometerReport from './pages/OdometerReport';
import VehicleDetails from './pages/VehicleDetails';
import AnimatedBusSVG from './assets/AnimatedBusSVG';
import BusSamples from './pages/BusSamples';
import FleetReportOverview from './pages/FleetReportOverview';
import CategoryManagement from './pages/CategoryManagement';
import DatabaseManagement from './pages/DatabaseManagement';
import Summary from './pages/Summary';
import ServiceRequestStatus from './pages/ServiceRequestStatus';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

const Dashboard = () => {
  const [vehicles, setVehicles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [fuelData, setFuelData] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [budgetHeads, setBudgetHeads] = useState([]);
  const navigate = useNavigate();

  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterDuration, setFilterDuration] = useState('1');

  useEffect(() => {
    // Fetch all data for the dashboard
    api.get('vehicles/').then(res => setVehicles(res.data)).catch(console.error);
    api.get('institutions/').then(res => setInstitutions(res.data)).catch(console.error);
    api.get('fuel-data/').then(res => setFuelData(res.data)).catch(console.error);
    api.get('expenses/').then(res => setExpenses(res.data)).catch(console.error);
    api.get('budget-heads/').then(res => setBudgetHeads(res.data)).catch(console.error);
  }, []);

  // Aggregations
  const getVehicleCounts = (instId) => {
    return vehicles.filter(v => v.institution === instId).length;
  };

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  const getAlertsForInst = (instId) => {
    const instVehicles = vehicles.filter(v => v.institution === instId);
    let expired = 0;
    let soon = 0;

    instVehicles.forEach(v => {
      const dates = [v.fc_expiry_date, v.insurance_renewal_date, v.road_tax_date, v.pucc_date, v.permit_date];
      let vExpired = false;
      let vSoon = false;
      
      dates.forEach(d => {
        const daysLeft = getDaysLeft(d);
        if (daysLeft !== null) {
          if (daysLeft < 0) vExpired = true;
          else if (daysLeft >= 0 && daysLeft <= 30) vSoon = true;
        }
      });

      if (vExpired) expired++;
      else if (vSoon) soon++;
    });

    return { expired, soon };
  };

  // Global Compliance Alert Totals across entire fleet
  const totalAlerts = vehicles.reduce((acc, v) => {
    const dates = [v.fc_expiry_date, v.insurance_renewal_date, v.road_tax_date, v.pucc_date, v.permit_date];
    let isExpired = false;
    let isSoon = false;
    dates.forEach(d => {
      const dl = getDaysLeft(d);
      if (dl !== null) {
        if (dl < 0) isExpired = true;
        else if (dl >= 0 && dl <= 30) isSoon = true;
      }
    });
    if (isExpired) acc.expired++;
    else if (isSoon) acc.soon++;
    else acc.compliant++;
    return acc;
  }, { expired: 0, soon: 0, compliant: 0 });

  const getMonthsInRange = (endMonth, durationStr) => {
    if (durationStr === 'all') return null;
    const duration = parseInt(durationStr, 10);
    const months = [];
    const [year, month] = endMonth.split('-').map(Number);
    for (let i = 0; i < duration; i++) {
      let m = month - i;
      let y = year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      months.push(`${y}-${m.toString().padStart(2, '0')}`);
    }
    return months;
  };

  const targetMonths = getMonthsInRange(filterMonth, filterDuration);

  const filteredFuelData = targetMonths === null 
    ? fuelData 
    : fuelData.filter(item => item.date && targetMonths.includes(item.date.slice(0, 7)));

  const filteredExpenses = targetMonths === null
    ? expenses
    : expenses.filter(item => item.bill_received_date && targetMonths.includes(item.bill_received_date.slice(0, 7)));

  const totalFuelLiters = filteredFuelData.reduce((sum, item) => sum + parseFloat(item.liters || 0), 0);
  const totalFuelCost = filteredFuelData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalExpenseCost = filteredExpenses.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

  const getFuelTrendData = () => {
    if (!fuelData.length) return null;
    const monthlyAmount = {};
    
    // Calculate on ALL fuelData so we can pick any month for the trend
    fuelData.forEach(entry => {
      const month = entry.date.slice(0, 7);
      monthlyAmount[month] = (monthlyAmount[month] || 0) + parseFloat(entry.amount || 0);
    });
    
    const sortedMonths = Object.keys(monthlyAmount).sort();
    
    const displayMonths = targetMonths !== null 
        ? [...targetMonths].sort() 
        : sortedMonths.slice(-6);
    
    return {
      labels: displayMonths.map(m => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short' })),
      datasets: [{
        label: 'Spend',
        data: displayMonths.map(m => monthlyAmount[m] || 0),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: '#3b82f6',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
    };
  };

  const fuelTrendData = getFuelTrendData();
  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { x: { display: false }, y: { display: false } },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  const getExpenseForInst = (instId) => {
    return filteredExpenses
      .filter(e => e.institution === instId)
      .reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  };

  // Group expenses by Budget Head
  const expensesByBudgetHead = budgetHeads.map(bh => {
    const total = filteredExpenses
      .filter(e => e.budget_head === bh.id)
      .reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);
    return { name: bh.name, total, color: bh.color_code || '#3b82f6' };
  }).filter(bh => bh.total > 0).sort((a, b) => b.total - a.total);

  const maxExpense = Math.max(...expensesByBudgetHead.map(e => e.total), 1);

  return (
    <div className="grid gap-8 animate-fade-in w-full max-w-7xl mx-auto pb-16">
      


      {/* TOP EXECUTIVE KPI COUNTER RIBBON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Fleet Vehicles */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-yellow-500 flex flex-col justify-between group hover:border-yellow-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Active Fleet</p>
              <h2 className="text-4xl font-black text-white mt-1.5">{vehicles.length}</h2>
            </div>
            <span className="p-3.5 bg-yellow-500/10 text-yellow-400 rounded-2xl border border-yellow-500/20 group-hover:scale-110 transition-transform">
              <Bus size={24} />
            </span>
          </div>
          <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
            <span>Institutions Covered:</span>
            <span className="text-yellow-400 font-extrabold text-sm">{institutions.length} Campuses</span>
          </div>
        </div>

        {/* Card 2: Fuel Volume & Cost */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-blue-500 flex flex-col justify-between group hover:border-blue-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">Fuel Consumption</p>
              <h2 className="text-3xl font-black text-white mt-1.5">{totalFuelLiters.toLocaleString()} <span className="text-sm font-normal text-slate-400">L</span></h2>
            </div>
            <span className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Fuel size={24} />
            </span>
          </div>
          <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
            <span>Fuel Spend:</span>
            <span className="text-blue-400 font-extrabold text-sm">₹{totalFuelCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 3: Total Logged Expenses */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-emerald-500 flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">Logged Expenses</p>
              <h2 className="text-3xl font-black text-emerald-400 mt-1.5">₹{totalExpenseCost.toLocaleString('en-IN')}</h2>
            </div>
            <span className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </span>
          </div>
          <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
            <span>Budget Categories:</span>
            <span className="text-emerald-400 font-extrabold text-sm">{expensesByBudgetHead.length} Active</span>
          </div>
        </div>

        {/* Card 4: Document Compliance Health */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl border-t-4 border-t-amber-500 flex flex-col justify-between group hover:border-amber-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">Renewal Alerts</p>
              <h2 className="text-4xl font-black text-amber-400 mt-1.5">{totalAlerts.expired + totalAlerts.soon}</h2>
            </div>
            <span className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 group-hover:scale-110 transition-transform animate-pulse">
              <ShieldAlert size={24} />
            </span>
          </div>
          <div className="mt-5 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800/80">
            <span>Health Status:</span>
            <span className="text-red-400 font-extrabold text-xs">{totalAlerts.expired} Expired • {totalAlerts.soon} Expiring Soon</span>
          </div>
        </div>
      </div>

      {/* GLOBAL FILTER BAR */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter size={16} className="text-indigo-400" />
          <span>Global Time Period Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs">
            <Calendar size={14} className="text-indigo-400" />
            <span className="text-slate-400 font-medium">Month:</span>
            <input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs">
            <Clock size={14} className="text-indigo-400" />
            <span className="text-slate-400 font-medium">Duration:</span>
            <select 
              value={filterDuration}
              onChange={(e) => setFilterDuration(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="1" className="bg-slate-900">1 Month</option>
              <option value="2" className="bg-slate-900">2 Months</option>
              <option value="3" className="bg-slate-900">3 Months</option>
              <option value="6" className="bg-slate-900">6 Months</option>
              <option value="all" className="bg-slate-900">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* TOP ROW: FLEET OVERVIEW & FUEL MONITORING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Fleet Overview Cards */}
        <div className="bg-slate-900/60 p-7 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md flex flex-col justify-between border-t-4 border-t-yellow-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="flex items-center gap-2.5 text-yellow-400 text-xl font-black tracking-tight">
                <Building2 size={22} />
                Campus Fleet Overview
              </h3>
              <p className="text-slate-400 text-xs mt-1">Vehicle allocations and compliance health across campuses</p>
            </div>
            <span className="text-xs bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full font-bold border border-yellow-500/30">
              {vehicles.length} Vehicles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {institutions.map(inst => (
              <div 
                key={inst.id} 
                onClick={() => navigate(`/fleet/${inst.id}`)}
                className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60 transition-all hover:border-yellow-500/70 hover:bg-slate-800/70 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-yellow-300 transition-colors truncate pr-2" title={inst.name}>
                      {inst.name}
                    </h4>
                    <span className="text-slate-400 group-hover:text-yellow-400 transition-transform group-hover:translate-x-1">
                      <ChevronRight size={16} />
                    </span>
                  </div>
                  <p className="text-yellow-400 font-black text-2xl">
                    {getVehicleCounts(inst.id)} <span className="text-slate-400 font-medium text-xs">Vehicles</span>
                  </p>
                </div>
                
                {/* Alerts Pill Section */}
                {(() => {
                  const alerts = getAlertsForInst(inst.id);
                  if (alerts.expired === 0 && alerts.soon === 0) {
                    return (
                      <div className="mt-4 text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 w-fit">
                        <CheckCircle2 size={12} /> Compliant
                      </div>
                    );
                  }
                  return (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {alerts.expired > 0 && (
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold text-white rounded-full bg-red-600 border border-red-500 shadow-sm">
                          {alerts.expired} Expired
                        </span>
                      )}
                      {alerts.soon > 0 && (
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950 rounded-full bg-amber-400 border border-amber-500 shadow-sm">
                          {alerts.soon} Soon
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Fuel Monitoring Card */}
        <div 
          className="bg-slate-900/60 p-7 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:border-blue-500/70 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group flex flex-col justify-between relative overflow-hidden border-t-4 border-t-blue-500"
          onClick={() => navigate('/report/fuel')}
        >
          {/* Background Chart Element */}
          {fuelTrendData && (
            <div className="absolute inset-x-0 bottom-0 top-24 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none">
              <Line 
                data={fuelTrendData} 
                options={sparklineOptions} 
              />
            </div>
          )}

          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h3 className="flex items-center gap-2.5 text-slate-100 text-xl font-black group-hover:text-blue-400 transition-colors">
                <Fuel size={22} className="text-blue-500" />
                Fuel Expenditure Monitoring
              </h3>
              <p className="text-slate-400 text-xs mt-1">Multi-month fuel volume and spend trends</p>
            </div>
            <span className="bg-blue-500/10 text-blue-400 text-xs px-3.5 py-1.5 rounded-full font-bold border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white transition-all flex items-center gap-1">
              View Fuel Report <ChevronRight size={14} />
            </span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mt-12 relative z-10">
            <div>
              <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-wider">Total Diesel Volume</p>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                {totalFuelLiters.toLocaleString()} <span className="text-lg text-slate-400 font-normal">Litres</span>
              </h1>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl px-6 py-4 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col items-end min-w-[170px] group-hover:border-blue-500/60 transition-colors">
              <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Total Fuel Cost</p>
              <h4 className="text-blue-400 font-black text-2xl tracking-tight">
                ₹{totalFuelCost.toLocaleString('en-IN')}
              </h4>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('pt_token'));

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 flex">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="main-container p-6 lg:px-10 lg:pb-10 lg:pt-[22px] relative w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/service-request-status" element={<ServiceRequestStatus />} />
          {/* Reports */}
          <Route path="/report/fuel" element={<FuelReport />} />
          <Route path="/report/expense" element={<ExpenseReport />} />
          <Route path="/report/odometer" element={<OdometerReport />} />
          <Route path="/report/fleet" element={<FleetReportOverview />} />
          <Route path="/category-management" element={<CategoryManagement />} />
          <Route path="/database-management" element={<DatabaseManagement />} />
          
          <Route path="/fleet/:id" element={<FleetDetails />} />
          <Route path="/entry" element={<DataEntry />} />
          <Route path="/entry/:tab" element={<DataEntry />} />
          <Route path="/check" element={<DataCheck />} />
          <Route path="/check/:tab" element={<DataCheck />} />
          <Route path="/vehicle/:id" element={<VehicleDetails />} />
          <Route path="/bus-samples" element={<BusSamples />} />
        </Routes>
      </main>


    </div>
  );
}

export default App;
