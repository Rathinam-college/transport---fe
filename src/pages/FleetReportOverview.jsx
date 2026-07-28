import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const FleetReportOverview = () => {
    const navigate = useNavigate();
    const [institutions, setInstitutions] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [instRes, vehRes] = await Promise.all([
                    api.get('institutions/'),
                    api.get('vehicles/')
                ]);
                setInstitutions(instRes.data);
                setVehicles(vehRes.data);
            } catch (err) {
                console.error("Failed to fetch fleet report data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-slate-400">
                Loading Fleet Overview...
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col pb-4 animate-fade-in -m-6 lg:-mx-10 lg:-mt-[22px] lg:-mb-10 p-6 lg:p-10">
            
            {/* HEADER */}
            <div className="flex items-center mb-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 mr-4 bg-slate-800/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/50"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                        Fleet Report Overview
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Select an institution to view its detailed fleet report</p>
                </div>
            </div>

            <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm border-t-[3px] border-t-yellow-500">
                <h3 className="flex items-center gap-2 text-yellow-400 text-xl font-semibold mb-6">
                    <Bus size={24} />
                    Institution Fleets
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {institutions.map(inst => (
                        <div 
                            key={inst.id} 
                            onClick={() => navigate(`/fleet/${inst.id}`)}
                            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 transition-all hover:border-yellow-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] cursor-pointer group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-center mb-2 overflow-hidden">
                                    <h4 className="text-lg font-medium text-slate-200 truncate pr-2">{inst.name}</h4>
                                    <span className="bg-yellow-500/10 text-yellow-400 text-[10px] px-2 py-1 rounded-full font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap">
                                        View Details →
                                    </span>
                                </div>
                                <p className="text-yellow-400 font-bold text-3xl">
                                    {getVehicleCounts(inst.id)} <span className="text-slate-400 font-normal text-sm">Vehicles</span>
                                </p>
                            </div>
                            
                            {/* Alerts Section */}
                            {(() => {
                                const alerts = getAlertsForInst(inst.id);
                                if (alerts.expired === 0 && alerts.soon === 0) {
                                    return <div className="mt-4 text-xs text-emerald-400/80 flex items-center gap-1">✓ All Compliant</div>;
                                }
                                return (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {alerts.expired > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold text-white rounded-full bg-gradient-to-b from-red-500 to-red-700 shadow-[inset_0px_1px_2px_rgba(255,255,255,0.4)] border border-red-800">
                                                {alerts.expired} Expired
                                            </span>
                                        )}
                                        {alerts.soon > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold text-white rounded-full bg-gradient-to-b from-amber-500 to-amber-700 shadow-[inset_0px_1px_2px_rgba(255,255,255,0.4)] border border-amber-800">
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
        </div>
    );
};

export default FleetReportOverview;
