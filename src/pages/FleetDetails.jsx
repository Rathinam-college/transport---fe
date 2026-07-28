import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const FleetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch vehicles and filter by institution ID
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [vehRes, instRes] = await Promise.all([
          api.get('vehicles/'),
          api.get(`institutions/${id}/`)
        ]);
        
        const filteredVehicles = vehRes.data.filter(v => String(v.institution) === String(id));
        setVehicles(filteredVehicles);
        setInstitution(instRes.data);
      } catch (err) {
        console.error("Error fetching fleet details:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center text-slate-400">Loading fleet details...</div>;
  }

  if (!institution) {
    return <div className="p-10 text-center text-red-400">Institution not found.</div>;
  }

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderDateCell = (dateStr) => {
    if (!dateStr) return <span className="text-slate-600">-</span>;
    
    const daysLeft = getDaysLeft(dateStr);
    const isExpired = daysLeft <= 0;
    const isUrgent = daysLeft > 0 && daysLeft <= 30;
    
    // Skeumorphic pill styling for expired (red gloss) vs urgent (yellow gloss) vs normal (dark inset)
    let pillClasses = "mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full inline-block ";
    
    if (isExpired) {
      pillClasses += "font-bold text-white bg-gradient-to-b from-red-500 to-red-700 shadow-[inset_0px_1px_3px_rgba(255,255,255,0.6),_0px_2px_4px_rgba(220,38,38,0.6)] border border-red-800";
    } else if (isUrgent) {
      pillClasses += "font-bold text-black bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[inset_0px_1px_3px_rgba(255,255,255,0.8),_0px_2px_4px_rgba(202,138,4,0.5)] border border-yellow-700";
    } else {
      pillClasses += "text-slate-300 bg-slate-800 shadow-[inset_0px_1px_2px_rgba(255,255,255,0.1),_0px_1px_2px_rgba(0,0,0,0.5)] border border-slate-700";
    }

    let statusText = "";
    if (daysLeft < 0) {
      statusText = `Expired ${Math.abs(daysLeft)}d ago`;
    } else if (daysLeft === 0) {
      statusText = "Expires Today";
    } else {
      statusText = `${daysLeft} days left`;
    }
    
    return (
      <div className="flex flex-col items-start">
        <span className="text-slate-200 font-medium">{dateStr}</span>
        <span className={pillClasses}>
          {statusText}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 mt-2">
        <button 
          onClick={() => navigate('/')} 
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10"
          title="Back to Dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{institution.name} - Fleet Details</h1>
          <p className="text-slate-400 mt-1">Detailed tracking overview for all registered vehicles</p>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm overflow-hidden">
        
        {/* Stats Bar */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex gap-8 items-center">
          <div>
            <p className="text-slate-400 text-sm">Total Vehicles</p>
            <p className="text-2xl font-bold text-yellow-400">{vehicles.length}</p>
          </div>
          <div className="h-10 w-px bg-slate-700"></div>
          <div>
            <p className="text-slate-400 text-sm">Active Drivers</p>
            <p className="text-2xl font-bold text-blue-400">
              {vehicles.filter(v => v.driver_name).length}
            </p>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          {vehicles.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No vehicles found for this institution.</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
              <thead className="bg-slate-800/80 sticky top-0">
                <tr>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700 w-16">Sl.No</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Vehicle No.</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Make & Model</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Type / Seats</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Driver</th>
                  
                  {/* Compliance Dates */}
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">FC Expiry</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Insurance</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Road Tax</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">PUCC</th>
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Permit</th>
                  
                  <th className="p-4 text-slate-300 font-semibold border-b border-slate-700">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vehicles.map((v, i) => (
                  <tr 
                    key={v.id} 
                    onClick={() => navigate(`/vehicle/${v.id}`)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 text-slate-400 font-medium">{i + 1}</td>
                    <td className="p-4 font-bold text-blue-400 whitespace-nowrap group-hover:text-blue-300">
                      {v.vehicle_number}
                      <span className="opacity-0 group-hover:opacity-100 ml-2 text-xs text-blue-500 transition-opacity">→</span>
                    </td>
                    
                    <td className="p-4">
                      {v.make ? <div className="font-medium text-slate-200">{v.make}</div> : null}
                      {v.model ? <div className="text-slate-400 text-xs">{v.model}</div> : null}
                      {!v.make && !v.model && <span className="text-slate-600">-</span>}
                    </td>
                    
                    <td className="p-4">
                      {v.purpose ? <div className="text-slate-300">{v.purpose}</div> : null}
                      {v.seating_capacity ? <div className="text-slate-400 text-xs">{v.seating_capacity} Seats</div> : null}
                      {!v.purpose && !v.seating_capacity && <span className="text-slate-600">-</span>}
                    </td>
                    
                    <td className="p-4">
                      {v.driver_name ? (
                        <>
                          <div className="text-slate-200">{v.driver_name}</div>
                          {v.driver_contact_no && <div className="text-slate-400 text-xs">{v.driver_contact_no}</div>}
                        </>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap">{renderDateCell(v.fc_expiry_date)}</td>
                    <td className="p-4 whitespace-nowrap">{renderDateCell(v.insurance_renewal_date)}</td>
                    <td className="p-4 whitespace-nowrap">{renderDateCell(v.road_tax_date)}</td>
                    <td className="p-4 whitespace-nowrap">{renderDateCell(v.pucc_date)}</td>
                    <td className="p-4 whitespace-nowrap">{renderDateCell(v.permit_date)}</td>

                    <td className="p-4 text-xs text-slate-400 max-w-xs truncate" title={v.remarks}>
                      {v.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetDetails;
