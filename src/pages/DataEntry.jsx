import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Database } from 'lucide-react';
import api from '../services/api';
import Select from 'react-select';
import { PDFDocument } from 'pdf-lib';

const compressPdfFile = async (file) => {
  if (!file || file.type !== 'application/pdf') return file;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
    const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
    if (compressedBlob.size < file.size) {
      return new File([compressedBlob], file.name, { type: 'application/pdf' });
    }
    return file;
  } catch (err) {
    console.warn("PDF Compression warning:", err);
    return file;
  }
};

const compressImageFile = async (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const selectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-glass)',
    borderColor: 'var(--border-glass)',
    color: 'var(--text-main)',
    minHeight: '40px',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--brand-blue)' }
  }),
  singleValue: (base) => ({ ...base, color: 'var(--text-main)' }),
  input: (base) => ({ ...base, color: 'var(--text-main)' }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-main)',
    border: '1px solid var(--border-glass)',
    zIndex: 50
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--brand-blue)' : state.isFocused ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    color: 'var(--text-main)',
    cursor: 'pointer'
  }),
  placeholder: (base) => ({ ...base, color: '#94a3b8' })
};

const DataEntry = () => {
  const location = useLocation();
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'institution';
  
  // Data for dropdowns
  const [institutions, setInstitutions] = useState([]);
  const [registeredInstitutions, setRegisteredInstitutions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [subBudgetHeads, setSubBudgetHeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [unusedServiceRequests, setUnusedServiceRequests] = useState([]);
  const [fuelRates, setFuelRates] = useState([]);

  // Form states - prefill if coming from Edit button
  const [formData, setFormData] = useState(location.state?.rowData || {});
  const [opexData, setOpexData] = useState(location.state?.rowData?.opex_details || []);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [refreshList, setRefreshList] = useState(0);
  const [prevLogInfo, setPrevLogInfo] = useState({ value: null, date: null });
  const [showPoDetails, setShowPoDetails] = useState(false);
  const [compressingPdf, setCompressingPdf] = useState(false);

  // Opex Functions
  const handleAddOpex = () => {
    setOpexData([...opexData, { opex_number: '', opex_date: '', opex_amount: '', opex_type: 'Settlement' }]);
  };
  
  const handleOpexChange = (index, e) => {
    const newOpex = [...opexData];
    newOpex[index][e.target.name] = e.target.value;
    setOpexData(newOpex);
  };
  
  const handleRemoveOpex = (index) => {
    setOpexData(opexData.filter((_, i) => i !== index));
  };

  // Fetch all dropdown data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [instRes, regInstRes, vehRes, bhRes, sbhRes, vendRes, frRes] = await Promise.all([
          api.get('institutions/'),
          api.get('registered-institutions/'),
          api.get('vehicles/'),
          api.get('budget-heads/'),
          api.get('sub-budget-heads/'),
          api.get('vendors/'),
          api.get('fuel-rates/')
        ]);
        setInstitutions(instRes.data);
        setRegisteredInstitutions(regInstRes.data);
        setVehicles(vehRes.data);
        setBudgetHeads(bhRes.data);
        setSubBudgetHeads(sbhRes.data);
        setVendors(vendRes.data);
        setFuelRates(frRes.data);
      } catch (err) {
        console.error("Failed to load dropdown data");
      }
    };
    fetchData();
  }, [activeTab]); // Refresh data when switching tabs

  // Auto-fetch previous km when a vehicle is selected in fuel-data tab
  useEffect(() => {
    if (activeTab === 'fuel-data' && formData.vehicle && !formData.id) {
      api.get('fuel-data/').then(res => {
        const fuelRecords = res.data.filter(r => r.vehicle === parseInt(formData.vehicle));
        if (fuelRecords.length > 0) {
          // Find the record with the most recent date
          fuelRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
          const lastRecord = fuelRecords[0];
          setFormData(prev => {
            const currentKm = parseInt(prev.current_km) || 0;
            const previousKm = parseInt(lastRecord.current_km) || 0;
            const totalKm = currentKm ? currentKm - previousKm : 0;
            
            const fetchedDiscount = lastRecord.discount_amount || '';
            const finalDiscount = prev.override_discount_rate ? prev.discount_amount : fetchedDiscount;
            
            const amt = parseFloat(prev.amount) || 0;
            const liters = parseFloat(prev.liters) || 0;
            const discValue = parseFloat(finalDiscount) || 0;

            return {
              ...prev,
              previous_km: prev.override_previous_km ? prev.previous_km : previousKm,
              total_km: prev.override_previous_km ? prev.total_km : (totalKm > 0 ? totalKm : 0),
              discount_amount: finalDiscount,
              actual_amount: (amt - (liters * discValue)).toFixed(2)
            };
          });
        }
      }).catch(err => console.error(err));
    }
  }, [formData.vehicle, activeTab]);

  // Auto-fetch fuel rate when vehicle and date are selected in fuel-data tab
  useEffect(() => {
    if (activeTab === 'fuel-data' && formData.vehicle && formData.date && vehicles.length > 0 && fuelRates.length > 0) {
      const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicle));
      if (selectedVehicle && selectedVehicle.fuel_type) {
        const vFuelType = selectedVehicle.fuel_type.toUpperCase();
        
        const validRates = fuelRates.filter(r => 
          r.fuel_type === vFuelType && 
          new Date(r.effective_date) <= new Date(formData.date)
        );
        
        validRates.sort((a, b) => {
          const dateDiff = new Date(b.effective_date) - new Date(a.effective_date);
          if (dateDiff !== 0) return dateDiff;
          return b.effective_time.localeCompare(a.effective_time);
        });
        
        if (validRates.length > 0) {
          const rate = validRates[0].rate_per_liter;
          setFormData(prev => {
             // Only auto-update amount if we haven't manually overridden it, or if it's dependent on liters
             const newAmount = prev.liters ? (parseFloat(prev.liters) * parseFloat(rate)).toFixed(2) : prev.amount;
             const actualAmount = prev.liters ? (parseFloat(newAmount) - (parseFloat(prev.discount_amount) || 0)).toFixed(2) : prev.actual_amount;
             return {
               ...prev,
               fetched_rate: rate,
               amount: newAmount || prev.amount,
               actual_amount: actualAmount || prev.actual_amount
             };
          });
        } else {
          setFormData(prev => ({ ...prev, fetched_rate: '' }));
        }
      }
    }
  }, [formData.vehicle, formData.date, activeTab, vehicles, fuelRates]);

  // Auto-fetch unused service requests when a vehicle is selected in expenses tab
  useEffect(() => {
    if (activeTab === 'expenses' && formData.vehicle) {
      api.get(`service-requests/unused/?vehicle=${formData.vehicle}`).then(res => {
        setUnusedServiceRequests(res.data);
      }).catch(err => console.error(err));
    } else {
      setUnusedServiceRequests([]);
    }
  }, [formData.vehicle, activeTab]);

  // Auto-fetch previous evening_330 when a vehicle and date are selected in vehicle-odometer-log tab
  useEffect(() => {
    if (activeTab === 'vehicle-odometer-log' && formData.vehicle && formData.log_date) {
      api.get(`vehicle-odometer-log/?vehicle=${formData.vehicle}`).then(res => {
        const sorted = res.data
          .filter(log => new Date(log.log_date) < new Date(formData.log_date) && log.id !== formData.id)
          .sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
        
        if (sorted.length > 0) {
          const prevVal = sorted[0].evening_330 !== null && sorted[0].evening_330 !== undefined 
            ? sorted[0].evening_330 
            : sorted[0].morning_930;
          setPrevLogInfo({ value: prevVal, date: sorted[0].log_date });

          if (!formData.override_morning_930 && (formData.morning_930 === undefined || formData.morning_930 === '' || formData.morning_930 === null) && !formData.id) {
            setFormData(prev => ({ ...prev, morning_930: prevVal }));
          }
        } else {
          setPrevLogInfo({ value: null, date: null });
        }
      }).catch(err => {
        console.error(err);
        setPrevLogInfo({ value: null, date: null });
      });
    } else {
      setPrevLogInfo({ value: null, date: null });
    }
  }, [formData.vehicle, formData.log_date, activeTab, formData.id]);

  // Auto-fill cab number, make, and model when a vehicle is selected in service-request tab
  useEffect(() => {
    if (activeTab === 'service-request' && formData.vehicle) {
      const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicle));
      if (selectedVehicle && !formData.id) {
        setFormData(prev => ({
          ...prev,
          cab_no: selectedVehicle.cab_number || '',
          make: selectedVehicle.make || '',
          model: selectedVehicle.model || ''
        }));
      }
    }
  }, [formData.vehicle, activeTab, vehicles]);

  // Auto-fill vendor when a service request is selected in expenses tab
  useEffect(() => {
    if (activeTab === 'expenses' && formData.service_request) {
      const selectedSR = unusedServiceRequests.find(sr => sr.id === parseInt(formData.service_request));
      if (selectedSR && !formData.id) {
        setFormData(prev => ({
          ...prev,
          vendor: selectedSR.vendor_name || prev.vendor || ''
        }));
      }
    }
  }, [formData.service_request, activeTab, unusedServiceRequests]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleTabChange = (newTab) => {
    navigate(`/entry/${newTab}`);
    setFormData({});
    setOpexData([]);
    setMessage({ text: '', type: '' });
  };

  // Handle Edit Mode from Location State
  useEffect(() => {
    if (location.state?.rowData && vehicles.length > 0) {
      const rd = { ...location.state.rowData };
      
      // Auto-set filter_institution based on the vehicle's institution
      if (rd.vehicle) {
        const v = vehicles.find(veh => veh.id === parseInt(rd.vehicle));
        if (v && v.institution) {
          rd.filter_institution = v.institution;
        }
      }

      setFormData(rd);
      if (rd.opex_details) {
        setOpexData(rd.opex_details);
      }
      setMessage({ text: 'Editing record. Make changes and save.', type: 'info' });
      // clear the state so refresh doesn't keep it
      window.history.replaceState({}, document.title)
    }
  }, [location.state, vehicles]);

  const handleEdit = (row) => {
    setFormData(row);
    setOpexData(row.opex_details || []);
    setMessage({ text: 'Editing record. Make changes and save.', type: 'info' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e, endpoint, isPatch=false) => {
    e.preventDefault();
    try {
      if (isPatch) {
        // For vehicle transfer special case
        await api.patch(`${endpoint}/${formData.vehicle_id}/`, { institution: formData.institution });
      } else {
        const payload = endpoint === 'expenses' ? { ...formData, opex_details: opexData } : formData;
        
        let reqData = payload;
        let config = {};

        if (
          payload.bill_file instanceof File || payload.bill_file instanceof Blob ||
          payload.estimate_doc instanceof File || payload.estimate_doc instanceof Blob
        ) {
          const form = new FormData();
          Object.keys(payload).forEach(key => {
            if (key === 'opex_details') {
              form.append(key, JSON.stringify(payload[key]));
            } else if (key === 'bill_file' || key === 'estimate_doc') {
              if (payload[key] instanceof File || payload[key] instanceof Blob) {
                form.append(key, payload[key], payload[key].name || 'file.pdf');
              }
            } else if (payload[key] !== null && payload[key] !== undefined) {
              form.append(key, payload[key]);
            }
          });
          reqData = form;
          config = { headers: { 'Content-Type': 'multipart/form-data' } };
        }

        if (formData.id) {
          // Update existing record
          await api.patch(`${endpoint}/${formData.id}/`, reqData, config);
        } else {
          // Create new record
          await api.post(`${endpoint}/`, reqData, config);
        }
      }
      if (location.state?.returnTo) {
        navigate(location.state.returnTo);
      } else {
        setMessage({ text: formData.id ? 'Record updated successfully!' : 'Record saved successfully!', type: 'success' });
        // Clear location state indirectly by clearing the form
        if (endpoint === 'vehicle-odometer-log') {
          // Retain form data for continuous entry, just remove the ID so it creates new
          setFormData(prev => {
            const newState = { ...prev };
            delete newState.id;
            return newState;
          });
        } else {
          setFormData({});
        }
        setOpexData([]);
        if (window.history.replaceState) {
           window.history.replaceState({}, document.title);
        }
        setRefreshList(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to save data. Please check inputs.', type: 'error' });
    }
  };

  useEffect(() => {
    // Clear form when active tab changes, unless we are coming from Edit (which sets rowData)
    if (!location.state?.rowData) {
      setFormData({});
      setOpexData([]);
      setMessage({ text: '', type: '' });
    }
  }, [activeTab, location.state]);

  const headerDetails = {
    'vehicle': { title: 'Vehicle Management', desc: 'Add or update vehicle details, chassis info, and tracking status' },
    'vehicles': { title: 'Vehicle Management', desc: 'Add or update vehicle details, chassis info, and tracking status' },
    'institution': { title: 'Institution Setup', desc: 'Manage institutional branches and their details' },
    'institutions': { title: 'Institution Setup', desc: 'Manage institutional branches and their details' },
    'registered-institution': { title: 'Registered Institutions', desc: 'Manage official registration details for institutions' },
    'registered-institutions': { title: 'Registered Institutions', desc: 'Manage official registration details for institutions' },
    'transfer': { title: 'Vehicle Transfers', desc: 'Record and track vehicle movements across institutions' },
    'movements': { title: 'Vehicle Transfers', desc: 'Record and track vehicle movements across institutions' },
    'vendor': { title: 'Vendor Directory', desc: 'Manage external service providers and parts suppliers' },
    'vendors': { title: 'Vendor Directory', desc: 'Manage external service providers and parts suppliers' },
    'budget-heads': { title: 'Budget Heads', desc: 'Define primary budget categories' },
    'sub-budget-heads': { title: 'Sub Budget Heads', desc: 'Define specific sub-categories for detailed budgeting' },
    'service-request': { title: 'Service Request', desc: 'Create a new estimation and vendor service request' },
    'expenses': { title: 'Expense Entry', desc: 'Record maintenance, fuel, and operational expenses' },
    'fuel-data': { title: 'Fuel Entry', desc: 'Enter new daily fuel consumption and cost records' },
    'fuel-rates': { title: 'Fuel Rates', desc: 'Manage petrol and diesel prices over time' },
    'vehicle-history': { title: 'Operational History', desc: 'Assign and track vehicle routes and capacities over time' },
    'vehicle-operational-history': { title: 'Operational History', desc: 'Assign and track vehicle routes and capacities over time' },
    'renewals': { title: 'Vehicle Renewals', desc: 'Track insurance, FC, tax, and permit renewals' },
  };
  const currentHeader = headerDetails[activeTab] || { title: 'Data Entry', desc: 'Live database viewer & editor' };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-fade-in py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-sm">
                <Database size={24} className="text-emerald-400" />
            </div>
            {currentHeader.title}
        </h1>
        <p className="text-slate-400 text-sm">{currentHeader.desc}</p>
      </div>
      
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-sm w-full">
        {message.text && (
          <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '8px', 
            backgroundColor: message.type === 'success' ? '#c6f6d5' : '#fed7d7',
            color: message.type === 'success' ? '#22543d' : '#822727'
          }}>
            {message.text}
          </div>
        )}

        {/* --- INSTITUTION --- */}
        {activeTab === 'institution' && (
          <form onSubmit={(e) => handleSubmit(e, 'institutions')} className="flex flex-col gap-6">
            <div className="mb-2 pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                Institution Details
              </h2>
              <p className="text-slate-400 text-sm mt-2">Manage core information for operating institutions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Institution Name <span className="text-red-400">*</span></label>
                <input type="text" name="name" className="input-field text-lg py-3" placeholder="e.g. Rathinam Technical Campus" value={formData.name || ''} onChange={handleChange} required />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contact Number</label>
                <input type="text" name="contact_number" className="input-field" placeholder="+91 9876543210" value={formData.contact_number || ''} onChange={handleChange} />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Address</label>
                <textarea name="address" className="input-field" placeholder="Enter complete postal address..." value={formData.address || ''} onChange={handleChange} rows={3} />
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-800 pt-6">
              <button 
                type="submit" 
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {formData.id ? 'Update Institution' : 'Save Institution'}
              </button>
            </div>
          </form>
        )}

        {/* --- REGISTERED INSTITUTION --- */}
        {activeTab === 'registered-institution' && (
          <form onSubmit={(e) => handleSubmit(e, 'registered-institutions')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Name</label>
              <input type="text" name="name" className="input-field" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- VEHICLE --- */}
        {activeTab === 'vehicle' && (
          <form onSubmit={(e) => handleSubmit(e, 'vehicles')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Vehicle Number *</label>
                <input type="text" name="vehicle_number" className="input-field" value={formData.vehicle_number || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Cab Number</label>
                <input type="text" name="cab_number" className="input-field" value={formData.cab_number || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Institution (Operating)</label>
                <select name="institution" className="input-field" value={formData.institution || ''} onChange={handleChange} required>
                  <option value="">Select Institution...</option>
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
              <div>
                <label>Registered Institution</label>
                <select name="registered_institution" className="input-field" value={formData.registered_institution || ''} onChange={handleChange}>
                  <option value="">Select Registered Institution...</option>
                  {registeredInstitutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" checked={formData.is_active !== false} onChange={handleChange} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50" />
                <span className="text-sm font-medium text-slate-300">Active (Working Condition)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_tracking" checked={formData.is_tracking !== false} onChange={handleChange} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50" />
                <span className="text-sm font-medium text-slate-300">Tracking (Odometer Monitored)</span>
              </label>
            </div>

            <h4 style={{ color: 'var(--brand-blue)', marginTop: '1rem' }}>Vehicle Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Make</label>
                <input type="text" name="make" className="input-field" value={formData.make || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Model</label>
                <input type="text" name="model" className="input-field" placeholder="e.g. Sep-2022" value={formData.model || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Chassis Number</label>
                <input type="text" name="chassis_number" className="input-field" value={formData.chassis_number || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Seating Capacity</label>
                <input type="number" name="seating_capacity" className="input-field" value={formData.seating_capacity || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Fuel Type</label>
                <select name="fuel_type" className="input-field" value={formData.fuel_type || ''} onChange={handleChange}>
                  <option value="">Select Fuel Type...</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="EV">EV</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
            </div>

            <h4 style={{ color: 'var(--brand-blue)', marginTop: '1rem' }}>Operational Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Driver Name</label>
                <input type="text" name="driver_name" className="input-field" value={formData.driver_name || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Contact No</label>
                <input type="text" name="driver_contact_no" className="input-field" value={formData.driver_contact_no || ''} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label>Purpose (Optional)</label>
              <textarea name="purpose" className="input-field" value={formData.purpose || ''} onChange={handleChange} rows={2} />
            </div>

            <div>
              <label>Remarks</label>
              <textarea name="remarks" className="input-field" value={formData.remarks || ''} onChange={handleChange} rows={2} />
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button type="submit" className="btn btn-primary">{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
              {location.state?.returnTo && (
                <button type="button" onClick={() => navigate(location.state.returnTo)} className="btn btn-secondary px-4 py-2 border border-slate-600 rounded">Cancel</button>
              )}
            </div>
          </form>
        )}

        {/* --- TRANSFER VEHICLE --- */}
        {activeTab === 'transfer' && (
          <form onSubmit={(e) => handleSubmit(e, 'vehicles', true)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Select Vehicle</label>
              <select name="vehicle_id" className="input-field" value={formData.vehicle_id || ''} onChange={handleChange} required>
                <option value="">Select Vehicle...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} (Current: {institutions.find(i => i.id === v.institution)?.name})</option>)}
              </select>
            </div>
            <div>
              <label>Transfer To Institution</label>
              <select name="institution" className="input-field" value={formData.institution || ''} onChange={handleChange} required>
                <option value="">Select Destination...</option>
                {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
            <small className="text-secondary">This will automatically generate a Vehicle Movement log.</small>
          </form>
        )}

        {/* --- VEHICLE OPERATIONAL HISTORY --- */}
        {activeTab === 'vehicle-operational-history' && (
          <form onSubmit={(e) => handleSubmit(e, 'vehicle-operational-history')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Institution Filter</label>
                <select name="filter_institution" className="input-field" value={formData.filter_institution || ''} onChange={handleChange}>
                  <option value="">All Institutions</option>
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
              <div>
                <label>Vehicle *</label>
                <select name="vehicle" className="input-field" value={formData.vehicle || ''} onChange={handleChange} required>
                  <option value="">Select Vehicle...</option>
                  {vehicles.filter(v => !formData.filter_institution || v.institution === parseInt(formData.filter_institution)).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                </select>
              </div>
              <div>
                <label>Effective From Date *</label>
                <input type="date" name="effective_from" className="input-field" value={formData.effective_from || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Effective To Date</label>
                <input type="date" name="effective_to" className="input-field" value={formData.effective_to || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Route Name</label>
                <input type="text" name="route_name" className="input-field" value={formData.route_name || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Actual Count (Traveling)</label>
                <input type="number" name="actual_count" className="input-field" value={formData.actual_count || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Approved Km's</label>
                <input type="number" name="approved_kms" className="input-field" value={formData.approved_kms || ''} onChange={handleChange} />
              </div>
            </div>
            <div>
              <label>Remarks</label>
              <textarea name="remarks" className="input-field" value={formData.remarks || ''} onChange={handleChange} rows={2} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- DAILY ODOMETER LOG --- */}
        {activeTab === 'vehicle-odometer-log' && (() => {
          const prevValNum = prevLogInfo.value !== null ? parseFloat(prevLogInfo.value) : null;
          const mornValNum = (formData.morning_930 !== undefined && formData.morning_930 !== '' && formData.morning_930 !== null) ? parseFloat(formData.morning_930) : null;
          const eveValNum = (formData.evening_330 !== undefined && formData.evening_330 !== '' && formData.evening_330 !== null) ? parseFloat(formData.evening_330) : null;

          const actualKm = (mornValNum !== null && prevValNum !== null) ? Math.max(0, mornValNum - prevValNum) : 0;
          const extraKm = (eveValNum !== null && mornValNum !== null) ? Math.max(0, eveValNum - mornValNum) : 0;
          const totalKm = actualKm + extraKm;

          return (
            <form onSubmit={(e) => handleSubmit(e, 'vehicle-odometer-log')} className="flex flex-col gap-6">
              <div className="mb-2 pb-4 border-b border-slate-800">
                <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Daily Odometer Log Entry
                </h2>
                <p className="text-slate-400 text-sm mt-1">Select a vehicle and log date to preview previous readings and calculate daily distance.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Institution Filter</label>
                  <select name="filter_institution" className="input-field" value={formData.filter_institution || ''} onChange={handleChange}>
                    <option value="">All Institutions</option>
                    {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vehicle <span className="text-red-400">*</span></label>
                  <select name="vehicle" className="input-field" value={formData.vehicle || ''} onChange={handleChange} required>
                    <option value="">Select Vehicle...</option>
                    {vehicles.filter(v => !formData.filter_institution || v.institution === parseInt(formData.filter_institution)).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Log Date <span className="text-red-400">*</span></label>
                  <input type="date" name="log_date" className="input-field" value={formData.log_date || ''} onChange={handleChange} required />
                </div>
              </div>

              {/* Previous Evening 3:30 Reading Preview Card */}
              {formData.vehicle && formData.log_date && (
                <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Previous Evening 3:30 Reading Preview</p>
                      {prevLogInfo.value !== null ? (
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xl font-bold text-white font-mono">{Number(prevLogInfo.value).toLocaleString()} KM</span>
                          {prevLogInfo.date && (
                            <span className="text-xs text-slate-400">(Logged on {new Date(prevLogInfo.date).toLocaleDateString('en-IN')})</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-amber-400 mt-0.5">No previous reading recorded before this date</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Readings Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Morning 9:30 Reading <span className="text-red-400">*</span></label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input type="checkbox" name="override_morning_930" checked={formData.override_morning_930 || false} onChange={(e) => {
                        setFormData(prev => ({ ...prev, override_morning_930: e.target.checked }));
                      }} className="rounded border-slate-700 bg-slate-800 text-blue-500" />
                      Manual Override
                    </label>
                  </div>
                  <input 
                    type="number" 
                    name="morning_930" 
                    className="input-field text-lg font-mono py-2.5" 
                    placeholder="Enter Morning Reading..." 
                    value={formData.morning_930 ?? ''} 
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Evening 3:30 Reading</label>
                  <input 
                    type="number" 
                    name="evening_330" 
                    className="input-field text-lg font-mono py-2.5" 
                    placeholder="Enter Evening Reading..." 
                    value={formData.evening_330 ?? ''} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              {/* Calculated Results (Actual, Extra, Total) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="bg-blue-950/40 border border-blue-800/40 p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold tracking-wider text-blue-400 mb-1">Actual KM</p>
                  <h3 className="text-2xl font-black font-mono text-white">{actualKm.toLocaleString()} <span className="text-sm font-normal text-blue-300">KM</span></h3>
                  <p className="text-[11px] text-slate-400 mt-1">Morning 9:30 − Prev Evening</p>
                </div>

                <div className="bg-amber-950/40 border border-amber-800/40 p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold tracking-wider text-amber-400 mb-1">Extra KM</p>
                  <h3 className="text-2xl font-black font-mono text-white">{extraKm.toLocaleString()} <span className="text-sm font-normal text-amber-300">KM</span></h3>
                  <p className="text-[11px] text-slate-400 mt-1">Evening 3:30 − Morning 9:30</p>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold tracking-wider text-emerald-400 mb-1">Total KM</p>
                  <h3 className="text-2xl font-black font-mono text-white">{totalKm.toLocaleString()} <span className="text-sm font-normal text-emerald-300">KM</span></h3>
                  <p className="text-[11px] text-slate-400 mt-1">Actual + Extra KM</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Remarks</label>
                <textarea name="remarks" className="input-field" placeholder="Optional notes or remarks..." value={formData.remarks || ''} onChange={handleChange} rows={2} />
              </div>

              <div className="flex justify-end mt-2">
                <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200">
                  {formData.id ? 'Update Odometer Record' : 'Save Odometer Record'}
                </button>
              </div>
            </form>
          );
        })()}

        {/* --- VEHICLE RENEWALS --- */}
        {activeTab === 'renewals' && (
          <form onSubmit={(e) => handleSubmit(e, 'renewals')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Institution Filter</label>
                <select name="filter_institution" className="input-field" value={formData.filter_institution || ''} onChange={handleChange}>
                  <option value="">All Institutions</option>
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
              <div>
                <label>Vehicle *</label>
                <select name="vehicle" className="input-field" value={formData.vehicle || ''} onChange={handleChange} required>
                  <option value="">Select Vehicle...</option>
                  {vehicles.filter(v => !formData.filter_institution || v.institution === parseInt(formData.filter_institution)).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                </select>
              </div>
              <div>
                <label>Institution *</label>
                <select name="institution" className="input-field" value={formData.institution || ''} onChange={handleChange} required>
                  <option value="">Select Institution...</option>
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
              <div>
                <label>Document Type *</label>
                <select name="document_type" className="input-field" value={formData.document_type || ''} onChange={handleChange} required>
                  <option value="">Select Document Type...</option>
                  <option value="FC">FC</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Road Tax">Road Tax</option>
                  <option value="Green Tax">Green Tax</option>
                  <option value="Permit">Permit</option>
                  <option value="PUCC">PUCC</option>
                  <option value="Kerala Permit">Kerala Permit</option>
                  <option value="Tiruppur Permit">Tiruppur Permit</option>
                </select>
              </div>
              <div>
                <label>Document Number (Policy / Receipt No)</label>
                <input type="text" name="document_number" className="input-field" value={formData.document_number || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Renewed Date (Issued Date)</label>
                <input type="date" name="renewed_date" className="input-field" value={formData.renewed_date || ''} onChange={handleChange} />
              </div>
              <div>
                <label>New Expiry Date *</label>
                <input type="date" name="new_expiry_date" className="input-field" value={formData.new_expiry_date || ''} onChange={handleChange} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- FUEL RATES --- */}
        {activeTab === 'fuel-rates' && (
          <form onSubmit={(e) => handleSubmit(e, 'fuel-rates')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Fuel Type *</label>
                <select name="fuel_type" className="input-field" value={formData.fuel_type || 'DIESEL'} onChange={handleChange} required>
                  <option value="DIESEL">Diesel</option>
                  <option value="PETROL">Petrol</option>
                  <option value="EV">EV</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
              <div>
                <label>Rate Per Liter (₹) *</label>
                <input type="number" step="0.01" name="rate_per_liter" className="input-field" value={formData.rate_per_liter || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Effective Date *</label>
                <input type="date" name="effective_date" className="input-field" value={formData.effective_date || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Effective Time *</label>
                <input type="time" name="effective_time" className="input-field" value={formData.effective_time || ''} onChange={handleChange} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- FUEL DATA --- */}
        {activeTab === 'fuel-data' && (
          <form onSubmit={(e) => handleSubmit(e, 'fuel-data')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Institution</label>
              <select name="institution" className="input-field" value={formData.institution || ''} onChange={handleChange} required>
                <option value="">Select Institution...</option>
                {institutions.map(inst => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label>Vehicle (Dependent)</label>
                <Select
                  name="vehicle"
                  options={vehicles.filter(v => {
                    const inst = institutions.find(i => i.name === formData.institution);
                    return inst && v.institution === inst.id;
                  }).map(v => ({ value: v.id, label: v.vehicle_number }))}
                  value={formData.vehicle ? { value: formData.vehicle, label: vehicles.find(v => v.id === parseInt(formData.vehicle))?.vehicle_number || '' } : null}
                  onChange={(option) => handleChange({ target: { name: 'vehicle', value: option ? option.value : '' } })}
                  isDisabled={!formData.institution}
                  styles={selectStyles}
                  isClearable
                  placeholder="Select Vehicle..."
                  required
                />
              </div>
              <div>
                <label>Date</label>
                <input type="date" name="date" className="input-field" value={formData.date || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Fuel Rate (₹)</label>
                <input type="text" className="input-field bg-slate-100 dark:bg-slate-800" value={formData.fetched_rate ? `₹${formData.fetched_rate} / L` : 'Pending / Not Found'} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Previous KM
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="checkbox" name="override_previous_km" checked={formData.override_previous_km || false} onChange={(e) => {
                      setFormData(prev => ({ ...prev, override_previous_km: e.target.checked }));
                    }} />
                    Override
                  </label>
                </label>
                <input type="number" name="previous_km" className="input-field" value={formData.previous_km || ''} onChange={(e) => {
                  handleChange(e);
                  const prev = parseInt(e.target.value) || 0;
                  const curr = parseInt(formData.current_km) || 0;
                  setFormData(f => ({ ...f, previous_km: e.target.value, total_km: curr > prev ? curr - prev : 0 }));
                }} disabled={!formData.override_previous_km} />
              </div>
              <div>
                <label>Current KM</label>
                <input type="number" name="current_km" className="input-field" value={formData.current_km || ''} onChange={(e) => {
                  handleChange(e);
                  const curr = parseInt(e.target.value) || 0;
                  const prev = parseInt(formData.previous_km) || 0;
                  setFormData(f => ({ ...f, current_km: e.target.value, total_km: curr > prev ? curr - prev : 0 }));
                }} />
              </div>
              <div>
                <label>Total KM</label>
                <input type="number" name="total_km" className="input-field bg-slate-100 dark:bg-slate-800" value={formData.total_km || ''} readOnly />
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                Bill No
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'normal' }}>
                  <input type="checkbox" name="is_direct_bill" checked={formData.is_direct_bill || false} onChange={(e) => {
                    setFormData(prev => ({ ...prev, is_direct_bill: e.target.checked, bill_no: e.target.checked ? 'Direct' : '' }));
                  }} />
                  Direct Bill
                </label>
              </label>
              <input type="text" name="bill_no" className="input-field" value={formData.bill_no || ''} onChange={handleChange} disabled={formData.is_direct_bill} required={!formData.is_direct_bill} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label>Liters</label>
                <input type="number" step="0.01" name="liters" className="input-field" value={formData.liters || ''} onChange={(e) => {
                  handleChange(e);
                  if (formData.fetched_rate) {
                    const liters = parseFloat(e.target.value || 0);
                    const amt = (liters * parseFloat(formData.fetched_rate)).toFixed(2);
                    const disc = parseFloat(formData.discount_amount) || 0;
                    setFormData(prev => ({ ...prev, liters: e.target.value, amount: amt, actual_amount: (amt - (liters * disc)).toFixed(2) }));
                  } else {
                    const liters = parseFloat(e.target.value || 0);
                    const amt = parseFloat(formData.amount) || 0;
                    const disc = parseFloat(formData.discount_amount) || 0;
                    setFormData(prev => ({ ...prev, liters: e.target.value, actual_amount: (amt - (liters * disc)).toFixed(2) }));
                  }
                }} required />
              </div>
              <div>
                <label>Amount (₹)</label>
                <input type="number" step="0.01" name="amount" className="input-field" value={formData.amount || ''} onChange={(e) => {
                  handleChange(e);
                  const amt = parseFloat(e.target.value) || 0;
                  const liters = parseFloat(formData.liters) || 0;
                  const disc = parseFloat(formData.discount_amount) || 0;
                  setFormData(prev => ({ ...prev, amount: e.target.value, actual_amount: (amt - (liters * disc)).toFixed(2) }));
                }} required />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Discount per Liter (₹)
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="checkbox" name="override_discount_rate" checked={formData.override_discount_rate || false} onChange={(e) => {
                      setFormData(prev => ({ ...prev, override_discount_rate: e.target.checked }));
                    }} />
                    Override
                  </label>
                </label>
                <input type="number" step="0.01" name="discount_amount" className={`input-field ${!formData.override_discount_rate ? 'bg-slate-100 dark:bg-slate-800' : ''}`} value={formData.discount_amount || ''} onChange={(e) => {
                  handleChange(e);
                  const amt = parseFloat(formData.amount) || 0;
                  const liters = parseFloat(formData.liters) || 0;
                  const disc = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, discount_amount: e.target.value, actual_amount: (amt - (liters * disc)).toFixed(2) }));
                }} readOnly={!formData.override_discount_rate} />
              </div>
              <div>
                <label>Actual Amount</label>
                <input type="number" step="0.01" name="actual_amount" className="input-field bg-slate-100 dark:bg-slate-800" value={formData.actual_amount || formData.amount || ''} readOnly />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- BUDGET HEAD --- */}
        {activeTab === 'budget-heads' && (
          <form onSubmit={(e) => handleSubmit(e, 'budget-heads')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Budget Head Name</label>
              <input type="text" name="name" className="input-field" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <label>Color Code (Optional)</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input type="color" name="color_code" value={formData.color_code || '#cbd5e1'} onChange={handleChange} style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer' }} />
                <input type="text" name="color_code" className="input-field" value={formData.color_code || ''} onChange={handleChange} placeholder="e.g. #ff0000" style={{ flex: 1 }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- SUB BUDGET HEAD --- */}
        {activeTab === 'sub-budget-heads' && (
          <form onSubmit={(e) => handleSubmit(e, 'sub-budget-heads')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Budget Head</label>
              <select name="budget_head" className="input-field" value={formData.budget_head || ''} onChange={handleChange} required>
                <option value="">Select Budget Head...</option>
                {budgetHeads.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label>Sub Budget Head Name</label>
              <input type="text" name="name" className="input-field" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- VENDOR --- */}
        {activeTab === 'vendors' && (
          <form onSubmit={(e) => handleSubmit(e, 'vendors')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Vendor Name</label>
              <input type="text" name="name" className="input-field" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <label>Contact Number (Optional)</label>
              <input type="text" name="contact_number" className="input-field" value={formData.contact_number || ''} onChange={handleChange} />
            </div>
            <div>
              <label>Email (Optional)</label>
              <input type="email" name="email" className="input-field" value={formData.email || ''} onChange={handleChange} />
            </div>
            <div>
              <label>GST Number (Optional)</label>
              <input type="text" name="gst_number" className="input-field" value={formData.gst_number || ''} onChange={handleChange} />
            </div>
            <div>
              <label>Address (Optional)</label>
              <textarea name="address" className="input-field" value={formData.address || ''} onChange={handleChange} rows={2} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
          </form>
        )}

        {/* --- SERVICE REQUEST --- */}
        {activeTab === 'service-request' && (
          <form onSubmit={(e) => handleSubmit(e, 'service-requests')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'var(--brand-blue)' }}>Basic Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Institution</label>
                <select name="institution" className="input-field" value={formData.institution || ''} onChange={handleChange} required>
                  <option value="">Select Institution...</option>
                  {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
              <div>
                <label>Vehicle</label>
                <Select
                  name="vehicle"
                  options={vehicles.filter(v => v.institution === parseInt(formData.institution)).map(v => ({ value: v.id, label: v.vehicle_number }))}
                  value={formData.vehicle ? { value: formData.vehicle, label: vehicles.find(v => v.id === parseInt(formData.vehicle))?.vehicle_number || '' } : null}
                  onChange={(option) => handleChange({ target: { name: 'vehicle', value: option ? option.value : '' } })}
                  isDisabled={!formData.institution}
                  styles={selectStyles}
                  isClearable
                  placeholder="Select Vehicle..."
                  required
                />
              </div>
              <div>
                <label>Date</label>
                <input type="date" name="date" className="input-field" value={formData.date || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Cab No</label>
                <input type="text" name="cab_no" className="input-field" value={formData.cab_no || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Make</label>
                <input type="text" name="make" className="input-field" value={formData.make || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Model</label>
                <input type="text" name="model" className="input-field" value={formData.model || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Kms Reading</label>
                <input type="number" name="kms_reading" className="input-field" value={formData.kms_reading || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Last Service Date (Optional)</label>
                <input type="date" name="last_service_date" className="input-field" value={formData.last_service_date || ''} onChange={handleChange} />
              </div>
            </div>
            
            <h4 style={{ color: 'var(--brand-blue)', marginTop: '1rem' }}>Service Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label>Nature of Problem</label>
                <textarea name="nature_of_problem" className="input-field" value={formData.nature_of_problem || ''} onChange={handleChange} rows={3} required />
              </div>
              <div>
                <label>Vendor Name</label>
                <select name="vendor_name" className="input-field" value={formData.vendor_name || ''} onChange={handleChange}>
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label>Estimated Repair Cost</label>
                <input type="number" step="0.01" name="estimated_repair_cost" className="input-field" value={formData.estimated_repair_cost || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Days Required</label>
                <input type="number" name="days_required" className="input-field" value={formData.days_required || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Expected Delivery Date</label>
                <input type="date" name="expected_delivery_date" className="input-field" value={formData.expected_delivery_date || ''} onChange={handleChange} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label>Remarks</label>
                <textarea name="remarks" className="input-field" value={formData.remarks || ''} onChange={handleChange} rows={2} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Upload Estimate / Bill Document (Optional PDF/Image)
                </label>
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  className="input-field py-2 px-3 text-xs bg-slate-800 text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setCompressingPdf(true);
                      let finalFile = file;
                      if (file.type.startsWith('image/')) {
                        finalFile = await compressImageFile(file);
                      } else if (file.type === 'application/pdf') {
                        finalFile = await compressPdfFile(file);
                      }
                      setFormData(prev => ({ ...prev, estimate_doc: finalFile }));
                      setCompressingPdf(false);
                    }
                  }}
                />
                {formData.estimate_doc && (
                  <div className="mt-2 flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-xl">
                    <span className="truncate font-mono">
                      📎 {typeof formData.estimate_doc === 'string' ? formData.estimate_doc.split('/').pop() : formData.estimate_doc.name}
                    </span>
                    {typeof formData.estimate_doc === 'string' && (
                      <a href={formData.estimate_doc} target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold ml-3 hover:text-blue-300">
                        View Attached Estimate
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{formData.id ? 'Update Service Request' : 'Submit Service Request'}</button>
          </form>
        )}

        {/* --- EXPENSE RECORD --- */}
        {activeTab === 'expenses' && (
          <form onSubmit={(e) => handleSubmit(e, 'expenses')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'var(--brand-blue)' }}>Basic & Dependent Details</h4>
            <div>
              <label>Institution *</label>
              <select name="institution" className="input-field" value={formData.institution || ''} onChange={handleChange} required>
                <option value="">Select Institution...</option>
                {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            <div>
              <label>Vehicle *</label>
              <Select
                name="vehicle"
                options={vehicles.filter(v => v.institution === parseInt(formData.institution)).map(v => ({ value: v.id, label: v.vehicle_number }))}
                value={formData.vehicle ? { value: formData.vehicle, label: vehicles.find(v => v.id === parseInt(formData.vehicle))?.vehicle_number || '' } : null}
                onChange={(option) => handleChange({ target: { name: 'vehicle', value: option ? option.value : '' } })}
                isDisabled={!formData.institution}
                styles={selectStyles}
                isClearable
                placeholder="Select Vehicle..."
                required
              />
            </div>
            <div>
              <label>Service Request (Optional)</label>
              <select name="service_request" className="input-field" value={formData.service_request || ''} onChange={handleChange} disabled={!formData.vehicle}>
                <option value="">Select Service Request (Optional)...</option>
                {unusedServiceRequests.map(sr => (
                  <option key={sr.id} value={sr.id}>{sr.request_id} - {sr.nature_of_problem}</option>
                ))}
                {formData.service_request && !unusedServiceRequests.find(sr => sr.id === parseInt(formData.service_request)) && (
                   <option value={formData.service_request}>Current SR Selected (ID: {formData.service_request})</option>
                )}
              </select>
            </div>

            {/* Service Request Info & Estimate Amount Card inside Transaction & Vendor Details */}
            {(() => {
              const selectedSR = unusedServiceRequests.find(sr => sr.id === parseInt(formData.service_request));
              if (!selectedSR) return null;
              return (
                <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-2xl flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Selected Request Details</p>
                      <p className="text-xs text-blue-300 font-medium mt-0.5">
                        Request Date: <span className="text-white font-mono">{selectedSR.date ? new Date(selectedSR.date).toLocaleDateString('en-IN') : 'N/A'}</span>
                        {selectedSR.nature_of_problem && <span className="text-slate-400 ml-2">({selectedSR.nature_of_problem})</span>}
                      </p>
                    </div>
                  </div>

                  {selectedSR.estimated_repair_cost && (
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estimated Cost</p>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        ₹ {parseFloat(selectedSR.estimated_repair_cost).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <label>Budget Head *</label>
              <select name="budget_head" className="input-field" value={formData.budget_head || ''} onChange={handleChange} required disabled={!formData.institution}>
                <option value="">Select Budget Head...</option>
                {budgetHeads
                  .filter(b => formData.institution ? b.institutions.includes(parseInt(formData.institution)) : true)
                  .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label>Sub Budget Head *</label>
              <select name="sub_budget_head" className="input-field" value={formData.sub_budget_head || ''} onChange={handleChange} required disabled={!formData.budget_head}>
                <option value="">Select Sub Budget...</option>
                {subBudgetHeads
                  .filter(s => s.budget_head === parseInt(formData.budget_head))
                  .filter(s => formData.institution ? s.institutions.includes(parseInt(formData.institution)) : true)
                  .map(s => 
                  <option key={s.id} value={s.id}>{s.name}</option>
                )}
              </select>
            </div>

            <h4 style={{ color: 'var(--brand-blue)', marginTop: '1rem' }}>Transaction & Vendor Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Date *</label>
                <input type="date" name="date" className="input-field" value={formData.date || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Vendor (Optional)</label>
                <select name="vendor" className="input-field" value={formData.vendor || ''} onChange={handleChange}>
                  <option value="">Select Vendor...</option>
                  {vendors && vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Vendor Manual (If not in list)</label>
                <input type="text" name="vendor_manual" className="input-field" value={formData.vendor_manual || ''} onChange={handleChange} placeholder="Fill if vendor not in list..." />
              </div>
            </div>

            {/* PO Details Collapsible Section */}
            {(() => {
              const isPoActive = showPoDetails;
              return (
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-slate-200">PO / Estimate Details (Optional)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPoDetails(prev => !prev)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                        isPoActive 
                          ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-sm' 
                          : 'bg-slate-700/80 text-slate-200 border-slate-600 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {isPoActive ? '✓ PO Details Active' : '+ Add PO Details (Optional)'}
                    </button>
                  </div>

                  {isPoActive && (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PO/Estimate No (Optional)</label>
                        <input type="text" name="po_estimate_no" className="input-field" placeholder="e.g. PO-2026-001" value={formData.po_estimate_no || ''} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PO/Estimate Date (Optional)</label>
                        <input type="date" name="po_estimate_date" className="input-field" value={formData.po_estimate_date || ''} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PO/Estimate Amount (Optional ₹)</label>
                        <input type="number" step="0.01" name="po_estimate_amount" className="input-field" placeholder="0.00" value={formData.po_estimate_amount || ''} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Service Km (Optional)</label>
                        <input type="number" name="service_km" className="input-field" placeholder="KM at time of service" value={formData.service_km || ''} onChange={handleChange} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <h4 style={{ color: 'var(--brand-blue)', marginTop: '1rem' }}>Bill Details & PDF Upload</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Bill No</label>
                <input type="text" name="bill_no" className="input-field" value={formData.bill_no || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Bill Date</label>
                <input type="date" name="bill_date" className="input-field" value={formData.bill_date || ''} onChange={handleChange} />
              </div>
              <div>
                <label>Bill Description</label>
                <textarea name="bill_description" className="input-field" value={formData.bill_description || ''} onChange={handleChange} required />
              </div>
              <div>
                <label>Purpose</label>
                <textarea name="purpose" className="input-field" value={formData.purpose || ''} onChange={handleChange} required />
              </div>

              {/* Bill PDF File Upload Field */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Upload Bill PDF / Document (Auto Compressed &lt; 1 MB)
                </label>
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  className="input-field py-2 px-3 text-xs bg-slate-800 text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setCompressingPdf(true);
                      let finalFile = file;
                      if (file.type.startsWith('image/')) {
                        finalFile = await compressImageFile(file);
                      } else if (file.type === 'application/pdf') {
                        finalFile = await compressPdfFile(file);
                      }
                      setFormData(prev => ({ ...prev, bill_file: finalFile }));
                      setCompressingPdf(false);
                    }
                  }}
                />
                {compressingPdf && (
                  <p className="text-xs text-amber-400 mt-1 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Compressing PDF file below 1 MB...
                  </p>
                )}
                {formData.bill_file && !compressingPdf && (
                  <div className="mt-2 flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-xl">
                    <span className="truncate font-mono">
                      📎 {typeof formData.bill_file === 'string' ? formData.bill_file.split('/').pop() : formData.bill_file.name}
                    </span>
                    {formData.bill_file.size && (
                      <span className={`font-semibold ml-2 ${formData.bill_file.size <= 1048576 ? 'text-emerald-300' : 'text-amber-400'}`}>
                        ({(formData.bill_file.size / 1024).toFixed(0)} KB {formData.bill_file.size <= 1048576 ? '✓ < 1 MB' : 'compressing...'})
                      </span>
                    )}
                    {typeof formData.bill_file === 'string' && (
                      <a href={formData.bill_file} target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold ml-3 hover:text-blue-300">
                        View Attached File
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <h4 style={{ color: 'var(--brand-blue)', marginTop: '1rem' }}>Amounts</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Base Amount (₹)</label>
                <input type="number" step="0.01" name="amount" className="input-field" value={formData.amount || ''} onChange={(e) => {
                  handleChange(e);
                  const amt = parseFloat(e.target.value) || 0;
                  const s = parseFloat(formData.sgst) || 0;
                  const c = parseFloat(formData.cgst) || 0;
                  setFormData(prev => ({ ...prev, amount: e.target.value, total_amount: (amt + s + c).toFixed(2) }));
                }} required />
              </div>
              <div>
                <label>SGST (₹)</label>
                <input type="number" step="0.01" name="sgst" className="input-field" value={formData.sgst || ''} onChange={(e) => {
                  handleChange(e);
                  const amt = parseFloat(formData.amount) || 0;
                  const s = parseFloat(e.target.value) || 0;
                  const c = parseFloat(formData.cgst) || 0;
                  setFormData(prev => ({ ...prev, sgst: e.target.value, total_amount: (amt + s + c).toFixed(2) }));
                }} />
              </div>
              <div>
                <label>CGST (₹)</label>
                <input type="number" step="0.01" name="cgst" className="input-field" value={formData.cgst || ''} onChange={(e) => {
                  handleChange(e);
                  const amt = parseFloat(formData.amount) || 0;
                  const s = parseFloat(formData.sgst) || 0;
                  const c = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, cgst: e.target.value, total_amount: (amt + s + c).toFixed(2) }));
                }} />
              </div>
              <div>
                <label>Total Amount (₹)</label>
                <input type="number" step="0.01" name="total_amount" className="input-field bg-slate-100 dark:bg-slate-800" value={formData.total_amount || ''} readOnly />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <h4 style={{ color: 'var(--brand-blue)', margin: 0 }}>Inline Opex Details</h4>
              <button type="button" onClick={handleAddOpex} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>+ Add Opex Line</button>
            </div>
            
            {opexData.length === 0 && <p className="text-secondary" style={{ fontSize: '0.875rem' }}>No opex lines added. Click the button above to add one.</p>}
            
            {opexData.map((opex, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', backgroundColor: 'var(--bg-neumorphic)', padding: '1rem', borderRadius: '8px', boxShadow: 'inset 2px 2px 5px var(--neu-shadow-dark), inset -2px -2px 5px var(--neu-shadow-light)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>Opex Number</label>
                  <input type="text" name="opex_number" className="input-field" value={opex.opex_number} onChange={(e) => handleOpexChange(index, e)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>Opex Date</label>
                  <input type="date" name="opex_date" className="input-field" value={opex.opex_date} onChange={(e) => handleOpexChange(index, e)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                  <input type="number" step="0.01" name="opex_amount" className="input-field" value={opex.opex_amount} onChange={(e) => handleOpexChange(index, e)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>Type</label>
                  <select name="opex_type" className="input-field" value={opex.opex_type} onChange={(e) => handleOpexChange(index, e)} required>
                    <option value="Settlement">Settlement</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
                <button type="button" onClick={() => handleRemoveOpex(index)} className="btn" style={{ backgroundColor: '#fed7d7', color: '#822727', padding: '0.5rem 1rem' }}>X</button>
              </div>
            ))}
            
            <div>
              <label>Remarks</label>
              <textarea name="remarks" className="input-field" value={formData.remarks || ''} onChange={handleChange} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">{formData.id ? 'Update Record' : 'Save / Log Record'}</button>
              {formData.id && (
                <button 
                  type="button" 
                  className="btn" 
                  style={{ backgroundColor: '#475569', color: 'white' }}
                  onClick={() => {
                    if (location.state?.returnTo) {
                      navigate(location.state.returnTo);
                    } else {
                      setFormData({});
                      setOpexData([]);
                      setMessage({ text: '', type: '' });
                      if (window.history.replaceState) {
                         window.history.replaceState({}, document.title);
                      }
                    }
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DataEntry;
