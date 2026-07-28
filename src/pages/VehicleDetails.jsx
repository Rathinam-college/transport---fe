import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [fuelData, setFuelData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('fuel'); // 'fuel' or 'expenses'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      setLoading(true);
      try {
        // Fetch Vehicle
        const vRes = await api.get(`vehicles/${id}/`);
        setVehicle(vRes.data);

        // Fetch related data
        const [fRes, eRes] = await Promise.all([
          api.get(`fuel-data/?vehicle=${id}`).catch(() => ({ data: [] })),
          api.get(`expenses/?vehicle=${id}`).catch(() => ({ data: [] }))
        ]);

        const fData = Array.isArray(fRes.data) ? fRes.data.filter(f => f.vehicle == id) : [];
        const eData = Array.isArray(eRes.data) ? eRes.data.filter(e => e.vehicle == id) : [];

        setFuelData(fData);
        setExpenses(eData);
      } catch (error) {
        console.error("Error fetching vehicle details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicleDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center mt-20 text-slate-400">
        <h2 className="text-2xl mb-4 text-slate-300">Vehicle Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">
          ← Go Back
        </button>
      </div>
    );
  }

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (dateStr) => {
    const days = getDaysLeft(dateStr);
    if (days === null) return 'text-slate-500 bg-slate-800/50 border-slate-700'; // No date
    if (days < 0) return 'text-red-400 bg-red-900/20 border-red-800/50 shadow-[inset_0_0_15px_rgba(248,113,113,0.1)]'; // Expired
    if (days <= 30) return 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50 shadow-[inset_0_0_15px_rgba(250,204,21,0.1)]'; // Expiring soon
    return 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50 shadow-[inset_0_0_15px_rgba(52,211,153,0.1)]'; // Valid
  };

  const getStatusIcon = (dateStr) => {
    const days = getDaysLeft(dateStr);
    if (days === null) return '−';
    if (days < 0) return '⚠';
    if (days <= 30) return '⏱';
    return '✓';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not Set';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalFuelLiters = fuelData.reduce((sum, item) => sum + parseFloat(item.liters || 0), 0);
  const totalFuelCost = fuelData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalExpenseCost = expenses.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

  const complianceItems = [
    { label: 'FC Expiry', date: vehicle.fc_expiry_date },
    { label: 'Insurance', date: vehicle.insurance_renewal_date },
    { label: 'Road Tax', date: vehicle.road_tax_date },
    { label: 'Green Tax', date: vehicle.green_tax_date },
    { label: 'Permit', date: vehicle.permit_date },
    { label: 'PUCC', date: vehicle.pucc_date },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in space-y-6">
      {/* Top Header / Navigation */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              {vehicle.vehicle_number}
              <span className="text-xs font-semibold px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                {vehicle.make} {vehicle.model}
              </span>
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Route: {vehicle.route_name || 'Unassigned'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/entry/vehicle', { state: { rowData: vehicle, returnTo: `/vehicle/${id}` } })}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          Update Details
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Details & Driver */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
              Vehicle Profile
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between pb-3 border-b border-slate-800/50">
                <span className="text-slate-500 text-sm">Chassis Number</span>
                <span className="text-slate-200 font-medium">{vehicle.chassis_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-800/50">
                <span className="text-slate-500 text-sm">Seating Capacity</span>
                <span className="text-slate-200 font-medium">{vehicle.seating_capacity || 'N/A'} Seats</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-800/50">
                <span className="text-slate-500 text-sm">Approved Km's</span>
                <span className="text-slate-200 font-medium">{vehicle.approved_kms || 'N/A'} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Actual Count</span>
                <span className="text-slate-200 font-medium">{vehicle.actual_count || 'N/A'} Persons</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Driver Information
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-sm">Driver Name</span>
                <span className="text-slate-200 text-lg font-medium">{vehicle.driver_name || 'Unassigned'}</span>
              </div>
              <div className="flex flex-col gap-1 mt-3">
                <span className="text-slate-500 text-sm">Contact Number</span>
                <span className="text-slate-200 font-medium">{vehicle.driver_contact_no || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Compliance & Financials */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Compliance Grid */}
          <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm border-t-[3px] border-t-emerald-500">
            <h3 className="text-slate-300 text-lg font-semibold mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Compliance Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {complianceItems.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between h-24 ${getStatusColor(item.date)}`}>
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</span>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold">{formatDate(item.date)}</span>
                    <span className="text-xl opacity-60">{getStatusIcon(item.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financials Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform transform translate-x-4 translate-y-4 text-blue-500">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M19.78 2.2L24 6.42L22.59 7.83L21 6.24V22H19V6.24L17.41 7.83L16 6.42L19.78 2.2ZM12 2H6C4.9 2 4 2.9 4 4V22H14V4C14 2.9 13.1 2 12 2ZM12 11H6V5H12V11Z"/></svg>
              </div>
              <h4 className="text-slate-400 text-sm font-medium mb-1 relative z-10">Total Fuel Logged</h4>
              <p className="text-3xl font-bold text-slate-100 relative z-10">
                {totalFuelLiters.toLocaleString()} <span className="text-lg text-slate-500 font-normal">Liters</span>
              </p>
              <p className="text-blue-400 font-semibold mt-2 relative z-10">₹ {totalFuelCost.toLocaleString()} Spent</p>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-pink-500/50 transition-colors">
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform transform translate-x-4 translate-y-4 text-pink-500">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              <h4 className="text-slate-400 text-sm font-medium mb-1 relative z-10">Total Maintenance / Expenses</h4>
              <p className="text-3xl font-bold text-slate-100 relative z-10">
                ₹ {totalExpenseCost.toLocaleString()}
              </p>
              <p className="text-pink-400 font-semibold mt-2 relative z-10">{expenses.length} Records found</p>
            </div>
          </div>

        </div>
      </div>

      {/* Activity Tabs */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm overflow-hidden mt-8">
        <div className="flex border-b border-slate-800/50 bg-slate-900/80">
          <button 
            className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'fuel' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            onClick={() => setActiveTab('fuel')}
          >
            Fuel Logs
          </button>
          <button 
            className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'expenses' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            onClick={() => setActiveTab('expenses')}
          >
            Expense Logs
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'fuel' && (
            fuelData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Date</th>
                      <th className="px-4 py-3">Liters</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelData.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,10).map((f, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">{formatDate(f.date)}</td>
                        <td className="px-4 py-3 font-medium text-blue-300">{f.liters} L</td>
                        <td className="px-4 py-3 text-right">₹ {parseFloat(f.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No fuel logs found for this vehicle.</p>
            )
          )}

          {activeTab === 'expenses' && (
            expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Date</th>
                      <th className="px-4 py-3">Purpose / Bill Desc</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,10).map((e, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 truncate max-w-xs">{e.purpose || e.bill_description || 'N/A'}</td>
                        <td className="px-4 py-3 text-right text-pink-400 font-medium">₹ {parseFloat(e.total_amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No expense logs found for this vehicle.</p>
            )
          )}
          
          {(activeTab === 'fuel' && fuelData.length > 10) || (activeTab === 'expenses' && expenses.length > 10) ? (
            <div className="text-center mt-4">
              <span className="text-xs text-slate-500 italic">Showing 10 most recent records.</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;
