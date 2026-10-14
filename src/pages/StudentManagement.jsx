import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Users, UserPlus, Search, Download, Edit3, Trash2,
  Bus, CheckCircle2, AlertCircle, Clock, DollarSign,
  RefreshCw, X, MapPin, Phone, Building2,
  FileSpreadsheet, Filter, ChevronRight, Check,
  UserMinus, RotateCcw, AlertTriangle, Info, Calendar,
  ShieldCheck, ArrowRight, UserCheck, Briefcase, GraduationCap,
  Layers, ArrowUpRight
} from 'lucide-react';

const ACADEMIC_YEARS = ['2025-2026', '2026-2027', '2024-2025'];
const STUDY_YEARS = ['All Years', '1st Year', '2nd Year', '3rd Year', '4th Year', 'PG / Masters', 'Schooling', 'Faculty / Staff'];
const STATUSES = ['All Statuses', 'Active', 'Pass Surrendered', 'Suspended', 'Graduated', 'Pending Allocation', 'Inactive'];

const SURRENDER_REASONS = [
  'Shifted to Hostel',
  'Using Own Vehicle / Bike',
  'Relocated Residence / Distance',
  'Fee Issues / Concession Dispute',
  'Course Completed / Left University',
  'Discontinued Transport Service',
  'Parent Request',
  'Other'
];

export default function StudentManagement() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedInst, setSelectedInst] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [selectedRiderType, setSelectedRiderType] = useState('ALL'); // 'ALL' | 'Student' | 'Staff'
  const [selectedAllocationStatus, setSelectedAllocationStatus] = useState('ALL'); // 'ALL' | 'ALLOCATED' | 'UNALLOCATED'
  const [selectedStudyYear, setSelectedStudyYear] = useState('All Years');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    rider_type: 'Student', // 'Student' | 'Staff'
    roll_number: '',
    student_name: '',
    institution: '',
    academic_year: '2025-2026',
    course: '',
    year_of_study: '1st Year',
    allocated_vehicle: '',
    route_name: '',
    pickup_point: '',
    drop_point: '',
    fee_demand: 24000,
    fee_discount: 0,
    fee_paid: 0,
    surrender_date: '',
    surrender_reason: '',
    refund_amount: 0,
    remarks: '',
    contact_number: '',
    parent_contact: '',
    status: 'Active'
  });

  // Dedicated Quick Bus Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocatingStudent, setAllocatingStudent] = useState(null);
  const [allocateForm, setAllocateForm] = useState({
    allocated_vehicle: '',
    route_name: '',
    pickup_point: '',
    drop_point: ''
  });

  // Pass Surrender Dedicated Modal State
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [surrenderStudent, setSurrenderStudent] = useState(null);
  const [surrenderForm, setSurrenderForm] = useState({
    surrender_date: new Date().toISOString().slice(0, 10),
    surrender_reason: 'Shifted to Hostel',
    refund_amount: 0,
    remarks: ''
  });

  // Filtered vehicles for modal based on selected institution
  const modalVehicles = useMemo(() => {
    if (!formData.institution) return vehicles;
    const instFiltered = vehicles.filter(v => String(v.institution) === String(formData.institution));
    return instFiltered.length > 0 ? instFiltered : vehicles;
  }, [vehicles, formData.institution]);

  // Compute live vehicle occupancy mapping for quick allocation
  const vehicleOccupancyMap = useMemo(() => {
    const map = {};
    vehicles.forEach(v => {
      map[v.id] = {
        id: v.id,
        vehicle_number: v.vehicle_number,
        cab_number: v.cab_number || '',
        capacity: v.seating_capacity || 40,
        active_count: 0
      };
    });

    students.forEach(s => {
      if (s.allocated_vehicle && map[s.allocated_vehicle] && s.status === 'Active') {
        map[s.allocated_vehicle].active_count += 1;
      }
    });

    return map;
  }, [vehicles, students]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStudents, resInsts, resVehicles] = await Promise.allSettled([
        api.get('students/'),
        api.get('institutions/'),
        api.get('vehicles/')
      ]);

      if (resStudents.status === 'fulfilled') {
        const data = Array.isArray(resStudents.value.data) ? resStudents.value.data : (resStudents.value.data?.results || []);
        setStudents(data);
      }
      if (resInsts.status === 'fulfilled') {
        const data = Array.isArray(resInsts.value.data) ? resInsts.value.data : (resInsts.value.data?.results || []);
        setInstitutions(data);
      }
      if (resVehicles.status === 'fulfilled') {
        const data = Array.isArray(resVehicles.value.data) ? resVehicles.value.data : (resVehicles.value.data?.results || []);
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to load passenger transport data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = (type = 'Student') => {
    setEditingStudent(null);
    setFormData({
      rider_type: type,
      roll_number: '',
      student_name: '',
      institution: institutions[0]?.id || '',
      academic_year: selectedYear || '2025-2026',
      course: type === 'Staff' ? 'Faculty / Staff Member' : '',
      year_of_study: type === 'Staff' ? 'Faculty / Staff' : '1st Year',
      allocated_vehicle: '',
      route_name: '',
      pickup_point: '',
      drop_point: '',
      fee_demand: type === 'Staff' ? 0 : 24000,
      fee_discount: 0,
      fee_paid: 0,
      surrender_date: '',
      surrender_reason: '',
      refund_amount: 0,
      remarks: '',
      contact_number: '',
      parent_contact: '',
      status: 'Active'
    });
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      rider_type: student.rider_type || (student.year_of_study === 'Faculty / Staff' ? 'Staff' : 'Student'),
      roll_number: student.roll_number,
      student_name: student.student_name,
      institution: student.institution,
      academic_year: student.academic_year || '2025-2026',
      course: student.course || '',
      year_of_study: student.year_of_study || '1st Year',
      allocated_vehicle: student.allocated_vehicle || '',
      route_name: student.route_name || '',
      pickup_point: student.pickup_point || '',
      drop_point: student.drop_point || '',
      fee_demand: parseFloat(student.fee_demand || 0),
      fee_discount: parseFloat(student.fee_discount || 0),
      fee_paid: parseFloat(student.fee_paid || 0),
      surrender_date: student.surrender_date || '',
      surrender_reason: student.surrender_reason || '',
      refund_amount: parseFloat(student.refund_amount || 0),
      remarks: student.remarks || '',
      contact_number: student.contact_number || '',
      parent_contact: student.parent_contact || '',
      status: student.status || 'Active'
    });
    setShowModal(true);
  };

  // Open Quick Bus Allocation Modal
  const openAllocateModal = (student) => {
    setAllocatingStudent(student);
    setAllocateForm({
      allocated_vehicle: student.allocated_vehicle || '',
      route_name: student.route_name || '',
      pickup_point: student.pickup_point || '',
      drop_point: student.drop_point || ''
    });
    setShowAllocateModal(true);
  };

  const handleQuickAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocatingStudent) return;
    try {
      await api.post(`students/${allocatingStudent.id}/allocate_vehicle/`, {
        allocated_vehicle: allocateForm.allocated_vehicle ? parseInt(allocateForm.allocated_vehicle, 10) : null,
        route_name: allocateForm.route_name,
        pickup_point: allocateForm.pickup_point,
        drop_point: allocateForm.drop_point
      });
      setShowAllocateModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to update bus allocation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const openSurrenderModal = (student) => {
    setSurrenderStudent(student);
    setSurrenderForm({
      surrender_date: new Date().toISOString().slice(0, 10),
      surrender_reason: student.surrender_reason || 'Shifted to Hostel',
      refund_amount: parseFloat(student.refund_amount || 0),
      remarks: student.remarks || ''
    });
    setShowSurrenderModal(true);
  };

  const handleSurrenderSubmit = async (e) => {
    e.preventDefault();
    if (!surrenderStudent) return;
    try {
      await api.post(`students/${surrenderStudent.id}/surrender_pass/`, surrenderForm);
      setShowSurrenderModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to surrender pass: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReactivate = async (student) => {
    if (!window.confirm(`Are you sure you want to reactivate the bus pass for ${student.student_name} (${student.roll_number})?`)) return;
    try {
      await api.post(`students/${student.id}/reactivate_pass/`, {});
      fetchData();
    } catch (err) {
      alert('Failed to reactivate pass: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        institution: parseInt(formData.institution, 10),
        allocated_vehicle: formData.allocated_vehicle ? parseInt(formData.allocated_vehicle, 10) : null,
        fee_demand: parseFloat(formData.fee_demand || 0),
        fee_discount: parseFloat(formData.fee_discount || 0),
        fee_paid: parseFloat(formData.fee_paid || 0),
        refund_amount: parseFloat(formData.refund_amount || 0),
        surrender_date: formData.surrender_date || null,
        surrender_reason: formData.surrender_reason || null
      };

      if (editingStudent) {
        await api.put(`students/${editingStudent.id}/`, payload);
      } else {
        await api.post('students/', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Error saving passenger record: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${name} from transport registry?\n\nTip: If the passenger merely left or surrendered their bus pass, use 'Surrender Pass' so all historical records are preserved in the DB!`)) return;
    try {
      await api.delete(`students/${id}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete passenger: ' + err.message);
    }
  };

  // Filtered Students & Staff
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedInst !== 'ALL' && String(s.institution) !== String(selectedInst)) return false;
      if (selectedYear !== 'ALL' && s.academic_year !== selectedYear) return false;
      if (selectedStudyYear !== 'All Years' && s.year_of_study !== selectedStudyYear) return false;
      if (selectedStatus !== 'All Statuses' && s.status !== selectedStatus) return false;
      
      // Rider Type Filter (Student vs Staff)
      const isStaff = s.rider_type === 'Staff' || s.year_of_study === 'Faculty / Staff';
      if (selectedRiderType === 'Student' && isStaff) return false;
      if (selectedRiderType === 'Staff' && !isStaff) return false;

      // Allocation Status Filter
      if (selectedAllocationStatus === 'ALLOCATED' && (!s.allocated_vehicle || s.status !== 'Active')) return false;
      if (selectedAllocationStatus === 'UNALLOCATED' && (!!s.allocated_vehicle && s.status === 'Active')) return false;

      // Vehicle Filter
      if (selectedVehicle !== 'ALL') {
        if (selectedVehicle === 'unallocated' && s.allocated_vehicle) return false;
        if (selectedVehicle !== 'unallocated' && String(s.allocated_vehicle) !== String(selectedVehicle)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.student_name?.toLowerCase().includes(q);
        const matchRoll = s.roll_number?.toLowerCase().includes(q);
        const matchCourse = s.course?.toLowerCase().includes(q);
        const matchPoint = s.pickup_point?.toLowerCase().includes(q);
        const matchRoute = s.route_name?.toLowerCase().includes(q);
        const matchVehicle = s.allocated_vehicle_number?.toLowerCase().includes(q);
        const matchReason = s.surrender_reason?.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchCourse && !matchPoint && !matchRoute && !matchVehicle && !matchReason) return false;
      }
      return true;
    });
  }, [students, selectedInst, selectedYear, selectedRiderType, selectedAllocationStatus, selectedStudyYear, selectedStatus, selectedVehicle, searchQuery]);

  // Aggregated KPIs focused on Enrollment & Allocation
  const kpiData = useMemo(() => {
    const total = filteredStudents.length;
    const activeCount = filteredStudents.filter(s => s.status === 'Active').length;
    const surrenderedCount = filteredStudents.filter(s => s.status === 'Pass Surrendered').length;
    const allocated = filteredStudents.filter(s => !!s.allocated_vehicle && s.status === 'Active').length;
    const unallocated = activeCount - allocated;

    const studentCount = filteredStudents.filter(s => s.rider_type !== 'Staff' && s.year_of_study !== 'Faculty / Staff').length;
    const staffCount = filteredStudents.filter(s => s.rider_type === 'Staff' || s.year_of_study === 'Faculty / Staff').length;

    // Total fleet capacity across matching vehicles
    const matchedVehicles = vehicles.filter(v => {
      if (selectedInst !== 'ALL' && String(v.institution) !== String(selectedInst)) return false;
      return true;
    });
    const totalCapacity = matchedVehicles.reduce((sum, v) => sum + (v.seating_capacity || 40), 0);
    const overallOccupancy = totalCapacity > 0 ? Math.round((allocated / totalCapacity) * 100) : 0;
    const allocationRate = activeCount > 0 ? Math.round((allocated / activeCount) * 100) : 0;

    return {
      total,
      allocated,
      unallocated,
      activeCount,
      staffCount,
      totalCapacity,
      overallOccupancy,
      allocationRate,
      vehicleCount: matchedVehicles.length
    };
  }, [filteredStudents, vehicles, selectedInst]);

  const exportCSV = () => {
    let csv = 'Rider Type,Roll / Staff ID,Passenger Name,Institution,Academic Year,Year of Study / Category,Department / Course,Allocated Vehicle,Route Name,Pickup Point,Drop Point,Rider Status,Surrender Date,Surrender Reason,Contact Number,Parent Contact\n';
    
    filteredStudents.forEach(s => {
      const type = (s.rider_type === 'Staff' || s.year_of_study === 'Faculty / Staff') ? 'Staff / Faculty' : 'Student';
      csv += `"${type}","${s.roll_number}","${s.student_name}","${s.institution_name || ''}","${s.academic_year || ''}","${s.year_of_study || ''}","${s.course || ''}","${s.allocated_vehicle_number || 'Unallocated'}","${s.route_name || ''}","${s.pickup_point || ''}","${s.drop_point || ''}","${s.status || ''}","${s.surrender_date || ''}","${s.surrender_reason || ''}","${s.contact_number || ''}","${s.parent_contact || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `passenger_transport_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const activeVehicles = vehicles.filter(v => v.is_active !== false);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-16">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER WITH MULTI-ROLE ENROLLMENT ACTION BUTTONS          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Transport Department
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active AY {selectedYear}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users size={32} className="text-blue-400" />
            Passenger Transport & Seat Allocation
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Student & staff passenger enrollment, 1-click bus seat allocation, surrender pass retention & live occupancy
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all hover:text-white shadow-sm"
            title="Refresh Passenger Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all shadow-sm"
            title="Export Passenger Registry to CSV"
          >
            <Download size={15} />
            Export CSV
          </button>

          {/* Enroll Student Button */}
          <button
            onClick={() => openAddModal('Student')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
          >
            <UserPlus size={15} />
            + Enroll Student
          </button>

          {/* Enroll Staff Button */}
          <button
            onClick={() => openAddModal('Staff')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
          >
            <Briefcase size={15} />
            + Enroll Staff
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ALLOCATION & ENROLLMENT KPI METRIC CARDS                      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Total Fleet Buses */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 border-t-4 border-t-blue-500 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Total Fleet Buses</p>
              <h2 className="text-3xl font-black text-white mt-1 font-mono">
                {kpiData.vehicleCount} <span className="text-xs font-normal text-slate-400">Buses</span>
              </h2>
            </div>
            <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Bus size={22} />
            </span>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>Operating Fleet</span>
            <span>AY: <b className="text-slate-200">{selectedYear}</b></span>
          </div>
        </div>

        {/* 2. Total Seating Capacity */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 border-t-4 border-t-cyan-500 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-cyan-400 tracking-wider">Total Seating Capacity</p>
              <h2 className="text-3xl font-black text-cyan-400 mt-1 font-mono">
                {kpiData.totalCapacity} <span className="text-xs font-normal text-slate-400">Seats</span>
              </h2>
            </div>
            <span className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Layers size={22} />
            </span>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>Combined Capacity</span>
            <span className="text-cyan-300 font-mono text-[11px]">100% Base</span>
          </div>
        </div>

        {/* 3. Allocated / Occupied Seats */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 border-t-4 border-t-emerald-500 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-emerald-400 tracking-wider">Occupied / Allocated</p>
              <h2 className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                {kpiData.allocated} <span className="text-xs font-normal text-slate-400">Seats ({kpiData.overallOccupancy}%)</span>
              </h2>
            </div>
            <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <UserCheck size={22} />
            </span>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>Assigned Riders</span>
            <button
              onClick={() => setSelectedAllocationStatus(selectedAllocationStatus === 'ALLOCATED' ? 'ALL' : 'ALLOCATED')}
              className="text-[10px] text-emerald-400 underline font-bold"
            >
              {selectedAllocationStatus === 'ALLOCATED' ? 'Show All' : 'Filter Assigned'}
            </button>
          </div>
        </div>

        {/* 4. Available / Vacant Seats */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 border-t-4 border-t-amber-500 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider">Available / Vacant Seats</p>
              <h2 className="text-3xl font-black text-amber-400 mt-1 font-mono">
                {Math.max(0, kpiData.totalCapacity - kpiData.allocated)} <span className="text-xs font-normal text-slate-400">Free Seats</span>
              </h2>
            </div>
            <span className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <CheckCircle2 size={22} />
            </span>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>Vacant Fleet Seats</span>
            <span className="text-amber-400 font-bold font-mono">{100 - kpiData.overallOccupancy}% Free</span>
          </div>
        </div>

        {/* 5. Active Riders & Pending Allocation */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 border-t-4 border-t-purple-500 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-purple-400 tracking-wider">Active in DB</p>
              <h2 className="text-3xl font-black text-purple-400 mt-1 font-mono">
                {kpiData.activeCount} <span className="text-xs font-normal text-slate-400">/ {kpiData.total}</span>
              </h2>
            </div>
            <span className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Users size={22} />
            </span>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>Pending Bus: <b className="text-amber-400 font-bold">{kpiData.unallocated}</b></span>
            <button
              onClick={() => setSelectedAllocationStatus(selectedAllocationStatus === 'UNALLOCATED' ? 'ALL' : 'UNALLOCATED')}
              className="text-[10px] text-amber-400 underline font-bold"
            >
              {selectedAllocationStatus === 'UNALLOCATED' ? 'All' : 'Filter Pending'}
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER TOOLBAR                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl">
        
        {/* Quick Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
          {/* Global Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, roll/staff ID, bus, stop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Passenger Type Filter: [ ALL | STUDENTS | STAFF ] */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Users size={13} className="text-cyan-400" />
            <select
              value={selectedRiderType}
              onChange={(e) => setSelectedRiderType(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Passengers ({students.length})</option>
              <option value="Student" className="bg-slate-900">🎓 Students Only ({kpiData.studentCount})</option>
              <option value="Staff" className="bg-slate-900">👔 Staff / Faculty Only ({kpiData.staffCount})</option>
            </select>
          </div>

          {/* Allocation Status Filter: [ ALL | ALLOCATED | UNALLOCATED ] */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Bus size={13} className="text-emerald-400" />
            <select
              value={selectedAllocationStatus}
              onChange={(e) => setSelectedAllocationStatus(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Allocation Statuses</option>
              <option value="ALLOCATED" className="bg-slate-900 text-emerald-400">🟢 Allocated to Bus ({kpiData.allocated})</option>
              <option value="UNALLOCATED" className="bg-slate-900 text-amber-400">⚠️ Unallocated / Pending ({kpiData.unallocated})</option>
            </select>
          </div>

          {/* Institution Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Building2 size={13} className="text-amber-400" />
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Campuses</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id} className="bg-slate-900">{inst.name}</option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Calendar size={13} className="text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer font-mono"
            >
              <option value="ALL" className="bg-slate-900">All AY</option>
              {ACADEMIC_YEARS.map(y => (
                <option key={y} value={y} className="bg-slate-900">{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PASSENGER DIRECTORY & BUS ALLOCATION TABLE                    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Users size={20} className="text-amber-400" />
              Passenger Transport & Fleet Allocation Directory
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active student & staff passengers, assigned vehicle routes, boarding points, and instant bus allocation
            </p>
          </div>

          {/* Quick Bus Filter in Directory Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filter By Bus Route:</span>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-1.5 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Bus / Cab Routes ({vehicles.length} Fleet)</option>
              <option value="unallocated" className="text-amber-400">⚠️ Unallocated Only ({kpiData.unallocated})</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} {v.cab_number ? `(${v.cab_number})` : ''} - {v.make || 'Bus'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-4">Passenger & ID</th>
                <th className="py-3.5 px-4">Institution & Dept / Course</th>
                <th className="py-3.5 px-4">Assigned Bus & Route</th>
                <th className="py-3.5 px-4">Boarding / Stops</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Allocation & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-slate-600 mb-1" />
                      <div className="text-white font-bold text-sm">No passenger records match your active filters.</div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Try clearing search query or enrolling a new student or staff passenger.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => openAddModal('Student')}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                        >
                          + Enroll Student
                        </button>
                        <button
                          onClick={() => openAddModal('Staff')}
                          className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
                        >
                          + Enroll Staff
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isStaff = s.rider_type === 'Staff' || s.year_of_study === 'Faculty / Staff';
                  const isSurrendered = s.status === 'Pass Surrendered';
                  const isAllocated = !!s.allocated_vehicle && s.status === 'Active';
                  const vehicleOccupancy = s.allocated_vehicle ? vehicleOccupancyMap[s.allocated_vehicle] : null;

                  return (
                    <tr key={s.id} className={`hover:bg-slate-800/40 transition-colors group ${isSurrendered ? 'bg-purple-950/10' : ''}`}>
                      {/* Passenger & Identity */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {s.student_name}
                          {isStaff ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                              <Briefcase size={10} /> Staff
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 inline-flex items-center gap-1">
                              <GraduationCap size={10} /> Student
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">
                            {s.roll_number}
                          </span>
                          {s.contact_number && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone size={10} /> {s.contact_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Institution & Dept / Course */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{s.institution_name || 'Rathinam Campus'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {s.course || (isStaff ? 'Faculty Member' : 'Undergraduate')} {s.year_of_study && !isStaff ? `• ${s.year_of_study}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">AY {s.academic_year}</div>
                      </td>

                      {/* Assigned Bus & Route (KEY ALLOCATION COLUMN) */}
                      <td className="py-3.5 px-4">
                        {isAllocated ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                              <Bus size={14} /> {s.allocated_vehicle_number}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]" title={s.route_name}>
                              {s.route_name || 'Assigned Fleet Route'}
                            </div>
                            {vehicleOccupancy && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Bus Load: {vehicleOccupancy.active_count}/{vehicleOccupancy.capacity} Seats
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock size={12} /> Pending Bus
                            </span>
                            <button
                              onClick={() => openAllocateModal(s)}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition-all shadow-sm"
                            >
                              Assign Bus
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Boarding Points */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <MapPin size={12} className="text-amber-400 shrink-0" />
                          <span className="truncate max-w-[160px]" title={s.pickup_point}>{s.pickup_point || 'Campus Boarding Stop'}</span>
                        </div>
                        {s.drop_point && s.drop_point !== s.pickup_point && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                            Drop: {s.drop_point}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isSurrendered ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              <UserMinus size={10} /> Surrendered
                            </span>
                            {s.surrender_date && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {s.surrender_date}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            s.status === 'Pending Allocation' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {s.status || 'Active'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Allocate / Change Bus Button */}
                          <button
                            onClick={() => openAllocateModal(s)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 rounded-lg border border-slate-700 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                            title="Assign or Change Vehicle / Bus Route"
                          >
                            <Bus size={12} /> {isAllocated ? 'Change Bus' : 'Assign Bus'}
                          </button>

                          {/* Surrender / Reactivate Quick Actions */}
                          {isSurrendered ? (
                            <button
                              onClick={() => handleReactivate(s)}
                              className="p-1.5 bg-purple-900/30 hover:bg-emerald-500/20 text-purple-300 hover:text-emerald-400 rounded-lg border border-purple-500/30 transition-colors"
                              title="Reactivate Bus Pass"
                            >
                              <RotateCcw size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => openSurrenderModal(s)}
                              className="p-1.5 bg-slate-800 hover:bg-purple-500/20 text-slate-300 hover:text-purple-400 rounded-lg border border-slate-700 transition-colors"
                              title="Surrender / Discontinue Bus Pass (Preserves DB record)"
                            >
                              <UserMinus size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded-lg border border-slate-700 transition-colors"
                            title="Edit Passenger Information"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.student_name)}
                            className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg border border-slate-700 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DEDICATED QUICK BUS ALLOCATION MODAL                          */}
      {/* ------------------------------------------------------------- */}
      {showAllocateModal && allocatingStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowAllocateModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-2 text-emerald-400">
              <Bus size={24} />
              <h2 className="text-xl font-black text-white">Allocate Vehicle & Bus Route</h2>
            </div>
            
            <p className="text-xs text-slate-300 mb-5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              Assign bus route and boarding pickup stop for <strong className="text-white">{allocatingStudent.student_name}</strong> ({allocatingStudent.roll_number}) • <span className="text-amber-400">{allocatingStudent.institution_name}</span>
            </p>

            <form onSubmit={handleQuickAllocateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Select Fleet Bus / Cab *</label>
                <select
                  required
                  value={allocateForm.allocated_vehicle}
                  onChange={(e) => {
                    const vId = e.target.value;
                    const v = vehicles.find(item => String(item.id) === String(vId));
                    setAllocateForm({
                      ...allocateForm,
                      allocated_vehicle: vId,
                      route_name: allocateForm.route_name || (v ? `${v.vehicle_number} Route` : '')
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Remove Allocation (Unallocated) --</option>
                  {vehicles.map(v => {
                    const occ = vehicleOccupancyMap[v.id] || { active_count: 0, capacity: 40 };
                    const vacant = Math.max(0, occ.capacity - occ.active_count);
                    return (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} {v.cab_number ? `(${v.cab_number})` : ''} - {v.make || 'Bus'} ({vacant} seats vacant / {occ.capacity} cap)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Route Name / Destination</label>
                <input
                  type="text"
                  placeholder="e.g., Route 12 - Gandhipuram Express"
                  value={allocateForm.route_name}
                  onChange={(e) => setAllocateForm({ ...allocateForm, route_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Pickup / Boarding Stop</label>
                  <input
                    type="text"
                    placeholder="e.g., Gandhipuram Bus Stand"
                    value={allocateForm.pickup_point}
                    onChange={(e) => setAllocateForm({ ...allocateForm, pickup_point: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Drop / Return Stop</label>
                  <input
                    type="text"
                    placeholder="e.g., Gandhipuram Bus Stand"
                    value={allocateForm.drop_point}
                    onChange={(e) => setAllocateForm({ ...allocateForm, drop_point: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                >
                  Save Bus Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DEDICATED PASS SURRENDER MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {showSurrenderModal && surrenderStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowSurrenderModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-2 text-purple-400">
              <UserMinus size={24} />
              <h2 className="text-xl font-black text-white">Surrender / Discontinue Bus Pass</h2>
            </div>
            
            <p className="text-xs text-slate-300 mb-4 bg-purple-950/40 border border-purple-500/30 p-3 rounded-xl flex items-start gap-2">
              <ShieldCheck size={16} className="text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Database Retention Guarantee:</strong> All details for <strong>{surrenderStudent.student_name}</strong> ({surrenderStudent.roll_number}) will remain safely preserved in the database for yearly and multi-year reporting.
              </span>
            </p>

            <form onSubmit={handleSurrenderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Surrender / Leave Date *</label>
                <input
                  type="date"
                  required
                  value={surrenderForm.surrender_date}
                  onChange={(e) => setSurrenderForm({ ...surrenderForm, surrender_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Reason for Leaving Pass *</label>
                <select
                  required
                  value={surrenderForm.surrender_reason}
                  onChange={(e) => setSurrenderForm({ ...surrenderForm, surrender_reason: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {SURRENDER_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Fee Refund Issued (₹)</label>
                <input
                  type="number"
                  step="100"
                  placeholder="0"
                  value={surrenderForm.refund_amount}
                  onChange={(e) => setSurrenderForm({ ...surrenderForm, refund_amount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Administrative Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes regarding reason, parent acknowledgment, or pass return..."
                  value={surrenderForm.remarks}
                  onChange={(e) => setSurrenderForm({ ...surrenderForm, remarks: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSurrenderModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
                >
                  Confirm Pass Surrender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ENROLL / EDIT STUDENT & STAFF MODAL                           */}
      {/* ------------------------------------------------------------- */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-amber-400">
                <UserPlus size={22} />
                <h2 className="text-xl font-black text-white">
                  {editingStudent ? `Edit ${formData.rider_type} Record` : `Enroll New ${formData.rider_type} Rider`}
                </h2>
              </div>

              {/* Rider Type Toggle inside Modal */}
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, rider_type: 'Student', year_of_study: '1st Year' })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    formData.rider_type === 'Student'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap size={13} /> Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, rider_type: 'Staff', year_of_study: 'Faculty / Staff' })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    formData.rider_type === 'Staff'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Briefcase size={13} /> Staff / Faculty
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Row 1: Roll/Staff No & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    {formData.rider_type === 'Staff' ? 'Staff ID / Employee Number *' : 'Roll / Register Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.rider_type === 'Staff' ? 'e.g., EMP-2024-102' : 'e.g., 721721104001'}
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    {formData.rider_type === 'Staff' ? 'Staff Full Name *' : 'Student Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Dr. Ramesh Kumar / Aakash V"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 2: Institution & Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Institution / Campus *</label>
                  <select
                    required
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="" disabled>Select Institution</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Academic Year *</label>
                  <select
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {ACADEMIC_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Course/Dept & Year of Study */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    {formData.rider_type === 'Staff' ? 'Department & Designation' : 'Course / Department'}
                  </label>
                  <input
                    type="text"
                    placeholder={formData.rider_type === 'Staff' ? 'e.g., Dept of Computer Science - Professor' : 'e.g., B.Tech Artificial Intelligence & DS'}
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Year of Study / Category</label>
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({ ...formData, year_of_study: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {STUDY_YEARS.filter(y => y !== 'All Years').map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Header: Route Allocation */}
              <div className="pt-2">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-3">
                  🚌 Route & Fleet Bus Allocation
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Allocated Vehicle (Bus / Cab) {formData.institution ? `(${modalVehicles.length} available)` : ''}
                  </label>
                  <select
                    value={formData.allocated_vehicle}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const selectedV = vehicles.find(v => String(v.id) === String(vId));
                      setFormData({ 
                        ...formData, 
                        allocated_vehicle: vId,
                        route_name: formData.route_name || (selectedV ? `${selectedV.vehicle_number} Route` : '')
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- No Vehicle (Pending Allocation) --</option>
                    {modalVehicles.map(v => {
                      const occ = vehicleOccupancyMap[v.id] || { active_count: 0, capacity: 40 };
                      const vacant = Math.max(0, occ.capacity - occ.active_count);
                      return (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_number} {v.cab_number ? `(${v.cab_number})` : ''} - {v.make || 'Bus'} ({vacant} seats vacant / {occ.capacity} cap)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Route Name / Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Route 1 - Gandhipuram Express"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Pickup / Boarding Stop</label>
                  <input
                    type="text"
                    placeholder="e.g., Gandhipuram Bus Stand"
                    value={formData.pickup_point}
                    onChange={(e) => setFormData({ ...formData, pickup_point: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Drop / Return Stop</label>
                  <input
                    type="text"
                    placeholder="e.g., Gandhipuram Bus Stand"
                    value={formData.drop_point}
                    onChange={(e) => setFormData({ ...formData, drop_point: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Section Header: Fee Structure */}
              <div className="pt-2">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-3">
                  💰 Transport Fee Structure (Optional for Staff)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Annual Fee Demand (₹)</label>
                  <input
                    type="number"
                    step="100"
                    value={formData.fee_demand}
                    onChange={(e) => setFormData({ ...formData, fee_demand: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Concession / Discount (₹)</label>
                  <input
                    type="number"
                    step="100"
                    value={formData.fee_discount}
                    onChange={(e) => setFormData({ ...formData, fee_discount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="100"
                    value={formData.fee_paid}
                    onChange={(e) => setFormData({ ...formData, fee_paid: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 4: Contacts & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Contact Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g., 9876543210"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Emergency / Alternate Contact</label>
                  <input
                    type="text"
                    placeholder="e.g., 9876543211"
                    value={formData.parent_contact}
                    onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">Rider Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {STATUSES.filter(s => s !== 'All Statuses').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                >
                  {editingStudent ? 'Update Passenger Record' : 'Save Passenger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

