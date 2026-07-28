import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const DataCheck = ({ activeTabProp, hideHeader, refreshTrigger, onEdit }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { tab } = useParams();

  const getCheckEndpoint = (entryTab) => {
    const map = {
      'institution': 'institutions',
      'registered-institution': 'registered-institutions',
      'vehicle': 'vehicles',
      'transfer': 'movements',
      'budget-heads': 'budget-heads',
      'sub-budget-heads': 'sub-budget-heads',
      'vendors': 'vendors',
      'fuel-data': 'fuel-data',
      'service-request': 'service-requests',
      'expenses': 'expenses'
    };
    return map[entryTab] || entryTab || 'institutions';
  };

  const activeTab = activeTabProp || getCheckEndpoint(tab) || 'institutions';

  const navigate = useNavigate();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBudgetHead, setFilterBudgetHead] = useState('');
  const [filterSubBudgetHead, setFilterSubBudgetHead] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterInstitution, setFilterInstitution] = useState('');
  const [filterRegisteredInstitution, setFilterRegisteredInstitution] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterFuelType, setFilterFuelType] = useState('');
  const [filterIsActive, setFilterIsActive] = useState('');
  const [filterIsTracking, setFilterIsTracking] = useState('');
  
  const [institutions, setInstitutions] = useState([]);
  const [registeredInstitutions, setRegisteredInstitutions] = useState([]);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [subBudgetHeads, setSubBudgetHeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    
    // Fetch main data
    api.get(`${activeTab}/`)
      .then(async response => {
        if (activeTab === 'vehicle-odometer-log') {
          try {
            // Also fetch operational history for Approved KM calculation
            const opHistoryRes = await api.get('vehicle-operational-history/');
            const opHistoryData = opHistoryRes.data;

            // Sort logs by log_date ascending for calculation
            const sortedLogs = [...response.data].sort((a, b) => new Date(a.log_date) - new Date(b.log_date));
            
            // Calculate fields per vehicle
            const enrichedLogs = response.data.map(log => {
              // 1. Previous 3:30 (fallback to 9:30 if missing)
              const vehicleLogs = sortedLogs.filter(l => l.vehicle === log.vehicle && new Date(l.log_date) < new Date(log.log_date));
              const previousLog = vehicleLogs.length > 0 ? vehicleLogs[vehicleLogs.length - 1] : null;
              const prevReading = previousLog ? (previousLog.evening_330 || previousLog.morning_930) : log.morning_930;

              // 2. Actual Run
              const actualRun = log.morning_930 - prevReading;

              // 3. Additional
              const additional = log.evening_330 ? log.evening_330 - log.morning_930 : 0;

              // 4. Total
              const total = actualRun + additional;

              // 5. Approved KM
              const vehicleOpHistories = opHistoryData.filter(h => h.vehicle === log.vehicle);
              // Find history active on log_date
              const activeHistory = vehicleOpHistories.find(h => {
                const start = new Date(h.effective_from);
                const end = h.effective_to ? new Date(h.effective_to) : null;
                const logD = new Date(log.log_date);
                return start <= logD && (!end || end >= logD);
              });
              const approvedKm = activeHistory && activeHistory.approved_kms ? parseFloat(activeHistory.approved_kms) : 0;

              // 6. Variance
              const variance = approvedKm > 0 ? total - approvedKm : 0; // or just total - approvedKm

              return {
                ...log,
                calculated_prev_930: prev930,
                calculated_actual_run: actualRun,
                calculated_additional: additional,
                calculated_total: total,
                calculated_approved_km: approvedKm || '-',
                calculated_variance: variance
              };
            });
            setData(enrichedLogs);
          } catch (e) {
            console.error("Failed to fetch operational history for calculations", e);
            setData(response.data);
          }
        } else {
          setData(response.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch data.');
        setLoading(false);
      });
      
    // Fetch institutions for mapping if needed
    api.get('institutions/')
      .then(res => setInstitutions(res.data))
      .catch(err => console.error("Could not fetch institutions mapping"));
      
    // Fetch registered institutions for mapping if needed
    api.get('registered-institutions/')
      .then(res => setRegisteredInstitutions(res.data))
      .catch(err => console.error("Could not fetch registered institutions mapping"));
      
    // Fetch budget heads for mapping if needed
    api.get('budget-heads/')
      .then(res => setBudgetHeads(res.data))
      .catch(err => console.error("Could not fetch budget heads mapping"));
      
    // Fetch sub budget heads for mapping if needed
    api.get('sub-budget-heads/')
      .then(res => setSubBudgetHeads(res.data))
      .catch(err => console.error("Could not fetch sub budget heads mapping"));
      
    // Fetch vendors for mapping if needed
    api.get('vendors/')
      .then(res => setVendors(res.data))
      .catch(err => console.error("Could not fetch vendors mapping"));
      
    // Fetch vehicles for mapping if needed
    api.get('vehicles/')
      .then(res => setVehicles(res.data))
      .catch(err => console.error("Could not fetch vehicles mapping"));
      
    // Fetch users for mapping if needed
    api.get('users/')
      .then(res => setUsers(res.data))
      .catch(err => console.error("Could not fetch users mapping"));

    // Fetch service requests for mapping if needed
    api.get('service-requests/')
      .then(res => setServiceRequests(res.data))
      .catch(err => console.error("Could not fetch service requests mapping"));
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on tab change or search
  }, [activeTab, refreshTrigger, searchQuery]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      if (window.confirm("WARNING: This action cannot be undone. Are you absolutely sure?")) {
        try {
          await api.delete(`${activeTab}/${id}/`);
          fetchData(); // Refresh data
        } catch (err) {
          console.error(err);
          alert("Failed to delete record.");
        }
      }
    }
  };

  const handleEditClick = (row) => {
    if (onEdit) {
      onEdit(row);
    } else {
      const entryTabMap = {
        'institutions': 'institution',
        'registered-institutions': 'registered-institution',
        'vehicles': 'vehicle',
        'movements': 'transfer',
        'service-requests': 'service-request',
        'renewals': 'renewals',
      };
      const entryTab = entryTabMap[activeTab] || activeTab;
      
      // Navigate to the DataEntry page, passing the row's data, current tab name, and returnTo path
      navigate(`/entry/${entryTab}`, { state: { rowData: row, tab: activeTab, returnTo: location.pathname } });
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const getHeaders = () => {
    if (data.length === 0) return [];
    
    if (activeTab === 'vehicles' || activeTab === 'vehicle') {
      const allowedCols = ['id', 'vehicle_number', 'fuel_type', 'institution', 'registered_institution', 'is_active', 'is_tracking'];
      return Object.keys(data[0]).filter(key => allowedCols.includes(key));
    }

    if (activeTab === 'vehicle-operational-history') {
      const allowedCols = ['id', 'vehicle', 'effective_from', 'effective_to', 'route_name', 'actual_count', 'approved_kms', 'remarks'];
      return Object.keys(data[0]).filter(key => allowedCols.includes(key));
    }

    if (activeTab === 'vehicle-odometer-log') {
      const allowedCols = ['id', 'vehicle', 'log_date', 'morning_930', 'calculated_prev_930', 'calculated_actual_run', 'evening_330', 'calculated_additional', 'calculated_total', 'calculated_approved_km', 'calculated_variance', 'remarks'];
      return Object.keys(data[0]).filter(key => allowedCols.includes(key));
    }

    if (activeTab === 'service-requests') {
      const hiddenCols = ['created_at', 'updated_at', 'created_by', 'updated_by', 'days_required', 'remarks', 'last_service_date'];
      return Object.keys(data[0]).filter(key => !hiddenCols.includes(key));
    }

    if (activeTab === 'expenses') {
      const allowedCols = ['id', 'opex_details', 'date', 'purpose', 'po_estimate_no', 'po_estimate_amount', 'bill_no', 'total_amount', 'institution', 'vehicle', 'service_request', 'vendor', 'budget_head', 'sub_budget_head'];
      return Object.keys(data[0]).filter(key => allowedCols.includes(key));
    }

    if (activeTab === 'vehicle-renewals') {
      const hiddenCols = ['created_at', 'updated_at', 'created_by', 'updated_by', 'amount_paid'];
      return Object.keys(data[0]).filter(key => !hiddenCols.includes(key));
    }

    const hiddenCols = ['created_at', 'updated_at', 'created_by', 'updated_by'];
    return Object.keys(data[0]).filter(key => !hiddenCols.includes(key));
  };

  const headers = getHeaders();

  // Search & Filter Logic
  const filteredData = data.filter(row => {
    if (filterInstitution && row.institution !== parseInt(filterInstitution) && row.institution !== institutions.find(i => i.id === parseInt(filterInstitution))?.name) return false;
    if (filterRegisteredInstitution && row.registered_institution !== parseInt(filterRegisteredInstitution)) return false;
    if (filterFromDate && row.date && new Date(row.date) < new Date(filterFromDate)) return false;
    if (filterToDate && row.date && new Date(row.date) > new Date(filterToDate)) return false;
    if (filterBudgetHead && row.budget_head !== parseInt(filterBudgetHead)) return false;
    if (filterSubBudgetHead && row.sub_budget_head !== parseInt(filterSubBudgetHead)) return false;
    if (filterVendor && row.vendor !== parseInt(filterVendor) && row.vendor_name !== parseInt(filterVendor) && row.vendor_name !== vendors.find(v => v.id === parseInt(filterVendor))?.name) return false;
    if (filterVehicle && row.vehicle !== parseInt(filterVehicle) && row.vehicle_number !== filterVehicle && row.vehicle_id !== parseInt(filterVehicle)) return false;
    if (filterFuelType && row.fuel_type !== filterFuelType) return false;
    if (filterIsActive !== '' && String(row.is_active) !== filterIsActive) return false;
    if (filterIsTracking !== '' && String(row.is_tracking) !== filterIsTracking) return false;

    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    // Check if any value in the row contains the search query
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(lowerQuery)
    );
  });

  // Pagination Logic
  const totalRecords = filteredData.length;
  const isAll = pageSize === -1;
  const totalPages = isAll ? 1 : Math.ceil(totalRecords / pageSize);
  const currentData = isAll ? filteredData : filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    'expenses': { title: 'Expense Records', desc: 'View and manage maintenance, fuel, and operational expenses' },
    'fuel-data': { title: 'Fuel Records', desc: 'View and monitor daily fuel consumption and costs' },
    'fuel-rates': { title: 'Fuel Rates', desc: 'Manage petrol and diesel prices over time' },
    'vehicle-operational-history': { title: 'Operational History', desc: 'View and manage historical records of vehicle routes and capacities' },
  };
  const currentHeader = headerDetails[activeTab] || { title: 'Data Management', desc: 'Live database viewer & editor' };

  const handleExportExcel = async () => {
    if (data.length === 0) return;
    
    // Include all columns except backend tracking fields
    const exportHeaders = Object.keys(data[0]).filter(key => !['created_at', 'updated_at', 'created_by', 'updated_by'].includes(key));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(activeTab.toUpperCase());

    // Formatting for header
    let reportTitle = `${currentHeader.title} Report`;
    if (filterFromDate && filterToDate) {
      reportTitle += ` (${filterFromDate} to ${filterToDate})`;
    } else if (filterFromDate) {
      reportTitle += ` (From ${filterFromDate})`;
    } else if (filterToDate) {
      reportTitle += ` (Until ${filterToDate})`;
    }

    if (activeTab === 'expenses') {
      const expenseHeaders = [
        "Institution", "Vehicle No:", "DATE", "Month", "Year", "Vendor Name", 
        "Budget Head", "Sub Budget Head", "Purpose", "PO/Estimate No", "PO/Estimate Date", 
        "PO/Estimate Amount", "Service Km", "Bill Receieved Date", "Bill Description", 
        "Bill No", "Bill Date", "Amount", "SGST", "CGST", "Total Amount", 
        "Opex Type", "Opex No", "Opex Date", "Opex Amount", "Remarks"
      ];
      worksheet.mergeCells(1, 1, 1, expenseHeaders.length);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = { bottom: { style: 'thick', color: { argb: 'FF000000' } } };
      worksheet.getRow(1).height = 40;

      const headerRow = worksheet.addRow(expenseHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      worksheet.getRow(2).height = 40;

      filteredData.forEach(row => {
        const instName = row.institution ? institutions.find(inst => inst.id === row.institution)?.name || row.institution : '-';
        const vehNum = row.vehicle ? vehicles.find(v => v.id === row.vehicle)?.vehicle_number || row.vehicle : '-';
        const rawDate = row.date || '';
        const dateObj = rawDate ? new Date(rawDate) : null;
        const month = dateObj ? dateObj.toLocaleString('default', { month: 'long' }) : '-';
        const year = dateObj ? dateObj.getFullYear() : '-';
        const venName = row.vendor ? vendors.find(v => v.id === row.vendor)?.name || row.vendor : row.vendor_manual || '-';
        const bhName = row.budget_head ? budgetHeads.find(bh => bh.id === row.budget_head)?.name || row.budget_head : '-';
        const sbhName = row.sub_budget_head ? subBudgetHeads.find(sbh => sbh.id === row.sub_budget_head)?.name || row.sub_budget_head : '-';
        
        const baseData = [
          instName, vehNum, rawDate || '-', month, year, venName, bhName, sbhName, 
          row.purpose || '-', row.po_estimate_no || '-', row.po_estimate_date || '-', row.po_estimate_amount || '-', 
          row.service_km || '-', row.bill_received_date || '-', row.bill_description || '-', 
          row.bill_no || '-', row.bill_date || '-', row.amount || '-', row.sgst || '-', row.cgst || '-', row.total_amount || '-'
        ];

        const opexList = Array.isArray(row.opex_details) && row.opex_details.length > 0 ? row.opex_details : [null];
        
        opexList.forEach(opex => {
          const rowData = [
            ...baseData,
            opex ? opex.opex_type || '-' : '-',
            opex ? opex.opex_number || '-' : '-',
            opex ? opex.opex_date || '-' : '-',
            opex ? opex.opex_amount || '-' : '-',
            row.remarks || '-'
          ];
          const dataRow = worksheet.addRow(rowData);
          dataRow.eachCell(cell => {
            cell.font = { name: 'Arial', size: 11 };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
          });
        });
      });

      worksheet.columns.forEach((col, index) => {
        col.width = Math.max(expenseHeaders[index].length + 5, 15);
      });
    } else {
      // Add title row
      worksheet.mergeCells(1, 1, 1, exportHeaders.length || 1);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = { bottom: { style: 'thick', color: { argb: 'FF000000' } } };
      worksheet.getRow(1).height = 40;

      // Add Header Row
      const headerRow = worksheet.addRow(exportHeaders.map(h => h.replace(/_/g, ' ').toUpperCase()));
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      worksheet.getRow(2).height = 25;

      // Add Data
      filteredData.forEach(row => {
        const rowData = exportHeaders.map(h => {
          if (h === 'budget_head') return row[h] ? budgetHeads.find(bh => bh.id === row[h])?.name || row[h] : '-';
          if (h === 'sub_budget_head') return row[h] ? subBudgetHeads.find(sbh => sbh.id === row[h])?.name || row[h] : '-';
          if (h === 'vendor' || h === 'vendor_name') return row[h] ? vendors.find(v => v.id === row[h])?.name || row[h] : row.vendor_manual || '-';
          if (h === 'institution' || h === 'from_institution' || h === 'to_institution') return row[h] ? institutions.find(inst => inst.id === row[h])?.name || row[h] : '-';
          if (h === 'registered_institution') return row[h] ? registeredInstitutions.find(inst => inst.id === row[h])?.name || row[h] : '-';
          if (h === 'vehicle') return row[h] ? vehicles.find(v => v.id === row[h])?.vehicle_number || row[h] : '-';
          if (h === 'moved_by') return row[h] ? users?.find(u => u.id === row[h])?.username || row[h] : '-';
          if (h === 'service_request') return row[h] ? `SR-#${row[h]} (${serviceRequests.find(sr => sr.id === row[h])?.nature_of_problem?.substring(0, 20) || 'Unknown'})` : '-';
          if (h === 'moved_at') return row[h] ? new Date(row[h]).toLocaleString() : '-';
          if (h === 'institutions' && Array.isArray(row[h])) {
            return row[h].map(id => institutions.find(inst => inst.id === id)?.name || id).join(', ');
          }
          if (h === 'opex_details' && Array.isArray(row[h])) {
            return row[h].map(o => `${o.opex_number} (${o.opex_date}) - ${o.opex_type} - ₹${o.opex_amount}`).join('\n');
          }
          return row[h] === null || row[h] === undefined ? '-' : typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h]);
        });
        const dataRow = worksheet.addRow(rowData);
        dataRow.eachCell(cell => {
          cell.font = { name: 'Arial', size: 11 };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
        });
      });

      // Adjust column widths
      worksheet.columns.forEach((col, index) => {
        const headerLength = exportHeaders[index] ? exportHeaders[index].length : 10;
        col.width = Math.max(headerLength + 10, 20); // Minimum 20
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${activeTab}_report.xlsx`);
  };

  return (
    <div className={`w-full max-w-[98%] mx-auto flex flex-col items-center animate-fade-in ${!hideHeader ? 'py-8 px-4' : ''}`}>
      {!hideHeader && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-sm">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            </div>
            {currentHeader.title}
          </h1>
          <p className="text-slate-400 text-sm">{currentHeader.desc}</p>
        </div>
      )}
      
      {/* Pagination Controls & Table Container */}
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm w-full overflow-x-auto">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
          <div>
            <label style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>Show entries:</label>
            <select className="input-field" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} value={pageSize} onChange={handlePageSizeChange}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
              <option value={-1}>All</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export Excel
            </button>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search..." 
              style={{ width: '200px', padding: '0.35rem 0.75rem', fontSize: '0.875rem' }} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {isAll ? totalRecords : Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
            </div>
          </div>
        </div>
        
        {/* Dropdown Filters */}
        {(headers.includes('vehicle') || activeTab === 'vehicle' || activeTab === 'vehicles' || headers.includes('vendor') || headers.includes('budget_head') || headers.includes('institution') || headers.includes('date')) && (
          <div className="flex flex-wrap gap-4 mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
            {headers.includes('institution') && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Institution</label>
                <select className="input-field w-full text-sm" value={filterInstitution} onChange={e => setFilterInstitution(e.target.value)}>
                  <option value="">All Institutions</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
            {(headers.includes('registered_institution') || activeTab === 'vehicle' || activeTab === 'vehicles') && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Registered Inst.</label>
                <select className="input-field w-full text-sm" value={filterRegisteredInstitution} onChange={e => setFilterRegisteredInstitution(e.target.value)}>
                  <option value="">All Reg. Institutions</option>
                  {registeredInstitutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
            {headers.includes('date') && (
              <>
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">From Date</label>
                  <input type="date" className="input-field w-full text-sm" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">To Date</label>
                  <input type="date" className="input-field w-full text-sm" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
                </div>
              </>
            )}
            {headers.includes('vehicle') && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Vehicle</label>
                <select className="input-field w-full text-sm" value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
                  <option value="">All Vehicles</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                </select>
              </div>
            )}
            {(activeTab === 'vehicle' || activeTab === 'vehicles') && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Fuel Type</label>
                  <select className="input-field w-full text-sm" value={filterFuelType} onChange={e => setFilterFuelType(e.target.value)}>
                    <option value="">All</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="EV">EV</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
                  <select className="input-field w-full text-sm" value={filterIsActive} onChange={e => setFilterIsActive(e.target.value)}>
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Tracking</label>
                  <select className="input-field w-full text-sm" value={filterIsTracking} onChange={e => setFilterIsTracking(e.target.value)}>
                    <option value="">All</option>
                    <option value="true">Tracking On</option>
                    <option value="false">Tracking Off</option>
                  </select>
                </div>
              </>
            )}
            {headers.includes('vendor') && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Vendor</label>
                <select className="input-field w-full text-sm" value={filterVendor} onChange={e => setFilterVendor(e.target.value)}>
                  <option value="">All Vendors</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}
            {headers.includes('budget_head') && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Budget Head</label>
                <select className="input-field w-full text-sm" value={filterBudgetHead} onChange={e => { setFilterBudgetHead(e.target.value); setFilterSubBudgetHead(''); }}>
                  <option value="">All Budget Heads</option>
                  {budgetHeads.map(bh => <option key={bh.id} value={bh.id}>{bh.name}</option>)}
                </select>
              </div>
            )}
            {headers.includes('sub_budget_head') && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Sub Budget Head</label>
                <select className="input-field w-full text-sm" value={filterSubBudgetHead} onChange={e => setFilterSubBudgetHead(e.target.value)}>
                  <option value="">All Sub Budgets</option>
                  {subBudgetHeads
                    .filter(sbh => !filterBudgetHead || sbh.budget_head === parseInt(filterBudgetHead))
                    .map(sbh => <option key={sbh.id} value={sbh.id}>{sbh.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p style={{ padding: '1rem' }}>Loading...</p>
        ) : error ? (
          <p style={{ color: 'var(--danger)', padding: '1rem' }}>{error}</p>
        ) : data.length === 0 ? (
          <p style={{ padding: '1rem' }}>No records found.</p>
        ) : (
          <div className="custom-table-container" style={{ overflowX: 'auto', overflowY: 'auto', width: '100%', maxHeight: '70vh', paddingBottom: '1rem' }}>
            <style>
              {`
                .custom-table-container::-webkit-scrollbar-track {
                  margin-top: 58px; /* Offset the scrollbar by the header height */
                  border-radius: 8px;
                }
              `}
            </style>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neu-shadow-dark)' }}>
                  {headers.map(h => (
                    <th key={h} className="table-header-neu" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem 0.5rem', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {h === 'bill_file' ? 'Bill Document / PDF' : h === 'estimate_doc' ? 'Estimate Document / PDF' : h === 'discount_amount' ? 'Discount Rate' : h.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="table-header-neu" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
            <tbody>
              {currentData.map((row, i) => (
                <tr key={row.id || i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  {headers.map(h => (
                    <td key={h} style={{ 
                      padding: '0.75rem 0.5rem', 
                      whiteSpace: ['purpose', 'bill_description', 'nature_of_problem', 'vendor', 'vendor_name', 'budget_head', 'sub_budget_head'].includes(h) ? 'normal' : 'nowrap',
                      minWidth: h === 'opex_details' ? '280px' : ['purpose', 'bill_description', 'nature_of_problem'].includes(h) ? '200px' : ['vendor', 'vendor_name', 'budget_head', 'sub_budget_head'].includes(h) ? '150px' : 'auto'
                    }}>
                      {h === 'color_code' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: row[h] || '#cbd5e1' }} title={row[h]}></div>
                          <span>{row[h]}</span>
                        </div>
                      ) : typeof row[h] === 'boolean' ? (
                        row[h] ? 'Yes' : 'No'
                      ) : h === 'budget_head' ? (
                        <span>{row[h] ? budgetHeads.find(bh => bh.id === row[h])?.name || row[h] : '-'}</span>
                      ) : h === 'sub_budget_head' ? (
                        <span>{row[h] ? subBudgetHeads.find(sbh => sbh.id === row[h])?.name || row[h] : '-'}</span>
                      ) : h === 'vendor' || h === 'vendor_name' ? (
                        <span>{row[h] ? vendors.find(v => v.id === row[h])?.name || row[h] : row.vendor_manual || '-'}</span>
                      ) : h === 'institution' || h === 'from_institution' || h === 'to_institution' ? (
                        <span>{row[h] ? institutions.find(inst => inst.id === row[h])?.name || row[h] : '-'}</span>
                      ) : h === 'registered_institution' ? (
                        <span>{row[h] ? registeredInstitutions.find(inst => inst.id === row[h])?.name || row[h] : '-'}</span>
                      ) : h === 'vehicle' ? (
                        <span>{row[h] ? vehicles.find(v => v.id === row[h])?.vehicle_number || row[h] : '-'}</span>
                      ) : h === 'moved_by' ? (
                        <span>{row[h] ? users.find(u => u.id === row[h])?.username || row[h] : '-'}</span>
                      ) : h === 'service_request' ? (
                        <span>{row[h] ? `SR-#${row[h]} (${serviceRequests.find(sr => sr.id === row[h])?.nature_of_problem?.substring(0, 20) || 'Unknown'})` : '-'}</span>
                      ) : h === 'moved_at' ? (
                        <span>{row[h] ? new Date(row[h]).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</span>
                      ) : h === 'institutions' && Array.isArray(row[h]) ? (
                        <div className="flex flex-wrap gap-1">
                          {row[h].length > 0 ? row[h].map(id => {
                            const inst = institutions.find(inst => inst.id === id);
                            return (
                              <span key={id} className="px-2 py-1 bg-slate-800 text-xs text-slate-300 rounded-md border border-slate-700">
                                {inst ? inst.name : id}
                              </span>
                            );
                          }) : '-'}
                        </div>
                      ) : h === 'request_id' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-mono font-bold">
                          {row[h]}
                        </span>
                      ) : h === 'estimated_repair_cost' ? (
                        row[h] !== null && row[h] !== undefined && row[h] !== '' ? (
                          <span className="font-mono text-emerald-400 font-bold">
                            ₹ {parseFloat(row[h]).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : '-'
                      ) : h === 'kms_reading' ? (
                        row[h] !== null && row[h] !== undefined && row[h] !== '' ? (
                          <span className="font-mono font-medium text-slate-200">
                            {parseInt(row[h]).toLocaleString()} KM
                          </span>
                        ) : '-'
                      ) : h === 'bill_file' || h === 'estimate_doc' ? (
                        row[h] ? (
                          <button 
                            type="button"
                            onClick={() => {
                              const fullUrl = String(row[h]).startsWith('http') ? String(row[h]) : `http://localhost:8000${String(row[h]).startsWith('/') ? '' : '/'}${row[h]}`;
                              setPdfPreviewUrl(fullUrl);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 hover:text-blue-200 border border-blue-500/40 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View PDF
                          </button>
                        ) : (
                          <span className="text-slate-500 text-xs italic">No File</span>
                        )
                      ) : h === 'opex_details' && Array.isArray(row[h]) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {row[h].length > 0 ? row[h].map(opex => (
                            <div key={opex.id} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--neu-bg)', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.05)' }}>
                              <strong>{opex.opex_number}</strong> ({opex.opex_date}) &middot; {opex.opex_type} &middot; ₹{opex.opex_amount}
                            </div>
                          )) : '-'}
                        </div>
                      ) : row[h] === null || row[h] === '' || row[h] === undefined ? '-' : typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h])}
                    </td>
                  ))}
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => handleEditClick(row)} style={{ marginRight: '0.5rem', color: 'var(--brand-blue)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                    <button onClick={() => handleDelete(row.id)} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Bottom Pagination Buttons */}
        {!isAll && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem', gap: '0.5rem' }}>
            <button 
              className="btn" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem' }}>Page {currentPage} of {totalPages}</span>
            <button 
              className="btn" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Inline PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white tracking-wide">Document Preview</span>
              </div>

              <div className="flex items-center gap-3">
                <a 
                  href={pdfPreviewUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  Open in New Tab ↗
                </a>
                <button 
                  type="button"
                  onClick={() => setPdfPreviewUrl(null)} 
                  className="p-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 transition-all text-xs font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="w-full flex-1 bg-slate-950 relative">
              <iframe 
                src={pdfPreviewUrl} 
                className="w-full h-full border-0" 
                title="Document PDF Viewer" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DataCheck;
