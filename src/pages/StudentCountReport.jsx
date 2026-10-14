import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, Bus, Building2, Download, RefreshCw, Filter,
  CheckCircle2, AlertCircle, Clock, MapPin, GraduationCap,
  Layers, DollarSign, Search, FileSpreadsheet, ArrowUpRight, X,
  UserMinus, Calendar, History, ShieldCheck, Info, UserCheck, UserX,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Phone, Briefcase
} from 'lucide-react';

const ACADEMIC_YEARS = ['2025-2026', '2026-2027', '2024-2025'];
const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG / Masters', 'Schooling'];
const CHART_COLORS = ['#10B981', '#F59E0B', '#F43F5E', '#A855F7', '#3B82F6', '#06B6D4', '#EC4899'];

export default function StudentCountReport() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab: 'report' | 'students'
  const [activeTab, setActiveTab] = useState('report');

  // Global Filters
  const [selectedInst, setSelectedInst] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [studentStudyYearFilter, setStudentStudyYearFilter] = useState('ALL');
  const [studentRiderTypeFilter, setStudentRiderTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Read-only Student Profile Modal
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  // Student Directory Table Pagination
  const [studentPageSize, setStudentPageSize] = useState(10);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);

  // Table Dedicated Search & Quick Filter
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('ALL'); // 'ALL' | 'DUE' | 'ALL_PAID' | 'HIGH_OCCUPANCY' | 'VACANT' | 'UNALLOCATED'

  // Bus Route Table Pagination (Page sizes: 5, 10, 15, 20, 25, 'ALL')
  const [busPageSize, setBusPageSize] = useState(10);
  const [busCurrentPage, setBusCurrentPage] = useState(1);

  // Surrender Audit Search & Reason Filter & Pagination
  const [surrenderSearch, setSurrenderSearch] = useState('');
  const [surrenderReasonFilter, setSurrenderReasonFilter] = useState('ALL');
  const [surrenderPageSize, setSurrenderPageSize] = useState(10);
  const [surrenderCurrentPage, setSurrenderCurrentPage] = useState(1);

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
      console.error('Failed to load student count report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedInst !== 'ALL' && String(s.institution) !== String(selectedInst)) return false;
      if (selectedYear !== 'ALL' && s.academic_year !== selectedYear) return false;
      if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;
      if (selectedVehicle !== 'ALL') {
        if (selectedVehicle === 'unallocated' && s.allocated_vehicle) return false;
        if (selectedVehicle !== 'unallocated' && String(s.allocated_vehicle) !== String(selectedVehicle)) return false;
      }
      
      // Fee Payment Status Filter
      if (selectedFeeStatus !== 'ALL') {
        const netDemand = Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0));
        const paid = parseFloat(s.fee_paid) || 0;
        const due = Math.max(0, netDemand - paid);

        if (selectedFeeStatus === 'UNPAID') {
          if (paid > 0 || netDemand <= 0) return false;
        } else if (selectedFeeStatus === 'PARTIAL') {
          if (paid <= 0 || due <= 0) return false;
        } else if (selectedFeeStatus === 'PAID') {
          if (due > 0 || paid <= 0) return false;
        } else if (selectedFeeStatus === 'ANY_PAID') {
          if (paid <= 0) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.student_name?.toLowerCase().includes(q);
        const matchRoll = s.roll_number?.toLowerCase().includes(q);
        const matchCourse = s.course?.toLowerCase().includes(q);
        const matchPoint = s.pickup_point?.toLowerCase().includes(q);
        const matchRoute = s.route_name?.toLowerCase().includes(q);
        const matchReason = s.surrender_reason?.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchCourse && !matchPoint && !matchRoute && !matchReason) return false;
      }

      return true;
    });
  }, [students, selectedInst, selectedYear, selectedStatusFilter, selectedVehicle, selectedFeeStatus, searchQuery]);

  // Overall Headcount & Financial KPIs with Detailed Paid & Unpaid Counts
  const kpis = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const activeCount = filteredStudents.filter(s => s.status === 'Active').length;
    const surrenderedCount = filteredStudents.filter(s => s.status === 'Pass Surrendered').length;
    const allocatedCount = filteredStudents.filter(s => !!s.allocated_vehicle && s.status === 'Active').length;
    const unallocatedCount = activeCount - allocatedCount;
    const pendingStatusCount = filteredStudents.filter(s => s.status === 'Pending Allocation').length;

    // Financial & Payment Headcounts
    let fullyPaidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let zeroDemandCount = 0;

    let totalDemand = 0;
    let totalPaid = 0;
    let totalRefund = 0;

    filteredStudents.forEach(s => {
      const demand = Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0));
      const paid = parseFloat(s.fee_paid) || 0;
      const refund = parseFloat(s.refund_amount) || 0;
      const due = Math.max(0, demand - paid);

      totalDemand += demand;
      totalPaid += paid;
      totalRefund += refund;

      if (demand === 0) {
        zeroDemandCount += 1;
      } else if (due <= 0 && paid > 0) {
        fullyPaidCount += 1;
      } else if (paid > 0 && due > 0) {
        partialCount += 1;
      } else if (paid === 0 && demand > 0) {
        unpaidCount += 1;
      }
    });

    const paidCount = fullyPaidCount + partialCount; // All students who have paid any amount
    const totalDue = Math.max(0, totalDemand - totalPaid);

    // Total fleet capacity across matching vehicles
    const matchedVehicles = vehicles.filter(v => {
      if (selectedInst !== 'ALL' && String(v.institution) !== String(selectedInst)) return false;
      return true;
    });
    const totalCapacity = matchedVehicles.reduce((sum, v) => sum + (v.seating_capacity || 40), 0);
    const overallOccupancy = totalCapacity > 0 ? Math.round((allocatedCount / totalCapacity) * 100) : 0;
    const collectionRate = totalDemand > 0 ? Math.round((totalPaid / totalDemand) * 100) : 100;
    const allocationRate = activeCount > 0 ? Math.round((allocatedCount / activeCount) * 100) : 0;
    const surrenderRate = totalStudents > 0 ? Math.round((surrenderedCount / totalStudents) * 100) : 0;
    const paidStudentRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
    const unpaidStudentRate = totalStudents > 0 ? Math.round((unpaidCount / totalStudents) * 100) : 0;
    const fullyPaidRate = totalStudents > 0 ? Math.round((fullyPaidCount / totalStudents) * 100) : 0;

    return {
      totalStudents,
      activeCount,
      surrenderedCount,
      surrenderRate,
      allocatedCount,
      unallocatedCount,
      pendingStatusCount,
      paidCount,
      fullyPaidCount,
      partialCount,
      unpaidCount,
      zeroDemandCount,
      paidStudentRate,
      unpaidStudentRate,
      fullyPaidRate,
      totalCapacity,
      overallOccupancy,
      totalDemand,
      totalPaid,
      totalRefund,
      netCollected: Math.max(0, totalPaid - totalRefund),
      totalDue,
      collectionRate,
      allocationRate,
      activeVehicleCount: matchedVehicles.length
    };
  }, [filteredStudents, vehicles, selectedInst]);

  // -------------------------------------------------------------
  // BUS-BY-BUS CONSOLIDATED ROUTE & FEE AUDIT DATA
  // -------------------------------------------------------------
  const busReportData = useMemo(() => {
    const map = {};

    vehicles.forEach(v => {
      if (selectedInst !== 'ALL' && String(v.institution) !== String(selectedInst)) return;
      const instObj = institutions.find(i => i.id === v.institution);
      map[v.id] = {
        vehicle_id: v.id,
        vehicle_number: v.vehicle_number,
        cab_number: v.cab_number || '',
        institution_name: instObj?.name || 'Rathinam Campus',
        seating_capacity: v.seating_capacity || 40,
        make: v.make || 'Bus',
        model: v.model || '',
        total_students: 0,
        active_count: 0,
        surrendered_count: 0,
        pending_count: 0,
        inactive_count: 0,
        paid_student_count: 0,
        fully_paid_count: 0,
        partial_student_count: 0,
        unpaid_student_count: 0,
        fee_demand: 0,
        fee_discount: 0,
        fee_paid: 0,
        fee_refund: 0,
        fee_due: 0,
        yearCounts: { '1st Year': 0, '2nd Year': 0, '3rd Year': 0, '4th Year': 0, 'PG / Masters': 0, 'Schooling': 0, 'Faculty / Staff': 0 },
        routes: new Set(),
        stops: new Set()
      };
    });

    // Unallocated Students Bucket
    const unallocated = {
      vehicle_id: 'unallocated',
      vehicle_number: 'Unallocated Students',
      cab_number: 'Pending Bus Route',
      institution_name: 'Pending Assignment',
      seating_capacity: 0,
      make: 'N/A',
      model: '',
      total_students: 0,
      active_count: 0,
      surrendered_count: 0,
      pending_count: 0,
      inactive_count: 0,
      paid_student_count: 0,
      fully_paid_count: 0,
      partial_student_count: 0,
      unpaid_student_count: 0,
      fee_demand: 0,
      fee_discount: 0,
      fee_paid: 0,
      fee_refund: 0,
      fee_due: 0,
      yearCounts: { '1st Year': 0, '2nd Year': 0, '3rd Year': 0, '4th Year': 0, 'PG / Masters': 0, 'Schooling': 0, 'Faculty / Staff': 0 },
      routes: new Set(['Awaiting Route']),
      stops: new Set()
    };

    filteredStudents.forEach(s => {
      const vId = s.allocated_vehicle;
      const target = vId && map[vId] ? map[vId] : unallocated;

      target.total_students += 1;
      if (s.status === 'Active') target.active_count += 1;
      else if (s.status === 'Pass Surrendered') target.surrendered_count += 1;
      else if (s.status === 'Pending Allocation') target.pending_count += 1;
      else target.inactive_count += 1;

      const demand = parseFloat(s.fee_demand || 0);
      const discount = parseFloat(s.fee_discount || 0);
      const paid = parseFloat(s.fee_paid) || 0;
      const refund = parseFloat(s.refund_amount || 0);
      const net = Math.max(0, demand - discount);
      const due = Math.max(0, net - paid);

      target.fee_demand += net;
      target.fee_discount += discount;
      target.fee_paid += paid;
      target.fee_refund += refund;
      target.fee_due += due;

      // Fee Student Headcounts per bus
      if (net > 0) {
        if (due <= 0 && paid > 0) {
          target.fully_paid_count += 1;
          target.paid_student_count += 1;
        } else if (paid > 0 && due > 0) {
          target.partial_student_count += 1;
          target.paid_student_count += 1;
        } else if (paid === 0) {
          target.unpaid_student_count += 1;
        }
      }

      const yr = s.year_of_study || '1st Year';
      if (target.yearCounts[yr] !== undefined) {
        target.yearCounts[yr] += 1;
      }

      if (s.route_name) target.routes.add(s.route_name);
      if (s.pickup_point) target.stops.add(s.pickup_point);
    });

    const list = Object.values(map);
    if (unallocated.total_students > 0) {
      list.push(unallocated);
    }

    return list.map(b => {
      const vacant = Math.max(0, b.seating_capacity - b.active_count);
      const occupancy = b.seating_capacity > 0 ? Math.round((b.active_count / b.seating_capacity) * 100) : 0;
      const collection = b.fee_demand > 0 ? Math.round((b.fee_paid / b.fee_demand) * 100) : 100;
      return {
        ...b,
        vacant_seats: vacant,
        occupancy_rate: occupancy,
        collection_rate: collection,
        routes_display: Array.from(b.routes).join(', ') || 'Campus Route',
        stops_count: b.stops.size
      };
    });
  }, [vehicles, institutions, filteredStudents, selectedInst]);

  // Filtered Bus Report Data
  const filteredBusReportData = useMemo(() => {
    return busReportData.filter(b => {
      if (tableFilter === 'DUE' && b.unpaid_student_count <= 0 && b.fee_due <= 0) return false;
      if (tableFilter === 'ALL_PAID' && (b.unpaid_student_count > 0 || b.fee_due > 0 || b.total_students === 0)) return false;
      if (tableFilter === 'HIGH_OCCUPANCY' && b.occupancy_rate < 80) return false;
      if (tableFilter === 'VACANT' && (b.vacant_seats <= 0 || b.vehicle_id === 'unallocated')) return false;
      if (tableFilter === 'UNALLOCATED' && b.vehicle_id !== 'unallocated') return false;

      const q = tableSearch.trim().toLowerCase();
      if (q) {
        const matchVehicle = b.vehicle_number?.toLowerCase().includes(q);
        const matchCab = String(b.cab_number || '').toLowerCase().includes(q);
        const matchInst = b.institution_name?.toLowerCase().includes(q);
        const matchRoute = b.routes_display?.toLowerCase().includes(q);
        const matchMake = b.make?.toLowerCase().includes(q);
        const matchStops = Array.from(b.stops || []).some(stop => stop.toLowerCase().includes(q));

        if (!matchVehicle && !matchCab && !matchInst && !matchRoute && !matchMake && !matchStops) {
          return false;
        }
      }

      return true;
    });
  }, [busReportData, tableFilter, tableSearch]);

  // Quick Filter Counts for chips
  const quickCounts = useMemo(() => {
    return {
      all: busReportData.length,
      withDue: busReportData.filter(b => b.unpaid_student_count > 0 || b.fee_due > 0).length,
      allPaid: busReportData.filter(b => b.total_students > 0 && b.unpaid_student_count === 0 && b.fee_due === 0).length,
      highOccupancy: busReportData.filter(b => b.occupancy_rate >= 80).length,
      vacant: busReportData.filter(b => b.vacant_seats > 0 && b.vehicle_id !== 'unallocated').length,
      unallocated: busReportData.filter(b => b.vehicle_id === 'unallocated').length
    };
  }, [busReportData]);

  // Bus Route Table Pagination Calculations (5, 10, 15, 20, 25, ALL)
  const totalBusRoutes = filteredBusReportData.length;
  const effectiveBusPageSize = busPageSize === 'ALL' ? (totalBusRoutes || 1) : Number(busPageSize);
  const totalBusPages = Math.max(1, Math.ceil(totalBusRoutes / effectiveBusPageSize));
  const validBusCurrentPage = Math.min(Math.max(1, busCurrentPage), totalBusPages);

  const paginatedBusReportData = useMemo(() => {
    if (busPageSize === 'ALL') return filteredBusReportData;
    const start = (validBusCurrentPage - 1) * effectiveBusPageSize;
    return filteredBusReportData.slice(start, start + effectiveBusPageSize);
  }, [filteredBusReportData, validBusCurrentPage, effectiveBusPageSize, busPageSize]);

  useEffect(() => {
    setBusCurrentPage(1);
  }, [tableSearch, tableFilter, selectedInst, selectedYear, selectedVehicle, selectedFeeStatus, selectedStatusFilter, busPageSize]);

  // -------------------------------------------------------------
  // PASS SURRENDER & DISCONTINUATION AUDIT DATA
  // -------------------------------------------------------------
  const surrenderedStudents = useMemo(() => {
    return filteredStudents.filter(s => s.status === 'Pass Surrendered');
  }, [filteredStudents]);

  const filteredSurrenderedStudents = useMemo(() => {
    return surrenderedStudents.filter(s => {
      if (surrenderReasonFilter !== 'ALL' && s.surrender_reason !== surrenderReasonFilter) return false;
      if (surrenderSearch.trim()) {
        const q = surrenderSearch.toLowerCase();
        const matchName = s.student_name?.toLowerCase().includes(q);
        const matchRoll = s.roll_number?.toLowerCase().includes(q);
        const matchCourse = s.course?.toLowerCase().includes(q);
        const matchReason = s.surrender_reason?.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchCourse && !matchReason) return false;
      }
      return true;
    });
  }, [surrenderedStudents, surrenderReasonFilter, surrenderSearch]);

  // Surrendered Passes Pagination Calculations (5, 10, 15, 20, 25, ALL)
  const totalSurrendered = filteredSurrenderedStudents.length;
  const effectiveSurrenderPageSize = surrenderPageSize === 'ALL' ? (totalSurrendered || 1) : Number(surrenderPageSize);
  const totalSurrenderPages = Math.max(1, Math.ceil(totalSurrendered / effectiveSurrenderPageSize));
  const validSurrenderCurrentPage = Math.min(Math.max(1, surrenderCurrentPage), totalSurrenderPages);

  const paginatedSurrenderedStudents = useMemo(() => {
    if (surrenderPageSize === 'ALL') return filteredSurrenderedStudents;
    const start = (validSurrenderCurrentPage - 1) * effectiveSurrenderPageSize;
    return filteredSurrenderedStudents.slice(start, start + effectiveSurrenderPageSize);
  }, [filteredSurrenderedStudents, validSurrenderCurrentPage, effectiveSurrenderPageSize, surrenderPageSize]);

  useEffect(() => {
    setSurrenderCurrentPage(1);
  }, [surrenderSearch, surrenderReasonFilter, selectedInst, selectedYear, selectedVehicle, surrenderPageSize]);

  // Surrender Reasons Breakdown Chart Data
  const surrenderReasonsData = useMemo(() => {
    const map = {};
    surrenderedStudents.forEach(s => {
      const r = s.surrender_reason?.trim() || 'Other / Unspecified';
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [surrenderedStudents]);

  // Chart 1: Seating Capacity vs Occupied / Full vs Vacant Seats per Bus
  const busSeatOccupancyChartData = useMemo(() => {
    return busReportData
      .filter(b => b.vehicle_id !== 'unallocated')
      .slice(0, 10)
      .map(b => ({
        bus: b.cab_number ? `${b.cab_number}` : b.vehicle_number.slice(-8),
        "Total Seats": b.seating_capacity,
        "Occupied / Full": b.active_count,
        "Vacant Seats": b.vacant_seats,
        "Occupancy Rate": `${b.occupancy_rate}%`
      }));
  }, [busReportData]);

  // Chart 2: Bus Route Occupancy Rate (%) & Full Status
  const busOccupancyRateChartData = useMemo(() => {
    return busReportData
      .filter(b => b.vehicle_id !== 'unallocated')
      .slice(0, 10)
      .map(b => ({
        bus: b.cab_number ? `${b.cab_number}` : b.vehicle_number.slice(-8),
        "Occupancy %": b.occupancy_rate,
        "Status": b.occupancy_rate >= 100 ? 'Full Seat' : b.occupancy_rate >= 80 ? 'High' : 'Available',
        "Allocated": `${b.active_count} / ${b.seating_capacity} Seats`
      }));
  }, [busReportData]);

  // Chart 3: Fleet Bus Full / Vacant Seat Status Distribution (Donut Chart)
  const seatStatusDonutData = useMemo(() => {
    const validBuses = busReportData.filter(b => b.vehicle_id !== 'unallocated');
    const fullCount = validBuses.filter(b => b.occupancy_rate >= 100).length;
    const highCount = validBuses.filter(b => b.occupancy_rate >= 80 && b.occupancy_rate < 100).length;
    const moderateCount = validBuses.filter(b => b.occupancy_rate >= 50 && b.occupancy_rate < 80).length;
    const lowCount = validBuses.filter(b => b.occupancy_rate > 0 && b.occupancy_rate < 50).length;
    const vacantCount = validBuses.filter(b => b.occupancy_rate === 0).length;

    return [
      { name: 'Full Seat (100%+)', count: fullCount, color: '#EF4444' },
      { name: 'High Load (80-99%)', count: highCount, color: '#F59E0B' },
      { name: 'Moderate (50-79%)', count: moderateCount, color: '#10B981' },
      { name: 'Low (<50%)', count: lowCount, color: '#3B82F6' },
      { name: 'Vacant (0%)', count: vacantCount, color: '#64748B' }
    ].filter(d => d.count > 0);
  }, [busReportData]);

  // Institution / Company Headcount & Seating Capacity Aggregation
  const instHeadcounts = useMemo(() => {
    return institutions.map(inst => {
      const instStudents = students.filter(s => {
        if (selectedYear !== 'ALL' && s.academic_year !== selectedYear) return false;
        return String(s.institution) === String(inst.id);
      });
      const total = instStudents.length;
      const active = instStudents.filter(s => s.status === 'Active').length;
      const surrendered = instStudents.filter(s => s.status === 'Pass Surrendered').length;
      const allocated = instStudents.filter(s => !!s.allocated_vehicle && s.status === 'Active').length;
      const unallocated = active - allocated;

      // Match vehicles by institution ID or allocated students
      const instVehicles = vehicles.filter(v => String(v.institution) === String(inst.id));
      const busCount = instVehicles.length;
      const totalCapacity = instVehicles.reduce((sum, v) => sum + (v.seating_capacity || 40), 0);
      const filledSeats = allocated;
      const availableSeats = Math.max(0, totalCapacity - filledSeats);
      const occupancyRate = totalCapacity > 0 ? Math.round((filledSeats / totalCapacity) * 100) : 0;

      const paidCount = instStudents.filter(s => {
        const demand = Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0));
        const paid = parseFloat(s.fee_paid) || 0;
        return paid > 0;
      }).length;

      const unpaidCount = instStudents.filter(s => {
        const demand = Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0));
        const paid = parseFloat(s.fee_paid) || 0;
        return paid === 0 && demand > 0;
      }).length;

      const demand = instStudents.reduce((sum, s) => sum + Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0)), 0);
      const paid = instStudents.reduce((sum, s) => sum + (parseFloat(s.fee_paid) || 0), 0);
      const collectionRate = demand > 0 ? Math.round((paid / demand) * 100) : 100;

      return {
        institution_id: inst.id,
        name: inst.name,
        total_students: total,
        active_count: active,
        surrendered_count: surrendered,
        allocated_count: allocated,
        unallocated_count: unallocated,
        paid_count: paidCount,
        unpaid_count: unpaidCount,
        collection_rate: collectionRate,
        allocation_rate: active > 0 ? Math.round((allocated / active) * 100) : 0,
        bus_count: busCount,
        total_capacity: totalCapacity,
        filled_seats: filledSeats,
        available_seats: availableSeats,
        occupancy_rate: occupancyRate
      };
    });
  }, [institutions, students, vehicles, selectedYear]);

  // Combined stats across all campuses
  const combinedCampusStats = useMemo(() => {
    const totalBuses = vehicles.length;
    const totalCapacity = vehicles.reduce((sum, v) => sum + (v.seating_capacity || 40), 0);
    const activeStudents = students.filter(s => {
      if (selectedYear !== 'ALL' && s.academic_year !== selectedYear) return false;
      return s.status === 'Active';
    });
    const filledSeats = activeStudents.filter(s => !!s.allocated_vehicle).length;
    const availableSeats = Math.max(0, totalCapacity - filledSeats);
    const occupancyRate = totalCapacity > 0 ? Math.round((filledSeats / totalCapacity) * 100) : 0;

    return {
      totalBuses,
      totalCapacity,
      filledSeats,
      availableSeats,
      occupancyRate,
      activeCount: activeStudents.length
    };
  }, [vehicles, students, selectedYear]);

  // Boarding Point Top Stops Headcount
  const stopHeadcounts = useMemo(() => {
    const stopsMap = {};
    filteredStudents.filter(s => s.status === 'Active').forEach(s => {
      const pt = s.pickup_point?.trim() || 'Campus Gate';
      stopsMap[pt] = (stopsMap[pt] || 0) + 1;
    });

    return Object.entries(stopsMap)
      .map(([stop, count]) => ({ stop, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredStudents]);

  // Export Consolidated Bus Report CSV
  const exportBusReportCSV = () => {
    let csv = 'Bus / Cab Number,Route / Make,Institution,Seating Capacity,Active Students,Surrendered Passes,Fees Paid Count,Fully Paid Count,Partial Due Count,Unpaid Count,Vacant Seats,Occupancy Rate,Total Fee Demand (INR),Fee Collected (INR),Fee Refunded (INR),Outstanding Balance (INR),Collection Rate,1st Year,2nd Year,3rd Year,4th Year,PG,Schooling,Faculty / Staff\n';
    filteredBusReportData.forEach(b => {
      csv += `"${b.vehicle_number} ${b.cab_number ? `(${b.cab_number})` : ''}","${b.routes_display}","${b.institution_name}",${b.seating_capacity},${b.active_count},${b.surrendered_count},${b.paid_student_count},${b.fully_paid_count},${b.partial_student_count},${b.unpaid_student_count},${b.vacant_seats},"${b.occupancy_rate}%",${b.fee_demand},${b.fee_paid},${b.fee_refund},${b.fee_due},"${b.collection_rate}%",${b.yearCounts['1st Year']},${b.yearCounts['2nd Year']},${b.yearCounts['3rd Year']},${b.yearCounts['4th Year']},${b.yearCounts['PG / Masters']},${b.yearCounts['Schooling']},${b.yearCounts['Faculty / Staff']}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Consolidated_Bus_Route_and_Fee_Audit_${selectedYear}.csv`;
    a.click();
  };

  // Export Surrendered Passes Historical CSV
  const exportSurrenderReportCSV = () => {
    let csv = 'Roll Number,Student Name,Institution,Academic Year,Department / Course,Year of Study,Previously Assigned Bus,Route Name,Surrender Date,Reason for Leaving,Fee Paid (INR),Refund Issued (INR),Net Retained (INR),Remarks,Contact Number,Parent Contact\n';
    filteredSurrenderedStudents.forEach(s => {
      const paid = parseFloat(s.fee_paid || 0);
      const refund = parseFloat(s.refund_amount || 0);
      const net = Math.max(0, paid - refund);
      csv += `"${s.roll_number}","${s.student_name}","${s.institution_name || ''}","${s.academic_year || ''}","${s.course || ''}","${s.year_of_study || ''}","${s.allocated_vehicle_number || 'Unallocated'}","${s.route_name || ''}","${s.surrender_date || ''}","${s.surrender_reason || ''}",${paid},${refund},${net},"${(s.remarks || '').replace(/"/g, '""')}","${s.contact_number || ''}","${s.parent_contact || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pass_Surrender_and_Historical_Audit_${selectedYear}.csv`;
    a.click();
  };

  // Export Headcount CSV
  const exportHeadcountCSV = () => {
    let csv = 'Bus / Cab Number,Route Name,Institution,Seating Capacity,Active Student Count,Fees Paid Students,Unpaid Students,Surrendered Passes,Vacant Seats,Occupancy Rate,1st Year,2nd Year,3rd Year,4th Year,PG,Schooling,Faculty / Staff,Pending Allocation,Inactive\n';
    filteredBusReportData.forEach(b => {
      csv += `"${b.vehicle_number} ${b.cab_number ? `(${b.cab_number})` : ''}","${b.routes_display}","${b.institution_name}",${b.seating_capacity},${b.active_count},${b.paid_student_count},${b.unpaid_student_count},${b.surrendered_count},${b.vacant_seats},"${b.occupancy_rate}%",${b.yearCounts['1st Year']},${b.yearCounts['2nd Year']},${b.yearCounts['3rd Year']},${b.yearCounts['4th Year']},${b.yearCounts['PG / Masters']},${b.yearCounts['Schooling']},${b.yearCounts['Faculty / Staff']},${b.pending_count},${b.inactive_count}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Headcount_Report_${selectedYear}.csv`;
    a.click();
  };

  // -------------------------------------------------------------
  // ALL STUDENTS DIRECTORY & RIDERSHIP AUDIT (READ-ONLY REPORT)
  // -------------------------------------------------------------
  const filteredStudentRecords = useMemo(() => {
    return students.filter(s => {
      // Campus
      if (selectedInst !== 'ALL' && String(s.institution) !== String(selectedInst)) return false;
      // Academic Year
      if (selectedYear !== 'ALL' && s.academic_year !== selectedYear) return false;
      // Bus Route
      if (selectedVehicle !== 'ALL') {
        if (selectedVehicle === 'unallocated') {
          if (s.allocated_vehicle) return false;
        } else if (String(s.allocated_vehicle) !== String(selectedVehicle)) {
          return false;
        }
      }
      // Status
      if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;
      // Rider Type
      if (studentRiderTypeFilter !== 'ALL' && s.rider_type !== studentRiderTypeFilter) return false;
      // Study Year
      if (studentStudyYearFilter !== 'ALL' && s.year_of_study !== studentStudyYearFilter) return false;

      // Fee Status
      if (selectedFeeStatus !== 'ALL') {
        const demand = Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0));
        const paid = parseFloat(s.fee_paid) || 0;
        const due = Math.max(0, demand - paid);
        if (selectedFeeStatus === 'PAID' && (due > 0 || demand === 0)) return false;
        if (selectedFeeStatus === 'ANY_PAID' && paid <= 0) return false;
        if (selectedFeeStatus === 'PARTIAL' && (paid <= 0 || due <= 0)) return false;
        if (selectedFeeStatus === 'UNPAID' && (paid > 0 || demand === 0)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.student_name?.toLowerCase().includes(q);
        const matchRoll = s.roll_number?.toLowerCase().includes(q);
        const matchCourse = s.course?.toLowerCase().includes(q);
        const matchRoute = s.route_name?.toLowerCase().includes(q);
        const matchPickup = s.pickup_point?.toLowerCase().includes(q);
        const matchBus = s.allocated_vehicle_number?.toLowerCase().includes(q);
        const matchCab = s.allocated_cab_number?.toLowerCase().includes(q);
        const matchPhone = s.contact_number?.includes(q) || s.parent_contact?.includes(q);
        if (!matchName && !matchRoll && !matchCourse && !matchRoute && !matchPickup && !matchBus && !matchCab && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedInst, selectedYear, selectedVehicle, selectedStatusFilter, selectedFeeStatus, studentRiderTypeFilter, studentStudyYearFilter, searchQuery]);

  const totalStudentsCount = filteredStudentRecords.length;
  const effectiveStudentPageSize = studentPageSize === 'ALL' ? (totalStudentsCount || 1) : Number(studentPageSize);
  const totalStudentPages = Math.max(1, Math.ceil(totalStudentsCount / effectiveStudentPageSize));
  const validStudentCurrentPage = Math.min(Math.max(1, studentCurrentPage), totalStudentPages);

  const paginatedStudentRecords = useMemo(() => {
    if (studentPageSize === 'ALL') return filteredStudentRecords;
    const start = (validStudentCurrentPage - 1) * effectiveStudentPageSize;
    return filteredStudentRecords.slice(start, start + effectiveStudentPageSize);
  }, [filteredStudentRecords, validStudentCurrentPage, effectiveStudentPageSize, studentPageSize]);

  useEffect(() => {
    setStudentCurrentPage(1);
  }, [searchQuery, selectedInst, selectedYear, selectedVehicle, selectedFeeStatus, selectedStatusFilter, studentRiderTypeFilter, studentStudyYearFilter, studentPageSize]);

  // Export Complete Student Directory CSV
  const exportStudentListCSV = () => {
    let csv = 'Roll / Staff ID,Name,Rider Type,Institution / Campus,Course,Study Year,Academic Year,Allocated Bus,Cab No,Route Name,Pickup Point,Drop Point,Pass Status,Fee Demand (INR),Fee Discount (INR),Fee Paid (INR),Fee Due (INR),Payment Status,Contact Number,Parent Contact,Surrender Date,Surrender Reason,Refund Issued (INR),Remarks\n';
    filteredStudentRecords.forEach(s => {
      const demand = parseFloat(s.fee_demand || 0);
      const discount = parseFloat(s.fee_discount || 0);
      const netDemand = Math.max(0, demand - discount);
      const paid = parseFloat(s.fee_paid || 0);
      const due = Math.max(0, netDemand - paid);
      const payStatus = due === 0 && netDemand > 0 ? 'Fully Paid' : paid > 0 ? 'Partial Due' : 'Unpaid';
      csv += `"${s.roll_number || ''}","${s.student_name || ''}","${s.rider_type || 'Student'}","${s.institution_name || ''}","${s.course || ''}","${s.year_of_study || ''}","${s.academic_year || ''}","${s.allocated_vehicle_number || 'Unallocated'}","${s.allocated_cab_number || ''}","${s.route_name || ''}","${s.pickup_point || ''}","${s.drop_point || ''}","${s.status || 'Active'}",${demand},${discount},${paid},${due},"${payStatus}","${s.contact_number || ''}","${s.parent_contact || ''}","${s.surrender_date || ''}","${s.surrender_reason || ''}",${s.refund_amount || 0},"${(s.remarks || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Transport_Directory_${selectedYear}.csv`;
    a.click();
  };

  const fmtINR = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

  const tooltipStyle = {
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 8,
    fontSize: 12,
    color: '#F9FAFB'
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in text-slate-100 font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* EXECUTIVE HEADER WITH UNIFIED EXPORT TOOLBAR                  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Transport Department
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Ridership Audit & Fee Recovery
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FileSpreadsheet size={30} className="text-cyan-400" />
            Student Transport & Bus Fee Reports
          </h1>
        </div>

        {/* Action & Export Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all hover:text-white shadow-sm"
            title="Refresh Report Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>

          {activeTab === 'students' ? (
            <button
              onClick={exportStudentListCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
              title="Export Full Student Directory to CSV"
            >
              <Users size={15} />
              Export Student Directory CSV
            </button>
          ) : (
            <button
              onClick={exportBusReportCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              title="Export Consolidated Bus Route & Fee Audit Table to CSV"
            >
              <FileSpreadsheet size={15} />
              Export Bus Report CSV
            </button>
          )}

          <button
            onClick={exportHeadcountCSV}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-cyan-400 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-cyan-500/30 transition-all shadow-sm"
            title="Export Headcount Report to CSV"
          >
            <Download size={14} />
            Headcount CSV
          </button>

          <button
            onClick={exportSurrenderReportCSV}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-purple-400 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-purple-500/30 transition-all shadow-sm"
            title="Export Surrendered Passes Historical Audit Table to CSV"
          >
            <UserMinus size={14} />
            Surrender CSV
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL NAVIGATION & FILTER CONTROLS BAR                       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        
        {/* Row 1: Pill Switcher & Global Search */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          {/* Sleek Pill Tab Switcher: [ STUDENT LIST | REPORT VIEW ] */}
          <div className="bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-2xl inline-flex items-center backdrop-blur-md shadow-lg shrink-0 gap-1">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users size={14} className={activeTab === 'students' ? 'text-white' : 'text-slate-400'} />
              <span>Student List</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'students' ? 'bg-white/20 text-white font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {totalStudentsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'report'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileSpreadsheet size={14} className={activeTab === 'report' ? 'text-white' : 'text-slate-400'} />
              <span>Report View</span>
            </button>
          </div>

          {/* Global Search Box */}
          <div className="relative flex-1 max-w-md ml-auto">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, roll / staff no, route, campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-400 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Clean Uniform Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80">
          
          {/* 1. Campus Filter */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus-within:border-cyan-400 px-3 py-2 rounded-xl text-xs transition-all shadow-sm">
            <Building2 size={14} className="text-amber-400 shrink-0" />
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL" className="bg-slate-900">All Campuses</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id} className="bg-slate-900">{inst.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Academic Year Filter */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus-within:border-cyan-400 px-3 py-2 rounded-xl text-xs transition-all shadow-sm">
            <Calendar size={14} className="text-cyan-400 shrink-0" />
            <span className="text-slate-400 font-medium text-[11px]">AY:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL" className="bg-slate-900">All Academic Years</option>
              {ACADEMIC_YEARS.map(y => (
                <option key={y} value={y} className="bg-slate-900">{y}</option>
              ))}
            </select>
          </div>

          {/* 3. Bus / Cab Route Filter */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus-within:border-cyan-400 px-3 py-2 rounded-xl text-xs transition-all shadow-sm">
            <Bus size={14} className="text-blue-400 shrink-0" />
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL" className="bg-slate-900">All Bus / Cab Routes</option>
              <option value="unallocated" className="bg-slate-900 text-amber-400">⚠️ Unallocated Only</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id} className="bg-slate-900">
                  {v.vehicle_number} {v.cab_number ? `(${v.cab_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Pass Status Filter */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus-within:border-cyan-400 px-3 py-2 rounded-xl text-xs transition-all shadow-sm">
            <Filter size={14} className="text-purple-400 shrink-0" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="ALL" className="bg-slate-900">All Pass Statuses</option>
              <option value="Active" className="bg-slate-900">🟢 Active Riders Only</option>
              <option value="Pass Surrendered" className="bg-slate-900 text-purple-400">🟣 Surrendered Passes</option>
              <option value="Pending Allocation" className="bg-slate-900 text-amber-400">🟡 Pending Allocation</option>
              <option value="Graduated" className="bg-slate-900 text-cyan-400">🎓 Graduated</option>
              <option value="Inactive" className="bg-slate-900 text-slate-400">⚪ Inactive</option>
            </select>
          </div>

          {/* 5. Fee Payment Status Filter */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus-within:border-cyan-400 px-3 py-2 rounded-xl text-xs transition-all shadow-sm">
            <DollarSign size={14} className="text-emerald-400 shrink-0" />
            <select
              value={selectedFeeStatus}
              onChange={(e) => setSelectedFeeStatus(e.target.value)}
              className={`bg-transparent font-medium focus:outline-none cursor-pointer w-full truncate ${
                selectedFeeStatus === 'UNPAID' ? 'text-rose-400' :
                selectedFeeStatus === 'PARTIAL' ? 'text-amber-400' :
                selectedFeeStatus === 'PAID' ? 'text-emerald-400' : 'text-slate-200'
              }`}
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Fee Statuses</option>
              <option value="PAID" className="bg-slate-900 text-emerald-400">🟢 Fully Paid ({kpis.fullyPaidCount})</option>
              <option value="ANY_PAID" className="bg-slate-900 text-emerald-300">✅ All Fees Paid ({kpis.paidCount})</option>
              <option value="PARTIAL" className="bg-slate-900 text-amber-400">🟡 Partial Due ({kpis.partialCount})</option>
              <option value="UNPAID" className="bg-slate-900 text-rose-400">🔴 Unpaid Only ({kpis.unpaidCount})</option>
            </select>
          </div>

        </div>

        {/* Active Filter Chips & Reset Bar (When any filter is applied) */}
        {(selectedInst !== 'ALL' || selectedVehicle !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedFeeStatus !== 'ALL' || searchQuery) && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-slate-800/60 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>
              {selectedInst !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Campus: {institutions.find(i => String(i.id) === String(selectedInst))?.name || selectedInst}
                </span>
              )}
              {selectedVehicle !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Bus: {vehicles.find(v => String(v.id) === String(selectedVehicle))?.vehicle_number || selectedVehicle}
                </span>
              )}
              {selectedStatusFilter !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Status: {selectedStatusFilter}
                </span>
              )}
              {selectedFeeStatus !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fee: {selectedFeeStatus}
                </span>
              )}
              {searchQuery && (
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Search: "{searchQuery}"
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedInst('ALL');
                setSelectedVehicle('ALL');
                setSelectedStatusFilter('ALL');
                setSelectedFeeStatus('ALL');
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-white font-bold underline transition-colors shrink-0 ml-auto"
            >
              Reset All Filters
            </button>
          </div>
        )}

      </div>

      {/* ============================================================= */}
      {/* TAB VIEW 1: STUDENT DIRECTORY & RIDERSHIP AUDIT (READ-ONLY)   */}
      {/* ============================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Filtered</div>
              <div className="text-xl font-black text-white font-mono mt-1">{totalStudentsCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Records in DB</div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-emerald-400">Active Riders</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {filteredStudentRecords.filter(s => s.status === 'Active').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Valid Pass Holders</div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-blue-400">Bus Allocated</div>
              <div className="text-xl font-black text-blue-400 font-mono mt-1">
                {filteredStudentRecords.filter(s => !!s.allocated_vehicle && s.status === 'Active').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Assigned to Fleet</div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-purple-400">Surrendered</div>
              <div className="text-xl font-black text-purple-400 font-mono mt-1">
                {filteredStudentRecords.filter(s => s.status === 'Pass Surrendered').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Left / Discontinued</div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-emerald-400">Fees Collected</div>
              <div className="text-base font-black text-emerald-400 font-mono mt-1 truncate" title={fmtINR(filteredStudentRecords.reduce((sum, s) => sum + (parseFloat(s.fee_paid) || 0), 0))}>
                {fmtINR(filteredStudentRecords.reduce((sum, s) => sum + (parseFloat(s.fee_paid) || 0), 0))}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Paid into Accounts</div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-rose-400">Total Due</div>
              <div className="text-base font-black text-rose-400 font-mono mt-1 truncate" title={fmtINR(filteredStudentRecords.reduce((sum, s) => sum + Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0) - (parseFloat(s.fee_paid) || 0)), 0))}>
                {fmtINR(filteredStudentRecords.reduce((sum, s) => sum + Math.max(0, (parseFloat(s.fee_demand) || 0) - (parseFloat(s.fee_discount) || 0) - (parseFloat(s.fee_paid) || 0)), 0))}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Outstanding Balance</div>
            </div>
          </div>

          {/* Student Table Container */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl p-6">
            
            {/* Table Header & Secondary Filter Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users size={20} className="text-blue-400" />
                  Student Transport Ridership & Audit Directory
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Complete read-only passenger list with route allocation, boarding stops, contact details & fee audit records
                </p>
              </div>

              {/* Secondary Quick Selectors */}
              <div className="flex items-center gap-2.5 flex-wrap text-xs">
                
                {/* Study Year */}
                <select
                  value={studentStudyYearFilter}
                  onChange={(e) => setStudentStudyYearFilter(e.target.value)}
                  className="bg-slate-950/90 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Study Years</option>
                  {STUDY_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {/* Rider Type */}
                <select
                  value={studentRiderTypeFilter}
                  onChange={(e) => setStudentRiderTypeFilter(e.target.value)}
                  className="bg-slate-950/90 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Rider Types</option>
                  <option value="Student">Students Only</option>
                  <option value="Staff">Staff / Faculty</option>
                </select>

                <button
                  onClick={exportStudentListCSV}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Student Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-3.5 px-4">Student & Identity</th>
                    <th className="py-3.5 px-4">Campus & Course</th>
                    <th className="py-3.5 px-4">Allocated Bus & Route</th>
                    <th className="py-3.5 px-4 text-center">Pass Status</th>
                    <th className="py-3.5 px-4 text-right">Fee Demand</th>
                    <th className="py-3.5 px-4 text-right">Paid vs Due</th>
                    <th className="py-3.5 px-4 text-center">Payment Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {paginatedStudentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users size={32} className="text-slate-600 mb-1" />
                          <div className="font-bold text-white text-sm">No student records found matching active filters</div>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Try adjusting your search query, campus, academic year, or pass status filters.
                          </p>
                          {(searchQuery || selectedInst !== 'ALL' || selectedVehicle !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedFeeStatus !== 'ALL') && (
                            <button
                              onClick={() => {
                                setSelectedInst('ALL');
                                setSelectedVehicle('ALL');
                                setSelectedStatusFilter('ALL');
                                setSelectedFeeStatus('ALL');
                                setStudentStudyYearFilter('ALL');
                                setStudentRiderTypeFilter('ALL');
                                setSearchQuery('');
                              }}
                              className="mt-2 px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/30 transition-all"
                            >
                              Reset All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudentRecords.map((s) => {
                      const demand = parseFloat(s.fee_demand || 0);
                      const discount = parseFloat(s.fee_discount || 0);
                      const netDemand = Math.max(0, demand - discount);
                      const paid = parseFloat(s.fee_paid || 0);
                      const due = Math.max(0, netDemand - paid);
                      const isSurrendered = s.status === 'Pass Surrendered';

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Student Identity */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`p-2 rounded-xl border ${
                                s.rider_type === 'Staff'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>
                                {s.rider_type === 'Staff' ? <Briefcase size={15} /> : <GraduationCap size={15} />}
                              </span>
                              <div>
                                <div className="font-bold text-white text-sm">{s.student_name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-amber-500/20">
                                    {s.roll_number}
                                  </span>
                                  {s.contact_number && (
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                      <Phone size={10} /> {s.contact_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Campus & Course */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-200">{s.institution_name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {s.course || 'General'} • <span className="text-amber-400/90 font-medium">{s.year_of_study}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">AY {s.academic_year}</div>
                          </td>

                          {/* Allocated Bus & Route */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              {s.allocated_vehicle_number ? (
                                <>
                                  <span className="font-bold text-blue-400 font-mono flex items-center gap-1">
                                    <Bus size={13} /> {s.allocated_vehicle_number}
                                  </span>
                                  {s.allocated_cab_number && (
                                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                      {s.allocated_cab_number}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-amber-400/80 italic text-xs flex items-center gap-1">
                                  <AlertCircle size={12} /> Pending Allocation
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]" title={s.route_name}>
                              {s.route_name || 'Standard Campus Route'}
                            </div>
                            {s.pickup_point && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[180px]" title={s.pickup_point}>
                                <MapPin size={10} className="text-rose-400 shrink-0" /> {s.pickup_point}
                              </div>
                            )}
                          </td>

                          {/* Pass Status */}
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              s.status === 'Pass Surrendered' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                              s.status === 'Pending Allocation' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {s.status === 'Active' && '🟢 Active Pass'}
                              {s.status === 'Pass Surrendered' && '🟣 Surrendered'}
                              {s.status === 'Pending Allocation' && '🟡 Pending'}
                              {s.status !== 'Active' && s.status !== 'Pass Surrendered' && s.status !== 'Pending Allocation' && s.status}
                            </span>
                            {isSurrendered && s.surrender_reason && (
                              <div className="text-[10px] text-purple-300/80 mt-1 truncate max-w-[140px] mx-auto" title={s.surrender_reason}>
                                {s.surrender_reason}
                              </div>
                            )}
                          </td>

                          {/* Fee Demand */}
                          <td className="py-4 px-4 text-right font-mono text-slate-300">
                            <div className="font-bold">{fmtINR(netDemand)}</div>
                            {discount > 0 && (
                              <div className="text-[10px] text-amber-400/80">Disc: -{fmtINR(discount)}</div>
                            )}
                          </td>

                          {/* Fee Paid vs Due */}
                          <td className="py-4 px-4 text-right font-mono">
                            <div className="font-bold text-emerald-400">{fmtINR(paid)}</div>
                            {due > 0 ? (
                              <div className="font-bold text-rose-400 text-[11px] mt-0.5">Due: {fmtINR(due)}</div>
                            ) : (
                              <div className="text-[10px] text-emerald-500 mt-0.5">Cleared</div>
                            )}
                          </td>

                          {/* Payment Status Badge */}
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border font-mono ${
                              due === 0 && netDemand > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              paid > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {due === 0 && netDemand > 0 ? '🟢 Fully Paid' : paid > 0 ? '🟡 Partial' : '🔴 Unpaid'}
                            </span>
                          </td>

                          {/* Action: View Profile */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudentForModal(s)}
                              className="px-3 py-1 bg-slate-800 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 rounded-lg border border-slate-700 hover:border-blue-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                              title="View Student Transport Profile"
                            >
                              View Details <ArrowUpRight size={11} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modern Pagination Footer for Student Directory Table */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              
              {/* Left: Summary Count */}
              <div className="text-slate-400 font-medium">
                Showing <span className="font-bold text-white font-mono">{totalStudentsCount === 0 ? 0 : (validStudentCurrentPage - 1) * effectiveStudentPageSize + 1}</span> to <span className="font-bold text-white font-mono">{Math.min(validStudentCurrentPage * effectiveStudentPageSize, totalStudentsCount)}</span> of <span className="font-bold text-blue-400 font-mono">{totalStudentsCount}</span> Registered Riders
              </div>

              {/* Center: Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Rows per page:</span>
                <div className="bg-slate-950/90 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                  {[5, 10, 15, 20, 25, 50, 100, 'ALL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setStudentPageSize(size);
                        setStudentCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                        studentPageSize === size
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-black scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {size === 'ALL' ? 'All' : size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Page Navigation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStudentCurrentPage(1)}
                  disabled={validStudentCurrentPage === 1}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => setStudentCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validStudentCurrentPage === 1}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Page Number Indicator */}
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                  Page <span className="text-blue-400 font-black">{validStudentCurrentPage}</span> of <span className="text-white">{totalStudentPages}</span>
                </div>

                <button
                  onClick={() => setStudentCurrentPage(p => Math.min(totalStudentPages, p + 1))}
                  disabled={validStudentCurrentPage === totalStudentPages}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setStudentCurrentPage(totalStudentPages)}
                  disabled={validStudentCurrentPage === totalStudentPages}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB VIEW 2: EXECUTIVE REPORT & AUDIT VIEW                      */}
      {/* ============================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* CAMPUS / COMPANY FLEET SEATING CAPACITY & AVAILABILITY CARDS  */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-amber-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  Campus & Company Fleet Seating Capacity
                </h2>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (Total Seats, Filled / Occupied & Available Free Seats per Campus)
                </span>
              </div>
              {selectedInst !== 'ALL' && (
                <button
                  onClick={() => setSelectedInst('ALL')}
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  Show All Campuses
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              
              {/* Card 0: All Campuses Combined */}
              <div
                onClick={() => setSelectedInst('ALL')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between backdrop-blur-md shadow-xl ${
                  selectedInst === 'ALL'
                    ? 'bg-slate-900/90 border-cyan-400 ring-2 ring-cyan-400/20 shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                      All Campuses
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      {combinedCampusStats.totalBuses} Buses
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs text-slate-400 font-medium">Total Capacity</div>
                    <div className="text-2xl font-black text-white font-mono mt-0.5">
                      {combinedCampusStats.totalCapacity} <span className="text-xs font-normal text-slate-400">Seats</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">🟢 Filled: {combinedCampusStats.filledSeats}</span>
                    <span className="text-amber-400 font-bold">🪑 Free: {combinedCampusStats.availableSeats}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, combinedCampusStats.occupancyRate)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>Occupancy</span>
                    <span className="font-mono font-bold text-cyan-300">{combinedCampusStats.occupancyRate}%</span>
                  </div>
                </div>
              </div>

              {/* Cards for each Campus / Company (KPM, University, Common, RPS, etc.) */}
              {instHeadcounts.map((inst) => {
                const isSelected = selectedInst === String(inst.institution_id);
                return (
                  <div
                    key={inst.institution_id}
                    onClick={() => setSelectedInst(isSelected ? 'ALL' : String(inst.institution_id))}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between backdrop-blur-md shadow-xl ${
                      isSelected
                        ? 'bg-slate-900/90 border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[120px]" title={inst.name}>
                          {inst.name}
                        </span>
                        <span className="text-[11px] font-bold text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          {inst.bus_count} Buses
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-xs text-slate-400 font-medium">Total Seats</div>
                        <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                          {inst.total_capacity} <span className="text-xs font-normal text-slate-400">Seats</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold font-mono">🟢 {inst.filled_seats} Filled</span>
                        <span className="text-amber-400 font-bold font-mono">🪑 {inst.available_seats} Free</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            inst.occupancy_rate > 90 ? 'bg-emerald-400' :
                            inst.occupancy_rate > 50 ? 'bg-cyan-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.min(100, inst.occupancy_rate)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Active: <b className="text-white">{inst.active_count}</b></span>
                        <span className="font-mono font-bold text-amber-300">{inst.occupancy_rate}% Full</span>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CONSOLIDATED BUS ROUTE & FEE AUDIT TABLE                     */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl p-6">
            
            {/* Table Top Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-amber-400" />
                  Consolidated Bus Route, Ridership & Fee Audit Table
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Bus-by-bus route capacity, fees paid vs unpaid student counts, fee recovery & occupancy metrics
                </p>
              </div>

              {/* Table Search & Reset Toolbar */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search bus / cab / route / campus..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all font-medium shadow-inner"
                  />
                  {tableSearch && (
                    <button
                      onClick={() => setTableSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Filter Pill Chips */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
                <button
                  onClick={() => setTableFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    tableFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-105'
                      : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All Routes ({quickCounts.all})
                </button>
                <button
                  onClick={() => setTableFilter('DUE')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    tableFilter === 'DUE'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-105'
                      : 'bg-slate-900 text-rose-400 hover:bg-rose-400/10 border border-rose-400/30'
                  }`}
                >
                  🔴 Has Unpaid ({quickCounts.withDue})
                </button>
                <button
                  onClick={() => setTableFilter('ALL_PAID')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    tableFilter === 'ALL_PAID'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 scale-105'
                      : 'bg-slate-900 text-emerald-400 hover:bg-emerald-400/10 border border-emerald-400/30'
                  }`}
                >
                  🟢 Fully Paid ({quickCounts.allPaid})
                </button>
                <button
                  onClick={() => setTableFilter('HIGH_OCCUPANCY')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    tableFilter === 'HIGH_OCCUPANCY'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 scale-105'
                      : 'bg-slate-900 text-cyan-400 hover:bg-cyan-400/10 border border-cyan-400/30'
                  }`}
                >
                  🔥 High Occupancy ({quickCounts.highOccupancy})
                </button>
                <button
                  onClick={() => setTableFilter('VACANT')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    tableFilter === 'VACANT'
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25 scale-105'
                      : 'bg-slate-900 text-blue-400 hover:bg-blue-400/10 border border-blue-400/30'
                  }`}
                >
                  🪑 Vacant Seats ({quickCounts.vacant})
                </button>
                {quickCounts.unallocated > 0 && (
                  <button
                    onClick={() => setTableFilter('UNALLOCATED')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      tableFilter === 'UNALLOCATED'
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 scale-105'
                        : 'bg-slate-900 text-amber-400 hover:bg-amber-400/10 border border-amber-400/30'
                    }`}
                  >
                    ⚠️ Unallocated ({quickCounts.unallocated})
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-3.5 px-4">Bus / Cab Number</th>
                    <th className="py-3.5 px-4">Campus & Route</th>
                    <th className="py-3.5 px-4 text-center">Active Riders / Cap</th>
                    <th className="py-3.5 px-4 text-center">Fee Paid vs Unpaid Students</th>
                    <th className="py-3.5 px-4 text-right">Fee Demand (₹)</th>
                    <th className="py-3.5 px-4 text-right">Fee Paid (₹)</th>
                    <th className="py-3.5 px-4 text-right">Fee Due (₹)</th>
                    <th className="py-3.5 px-4 text-center">Collection %</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredBusReportData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Bus size={32} className="text-slate-600 mb-1" />
                          <div className="font-bold text-white text-sm">No bus routes match your search filter</div>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Try searching by a different vehicle number (e.g. TN99), cab number, campus, or clear your filters.
                          </p>
                          {(tableSearch || tableFilter !== 'ALL') && (
                            <button
                              onClick={() => { setTableSearch(''); setTableFilter('ALL'); }}
                              className="mt-2 px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 transition-all"
                            >
                              Reset Search Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedBusReportData.map((b) => (
                      <tr key={b.vehicle_id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Vehicle Number */}
                        <td className="py-4 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span className={`p-2 rounded-lg border ${
                              b.vehicle_id === 'unallocated'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              <Bus size={16} />
                            </span>
                            <div>
                              <div className="text-sm font-bold text-slate-100">{b.vehicle_number}</div>
                              {b.cab_number && (
                                <div className="text-[11px] font-mono text-amber-400 font-semibold">{b.cab_number}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Campus & Route */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-200">{b.institution_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={b.routes_display}>
                            {b.routes_display}
                          </div>
                        </td>

                        {/* Active Riders / Capacity */}
                        <td className="py-4 px-4 text-center">
                          <div className="font-black text-sm text-white font-mono">
                            {b.active_count} <span className="text-slate-400 font-normal text-xs">/ {b.seating_capacity || 'N/A'}</span>
                          </div>
                          {b.seating_capacity > 0 && (
                            <div className="w-24 bg-slate-800 rounded-full h-1.5 mx-auto mt-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  b.occupancy_rate > 90 ? 'bg-emerald-400' :
                                  b.occupancy_rate > 50 ? 'bg-blue-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${Math.min(100, b.occupancy_rate)}%` }}
                              />
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">
                            {b.occupancy_rate}% Capacity Filled
                          </div>
                        </td>

                        {/* Fees Paid vs Unpaid Students Count */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                              🟢 {b.paid_student_count} Paid
                            </span>
                            {b.unpaid_student_count > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
                                🔴 {b.unpaid_student_count} Unpaid
                              </span>
                            )}
                            {b.surrendered_count > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                                🟣 {b.surrendered_count} Left
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fee Demand */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-300">
                          {fmtINR(b.fee_demand)}
                        </td>

                        {/* Fee Paid */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400">
                          {fmtINR(b.fee_paid)}
                        </td>

                        {/* Fee Due */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-rose-400">
                          {fmtINR(b.fee_due)}
                        </td>

                        {/* Collection % */}
                        <td className="py-4 px-4 text-center font-mono">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            b.collection_rate >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            b.collection_rate >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {b.collection_rate}%
                          </span>
                        </td>

                        {/* Quick Action: Switch to Students Tab for this bus */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVehicle(b.vehicle_id);
                              setActiveTab('students');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded-lg border border-slate-700 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                            title="View Student Directory on this Bus"
                          >
                            View Students <ArrowUpRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modern Pagination Footer for Bus Route Table */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              
              {/* Left: Summary Count */}
              <div className="text-slate-400 font-medium">
                Showing <span className="font-bold text-white font-mono">{totalBusRoutes === 0 ? 0 : (validBusCurrentPage - 1) * effectiveBusPageSize + 1}</span> to <span className="font-bold text-white font-mono">{Math.min(validBusCurrentPage * effectiveBusPageSize, totalBusRoutes)}</span> of <span className="font-bold text-amber-400 font-mono">{totalBusRoutes}</span> Fleet Routes
              </div>

              {/* Center: Page Size Selector (5, 10, 15, 20, 25, All) */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Rows per page:</span>
                <div className="bg-slate-950/90 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                  {[5, 10, 15, 20, 25, 'ALL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setBusPageSize(size);
                        setBusCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                        busPageSize === size
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {size === 'ALL' ? 'All' : size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Page Navigation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setBusCurrentPage(1)}
                  disabled={validBusCurrentPage === 1}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => setBusCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validBusCurrentPage === 1}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Page Number Indicator */}
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                  Page <span className="text-amber-400 font-black">{validBusCurrentPage}</span> of <span className="text-white">{totalBusPages}</span>
                </div>

                <button
                  onClick={() => setBusCurrentPage(p => Math.min(totalBusPages, p + 1))}
                  disabled={validBusCurrentPage === totalBusPages}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setBusCurrentPage(totalBusPages)}
                  disabled={validBusCurrentPage === totalBusPages}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>

            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* PASS SURRENDER & DISCONTINUED RIDERS HISTORICAL AUDIT             */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-purple-500/30 overflow-hidden shadow-2xl p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-purple-500/20">
              <div>
                <div className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase flex items-center gap-2">
                  <History size={14} /> 1-YEAR & MULTI-YEAR RETENTION AUDIT
                </div>
                <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                  <UserMinus size={20} className="text-purple-400" />
                  Pass Surrender & Historical Discontinuation Register
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Permanent database records of students who discontinued transport passes, surrender dates, reasons & refunds
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportSurrenderReportCSV}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-105"
                >
                  <Download size={14} />
                  Export Surrender Register CSV
                </button>
              </div>
            </div>

            {/* Surrender Toolbar */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-inner">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search surrendered student name, roll number, course, reason..."
                  value={surrenderSearch}
                  onChange={(e) => setSurrenderSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all font-medium"
                />
                {surrenderSearch && (
                  <button
                    onClick={() => setSurrenderSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Filter Reason:</span>
                <select
                  value={surrenderReasonFilter}
                  onChange={(e) => setSurrenderReasonFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="ALL">All Surrender Reasons</option>
                  {surrenderReasonsData.map(r => (
                    <option key={r.name} value={r.name}>{r.name} ({r.count})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Surrender Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono font-bold uppercase text-purple-300 tracking-wider">
                    <th className="py-3.5 px-4">Student & Identity</th>
                    <th className="py-3.5 px-4">Institution & Academic Info</th>
                    <th className="py-3.5 px-4">Past Vehicle & Route</th>
                    <th className="py-3.5 px-4">Surrender Date</th>
                    <th className="py-3.5 px-4">Reason for Leaving</th>
                    <th className="py-3.5 px-4 text-right">Fee Paid vs Refund</th>
                    <th className="py-3.5 px-4 text-right">Net Retained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredSurrenderedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No surrendered pass records matched the active filter for academic year <strong>{selectedYear}</strong>.
                      </td>
                    </tr>
                  ) : (
                    paginatedSurrenderedStudents.map((s) => {
                      const paid = parseFloat(s.fee_paid || 0);
                      const refund = parseFloat(s.refund_amount || 0);
                      const net = Math.max(0, paid - refund);

                      return (
                        <tr key={s.id} className="hover:bg-purple-950/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{s.student_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px] border border-amber-500/20">
                                {s.roll_number}
                              </span>
                              {s.contact_number && (
                                <span className="text-[11px] text-slate-400">{s.contact_number}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-200">{s.institution_name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{s.course} • {s.year_of_study}</div>
                            <div className="text-[10px] text-slate-500 font-mono">AY {s.academic_year}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-blue-400 flex items-center gap-1.5">
                              <Bus size={13} /> {s.allocated_vehicle_number || 'Unallocated'}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[160px]" title={s.route_name}>
                              {s.route_name || 'Standard Route'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {s.surrender_date || 'Historical Record'}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {s.surrender_reason || 'Pass Surrendered'}
                            </span>
                            {s.remarks && (
                              <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[180px]" title={s.remarks}>
                                {s.remarks}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="text-white font-bold">{fmtINR(paid)} Paid</div>
                            {refund > 0 && (
                              <div className="text-purple-400 text-[10px] mt-0.5">Refund: {fmtINR(refund)}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            {fmtINR(net)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modern Pagination Footer for Surrender Passes Table */}
            <div className="mt-6 pt-4 border-t border-purple-500/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              
              {/* Left: Summary Count */}
              <div className="text-slate-400 font-medium">
                Showing <span className="font-bold text-white font-mono">{totalSurrendered === 0 ? 0 : (validSurrenderCurrentPage - 1) * effectiveSurrenderPageSize + 1}</span> to <span className="font-bold text-white font-mono">{Math.min(validSurrenderCurrentPage * effectiveSurrenderPageSize, totalSurrendered)}</span> of <span className="font-bold text-purple-300 font-mono">{totalSurrendered}</span> Discontinued Passes
              </div>

              {/* Center: Page Size Selector (5, 10, 15, 20, 25, All) */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Rows per page:</span>
                <div className="bg-slate-950/90 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                  {[5, 10, 15, 20, 25, 'ALL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setSurrenderPageSize(size);
                        setSurrenderCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                        surrenderPageSize === size
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 font-black scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {size === 'ALL' ? 'All' : size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Page Navigation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSurrenderCurrentPage(1)}
                  disabled={validSurrenderCurrentPage === 1}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => setSurrenderCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validSurrenderCurrentPage === 1}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Page Number Indicator */}
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                  Page <span className="text-purple-300 font-black">{validSurrenderCurrentPage}</span> of <span className="text-white">{totalSurrenderPages}</span>
                </div>

                <button
                  onClick={() => setSurrenderCurrentPage(p => Math.min(totalSurrenderPages, p + 1))}
                  disabled={validSurrenderCurrentPage === totalSurrenderPages}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setSurrenderCurrentPage(totalSurrenderPages)}
                  disabled={validSurrenderCurrentPage === totalSurrenderPages}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>

            </div>
          </div>

          {/* Campus / Institution Headcount & Payment Summary */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 size={18} className="text-amber-400" />
                  Campus / Institution Headcount & Payment Summary
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Enrolled student counts, fees paid students, unpaid counts and route allocation rates per campus</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {instHeadcounts.map(inst => (
                <div key={inst.institution_id} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-sm font-bold text-white mb-1 truncate" title={inst.name}>{inst.name}</div>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {inst.active_count} <span className="text-xs font-normal text-slate-400">/ {inst.total_students} Total In DB</span>
                    </div>
                  </div>

                  {/* Campus Paid vs Unpaid Counts */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-400">Fees Paid:</div>
                      <div className="font-bold text-white font-mono text-sm">{inst.paid_count} Students</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-rose-400">Unpaid:</div>
                      <div className="font-bold text-rose-400 font-mono text-sm">{inst.unpaid_count} Students</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 text-xs text-slate-300 flex justify-between items-center">
                    <span>Allocated: <b className="text-emerald-400">{inst.allocated_count}</b></span>
                    <span>Collection: <b className="text-amber-400">{inst.collection_rate}%</b></span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {inst.allocation_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Major Boarding Points & Stop Headcounts */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MapPin size={18} className="text-rose-400" />
                  Major Boarding Points & Stop Headcounts
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top pickup junctions and active passenger boarding concentrations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {stopHeadcounts.map(s => (
                <div key={s.stop} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200 truncate max-w-[140px]" title={s.stop}>{s.stop}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Boarding Stop</div>
                  </div>
                  <div className="text-xl font-black text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
                    {s.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================= */}
      {/* READ-ONLY STUDENT PROFILE & TRANSPORT PASS SUMMARY MODAL      */}
      {/* ============================================================= */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${
                  selectedStudentForModal.rider_type === 'Staff'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {selectedStudentForModal.rider_type === 'Staff' ? <Briefcase size={22} /> : <GraduationCap size={22} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{selectedStudentForModal.student_name}</h3>
                    <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-bold">
                      {selectedStudentForModal.roll_number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedStudentForModal.institution_name} • {selectedStudentForModal.course || 'General'} ({selectedStudentForModal.year_of_study})
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 transition-all hover:scale-105"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Box 1: Transport Route & Bus Allocation */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-mono font-bold text-blue-400 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Bus size={13} /> Fleet & Route Details
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allocated Bus:</span>
                    <span className="font-bold text-white font-mono">
                      {selectedStudentForModal.allocated_vehicle_number || 'Unallocated'} {selectedStudentForModal.allocated_cab_number ? `(${selectedStudentForModal.allocated_cab_number})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Route Name:</span>
                    <span className="font-bold text-slate-200">{selectedStudentForModal.route_name || 'Standard Route'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pickup Point:</span>
                    <span className="font-bold text-amber-400">{selectedStudentForModal.pickup_point || 'Campus Gate'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Drop Point:</span>
                    <span className="font-bold text-slate-200">{selectedStudentForModal.drop_point || 'Main Campus'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Academic Year:</span>
                    <span className="font-mono text-cyan-400 font-bold">{selectedStudentForModal.academic_year}</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Fee Audit & Recovery Status */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <DollarSign size={13} /> Fee Recovery Audit
                </div>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Standard Demand:</span>
                    <span className="font-bold text-slate-300">{fmtINR(selectedStudentForModal.fee_demand)}</span>
                  </div>
                  {parseFloat(selectedStudentForModal.fee_discount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Concession Discount:</span>
                      <span className="font-bold text-amber-400">-{fmtINR(selectedStudentForModal.fee_discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Paid:</span>
                    <span className="font-bold text-emerald-400">{fmtINR(selectedStudentForModal.fee_paid)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Outstanding Due:</span>
                    <span className={`font-bold ${
                      Math.max(0, (parseFloat(selectedStudentForModal.fee_demand || 0) - parseFloat(selectedStudentForModal.fee_discount || 0) - parseFloat(selectedStudentForModal.fee_paid || 0))) > 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}>
                      {fmtINR(Math.max(0, (parseFloat(selectedStudentForModal.fee_demand || 0) - parseFloat(selectedStudentForModal.fee_discount || 0) - parseFloat(selectedStudentForModal.fee_paid || 0))))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Pass Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedStudentForModal.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      selectedStudentForModal.status === 'Pass Surrendered' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {selectedStudentForModal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 3: Contact Details */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Phone size={13} /> Contact Information
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rider Contact:</span>
                    <span className="font-bold text-white">{selectedStudentForModal.contact_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Parent Contact:</span>
                    <span className="font-bold text-slate-300">{selectedStudentForModal.parent_contact || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Box 4: Surrender / Historical Exit Details */}
              {selectedStudentForModal.status === 'Pass Surrendered' ? (
                <div className="bg-purple-950/40 p-4 rounded-2xl border border-purple-500/30 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-purple-300 uppercase flex items-center gap-1.5 border-b border-purple-500/30 pb-1.5">
                    <UserMinus size={13} /> Surrender Audit
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Surrender Date:</span>
                      <span className="font-bold text-purple-200 font-mono">{selectedStudentForModal.surrender_date || 'Historical'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reason:</span>
                      <span className="font-bold text-purple-300">{selectedStudentForModal.surrender_reason || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Refund Issued:</span>
                      <span className="font-bold text-emerald-400 font-mono">{fmtINR(selectedStudentForModal.refund_amount)}</span>
                    </div>
                    {selectedStudentForModal.remarks && (
                      <div className="text-[11px] text-slate-400 mt-1 italic">
                        "{selectedStudentForModal.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                    <Info size={13} /> Pass Status Remarks
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    {selectedStudentForModal.remarks || 'Active transport pass holder allocated to regular route.'}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
